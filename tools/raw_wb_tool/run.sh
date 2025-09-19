#!/bin/bash
# 运行白点白平衡工具的便捷脚本

# 确保程序已编译
if [ ! -f "build/raw_wb_whitepoint" ]; then
    echo "正在编译程序..."
    make
fi

# 运行程序
./build/raw_wb_whitepoint "$@"
