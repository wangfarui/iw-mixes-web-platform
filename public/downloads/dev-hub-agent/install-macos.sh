#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="${HOME}/Applications/dev-hub-agent.app"
TARGET="$APP_DIR/Contents/MacOS/dev-hub-agent"
SOURCE="${1:-$SCRIPT_DIR/dev-hub-agent}"
# Accept an unpacked historical package when explicitly reusing this installer.
if [[ $# -eq 0 && ! -f "$SOURCE" && -f "$SCRIPT_DIR/zg-workbench-agent" ]]; then
  SOURCE="$SCRIPT_DIR/zg-workbench-agent"
fi
[[ -f "$SOURCE" ]] || { echo 'Dev Hub Agent 安装文件不存在' >&2; exit 1; }
mkdir -p "$APP_DIR/Contents/MacOS" "$APP_DIR/Contents/Resources"
BACKUP=""
if [[ -f "$TARGET" ]]; then
  BACKUP="$TARGET.previous"
  cp "$TARGET" "$BACKUP"
fi
agent_pid=""
install_healthy=false
rollback() {
  trap - ERR
  if [[ "$install_healthy" != true ]]; then
    [[ -z "$agent_pid" ]] || kill "$agent_pid" >/dev/null 2>&1 || true
    if [[ -n "$BACKUP" && -f "$BACKUP" ]]; then
      mv -f "$BACKUP" "$TARGET"
      "$TARGET" >/dev/null 2>&1 &
    fi
    for name in zg-workbench-agent zg-k8s-agent; do
      old_target="$HOME/Applications/$name.app/Contents/MacOS/$name"
      old_plist="$HOME/Library/LaunchAgents/com.zhaogang.$name.plist"
      if [[ -f "$old_plist" ]]; then launchctl load "$old_plist" >/dev/null 2>&1 || true
      elif [[ -x "$old_target" ]]; then "$old_target" >/dev/null 2>&1 & break; fi
    done
    echo 'Dev Hub Agent 安装失败，已保留旧安装' >&2
  else
    echo 'Dev Hub Agent 已启动，旧安装清理未完成' >&2
  fi
  exit 1
}
trap rollback ERR
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
done
cp "$SOURCE" "$TARGET.installing"
chmod 755 "$TARGET.installing"
mv -f "$TARGET.installing" "$TARGET"
"$TARGET" --register-install
"$TARGET" >/dev/null 2>&1 &
agent_pid=$!
"$TARGET" --check-install
install_healthy=true
"$TARGET" --complete-install
[[ -z "$BACKUP" ]] || rm -f "$BACKUP"
trap - ERR
echo "Dev Hub Agent installed at $APP_DIR"
