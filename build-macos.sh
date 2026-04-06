#!/bin/bash

# Markdown Pro - macOS 构建脚本
# 使用方法: ./build-macos.sh [--release]

set -e

PROJECT_NAME="Markdown Pro"
VERSION="0.1.0"

echo "🚀 开始构建 $PROJECT_NAME for macOS..."
echo "========================================"

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
    pnpm tauri init --app-name "$PROJECT_NAME" \
                    --window-title "$PROJECT_NAME" \
                    --dev-url "http://localhost:5173" \
                    --before-dev-command "pnpm dev" \
                    --before-build-command "pnpm build"
fi

# 清理旧构建
echo ""
echo "🧹 清理旧构建..."
rm -rf src-tauri/target/release/bundle 2>/dev/null || true

# 构建 macOS 应用
echo ""
echo "🔨 构建 macOS 应用..."
if [ "$1" == "--release" ]; then
    pnpm tauri build
else
    pnpm tauri build --debug
fi

# 检查构建结果
echo ""
echo "📊 检查构建结果..."

BUNDLE_DIR="src-tauri/target/release/bundle"

if [ -d "$BUNDLE_DIR/dmg" ]; then
    echo "✅ macOS 构建成功！"
    echo ""
    echo "📦 构建产物:"
    echo "  DMG 安装包:"
    ls -lh "$BUNDLE_DIR/dmg/"*.dmg 2>/dev/null || echo "    (无 DMG)"
    echo ""
    echo "  macOS 应用:"
    ls -lhd "$BUNDLE_DIR/macos/"*.app 2>/dev/null || echo "    (无 .app)"
    echo ""
    echo "📁 完整路径:"
    echo "  $(pwd)/$BUNDLE_DIR/dmg/"
    echo "  $(pwd)/$BUNDLE_DIR/macos/"
else
    echo "❌ 构建失败"
    exit 1
fi

echo ""
echo "🎉 构建完成！"
