"""Run two Chromium shards with independent loopback fixtures on one CI runner."""
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
from tempfile import TemporaryDirectory


def playwright(root, shard):
    output = root / 'test-results' / f'chromium-{shard}'
    return ['npm', 'run', 'test:e2e', '--', '--project=desktop', '--project=mobile',
            f'--shard={shard}/6', f'--output={output}']


def start_lane(root, workspace, scratch, shard, cpus):
    unit = f'blygger-e2e-{scratch.name}-{shard}.service'
    temp = scratch / f'tmp-{shard}'
    temp.mkdir()
    command = playwright(root, shard)
    command[0] = shutil.which('npm')
    if not command[0]:
        raise RuntimeError('npm is missing')
    environment = ['PATH', 'HOME', 'CI', 'GITHUB_ACTIONS', 'PLAYWRIGHT_BROWSERS_PATH',
                   'CLOUDFLARE_CF_FETCH_ENABLED', 'LANG', 'LC_ALL', 'TZ']
    args = ['sudo', '-n', 'systemd-run', '--wait', '--pipe', '--collect', f'--unit={unit}',
            f'--property=User={os.getuid()}', f'--property=Group={os.getgid()}',
            f'--property=WorkingDirectory={workspace}',
            f'--property=AllowedCPUs={",".join(map(str, cpus))}',
            '--property=PrivateNetwork=yes', '--property=KillMode=control-group',
            '--property=TimeoutStopSec=15', f'--setenv=TMPDIR={temp}']
    args.extend(f'--setenv={name}={os.environ[name]}' for name in environment if name in os.environ)
    print(f'Starting Chromium shard {shard}/6 on CPUs {cpus}', flush=True)
    return unit, subprocess.Popen([*args, *command], stdin=subprocess.DEVNULL)


def run(shard):
    root = Path.cwd()
    first, second = 2 * shard - 1, 2 * shard
    cpus = sorted(os.sched_getaffinity(0))
    if len(cpus) < 4:
        # Keep the same roster even when different runners have different CPU counts.
        first_result = subprocess.run(playwright(root, first)).returncode
        second_result = subprocess.run(playwright(root, second)).returncode
        return first_result or second_result

    with TemporaryDirectory(prefix='pair-', dir=os.environ['RUNNER_TEMP']) as directory:
        scratch = Path(directory)
        checkout = scratch / 'studio'
        subprocess.run(['git', 'worktree', 'add', '--detach', checkout, 'HEAD'], check=True)
        lanes = []
        try:
            # The web server builds into its checkout and uses fixed loopback ports.
            subprocess.run(['cp', '-a', '--reflink=auto', root / 'node_modules', checkout], check=True)
            lanes.append(start_lane(root, root, scratch, first, cpus[:2]))
            lanes.append(start_lane(root, checkout, scratch, second, cpus[2:4]))
            results = [process.wait() for _, process in lanes]
            return next((result for result in results if result), 0)
        finally:
            for unit, process in lanes:
                if process.poll() is None:
                    subprocess.run(['sudo', '-n', 'systemctl', 'stop', unit], check=False, timeout=25)
                    process.wait(timeout=10)
            subprocess.run(['git', 'worktree', 'remove', '--force', checkout], check=True)


def terminate(_signum, _frame):
    raise KeyboardInterrupt()


if __name__ == '__main__':
    signal.signal(signal.SIGTERM, terminate)
    shard = int(sys.argv[1])
    if shard not in range(1, 4):
        raise ValueError('The Check Chromium matrix requires a shard from 1 through 3')
    sys.exit(run(shard))
