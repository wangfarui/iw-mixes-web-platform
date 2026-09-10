#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="${HOME}/Applications/zg-workbench-agent.app"
LEGACY_APP_DIR="${HOME}/Applications/zg-k8s-agent.app"
CONTENTS="$APP_DIR/Contents"
TARGET="$CONTENTS/MacOS/zg-workbench-agent"
LEGACY_TARGET="$LEGACY_APP_DIR/Contents/MacOS/zg-k8s-agent"

mkdir -p "$CONTENTS/MacOS" "$CONTENTS/Resources"
cp "${1:-$SCRIPT_DIR/zg-workbench-agent}" "$TARGET"
chmod 755 "$TARGET"
cat > "$CONTENTS/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>com.zhaogang.zg-workbench-agent</string>
<key>CFBundleName</key><string>zg-workbench-agent</string>
<key>CFBundleExecutable</key><string>zg-workbench-agent</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>LSUIElement</key><true/>
<key>CFBundleURLTypes</key><array><dict><key>CFBundleURLSchemes</key><array><string>zg-workbench-agent</string><string>zg-k8s-agent</string></array></dict></array>
</dict></plist>
PLIST

if [[ -f "$HOME/Library/LaunchAgents/com.zhaogang.zg-k8s-agent.plist" ]]; then
  launchctl unload "$HOME/Library/LaunchAgents/com.zhaogang.zg-k8s-agent.plist" >/dev/null 2>&1 || true
fi
"$TARGET" >/dev/null 2>&1 &

healthy=false
for _ in $(seq 1 100); do
  if curl --silent --fail --max-time 1 http://127.0.0.1:28731/v1/health >/dev/null 2>&1; then
    healthy=true
    break
  fi
  sleep 0.1
done
if [[ "$healthy" != true ]]; then
  kill "$!" >/dev/null 2>&1 || true
  if [[ -x "$LEGACY_TARGET" ]]; then
    "$LEGACY_TARGET" >/dev/null 2>&1 &
  fi
  echo "zg-workbench-agent 安装后健康检查失败，已保留旧 Agent" >&2
  exit 1
fi

launchctl unload "$HOME/Library/LaunchAgents/com.zhaogang.zg-k8s-agent.plist" >/dev/null 2>&1 || true
rm -f "$HOME/Library/LaunchAgents/com.zhaogang.zg-k8s-agent.plist"
rm -rf "$LEGACY_APP_DIR"
echo "zg-workbench-agent installed at $APP_DIR"
