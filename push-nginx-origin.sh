#!/bin/bash

set -euo pipefail

# 初始化变量
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" # 本地项目目录
SOURCE_FILE="dist" # 待发布的构建目录
TARGET_DIR="iw-mixes-web-platform" # 目标服务器目录
REMOTE_HOST="aliyun183"
REMOTE_ROOT="/usr/share/nginx"
ARCHIVE_NAME="${TARGET_DIR}-$(date +%Y%m%d%H%M%S)-$$.tar.gz"
ARCHIVE_FILE="$(mktemp -t "${TARGET_DIR}.XXXXXX")"

cleanup_local_archive() {
  rm -f -- "$ARCHIVE_FILE"
}
trap cleanup_local_archive EXIT

# 1. 构建最新的前端代码；构建失败时停止发布
cd "$SOURCE_DIR"
echo "开始构建前端代码..."
npm run build

if [ ! -d "$SOURCE_FILE" ]; then
    echo "构建产物 $SOURCE_FILE 不存在，停止发布." >&2
    exit 1
fi

# 校验待上传的安装包、运行文件及兼容更新清单
node scripts/checkZgWorkbenchAgentRelease.mjs "$SOURCE_FILE"

# 2. 将构建目录压缩为单个文件，并先校验压缩包可正常读取
echo "开始压缩构建产物..."
# macOS 的 bsdtar 默认会写入 LIBARCHIVE.xattr.* 扩展头，CentOS 的 GNU tar 会对此告警。
tar --no-xattrs -czf "$ARCHIVE_FILE" -C "$SOURCE_FILE" .
tar -tzf "$ARCHIVE_FILE" >/dev/null
echo "构建产物已压缩：$(du -h "$ARCHIVE_FILE" | awk '{print $1}')"

# 3. 上传压缩包；线上目录在上传完成前保持不变
echo "开始上传压缩包..."
scp "$ARCHIVE_FILE" "$REMOTE_HOST:$REMOTE_ROOT/$ARCHIVE_NAME"

# 4. 在服务器解压到临时目录，校验后替换线上目录
ssh "$REMOTE_HOST" bash -s -- "$REMOTE_ROOT" "$TARGET_DIR" "$ARCHIVE_NAME" <<'REMOTE_SCRIPT'
set -euo pipefail

REMOTE_ROOT="$1"
TARGET_DIR="$2"
ARCHIVE_NAME="$3"
ARCHIVE_PATH="$REMOTE_ROOT/$ARCHIVE_NAME"
STAGING_DIR=""
BACKUP_DIR=""

cleanup_remote() {
  status=$?
  trap - EXIT

  if [ -n "$STAGING_DIR" ] && [ -d "$STAGING_DIR" ]; then
    rm -rf -- "$STAGING_DIR"
  fi

  if [ "$status" -ne 0 ] && [ -n "$BACKUP_DIR" ] && [ -d "$BACKUP_DIR" ] && [ ! -e "$REMOTE_ROOT/$TARGET_DIR" ]; then
    mv -- "$BACKUP_DIR" "$REMOTE_ROOT/$TARGET_DIR"
    echo "发布失败，已恢复历史目录 $TARGET_DIR." >&2
  fi

  rm -f -- "$ARCHIVE_PATH"
  exit "$status"
}
trap cleanup_remote EXIT

if [ ! -s "$ARCHIVE_PATH" ]; then
  echo "服务器上的压缩包不存在或为空：$ARCHIVE_PATH" >&2
  exit 1
fi

STAGING_DIR="$(mktemp -d "$REMOTE_ROOT/.${TARGET_DIR}.deploy.XXXXXX")"
tar -xzf "$ARCHIVE_PATH" -C "$STAGING_DIR"

if [ ! -s "$STAGING_DIR/index.html" ]; then
  echo "解压后的构建目录缺少 index.html，停止发布." >&2
  exit 1
fi

if [ -e "$REMOTE_ROOT/$TARGET_DIR" ]; then
  BACKUP_DIR="$REMOTE_ROOT/.${TARGET_DIR}.backup.$(date +%Y%m%d%H%M%S).$$"
  mv -- "$REMOTE_ROOT/$TARGET_DIR" "$BACKUP_DIR"
fi

mv -- "$STAGING_DIR" "$REMOTE_ROOT/$TARGET_DIR"
STAGING_DIR=""

if [ -n "$BACKUP_DIR" ] && [ -d "$BACKUP_DIR" ]; then
  rm -rf -- "$BACKUP_DIR"
  BACKUP_DIR=""
fi

rm -f -- "$ARCHIVE_PATH"
trap - EXIT
echo "服务器解压并替换目录完成：$REMOTE_ROOT/$TARGET_DIR"
REMOTE_SCRIPT

echo "前端代码构建并发布完成."
