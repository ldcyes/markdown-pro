# Markdown Pro - Android & Windows 构建指南

## 📱 Android 构建

### 前置要求

#### 1. Java JDK 17+
```bash
# Ubuntu/Debian
sudo apt install openjdk-17-jdk

# 验证安装
java -version
```

#### 2. Android SDK

**方法 1: Android Studio（推荐）**
```bash
# 下载并安装 Android Studio
# https://developer.android.com/studio

# 设置环境变量
echo 'export ANDROID_HOME=$HOME/Android/Sdk' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools' >> ~/.bashrc
source ~/.bashrc
```

**方法 2: 命令行工具**
```bash
# 下载 Android SDK Command-line Tools
cd ~/Android/Sdk/cmdline-tools
wget https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip
unzip commandlinetools-linux-9477386_latest.zip

# 安装必要组件
sdkmanager "platforms;android-34" "build-tools;34.0.0" "ndk;25.2.9519653"
```

#### 3. Rust Android 目标
```bash
# 安装 Android 构建目标
rustup target add aarch64-linux-android      # ARM64
rustup target add armv7-linux-androideabi    # ARM32
rustup target add i686-linux-android         # x86
rustup target add x86_64-linux-android       # x86_64
```

### 构建步骤

```bash
cd /home/ldcyes/Projects/markdown-pro

# 1. 安装依赖
pnpm install

# 2. 初始化 Android 项目（首次）
pnpm tauri android init

# 3. 构建
pnpm tauri android build --release

# 或使用脚本
chmod +x build-android.sh
./build-android.sh
```

### 输出文件

```
src-tauri/gen/android/app/build/outputs/
├── apk/
│   ├── debug/
│   │   └── app-debug.apk           # 调试版 APK
│   └── release/
│       └── app-release.apk         # 发布版 APK
└── bundle/
    └── release/
        └── app-release.aab         # App Bundle (Google Play)
```

### 测试和安装

```bash
# 安装到连接的设备
adb install app-debug.apk

# 或使用模拟器
# 在 Android Studio 中启动模拟器，然后安装
```

---

## 🪟 Windows 构建

### 前置要求

#### 1. Rust Windows 目标
```bash
# 安装 Windows GNU 目标（在 Linux 上交叉编译）
rustup target add x86_64-pc-windows-gnu

# 或使用 MSVC 目标（在 Windows 上）
rustup target add x86_64-pc-windows-msvc
```

#### 2. 交叉编译工具（Linux → Windows）
```bash
# Ubuntu/Debian
sudo apt install mingw-w64

# Arch Linux
sudo pacman -S mingw-w64-gcc
```

### 构建步骤

**在 Linux 上（交叉编译）：**
```bash
cd /home/ldcyes/Projects/markdown-pro

# 安装依赖
pnpm install

# 构建 Windows 版本
pnpm tauri build --target x86_64-pc-windows-gnu

# 或使用脚本
chmod +x build-windows.sh
./build-windows.sh
```

**在 Windows 上（原生构建）：**
```powershell
# 安装依赖
pnpm install

# 构建
pnpm tauri build
```

### 输出文件

```
src-tauri/target/x86_64-pc-windows-gnu/release/bundle/
├── msi/
│   └── Markdown Pro_0.1.0_x64.msi   # MSI 安装包
└── nsis/
    └── Markdown Pro_0.1.0_x64-setup.exe  # NSIS 安装包
```

### 安装包类型

1. **MSI (Windows Installer)**
   - 标准的 Windows 安装包
   - 支持企业部署
   - 需要管理员权限

2. **NSIS (Nullsoft Scriptable Install System)**
   - 轻量级安装包
   - 更小的文件大小
   - 用户友好的安装向导

---

## 🚀 一键构建所有平台

```bash
# 使用全平台构建脚本
chmod +x build-all-platforms.sh
./build-all-platforms.sh
```

脚本会询问你要构建哪些平台，然后自动完成所有构建。

---

## 📊 构建时间估算

| 平台 | 首次构建 | 增量构建 | 文件大小 |
|------|----------|----------|----------|
| Windows (MSI) | ~8 分钟 | ~2 分钟 | ~50MB |
| Windows (NSIS) | ~8 分钟 | ~2 分钟 | ~45MB |
| Android (APK) | ~12 分钟 | ~3 分钟 | ~20MB |
| Android (AAB) | ~12 分钟 | ~3 分钟 | ~25MB |

