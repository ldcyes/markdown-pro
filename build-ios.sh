#!/bin/bash

# Markdown Pro - iOS 构建脚本
# 使用方法: ./build-ios.sh [--release]

set -e

PROJECT_NAME="Markdown Pro"
VERSION="0.1.0"

echo "🚀 开始构建 $PROJECT_NAME for iOS..."
echo "========================================"

# 检查依赖
echo "🔍 检查构建依赖..."

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm 未安装"
    exit 1
fi

if ! command -v cargo &> /dev/null; then
    echo "❌ Rust 未安装"
    exit 1
fi

if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Xcode 未安装"
    echo "请从 App Store 安装 Xcode"
    exit 1
fi

# 检查 iOS 目标
if ! rustup target list | grep -q "aarch64-apple-ios (installed)"; then
    echo "⚙️  安装 iOS 构建目标..."
    rustup target add aarch64-apple-ios
    rustup target add aarch64-apple-ios-sim
fi

echo "✅ 依赖检查通过"

# 安装项目依赖
echo ""
echo "📦 安装项目依赖..."
pnpm install

# 构建 Web 资源
echo ""
echo "🌐 构建 Web 资源..."
pnpm run build

# 清理旧构建
echo ""
echo "🧹 清理旧构建..."
rm -rf src-tauri/target/aarch64-apple-ios 2>/dev/null || true

# 构建 iOS 应用
echo ""
echo "🔨 构建 iOS 应用..."
if [ "$1" == "--release" ]; then
    pnpm tauri ios build --release
else
    pnpm tauri ios build --debug
fi

# 检查构建结果
echo ""
echo "📊 检查构建结果..."

if [ -d "src-tauri/target/aarch64-apple-ios/release" ]; then
    echo "✅ iOS 构建成功！"
    echo ""
    echo "📦 构建产物:"
    ls -lh src-tauri/target/aarch64-apple-ios/release/*.ipa 2>/dev/null || echo "  (未找到 IPA)"
    echo ""
    echo "📁 完整路径:"
    echo "  $(pwd)/src-tauri/target/aarch64-apple-ios/release/"
    echo ""
    echo "📝 下一步:"
    echo "  1. 使用 Transporter 上传到 App Store Connect"
    echo "  2. 或使用 Xcode 直接安装到设备"
else
    echo "❌ 构建失败"
    exit 1
fi

echo ""
echo "🎉 构建完成！"
