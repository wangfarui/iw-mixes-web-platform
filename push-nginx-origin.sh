#!/bin/bash

# 初始化变量
SOURCE_DIR="/Users/wangfarui/workspaces/wfr/iw-mixes-web-platform" # 源服务器目录
SOURCE_FILE="dist" # 拷贝的文件或目录
TARGET_DIR="iw-mixes-web-platform" # 目标服务器目录

# 1. 连接到远程服务器并进行操作
ssh aliyun183 << EOF

# 2. 删除目标服务器目录
cd /usr/share/nginx || exit 1
if [ -d "$TARGET_DIR" ]; then
    rm -rf "$TARGET_DIR"
    echo "历史目录 $TARGET_DIR 已删除."
else
    echo "目录 $TARGET_DIR 不存在，无需删除."
fi

EOF

# 3. 切换到本地目录并拷贝源服务器目录到远程服务器的目标服务器目录下
cd $SOURCE_DIR || exit 1
scp -r $SOURCE_FILE aliyun183:/usr/share/nginx/$TARGET_DIR
