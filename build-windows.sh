#!/bin/bash

# Markdown Pro - Windows 构建脚本
# 使用方法: ./build-windows.sh [--release]

set -e

PROJECT_NAME="Markdown Pro"
VERSION="0.1.0"
TARGET="x86_64-pc-windows-gnu"

echo "🚀 开始构建 $PROJECT_NAME for Windows..."
echo "=========================================="

# 检查依赖
echo "🔍 检查构建依赖..."

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm 未安装"
    echo "请运行: npm install -g pnpm"
    exit 1
fi

if ! command -v cargo &> /dev/null; then
    echo "❌ Rust 未安装"
    echo "请运行: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# 检查 Windows 目标
if ! rustup target list | grep -q "x86_64-pc-windows-gnu (installed)"; then
    echo "⚙️  安装 Windows 构建目标..."
    rustup target add x86_64-pc-windows-gnu
fi

echo "✅ 依赖检查通过"

# 安装项目依赖
echo ""
echo "📦 安装项目依赖..."
pnpm install

# 运行测试
echo ""
echo "🧪 运行测试..."
pnpm run test:unit

# 构建 Web 资源
echo ""
echo "🌐 构建 Web 资源..."
pnpm run build

# 检查 Tauri 是否已初始化
if [ ! -d "src-tauri" ]; then
    echo ""
    echo "⚙️  初始化 Tauri..."
    pnpm add -D @tauri-apps/cli@next @tauri-apps/api@next
    pnpm tauri init
fi

# 清理旧构建
echo ""
echo "🧹 清理旧构建..."
rm -rf "src-tauri/target/$TARGET/release/bundle" 2>/dev/null || true
rm -rf "src-tauri/target/$TARGET/debug/bundle" 2>/dev/null || true

# 构建 Windows 应用
echo ""
echo "🔨 构建 Windows 应用..."

BUILD_PROFILE="release"
TAURI_ARGS=(build --target "$TARGET")

if [ "$1" == "--debug" ]; then
    BUILD_PROFILE="debug"
    TAURI_ARGS+=(--debug)
fi

if [ "$(uname -s)" != "MINGW64_NT" ] && [ "$(uname -s)" != "MSYS_NT" ] && ! command -v makensis.exe &> /dev/null; then
    echo "⚠️  未检测到 makensis.exe，当前主机将只生成 Windows 可执行文件，不打安装包"
    TAURI_ARGS+=(--no-bundle)
fi

pnpm tauri "${TAURI_ARGS[@]}"

# 检查构建结果
echo ""
echo "📊 检查构建结果..."

OUTPUT_DIR="src-tauri/target/$TARGET/$BUILD_PROFILE"
BUNDLE_DIR="$OUTPUT_DIR/bundle"
EXECUTABLE_PATH="$OUTPUT_DIR/markdown-pro.exe"

if [ -d "$BUNDLE_DIR/msi" ] || [ -d "$BUNDLE_DIR/nsis" ]; then
    echo "✅ Windows 构建成功！"
    echo ""
    echo "📦 构建产物:"
    echo "  MSI 安装包:"
    ls -lh "$BUNDLE_DIR/msi/"*.msi 2>/dev/null || echo "    (无 MSI)"
    echo ""
    echo "  NSIS 安装包:"
    ls -lh "$BUNDLE_DIR/nsis/"*.exe 2>/dev/null || echo "    (无 NSIS)"
    echo ""
    echo "📁 完整路径:"
    echo "  $(pwd)/$BUNDLE_DIR/msi/"
    echo "  $(pwd)/$BUNDLE_DIR/nsis/"
elif [ -f "$EXECUTABLE_PATH" ]; then
    echo "✅ Windows 可执行文件构建成功！"
    echo ""
    echo "📦 构建产物:"
    ls -lh "$EXECUTABLE_PATH"
    echo ""
    echo "📝 说明:"
    echo "  - 当前主机未提供 NSIS，因此跳过安装包打包"
    echo "  - 可执行文件可在 Windows 上直接运行"
    echo ""
    echo "📁 完整路径:"
    echo "  $(pwd)/$EXECUTABLE_PATH"
else
    echo "❌ 构建失败"
    exit 1
fi

echo ""
echo "🎉 构建完成！"
echo ""
echo "📝 注意:"
echo "  - MSI 安装包需要 Windows 10 或更高版本"
echo "  - 可以在 Windows 上直接运行或通过 Wine 测试"
