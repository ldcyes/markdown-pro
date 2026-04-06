# Markdown Pro - 快速构建指南

## 🚀 当前状态

### ✅ 已就绪
- **Web 版本**: ✅ 构建完成 (620KB)
- **测试**: ✅ 32/32 通过

### ⏳ 需要安装
- **Windows**: 需要 mingw-w64 + Rust
- **Android**: 需要 Android SDK + Rust
- **macOS/iOS**: 需要 macOS + Xcode

---

## 🔧 安装构建工具

### 方式 1: 自动安装（推荐）

```bash
cd /home/ldcyes/Projects/markdown-pro
chmod +x install-build-tools.sh
./install-build-tools.sh
```

这个脚本会安装：
- mingw-w64（Windows 交叉编译）
- Rust（桌面和移动应用核心）
- 所有必需的 Rust 目标

**需要**: sudo 密码

---

### 方式 2: 手动安装

#### 1. mingw-w64 (Windows 构建)
```bash
sudo apt update
sudo apt install mingw-w64
```

#### 2. Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

#### 3. Rust 目标
```bash
# Windows
rustup target add x86_64-pc-windows-gnu

# Android
rustup target add aarch64-linux-android
rustup target add armv7-linux-androideabi
```

#### 4. Android SDK（可选）
```bash
# 下载 Android Studio
# https://developer.android.com/studio

# 设置环境变量
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
```

---

## 📦 构建命令

### Web（立即可用）
```bash
cd /home/ldcyes/Projects/markdown-pro

# 开发模式
npx vite

# 生产构建
npx vite build
```

### Windows（安装 mingw + Rust 后）
```bash
./build-windows.sh
# 输出: src-tauri/target/x86_64-pc-windows-gnu/release/bundle/
```

### Android（安装 Android SDK 后）
```bash
./build-android.sh
# 输出: src-tauri/gen/android/app/build/outputs/
```

### 全平台
```bash
./build-all-platforms.sh
```

---

## ⏱️ 安装时间估算

| 组件 | 下载大小 | 安装时间 |
|------|---------|---------|
| mingw-w64 | ~200MB | ~3 分钟 |
| Rust | ~500MB | ~5 分钟 |
| Rust 目标 | ~100MB | ~2 分钟 |
| Android SDK | ~1GB | ~10 分钟 |
| **总计** | ~1.8GB | ~20 分钟 |

---

## 🎯 快速测试

### 1. Web 版本（现在）
```bash
# 查看构建产物
ls -lh dist/

# 启动预览
npx vite preview --port 5173
```

### 2. 安装后测试
```bash
# 运行安装脚本
./install-build-tools.sh

# 重新加载环境
source ~/.cargo/env

# 测试构建
./build-windows.sh
```

---

## 📞 需要帮助？

如果遇到问题：

1. **mingw 安装失败**: 确保有 sudo 权限
2. **Rust 安装卡住**: 检查网络连接
3. **Android SDK**: 使用 Android Studio 安装最简单

---

## ✅ 完整流程

```bash
# 1. 进入项目
cd /home/ldcyes/Projects/markdown-pro

# 2. 安装构建工具
chmod +x install-build-tools.sh
./install-build-tools.sh

# 3. 重新加载环境
source ~/.cargo/env

# 4. 构建
./build-all-platforms.sh

# 5. 查看结果
ls -lh src-tauri/target/*/release/bundle/
```

---

**准备好了吗？运行 `./install-build-tools.sh` 开始安装！** 🚀
