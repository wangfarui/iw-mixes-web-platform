#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="${HOME}/Applications/zg-k8s-agent.app"
CONTENTS="$APP_DIR/Contents"
mkdir -p "$CONTENTS/MacOS" "$CONTENTS/Resources"
cp "${1:-$SCRIPT_DIR/zg-k8s-agent}" "$CONTENTS/MacOS/zg-k8s-agent"
chmod 755 "$CONTENTS/MacOS/zg-k8s-agent"
cat > "$CONTENTS/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>com.zhaogang.zg-k8s-agent</string>
<key>CFBundleName</key><string>zg-k8s-agent</string>
<key>CFBundleExecutable</key><string>zg-k8s-agent</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>LSUIElement</key><true/>
<key>CFBundleURLTypes</key><array><dict><key>CFBundleURLSchemes</key><array><string>zg-k8s-agent</string></array></dict></array>
</dict></plist>
PLIST
"$CONTENTS/MacOS/zg-k8s-agent" >/dev/null 2>&1 &
echo "zg-k8s-agent installed at $APP_DIR"
