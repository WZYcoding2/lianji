#!/bin/sh
# 构建并发布到 GitHub Pages（gh-pages 分支）：npm run deploy
set -e
cd "$(dirname "$0")/.."

REMOTE=$(git remote get-url origin)
NAME=$(git config user.name)
EMAIL=$(git config user.email)

npm run build
cd dist
touch .nojekyll
rm -rf .git
git init -q -b gh-pages
git add -A
git -c user.name="$NAME" -c user.email="$EMAIL" commit -q -m "发布 $(date '+%Y-%m-%d %H:%M')"
git push -q -f "$REMOTE" gh-pages
rm -rf .git
echo "已发布，1~2 分钟后生效"
