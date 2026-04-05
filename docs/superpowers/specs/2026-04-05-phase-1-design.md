# MarkdownPro Phase 1 Design

## Goal

在 Phase 0 的 React + TypeScript + ProseMirror 编辑器基础上，补齐 Markdown 文件编辑器最小闭环：

- Markdown 与 ProseMirror 双向转换
- 本地打开、下载保存、自动保存
- 工具栏操作
- 文档大纲导航
- 亮色/暗色主题

## Architecture

采用“纯逻辑模块 + React 外壳 + ProseMirror View”的分层方式：

- `src/editor/markdown-parser.ts` 负责 Markdown 解析、序列化和大纲提取，保持尽量纯函数，方便 Node 单元测试
- `src/utils/fileSystem.ts` 负责文件打开、下载和本地草稿存储，浏览器 API 与可测试辅助函数分离
- `src/editor/Editor.tsx` 负责 ProseMirror View 生命周期、事务同步、工具栏命令执行和大纲跳转
- `src/App.tsx` 负责页面框架和主题持久化

## Decisions

1. Markdown 解析直接基于 `markdown-it` token 流构造 ProseMirror 节点，避免依赖浏览器 DOM，便于测试和后续扩展。
2. 自动保存使用 `localStorage` 持久化 Markdown 源文本和文件名，打开文件后继续沿用当前文档状态。
3. 工具栏图标使用 `lucide-react`，命令直接调用 ProseMirror command，避免额外状态层。
4. 大纲由当前文档节点树实时提取，点击后通过编辑器位置信息滚动并聚焦对应标题。
5. 主题基于 TailwindCSS + `document.documentElement` 类名切换实现，同时保留少量编辑器内容样式。
