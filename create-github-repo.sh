#!/bin/bash

# 创建 GitHub 仓库并推送代码
# 用户名: ldcyes
# 仓库名: markdown-pro

set -e

echo "🚀 Markdown Pro - GitHub 仓库创建"
echo "=================================="
echo ""

# 检查是否有 gh CLI
if command -v gh &> /dev/null; then
    echo "✅ 检测到 GitHub CLI"
    echo ""

    # 检查是否已登录
    if gh auth status &> /dev/null; then
        echo "✅ GitHub CLI 已登录"
        echo ""

        # 创建仓库
        echo "📦 创建 GitHub 仓库..."
        gh repo create markdown-pro \
            --public \
            --description "Typora-style Markdown editor with multi-platform support (Web/Windows/Android/macOS/iOS)" \
            --source=. \
            --push \
            --remote=origin

        echo ""
        echo "✅ 仓库创建成功！"
        echo ""

        # 创建标签触发 CI/CD
        echo "🏷️  创建标签触发自动构建..."
        git tag v0.1.0
        git push --tags

        echo ""
        echo "🎉 完成！"
        echo ""
        echo "📋 仓库地址: https://github.com/ldcyes/markdown-pro"
        echo "📊 Actions: https://github.com/ldcyes/markdown-pro/actions"
        echo ""
        echo "⏱️  GitHub Actions 正在构建..."
        echo "预计 15 分钟后完成所有平台构建"
    else
        echo "⚠️  GitHub CLI 未登录"
        echo ""
        echo "请先登录："
        echo "  gh auth login"
        echo ""
        echo "然后重新运行此脚本"
    fi
else
    echo "❌ GitHub CLI 未安装"
    echo ""
    echo "请按照以下步骤手动创建："
    echo ""
    echo "1️⃣  在浏览器中创建仓库："
    echo "   https://github.com/new"
    echo ""
    echo "2️⃣  填写信息："
    echo "   Repository name: markdown-pro"
    echo "   Description: Typora-style Markdown editor with multi-platform support"
    echo "   选择: Public"
    echo "   ❌ 不要勾选 'Add a README file'"
    echo "   ❌ 不要勾选 'Add .gitignore'"
    echo "   ❌ 不要勾选 'Choose a license'"
    echo ""
    echo "3️⃣  点击 'Create repository'"
    echo ""
    echo "4️⃣  然后运行以下命令推送代码："
    echo ""
    echo "   cd /home/ldcyes/Projects/markdown-pro"
    echo "   git remote add origin https://github.com/ldcyes/markdown-pro.git"
    echo "   git push -u origin master"
    echo "   git tag v0.1.0"
    echo "   git push --tags"
    echo ""
    echo "5️⃣  查看 Actions 自动构建："
    echo "   https://github.com/ldcyes/markdown-pro/actions"
fi
