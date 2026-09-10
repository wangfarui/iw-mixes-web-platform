#!/bin/bash

set -euo pipefail

# 初始化变量
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" # 本地项目目录
SOURCE_FILE="dist" # 拷贝的文件或目录
TARGET_DIR="iw-mixes-web-platform" # 目标服务器目录

# 1. 构建最新的前端代码；构建失败时停止发布
cd "$SOURCE_DIR"
echo "开始构建前端代码..."
npm run build

if [ ! -d "$SOURCE_FILE" ]; then
    echo "构建产物 $SOURCE_FILE 不存在，停止发布." >&2
    exit 1
fi

AGENT_RELEASE_DIR="$SOURCE_FILE/downloads/zg-workbench-agent"
LEGACY_AGENT_RELEASE_DIR="$SOURCE_FILE/downloads/zg-k8s-agent"
AGENT_MANIFEST="$AGENT_RELEASE_DIR/latest.json"
if [ ! -s "$AGENT_MANIFEST" ]; then
    echo "zg-workbench-agent 更新清单不存在：$AGENT_MANIFEST，停止发布." >&2
    exit 1
fi
node -e 'const fs=require("fs"); const path=process.argv[1]; const manifest=JSON.parse(fs.readFileSync(path, "utf8")); if (!manifest.version || !manifest.platforms || Object.keys(manifest.platforms).length !== 4) throw new Error("Agent 更新清单缺少版本或平台文件");' "$AGENT_MANIFEST"
for agent_file in \
    "$AGENT_RELEASE_DIR/zg-workbench-agent-darwin-arm64.bin" \
    "$AGENT_RELEASE_DIR/zg-workbench-agent-darwin-amd64.bin" \
    "$AGENT_RELEASE_DIR/zg-workbench-agent-windows-amd64.runtime.exe" \
    "$AGENT_RELEASE_DIR/zg-workbench-agent-windows-arm64.runtime.exe"; do
    if [ ! -s "$agent_file" ]; then
    echo "zg-workbench-agent 发布文件不存在：$agent_file，停止发布." >&2
    exit 1
  fi
done
if [ ! -s "$LEGACY_AGENT_RELEASE_DIR/latest.json" ]; then
    echo "旧版 zg-k8s-agent 更新清单不存在：$LEGACY_AGENT_RELEASE_DIR/latest.json，停止发布." >&2
    exit 1
fi

# 2. 连接到远程服务器并进行操作
ssh aliyun183 << EOF

# 3. 删除目标服务器目录
cd /usr/share/nginx || exit 1
if [ -d "$TARGET_DIR" ]; then
    rm -rf "$TARGET_DIR"
    echo "历史目录 $TARGET_DIR 已删除."
else
    echo "目录 $TARGET_DIR 不存在，无需删除."
fi

EOF

# 4. 拷贝构建产物到远程服务器的目标目录下
scp -r "$SOURCE_FILE" "aliyun183:/usr/share/nginx/$TARGET_DIR"

echo "前端代码构建并发布完成."
