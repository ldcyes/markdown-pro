#!/bin/bash

# Markdown Pro - Android 构建脚本
# 使用方法: ./build-android.sh [--release]

set -e

PROJECT_NAME="Markdown Pro"
VERSION="0.1.0"

echo "🚀 开始构建 $PROJECT_NAME for Android..."
echo "=========================================="

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

if ! command -v java &> /dev/null; then
    echo "❌ Java 未安装"
    echo "请安装 JDK 17 或更高版本"
    exit 1
fi

# 检查 Android SDK
if [ -z "$ANDROID_HOME" ]; then
    echo "⚠️  ANDROID_HOME 未设置"
    echo "请安装 Android Studio 或 Android SDK"
    echo ""
    echo "安装方法:"
    echo "  1. 安装 Android Studio"
    echo "  2. 设置环境变量:"
    echo "     export ANDROID_HOME=\$HOME/Android/Sdk"
    echo "     export PATH=\$PATH:\$ANDROID_HOME/emulator:\$ANDROID_HOME/platform-tools"
    
    # 尝试自动检测
    if [ -d "$HOME/Android/Sdk" ]; then
        export ANDROID_HOME="$HOME/Android/Sdk"
        echo ""
        echo "✅ 检测到 Android SDK: $ANDROID_HOME"
    else
        exit 1
    fi
fi

# 检查 Android 目标
if ! rustup target list | grep -q "aarch64-linux-android (installed)"; then
    echo "⚙️  安装 Android 构建目标..."
    rustup target add aarch64-linux-android
    rustup target add armv7-linux-androideabi
    rustup target add i686-linux-android
    rustup target add x86_64-linux-android
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
rm -rf src-tauri/gen/android 2>/dev/null || true

# 初始化 Android 项目（首次）
if [ ! -d "src-tauri/gen/android" ]; then
    echo ""
    echo "⚙️  初始化 Android 项目..."
    pnpm tauri android init
fi

# 构建 Android 应用
echo ""
echo "🔨 构建 Android 应用..."

if [ "$1" == "--release" ]; then
    pnpm tauri android build --release
else
    pnpm tauri android build --debug
fi

# 检查构建结果
echo ""
echo "📊 检查构建结果..."

if [ -d "src-tauri/gen/android/app/build/outputs" ]; then
    echo "✅ Android 构建成功！"
    echo ""
    echo "📦 构建产物:"
    
    # APK
    if [ -d "src-tauri/gen/android/app/build/outputs/apk" ]; then
        echo "  APK 文件:"
        find src-tauri/gen/android/app/build/outputs/apk -name "*.apk" -exec ls -lh {} \;
    fi
    
    # AAB (App Bundle)
    if [ -d "src-tauri/gen/android/app/build/outputs/bundle" ]; then
        echo ""
        echo "  AAB 文件 (App Bundle):"
        find src-tauri/gen/android/app/build/outputs/bundle -name "*.aab" -exec ls -lh {} \;
    fi
    
    echo ""
    echo "📁 完整路径:"
    echo "  $(pwd)/src-tauri/gen/android/app/build/outputs/"
    echo ""
    echo "📝 下一步:"
    echo "  1. 使用 adb 安装到设备: adb install app-debug.apk"
    echo "  2. 上传到 Google Play: 使用 AAB 文件"
else
    echo "❌ 构建失败"
    exit 1
fi

echo ""
echo "🎉 构建完成！"
