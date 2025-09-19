#!/bin/bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
# 输出到 deps/lcms2/build/<os>-<arch>
OS_NAME=${OS_NAME_OVERRIDE:-$(uname -s | tr '[:upper:]' '[:lower:]')}
ARCH_NAME=${ARCH_NAME_OVERRIDE:-$(uname -m)}
OUT_DIR="$ROOT_DIR/deps/lcms2/build/${OS_NAME}-${ARCH_NAME}"
VENDOR_DIR="$OUT_DIR"
TMP_DIR="$(mktemp -d)"
# Allow override via env LCMS2_VERSION, default 2.17
VERSION="${LCMS2_VERSION:-2.17}"
URL="https://downloads.sourceforge.net/project/lcms/lcms/${VERSION}/lcms2-${VERSION}.tar.gz"

echo "Building lcms2 ${VERSION} into ${VENDOR_DIR}"
mkdir -p "$VENDOR_DIR"
cd "$TMP_DIR"
curl -L -o lcms2.tar.gz "$URL"
tar xf lcms2.tar.gz
cd "lcms2-${VERSION}"

# 允许交叉编译：传入 HOST 三元组（例如 aarch64-linux-gnu、x86_64-w64-mingw32、x86_64-apple-darwin）
HOST_TRIPLE="${HOST_TRIPLE:-}"
CFG_ARGS=(--enable-static --disable-shared --prefix="$VENDOR_DIR")
if [ -n "$HOST_TRIPLE" ]; then
  CFG_ARGS+=(--host="$HOST_TRIPLE")
fi
./configure "${CFG_ARGS[@]}"
make -j"$(sysctl -n hw.ncpu 2>/dev/null || nproc || echo 4)"
make install

echo "lcms2 installed to $VENDOR_DIR"
