#!/usr/bin/env bash
set -euo pipefail

echo "🔨 Building frontend..."
pnpm build

echo "📱 Building Android release..."
cd src-tauri
tauri android build --release

echo "✅ Android release build complete!"