---

## 🔧 故障排除

### Android 问题

#### 问题 1: ANDROID_HOME 未设置
```bash
# 解决方案
export ANDROID_HOME=$HOME/Android/Sdk
echo 'export ANDROID_HOME=$HOME/Android/Sdk' >> ~/.bashrc
```

#### 问题 2: NDK 未找到
```bash
# 安装 NDK
sdkmanager "ndk;25.2.9519653"

# 或在 Android Studio 中安装
# Tools → SDK Manager → SDK Tools → NDK
```

#### 问题 3: Gradle 构建失败
```bash
# 清理 Gradle 缓存
cd src-tauri/gen/android
./gradlew clean

# 重新构建
cd ../../..
pnpm tauri android build
```

### Windows 问题

#### 问题 1: 交叉编译失败
```bash
# 确保安装了 mingw-w64
sudo apt install mingw-w64

# 验证安装
x86_64-w64-mingw32-gcc --version
```

#### 问题 2: MSVC 目标（在 Windows 上）
```powershell
# 安装 Visual Studio Build Tools
# 下载: https://visualstudio.microsoft.com/downloads/

# 安装 MSVC 目标
rustup target add x86_64-pc-windows-msvc

# 构建
pnpm tauri build
```

---

## 📱 发布准备

### Google Play (Android)

1. **准备材料**
   - 应用签名密钥
   - 512x512 图标
   - 应用截图（多种设备）
   - 隐私政策 URL

2. **上传 AAB**
```bash
# 使用 Google Play Console 上传
# 或使用 bundletool
bundletool build-apks --bundle=app-release.aab --output=app.apks
```

### Windows Store

1. **准备材料**
   - Microsoft 开发者账户
   - 应用清单文件
   - 应用图标和截图

2. **打包和上传**
```bash
# 在 Windows 上使用 MSIX 打包
# 需要安装 Windows SDK
```

---

## 🎯 完整构建示例

```bash
# 1. 克隆项目
cd ~/Projects
git clone https://github.com/your-username/markdown-pro.git
cd markdown-pro

# 2. 安装依赖
pnpm install

# 3. 构建所有平台
./build-all-platforms.sh

# 按提示选择平台:
# - Windows: y
# - Android: y
# - macOS/iOS: 跳过（需要在 macOS 上）

# 4. 查看构建结果
ls -lh src-tauri/target/x86_64-pc-windows-gnu/release/bundle/msi/
ls -lh src-tauri/gen/android/app/build/outputs/apk/release/
```

---

## 🔄 CI/CD 自动构建

### GitHub Actions 完整配置

创建 `.github/workflows/build-all.yml`：

```yaml
name: Build All Platforms

on:
  push:
    tags:
      - 'v*'

jobs:
  build-windows:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 20
      
      - name: Install pnpm
        run: npm install -g pnpm
      
      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: x86_64-pc-windows-gnu
      
      - name: Install mingw-w64
        run: sudo apt install -y mingw-w64
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build Windows
        run: pnpm tauri build --target x86_64-pc-windows-gnu
      
      - name: Upload Windows artifacts
        uses: actions/upload-artifact@v3
        with:
          name: windows-build
          path: src-tauri/target/x86_64-pc-windows-gnu/release/bundle/

  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 20
      
      - name: Install pnpm
        run: npm install -g pnpm
      
      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          targets: aarch64-linux-android
      
      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '17'
      
      - name: Setup Android SDK
        uses: android-actions/setup-android@v2
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Init Android
        run: pnpm tauri android init
      
      - name: Build Android
        run: pnpm tauri android build --release
      
      - name: Upload Android artifacts
        uses: actions/upload-artifact@v3
        with:
          name: android-build
          path: src-tauri/gen/android/app/build/outputs/
```

---

## 📝 构建检查清单

### Android
- [ ] Java JDK 17+ 已安装
- [ ] Android SDK 已配置
- [ ] NDK 已安装
- [ ] ANDROID_HOME 环境变量已设置
- [ ] Rust Android 目标已安装
- [ ] APK/AAB 文件已生成

### Windows
- [ ] Rust Windows 目标已安装
- [ ] mingw-w64 已安装（Linux）
- [ ] 或 Visual Studio 已安装（Windows）
- [ ] MSI/NSIS 文件已生成

---

**现在你可以构建 Android 和 Windows 版本了！** 🎉
