# CLAUDE.md — PDF 工具箱 (pdfwork)

## 项目概述

Next.js 16.2.6 (App Router + Turbopack) SaaS 网站，提供 18 个 PDF 在线工具。
部署在 Railway (sfo 区)，服务名 `api`，地址 `https://api-production-4963.up.railway.app`。

## 技术栈

- **前端**：React 19 + TypeScript + Tailwind CSS + shadcn/ui
- **后端**：Next.js API Routes + Prisma 7 + PostgreSQL
- **认证**：NextAuth.js v5 (Credentials + Google OAuth)，JWT session
- **PDF 处理**：Python 脚本（PyMuPDF、Tesseract、Ghostscript、LibreOffice、wkhtmltopdf）+ pdf-lib
- **Docker**：`node:22-slim` Debian，Dockerfile 安装所有依赖

## 环境与命令

```bash
# Node.js 路径
export PATH="/d/nodejs:$PATH"

# Bash CWD 默认 d:/vscode，操作 pdfwork 需先 cd
cd /d/vscode/pdfwork

# 构建（必须在 pdfwork 目录下执行）
npm run build
# 或完整命令：
cd /d/vscode/pdfwork && export PATH="/d/nodejs:$PATH" && npx next build

# Railway 部署
npx railway up --service api

# 查看 Railway 部署状态
npx railway deployment list --service api

# 查看 Railway 变量
npx railway variables --service api

# 设置 Railway 变量（设置后自动触发重部署）
npx railway variables set KEY=VALUE --service api
```

### 构建/部署注意事项

- **CWD**：bash 默认在 `d:/vscode`，所有命令必须先 `cd /d/vscode/pdfwork`
- **`.dockerignore`**：排除 node_modules / .next / .data / .git，否则 Railway 上传 4GB+ 触发 413
- **Dockerfile 构建顺序**：`prisma generate` 必须在 `npm run build` 之前（如果改了 schema），且要设 `DATABASE_URL=postgresql://dummy` 占位
- **改 Prisma schema** 后需本地 `npx prisma generate` 重新生成客户端
- **服务端动态页面**：DB 查询的 page 需要 `export const dynamic = "force-dynamic"`，否则构建时查 DB 会失败

## 功能清单（18 个工具）

### Free（11 个 + 压缩标准/高）
**转换**：PDF 转 Word、PDF 转 JPG、提取图片、图片转 PDF
**编辑**：合并、拆分、旋转、页面排序、PDF 页码、文字水印
**优化**：压缩 PDF（标准/高）

### Pro（7 个）— 每日每工具试用 1 次
Office 转 PDF、HTML 转 PDF、OCR 识别、图片水印、加密/解锁、批量处理、压缩极限

## 权限限额系统

| | 游客 | Free 登录 | Pro |
|------|------|------|------|
| 每日次数 | 3 | 5 | 不限 |
| 文件大小 | ≤10MB | ≤10MB | ≤100MB |
| 页数 | ≤20 页 | ≤30 页 | ≤200 页 |
| Pro 工具 | 每日每工具试用 1 次 | 同游客 | 不限 |

- **开关**：环境变量 `ENABLE_QUOTA=true` 启用，false 跳过所有检查
- **存储**：PostgreSQL 优先（`GuestUsage`/`ProTrial`/`User.dailyUsage`），JSON 文件兜底
- **前端**：API 返回 403 + `trial: true` 时显示 `UpgradePrompt`，不是提前拦截
- **核心文件**：`src/lib/access.ts`（后端）、`src/components/shared/UpgradePrompt.tsx`（前端）

## 架构要点

- **上传**：`/api/upload` → `.data/uploads/{fileId}`，r2Key 格式 `uploads/{fileId}/{filename}`
- **下载**：`/api/download?file={path}`，结果存 `.data/results/`
- **清理**：`src/lib/cleanup.ts` 每次 API 调用时清理 1 小时前的文件
- **数据库**：Prisma `prisma.config.ts` 配置 datasource URL，schema 在 `prisma/schema.prisma`
- **Dockerfile** 入口：`prisma generate → prisma db push → npm start`
- **环境变量**：`.env` 本地开发，Railway 上通过 `railway variables` 管理
