#!/bin/bash

# Markdown Pro - 环境安装脚本
# 用于安装 Windows 和 Android 构建所需的依赖

set -e

echo "🔨 Markdown Pro - 构建环境安装"
echo "=================================="
echo ""

# 1. 安装 mingw-w64 (Windows 交叉编译)
echo "📦 1. 安装 mingw-w64 (Windows 交叉编译工具)..."
echo "   这需要 sudo 权限，请输入密码"
echo ""

if ! command -v x86_64-w64-mingw32-gcc &> /dev/null; then
    sudo apt update
    sudo apt install -y mingw-w64
    echo "✅ mingw-w64 安装完成"
else
    echo "✅ mingw-w64 已安装"
fi

# 2. 安装 Rust
echo ""
echo "📦 2. 安装 Rust..."

if ! command -v rustc &> /dev/null; then
    echo "   下载并安装 Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    
    # 加载 Rust 环境
    source ~/.cargo/env
    
    echo "✅ Rust 安装完成"
else
    echo "✅ Rust 已安装: $(rustc --version)"
fi

# 3. 安装 Rust 目标
echo ""
echo "📦 3. 安装 Rust 构建目标..."

rustup target add x86_64-pc-windows-gnu
echo "✅ Windows 目标已添加"

rustup target add aarch64-linux-android
rustup target add armv7-linux-androideabi
rustup target add i686-linux-android
rustup target add x86_64-linux-android
echo "✅ Android 目标已添加"

# 4. 验证安装
echo ""
echo "📊 安装验证:"
echo "=================================="
echo ""
echo "✅ mingw-w64:"
x86_64-w64-mingw32-gcc --version | head -1

echo ""
echo "✅ Rust:"
rustc --version
cargo --version

echo ""
echo "✅ Rust 目标:"
rustup target list --installed

echo ""
echo "🎉 安装完成！"
echo ""
echo "📝 下一步:"
echo "  1. 构建 Windows: ./build-windows.sh"
echo "  2. 构建 Android: ./build-android.sh (需要 Android SDK)"
echo "  3. 构建所有平台: ./build-all-platforms.sh"
