"""Linux CI supervisor. Kernel cpuset bounds the complete service descendant tree.

This does not judge a product law. It preserves the wrapper status and records
empty/removed cgroup state only after systemd has stopped the owned service.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import signal
import stat
import subprocess
import sys
import time


def cleanup_owned_service(unit, group_path):
    """Never replace the child status/primary with a cleanup exception."""
    errors = []
    stop_exit = None
    try:
        stop_exit = subprocess.run(
            ['sudo', 'systemctl', 'stop', unit + '.service'],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            check=False, timeout=45).returncode
    except BaseException as error:
        errors.append(dict(stage='stop-service', name=type(error).__name__,
                           message=str(error)))
    remaining_pids = []
    try:
        def inspect(directory):
            if not stat.S_ISDIR(os.lstat(directory).st_mode):
                raise ValueError('Cgroup inspection path is not an ordinary directory')
            procs = directory / 'cgroup.procs'
            if not stat.S_ISREG(os.lstat(procs).st_mode):
                raise ValueError('Cgroup process list is not a regular file')
            pids = procs.read_text().split()
            if any(not re.fullmatch(r'[1-9][0-9]*', pid) for pid in pids):
                raise ValueError('Cgroup process list contains an invalid PID')
            remaining_pids.extend(pids)
            # Unlike Path.rglob/exists, these APIs propagate scan/stat errors.
            with os.scandir(directory) as entries:
                children = sorted(entries, key=lambda entry: entry.name)
            for entry in children:
                mode = entry.stat(follow_symlinks=False).st_mode
                if stat.S_ISLNK(mode):
                    raise ValueError('Cgroup inspection contains a symlink')
                if stat.S_ISDIR(mode):
                    inspect(directory / entry.name)

        inspect(group_path)
    except BaseException as error:
        # Only affirmative absence of the owned root proves release. A missing
        # descendant/procs file while that root survives is an inspection error.
        removed = False
        if isinstance(error, FileNotFoundError):
            try:
                os.lstat(group_path)
            except FileNotFoundError:
                removed = True
            except BaseException:
                pass
        if removed:
            remaining_pids.clear()
        else:
            errors.append(dict(stage='verify-cgroup', name=type(error).__name__,
                               message=str(error)))
    cleanup = ('verification-failed' if errors else
               'processes-remain' if remaining_pids else 'empty-or-removed')
    return dict(cleanup=cleanup, remainingPids=remaining_pids,
                cleanupErrors=errors, stopExitCode=stop_exit)


def run_partition(plan_path, part, out, cpus):
    plan_bytes = Path(plan_path).read_bytes()
    plan_sha256 = hashlib.sha256(plan_bytes).hexdigest()
    plan = json.loads(plan_bytes)
    seed = plan.get('seed')
    if (plan.get('schema') != 'blygger-formatting-baseline-plan-v4'
            or plan.get('seedSource') != 'fresh' or not isinstance(seed, str)
            or not re.fullmatch(r'-?(0|[1-9][0-9]*)', seed)
            or str(int(seed)) != seed or not -2147483648 <= int(seed) <= 2147483647):
        raise ValueError('Invalid baseline plan campaign seed')
    if not any(row['id'] == part for row in plan['parts']):
        raise ValueError('Unknown baseline partition')
    if [plan['commit'], plan['runId'], plan['attempt'], plan['root']] != [
            os.environ.get('GITHUB_SHA'), os.environ.get('GITHUB_RUN_ID'),
            os.environ.get('GITHUB_RUN_ATTEMPT'), str(Path.cwd().resolve())]:
        raise ValueError('Plan belongs to another checkout/run attempt')
    unit = 'formatting-baseline-' + plan['runId'] + '-' + plan['attempt'] + '-' + part
    if not re.fullmatch(r'formatting-baseline-[a-z0-9-]+', unit):
        raise ValueError('Invalid owned systemd unit')
    deadline = plan['deadline']
    remaining = (deadline / 1000 - time.time()) if deadline else None
    if remaining is not None and remaining <= 0:
        raise ValueError('Release baseline deadline expired')
    # Forward only non-secret runtime/identity settings. Replay controls and a
    # caller-supplied scope cannot be inherited into this complete baseline.
    forwarded = ['PATH', 'HOME', 'TMPDIR', 'CI', 'GITHUB_ACTIONS', 'TZ', 'LANG', 'LC_ALL', 'PLAYWRIGHT_BROWSERS_PATH', 'GITHUB_SHA',
                 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'ImageOS', 'ImageVersion', 'CLOUDFLARE_CF_FETCH_ENABLED']
    command = ['sudo', 'systemd-run', '--wait', '--pipe', '--collect',
               '--unit=' + unit, '--property=Slice=system.slice',
               '--property=User=' + str(os.getuid()),
               '--property=Group=' + str(os.getgid()),
               '--property=WorkingDirectory=' + str(Path.cwd()),
               '--property=KillMode=control-group', '--property=TimeoutStopSec=30',
               '--property=AllowedCPUs=' + ','.join(map(str, cpus))]
    for name in forwarded:
        if name in os.environ:
            command.append('--setenv=' + name + '=' + os.environ[name])
    command.append('--setenv=FORMATTING_BASELINE_UNIT=' + unit)
    node = shutil.which('node')
    if node is None:
        raise ValueError('Node executable is missing')
    command.extend([node, '--import', 'tsx', 'scripts/formatting-oracles.ts',
                    '--baseline-only', '--contexts', '2', '--browser', 'chromium',
                    '--browser-isolation', 'process', '--baseline-plan', str(Path(plan_path).resolve()),
                    '--baseline-part', part, '--out', str(out.resolve())])
    result = 1
    primary = None
    interrupt = None
    started_at = time.time()
    started = time.monotonic()
    group = '/system.slice/' + unit + '.service'
    group_path = Path('/sys/fs/cgroup' + group)
    try:
        result = subprocess.run(command, timeout=remaining, check=False).returncode
    except subprocess.TimeoutExpired:
        result = 124
        primary = 'absolute baseline deadline expired'
    except BaseException as error:
        primary = type(error).__name__ + ': ' + str(error)
        if isinstance(error, KeyboardInterrupt):
            interrupt = error
    finally:
        # Even stop/inspection exceptions become separate cleanup diagnostics.
        cleanup = cleanup_owned_service(unit, group_path)
    if cleanup['cleanup'] != 'empty-or-removed':
        result = result or 1
    out.mkdir(parents=True, exist_ok=True)
    receipt = dict(schema='blygger-formatting-baseline-host-v2', commit=plan['commit'],
                   runId=plan['runId'], attempt=plan['attempt'], part=part, unit=unit, seed=seed, planSha256=plan_sha256,
                   group=group, allowedCPUs=cpus, exitCode=result, primary=primary,
                   **cleanup, deadline=deadline,
                   startedAtUnixMs=round(started_at * 1000),
                   finishedAtUnixMs=round(time.time() * 1000),
                   elapsedSeconds=time.monotonic() - started)
    with (out / 'host-completion.json').open('x') as target:
        target.write(json.dumps(receipt, indent=2) + '\n')
    if interrupt is not None:
        raise interrupt
    return result, cleanup['cleanup'] == 'empty-or-removed'


def run_lane(plan, root, parts, cpus):
    result = 0
    for part in parts:
        status, released = run_partition(plan, part, Path(root) / ('formatting-part-' + part), cpus)
        result = result or status
        if not released:
            break
    return result


def paired_cpus(cpus):
    fallback = [cpus[:2], cpus[2:4]]
    by_core = {}
    try:
        for cpu in cpus:
            topology = Path(f'/sys/devices/system/cpu/cpu{cpu}/topology/thread_siblings_list')
            siblings = topology.read_text().strip()
            if not siblings:
                return fallback
            by_core.setdefault(siblings, []).append(cpu)
    except OSError:
        return fallback
    # Give each service a different physical core when the VM exposes SMT.
    complete = [members[:2] for members in by_core.values() if len(members) >= 2]
    return complete[:2] if len(complete) >= 2 else fallback


def main():
    cpus = sorted(os.sched_getaffinity(0))
    if len(cpus) < 2:
        raise ValueError('Baseline CI requires two available CPUs')
    args = sys.argv[1:]
    if len(args) == 3:
        plan, part, out = args
        return run_partition(plan, part, Path(out), cpus[:2])[0]
    if not 4 <= len(args) <= 7 or args[0] != 'group':
        raise ValueError('Use formatting-baseline-host.py group <plan> <out-root> <first> [<companion> [<followup> [<companion-followup>]]]')
    _, plan, root, *parts = args
    assigned = [part for part in parts if part]
    if not parts[0] or len(set(assigned)) != len(assigned):
        raise ValueError('A partition can run only once in a group')
    lanes = [[part for part in parts[index::2] if part] for index in (0, 1)]
    if not lanes[1] or len(cpus) < 4:
        return run_lane(plan, root, assigned, cpus[:2])
    # Prepare the shared, verified runner copy before both lanes open it.
    subprocess.run(['node', '--import', 'tsx', '--input-type=module', '-e',
                    "import { prepareFormattingBaselineRunner } "
                    "from './scripts/formatting-baseline-runner.ts'; "
                    "await prepareFormattingBaselineRunner()"], check=True)
    jobs = []
    try:
        for pair, lane in zip(paired_cpus(cpus), lanes):
            allowed = ','.join(map(str, pair))
            # The child sees exactly two CPUs and runs its lane in sequence.
            jobs.append(subprocess.Popen(
                ['taskset', '-c', allowed, sys.executable, __file__, 'group', plan, root, *lane],
                start_new_session=True))
        results = [job.wait() for job in jobs]
    finally:
        # Each supervisor stops its owned service and records the cleanup.
        for job in jobs:
            if job.poll() is None:
                job.terminate()
        for job in jobs:
            job.wait()
    return next((result for result in results if result), 0)


if __name__ == '__main__':
    def terminate(_signum, _frame):
        raise KeyboardInterrupt()

    signal.signal(signal.SIGTERM, terminate)
    sys.exit(main())
