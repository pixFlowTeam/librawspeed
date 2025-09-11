#!/bin/bash

# LibRaw 统一构建脚本
# 支持所有平台的交叉编译

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    echo "LibRaw 统一构建脚本"
    echo ""
    echo "用法: $0 [平台]"
    echo ""
    echo "支持的平台:"
    echo "  all           - 构建所有平台"
    echo "  windows-x64   - Windows x64"
    echo "  macos-x64     - macOS Intel"
    echo "  macos-arm64   - macOS Apple Silicon"
    echo "  linux-x64     - Linux x64"
    echo "  linux-arm64   - Linux ARM64"
    echo ""
    echo "示例:"
    echo "  $0 all                    # 构建所有平台"
    echo "  $0 windows-x64           # 构建 Windows x64"
    echo "  $0 macos-arm64           # 构建 macOS ARM64"
    echo ""
}

# 检查工具链是否可用
check_toolchain() {
    local platform=$1
    local arch=$2
    
    case "$platform" in
        "windows")
            if ! command -v x86_64-w64-mingw32-gcc &> /dev/null; then
                log_error "MinGW-w64 工具链未找到，请安装: brew install mingw-w64"
                return 1
            fi
            ;;
        "macos")
            if ! command -v clang &> /dev/null; then
                log_error "Xcode Command Line Tools 未找到，请安装: xcode-select --install"
                return 1
            fi
            ;;
        "linux")
            if ! command -v gcc &> /dev/null; then
                log_error "GCC 工具链未找到，请安装: brew install gcc"
                return 1
            fi
            ;;
    esac
    return 0
}

# 构建单个平台
build_platform() {
    local platform=$1
    local arch=$2
    
    log_info "开始构建 $platform-$arch..."
    
    # 检查工具链
    if ! check_toolchain "$platform" "$arch"; then
        log_error "工具链检查失败，跳过 $platform-$arch"
        return 1
    fi
    
    # 运行交叉编译
    case "$platform" in
        "windows")
            log_info "运行 Windows x64 交叉编译..."
            node scripts/cross-compile.js win32
            ;;
        "macos")
            if [ "$arch" = "arm64" ]; then
                log_info "运行 macOS ARM64 交叉编译..."
                node scripts/cross-compile.js darwin arm64
            else
                log_info "运行 macOS x64 交叉编译..."
                node scripts/cross-compile.js darwin x64
            fi
            ;;
        "linux")
            if [ "$arch" = "arm64" ]; then
                log_info "运行 Linux ARM64 交叉编译..."
                node scripts/cross-compile.js linux arm64
            else
                log_info "运行 Linux x64 交叉编译..."
                node scripts/cross-compile.js linux x64
            fi
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        log_success "$platform-$arch 构建完成"
    else
        log_error "$platform-$arch 构建失败"
        return 1
    fi
}

# 构建所有平台
build_all() {
    log_info "开始构建所有平台..."
    
    local platforms=(
        "windows-x64"
        "macos-x64"
        "macos-arm64"
        "linux-x64"
        "linux-arm64"
    )
    
    local failed_platforms=()
    
    for platform in "${platforms[@]}"; do
        log_info "构建平台: $platform"
        
        case "$platform" in
            "windows-x64")
                build_platform "windows" "x64" || failed_platforms+=("$platform")
                ;;
            "macos-x64")
                build_platform "macos" "x64" || failed_platforms+=("$platform")
                ;;
            "macos-arm64")
                build_platform "macos" "arm64" || failed_platforms+=("$platform")
                ;;
            "linux-x64")
                build_platform "linux" "x64" || failed_platforms+=("$platform")
                ;;
            "linux-arm64")
                build_platform "linux" "arm64" || failed_platforms+=("$platform")
                ;;
        esac
        
        echo ""  # 空行分隔
    done
    
    # 显示构建结果
    if [ ${#failed_platforms[@]} -eq 0 ]; then
        log_success "所有平台构建完成！"
    else
        log_warning "以下平台构建失败: ${failed_platforms[*]}"
        exit 1
    fi
}

# 显示构建状态
show_status() {
    log_info "构建状态检查..."
    
    local build_dirs=(
        "deps/LibRaw-Source/LibRaw-0.21.4/build/win32"
        "deps/LibRaw-Source/LibRaw-0.21.4/build/darwin-x64"
        "deps/LibRaw-Source/LibRaw-0.21.4/build/darwin-arm64"
        "deps/LibRaw-Source/LibRaw-0.21.4/build/linux-x64"
        "deps/LibRaw-Source/LibRaw-0.21.4/build/linux-arm64"
    )
    
    local platform_names=(
        "Windows x64"
        "macOS x64"
        "macOS ARM64"
        "Linux x64"
        "Linux ARM64"
    )
    
    for i in "${!build_dirs[@]}"; do
        local dir="${build_dirs[$i]}"
        local name="${platform_names[$i]}"
        
        if [ -d "$dir" ]; then
            log_success "$name: 已构建"
        else
            log_warning "$name: 未构建"
        fi
    done
}

# 清理构建文件
clean_builds() {
    log_info "清理所有构建文件..."
    
    local build_dirs=(
        "deps/LibRaw-Source/LibRaw-0.21.4/build/win32"
        "deps/LibRaw-Source/LibRaw-0.21.4/build/darwin-x64"
        "deps/LibRaw-Source/LibRaw-0.21.4/build/darwin-arm64"
        "deps/LibRaw-Source/LibRaw-0.21.4/build/linux-x64"
        "deps/LibRaw-Source/LibRaw-0.21.4/build/linux-arm64"
    )
    
    for dir in "${build_dirs[@]}"; do
        if [ -d "$dir" ]; then
            rm -rf "$dir"
            log_info "已删除: $dir"
        fi
    done
    
    log_success "清理完成"
}

# 主函数
main() {
    local command=${1:-"help"}
    
    case "$command" in
        "all")
            build_all
            ;;
        "windows-x64")
            build_platform "windows" "x64"
            ;;
        "macos-x64")
            build_platform "macos" "x64"
            ;;
        "macos-arm64")
            build_platform "macos" "arm64"
            ;;
        "linux-x64")
            build_platform "linux" "x64"
            ;;
        "linux-arm64")
            build_platform "linux" "arm64"
            ;;
        "status")
            show_status
            ;;
        "clean")
            clean_builds
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            log_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"
