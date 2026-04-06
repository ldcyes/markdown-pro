#!/bin/bash

# Markdown Pro - 全平台构建脚本
# 使用方法: ./build-all-platforms.sh

set -e

PROJECT_NAME="Markdown Pro"
VERSION="0.1.0"

echo "🔨 $PROJECT_NAME v$VERSION - 全平台构建"
echo "================================================"
echo ""

# 检查基础依赖
echo "🔍 检查基础依赖..."

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm 未安装"
    exit 1
fi

if ! command -v cargo &> /dev/null; then
    echo "❌ Rust 未安装"
    exit 1
fi

echo "✅ 基础依赖检查通过"

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
echo "✅ Web 构建完成: dist/"

# 初始化 Tauri（如果需要）
if [ ! -d "src-tauri" ]; then
    echo ""
    echo "⚙️  初始化 Tauri..."
    pnpm add -D @tauri-apps/cli@next @tauri-apps/api@next
    pnpm tauri init
fi

# 构建配置
BUILD_WEB=true
BUILD_WINDOWS=false
BUILD_ANDROID=false
BUILD_MACOS=false
BUILD_IOS=false

# 询问要构建的平台
echo ""
echo "选择要构建的平台:"
read -p "  构建 Windows 版本? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    BUILD_WINDOWS=true
    rustup target add x86_64-pc-windows-gnu 2>/dev/null || true
fi

read -p "  构建 Android 版本? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    BUILD_ANDROID=true
    
    # 检查 Android SDK
    if [ -z "$ANDROID_HOME" ] && [ -d "$HOME/Android/Sdk" ]; then
        export ANDROID_HOME="$HOME/Android/Sdk"
    fi
    
    if [ -n "$ANDROID_HOME" ]; then
        rustup target add aarch64-linux-android 2>/dev/null || true
        rustup target add armv7-linux-androideabi 2>/dev/null || true
    else
        echo "⚠️  跳过 Android 构建（未找到 Android SDK）"
        BUILD_ANDROID=false
    fi
fi

# macOS 和 iOS 需要在 macOS 上构建
if [[ "$OSTYPE" == "darwin"* ]]; then
    read -p "  构建 macOS 版本? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        BUILD_MACOS=true
    fi
    
    read -p "  构建 iOS 版本? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        BUILD_IOS=true
        rustup target add aarch64-apple-ios 2>/dev/null || true
        rustup target add aarch64-apple-ios-sim 2>/dev/null || true
    fi
else
    echo "  ℹ️  macOS 和 iOS 构建需要在 macOS 系统上进行"
fi

# 开始构建
echo ""
echo "🚀 开始构建..."
echo "================================================"

# Windows 构建
if [ "$BUILD_WINDOWS" = true ]; then
    echo ""
    echo "🖥️  构建 Windows 版本..."
    pnpm tauri build --target x86_64-pc-windows-gnu
    
    if [ -d "src-tauri/target/x86_64-pc-windows-gnu/release/bundle" ]; then
        echo "✅ Windows 构建完成"
        ls -lh src-tauri/target/x86_64-pc-windows-gnu/release/bundle/msi/*.msi 2>/dev/null || true
        ls -lh src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/*.exe 2>/dev/null || true
    else
        echo "❌ Windows 构建失败"
    fi
fi

# Android 构建
if [ "$BUILD_ANDROID" = true ]; then
    echo ""
    echo "📱 构建 Android 版本..."
    
    # 初始化 Android 项目（首次）
    if [ ! -d "src-tauri/gen/android" ]; then
        pnpm tauri android init
    fi
    
    pnpm tauri android build --release
    
    if [ -d "src-tauri/gen/android/app/build/outputs" ]; then
        echo "✅ Android 构建完成"
        find src-tauri/gen/android/app/build/outputs -name "*.apk" -exec ls -lh {} \; 2>/dev/null || true
    else
        echo "❌ Android 构建失败"
    fi
fi

# macOS 构建
if [ "$BUILD_MACOS" = true ]; then
    echo ""
    echo "🍎 构建 macOS 版本..."
    pnpm tauri build
    
    if [ -d "src-tauri/target/release/bundle" ]; then
        echo "✅ macOS 构建完成"
        ls -lh src-tauri/target/release/bundle/dmg/*.dmg 2>/dev/null || true
    else
        echo "❌ macOS 构建失败"
    fi
fi

# iOS 构建
if [ "$BUILD_IOS" = true ]; then
    echo ""
    echo "📱 构建 iOS 版本..."
    pnpm tauri ios build --release
    
    if [ -d "src-tauri/target/aarch64-apple-ios/release" ]; then
        echo "✅ iOS 构建完成"
        ls -lh src-tauri/target/aarch64-apple-ios/release/*.ipa 2>/dev/null || true
    else
        echo "❌ iOS 构建失败"
    fi
fi

# 总结
echo ""
echo "================================================"
echo "🎉 构建完成！"
echo ""
echo "📦 构建产物位置:"
echo "  Web:      $(pwd)/dist/"

if [ "$BUILD_WINDOWS" = true ]; then
    echo "  Windows:  $(pwd)/src-tauri/target/x86_64-pc-windows-gnu/release/bundle/"
fi

if [ "$BUILD_ANDROID" = true ]; then
    echo "  Android:  $(pwd)/src-tauri/gen/android/app/build/outputs/"
fi

if [ "$BUILD_MACOS" = true ]; then
    echo "  macOS:    $(pwd)/src-tauri/target/release/bundle/"
fi

if [ "$BUILD_IOS" = true ]; then
    echo "  iOS:      $(pwd)/src-tauri/target/aarch64-apple-ios/release/"
fi

echo ""
echo "📊 构建统计:"
echo "  - Web: $(du -sh dist/ | cut -f1)"

echo ""
