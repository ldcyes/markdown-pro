#!/bin/bash

# Markdown Pro - 完整构建脚本
# 使用方法: ./build-all.sh

set -e

PROJECT_NAME="Markdown Pro"
VERSION="0.1.0"

echo "🔨 $PROJECT_NAME v$VERSION - 完整构建"
echo "========================================"
echo ""

# 检查依赖
echo "🔍 检查所有构建依赖..."

MISSING_DEPS=0

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm 未安装"
    MISSING_DEPS=1
fi

if ! command -v cargo &> /dev/null; then
    echo "❌ Rust 未安装"
    MISSING_DEPS=1
fi

if [ $MISSING_DEPS -eq 1 ]; then
    echo ""
    echo "请先安装缺失的依赖"
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

# 构建 Web 版本
echo ""
echo "🌐 构建 Web 版本..."
pnpm run build

echo ""
echo "✅ Web 构建完成: dist/"

# 初始化 Tauri（如果需要）
if [ ! -d "src-tauri" ]; then
    echo ""
    echo "⚙️  初始化 Tauri..."
    pnpm add -D @tauri-apps/cli@next @tauri-apps/api@next
    pnpm tauri init
fi

# 构建 macOS 版本
echo ""
read -p "🍎 是否构建 macOS 版本? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔨 构建 macOS 版本..."
    pnpm tauri build
    
    if [ -d "src-tauri/target/release/bundle/dmg" ]; then
        echo "✅ macOS 构建完成"
        ls -lh src-tauri/target/release/bundle/dmg/*.dmg 2>/dev/null
    fi
fi

# 构建 iOS 版本
echo ""
read -p "📱 是否构建 iOS 版本? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if ! command -v xcodebuild &> /dev/null; then
        echo "⚠️  Xcode 未安装，跳过 iOS 构建"
    else
        echo "🔨 构建 iOS 版本..."
        
        # 安装 iOS 目标
        rustup target add aarch64-apple-ios 2>/dev/null || true
        rustup target add aarch64-apple-ios-sim 2>/dev/null || true
        
        pnpm tauri ios build --release
        
        if [ -d "src-tauri/target/aarch64-apple-ios/release" ]; then
            echo "✅ iOS 构建完成"
            ls -lh src-tauri/target/aarch64-apple-ios/release/*.ipa 2>/dev/null
        fi
    fi
fi

# 总结
echo ""
echo "========================================"
echo "🎉 所有构建完成！"
echo ""
echo "📦 构建产物:"
echo "  Web:      $(pwd)/dist/"
echo "  macOS:    $(pwd)/src-tauri/target/release/bundle/"
echo "  iOS:      $(pwd)/src-tauri/target/aarch64-apple-ios/release/"
echo ""
echo "📊 构建统计:"
echo "  - Web: $(ls -1 dist/*.html 2>/dev/null | wc -l) HTML 文件"
echo "  - Assets: $(du -sh dist/ | cut -f1)"
echo ""
