#!/usr/bin/env bash
set -euo pipefail
launchctl unload "$HOME/Library/LaunchAgents/com.zhaogang.zg-k8s-agent.plist" >/dev/null 2>&1 || true
rm -f "$HOME/Library/LaunchAgents/com.zhaogang.zg-k8s-agent.plist"
rm -rf "$HOME/Applications/zg-k8s-agent.app"
echo "zg-k8s-agent uninstalled"
