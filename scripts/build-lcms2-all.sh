#!/bin/bash
set -euo pipefail
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

# 版本可通过 LCMS2_VERSION 覆盖
: "${LCMS2_VERSION:=2.17}"

# 定义需要构建的平台矩阵（可按需增删）
MATRIX=(
  "darwin arm64"
  "darwin x64"
  "linux arm64 aarch64-linux-gnu"
  "linux x64 x86_64-linux-gnu"
  "windows x64 x86_64-w64-mingw32"
)

for entry in "${MATRIX[@]}"; do
  OS_NAME=$(echo "$entry" | awk '{print $1}')
  ARCH_NAME=$(echo "$entry" | awk '{print $2}')
  HOST_TRIPLE=$(echo "$entry" | awk '{print $3}')
  echo "\n=== Building lcms2 ${LCMS2_VERSION} for ${OS_NAME}-${ARCH_NAME} (host=${HOST_TRIPLE:-native}) ==="
  OS_NAME_OVERRIDE="$OS_NAME" ARCH_NAME_OVERRIDE="$ARCH_NAME" HOST_TRIPLE="$HOST_TRIPLE" LCMS2_VERSION="$LCMS2_VERSION" \
    bash scripts/build-lcms2.sh
 done

echo "\nAll targets built under deps/lcms2/build/<os>-<arch>"
