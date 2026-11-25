#!/usr/bin/env bash
set -euo pipefail

if [[ -d /dev/shm ]] && scratch=$(mktemp -d /dev/shm/blygger-check.XXXXXX); then
  export TMPDIR="$scratch"
  trap 'rm -rf -- "$scratch"' EXIT
fi

"$@"
