"""Run two independent shards on disjoint CPU sets in a Check job."""
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
from tempfile import TemporaryDirectory


def test_command(root, suite, shard, total):
    if suite == 'chromium':
        output = root / 'test-results' / f'chromium-{shard}'
        return ['npm', 'run', 'test:e2e', '--', '--project=desktop', '--project=mobile',
                f'--shard={shard}/{total}', f'--output={output}']
    return ['npm', 'run', 'test:auth:security:mutations', '--', f'--worker-shard={shard}-{total}']


def start_lane(workspace, scratch, suite, shard, cpus, command):
    unit = f'blygger-check-{suite}-{scratch.name}-{shard}.service'
    temp = scratch / f'tmp-{shard}'
    temp.mkdir()
    command[0] = shutil.which('npm')
    if not command[0]:
        raise RuntimeError('npm is missing')
    environment = ['PATH', 'HOME', 'CI', 'GITHUB_ACTIONS', 'PLAYWRIGHT_BROWSERS_PATH',
                   'CLOUDFLARE_CF_FETCH_ENABLED', 'LANG', 'LC_ALL', 'TZ']
    args = ['sudo', '-n', 'systemd-run', '--wait', '--pipe', '--collect', f'--unit={unit}',
            f'--property=User={os.getuid()}', f'--property=Group={os.getgid()}',
            f'--property=WorkingDirectory={workspace}',
            f'--property=AllowedCPUs={",".join(map(str, cpus))}',
            '--property=KillMode=control-group',
            '--property=TimeoutStopSec=15', f'--setenv=TMPDIR={temp}']
    if suite == 'chromium':
        args.append('--property=PrivateNetwork=yes')
    args.extend(f'--setenv={name}={os.environ[name]}' for name in environment if name in os.environ)
    print(f'Starting {suite} shard {shard} on CPUs {cpus}', flush=True)
    return unit, subprocess.Popen([*args, *command], stdin=subprocess.DEVNULL)


def keep_worker_evidence(root, checkout):
    destination = root / 'build'
    for log in (checkout / 'build').glob('security-mutant-*.log'):
        shutil.copy2(log, destination)
    evidence = checkout / 'build' / 'oracle-control-evidence'
    if evidence.is_dir():
        shutil.copytree(evidence, destination / evidence.name, dirs_exist_ok=True)


def run(suite, pair, pairs):
    root = Path.cwd()
    first, second = 2 * pair - 1, 2 * pair
    first_command = test_command(root, suite, first, 2 * pairs)
    second_command = test_command(root, suite, second, 2 * pairs)
    cpus = sorted(os.sched_getaffinity(0))
    if len(cpus) < 4:
        # Keep the same roster even when different runners have different CPU counts.
        first_result = subprocess.run(first_command).returncode
        second_result = subprocess.run(second_command).returncode
        return first_result or second_result

    with TemporaryDirectory(prefix='pair-', dir=os.environ['RUNNER_TEMP']) as directory:
        scratch = Path(directory)
        checkout = scratch / 'studio'
        subprocess.run(['git', 'worktree', 'add', '--detach', checkout, 'HEAD'], check=True)
        lanes = []
        try:
            # The Chromium web server builds into its own checkout and listens on fixed ports.
            # The Worker verifier snapshots its checkout before applying controls.
            subprocess.run(['cp', '-a', '--reflink=auto', root / 'node_modules', checkout], check=True)
            if suite == 'worker-auth':
                subprocess.run(['cp', '-a', '--reflink=auto', root / 'build', checkout], check=True)
                subprocess.run(['cp', '-a', '--reflink=auto', root / 'sdk' / 'dist', checkout / 'sdk'], check=True)
            lanes.append(start_lane(root, scratch, suite, first, cpus[:2], first_command))
            lanes.append(start_lane(checkout, scratch, suite, second, cpus[2:4], second_command))
            results = [process.wait() for _, process in lanes]
            return next((result for result in results if result), 0)
        finally:
            for unit, process in lanes:
                if process.poll() is None:
                    subprocess.run(['sudo', '-n', 'systemctl', 'stop', unit], check=False, timeout=25)
                    process.wait(timeout=10)
            try:
                if suite == 'worker-auth':
                    keep_worker_evidence(root, checkout)
            finally:
                subprocess.run(['git', 'worktree', 'remove', '--force', checkout], check=True)


def terminate(_signum, _frame):
    raise KeyboardInterrupt()


if __name__ == '__main__':
    signal.signal(signal.SIGTERM, terminate)
    suite, pair_index, pair_count = sys.argv[1:]
    pair, pairs = int(pair_index), int(pair_count)
    if suite not in ('chromium', 'worker-auth') or not 1 <= pair <= pairs:
        raise ValueError('Expected <chromium|worker-auth> <pair index> <number of pairs>')
    sys.exit(run(suite, pair, pairs))
