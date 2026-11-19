#!/usr/bin/env bash
set -euo pipefail
for name in dev-hub-agent zg-workbench-agent zg-k8s-agent; do
  if [[ "$name" == dev-hub-agent ]]; then label=com.devhub.agent; else label="com.zhaogang.$name"; fi
  launchctl unload "$HOME/Library/LaunchAgents/$label.plist" >/dev/null 2>&1 || true
  ps -axo pid=,comm= | while read -r process_id process_path; do
    if [[ "$process_path" == "$HOME/Applications/$name.app/Contents/MacOS/$name" ]]; then
      kill "$process_id" >/dev/null 2>&1 || true
      for _ in $(seq 1 50); do
        kill -0 "$process_id" >/dev/null 2>&1 || break
        sleep 0.1
      done
    fi
  done
  rm -f "$HOME/Library/LaunchAgents/$label.plist"
  rm -rf "$HOME/Applications/$name.app"
done
echo 'Dev Hub Agent uninstalled'
