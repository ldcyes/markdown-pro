# Markdown Pro - macOS & iOS 快速构建指南

## 🚀 一键构建

### macOS 版本
```bash
cd /home/ldcyes/Projects/markdown-pro
chmod +x build-macos.sh
./build-macos.sh
```

### iOS 版本
```bash
chmod +x build-ios.sh
./build-ios.sh
```

### 全平台构建
```bash
chmod +x build-all.sh
./build-all.sh
```

---

## ⚠️ 重要提示

### macOS 构建必须在 macOS 系统上进行！

**原因：**
- Apple 不允许在非 macOS 系统上构建 macOS/iOS 应用
- 需要 Xcode 和 Apple 开发者工具
- 代码签名和公证需要 macOS 环境

**解决方案：**
1. 使用 macOS 物理机器
2. 使用 macOS 云服务（如 MacStadium、AWS EC2 Mac）
3. 使用 GitHub Actions + macOS runner

---

## 📦 当前已准备

✅ **Tauri 配置文件**（支持 macOS/iOS）
- `src-tauri/tauri.conf.json` - 应用配置
- `src-tauri/Cargo.toml` - Rust 依赖
- `src-tauri/src/main.rs` - 应用入口
- `src-tauri/entitlements.plist` - macOS 权限

✅ **构建脚本**
- `build-macos.sh` - macOS 构建脚本
- `build-ios.sh` - iOS 构建脚本
- `build-all.sh` - 全平台构建

✅ **详细文档**
- `MARKDOWN_PRO_MACOS_IOS_BUILD_GUIDE.md` - 完整构建指南

---

## 🔄 在 macOS 上构建步骤

### 1. 传输项目到 macOS

```bash
# 方法1: Git
cd ~/Projects
git clone https://github.com/your-username/markdown-pro.git

# 方法2: 直接复制
scp -r /home/ldcyes/Projects/markdown-pro user@mac-host:~/Projects/
```

### 2. 安装依赖

```bash
# 安装 Node.js
brew install node

# 安装 pnpm
npm install -g pnpm

# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安装 Xcode（从 App Store）
```

### 3. 构建

```bash
cd ~/Projects/markdown-pro
pnpm install
./build-all.sh
```

---

## 📊 构建产物

构建完成后会生成：

### macOS
- `Markdown Pro.app` - macOS 应用
- `Markdown Pro_0.1.0_aarch64.dmg` - Apple Silicon 安装包
- `Markdown Pro_0.1.0_x64.dmg` - Intel Mac 安装包

### iOS
- `Markdown Pro.ipa` - iOS 应用包
- 可上传到 App Store Connect

### Web
- `dist/` - Web 版本（可部署到任何服务器）

---

## 🚀 CI/CD 自动构建（推荐）

### GitHub Actions 配置

创建 `.github/workflows/build.yml`：

```yaml
name: Build

on:
  push:
    tags:
      - 'v*'

jobs:
  build-macos:
    runs-on: macos-latest
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
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build macOS
        run: pnpm tauri build
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: macos-build
          path: src-tauri/target/release/bundle/

  build-ios:
    runs-on: macos-latest
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
          targets: aarch64-apple-ios,aarch64-apple-ios-sim
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build iOS
        run: pnpm tauri ios build --release
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ios-build
          path: src-tauri/target/aarch64-apple-ios/release/
```

---

## 📞 需要帮助？

如果在 macOS 上构建时遇到问题：

1. 检查 Xcode 是否正确安装
2. 运行 `xcode-select --install`
3. 检查 Rust 目标: `rustup target list`
4. 查看 Tauri 日志: `pnpm tauri build --verbose`

---

**当前状态：**
- ✅ 项目代码完成
- ✅ Tauri 配置就绪
- ✅ 构建脚本准备完毕
- ⏳ 需要在 macOS 环境执行最终构建
