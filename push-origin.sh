#!/bin/bash

# 1. 连接到远程服务器
ssh aliyun183 << 'EOF'
# 2. 检查连接是否成功，若失败则退出并报错
if [ $? -ne 0 ]; then
    echo "连接aliyun183服务器失败"
    exit 1
fi

# 3. 删除iw-mixes-web-platform目录
cd /usr/share/nginx || exit 1
rm -rf ./iw-mixes-web-platform

# 4. 退出远程服务器
exit
EOF

# 5. 切换到本地目录并拷贝iw-mixes-web-platform目录到远程服务器
cd /Users/wangfarui/workspaces/wfr/iw-mixes-web-platform || exit 1
scp -r ./dist aliyun183:/usr/share/nginx/iw-mixes-web-platform
