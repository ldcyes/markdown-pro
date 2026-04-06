#!/bin/bash

# Markdown Pro - Windows 构建脚本
# 使用方法: ./build-windows.sh [--release]

set -e

PROJECT_NAME="Markdown Pro"
VERSION="0.1.0"

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
rm -rf src-tauri/target/x86_64-pc-windows-gnu/release/bundle 2>/dev/null || true

# 构建 Windows 应用
echo ""
echo "🔨 构建 Windows 应用..."

if [ "$1" == "--release" ]; then
    pnpm tauri build --target x86_64-pc-windows-gnu --release
else
    pnpm tauri build --target x86_64-pc-windows-gnu --debug
fi

# 检查构建结果
echo ""
echo "📊 检查构建结果..."

BUNDLE_DIR="src-tauri/target/x86_64-pc-windows-gnu/release/bundle"

if [ -d "$BUNDLE_DIR/msi" ]; then
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
