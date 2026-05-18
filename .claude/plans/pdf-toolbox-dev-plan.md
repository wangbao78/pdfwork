# PDF 工具箱 — 开发实施计划

## 概述

基于需求文档和验收标准，按 4 个阶段开发。每阶段可独立验证，优先交付 MVP 核心流程。

## 阶段总览

| 阶段 | 目标 | 产出物 | 预计工作量 |
|------|------|--------|-----------|
| P0 — 基础设施 | 项目能跑，文件能上传下载 | Next.js 脚手架 + Railway 部署 + R2 可用 | 2-3h |
| P1 — MVP 核心 | 三个工具全部能处理能下载 | PDF 转 Word + 合并 + 压缩 | 5-8h |
| P2 — 用户体系 | 注册登录 + 权限 + 付费 | 认证 + 额度 + Stripe + Dashboard | 4-6h |
| P3 — 打磨上线 | 异常处理 + 埋点 + 界面完善 | 全部验收通过 | 3-4h |

---

## P0：基础设施（2-3h）

### P0.1 项目脚手架
- `npx create-next-app@latest pdfwork --typescript --tailwind --eslint --app --src-dir`
- 安装核心依赖：`@prisma/client prisma next-auth@beta stripe @stripe/stripe-js pdf-lib @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
- 安装 UI：shadcn/ui 初始化（button, card, dialog, progress, tabs 等组件）
- 创建 `.env.example`：DATABASE_URL / AUTH_SECRET / STRIPE_SECRET_KEY / R2_* / PDF_CONVERTER

### P0.2 数据库
- 创建 `prisma/schema.prisma`（User + File 模型）
- `npx prisma db push` 同步到 Railway PostgreSQL
- 创建 `src/lib/db.ts`（Prisma 单例）

### P0.3 R2 存储
- 创建 `src/lib/r2.ts`：
  - `getUploadUrl(key, expiresIn)` — 生成预签名上传 URL
  - `getDownloadUrl(key, expiresIn)` — 生成预签名下载 URL
  - `deleteFile(key)` — 删除文件
- Cloudflare R2 bucket 配置生命周期规则（1 小时自动过期）

### P0.4 Railway 部署
- 编写 `Dockerfile`：
  ```dockerfile
  FROM node:20-alpine
  RUN apk add --no-cache libreoffice ghostscript
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  RUN npx prisma generate
  RUN npm run build
  EXPOSE 3000
  CMD ["npm", "start"]
  ```
- Railway 项目创建 + GitHub 关联
- 环境变量配置确认

### P0 验收
- `npm run dev` 本地启动无报错
- Railway 部署返回 200
- R2 上传/下载可用（curl 测试）

---

## P1：MVP 核心功能（5-8h）

### P1.1 共享组件
- `src/components/shared/UploadZone.tsx` — 拖拽 + 点击上传，校验 MIME 和文件头
- `src/components/shared/ToolLayout.tsx` — 工具页统一布局（标题 + 上传区 + 操作区 + 说明）
- `src/components/shared/DownloadButton.tsx` — 下载按钮 + 重新下载逻辑

### P1.2 文件上传 API
- `/api/upload` — 生成 R2 预签名 URL，数据库创建 File 记录（PENDING 状态）
- 前端 `UploadZone` → 获取预签名 URL → 直传 R2 → 返回 fileId
- 校验：MIME type = application/pdf，文件头 %PDF

### P1.3 PDF 转 Word
- `src/lib/pdf/convert.ts` — PdfConverter 接口 + LibreOffice 实现
  - `exec('libreoffice --headless --convert-to docx input.pdf --outdir /tmp')`
  - 解析输出，检查结果文件大小（为 0 则可能是扫描件）
  - 上传结果到 R2，返回下载 URL
- `/api/convert/route.ts`：
  - 接收 fileId → 从 R2 下载 → LibreOffice 转换 → 结果上传 R2 → 返回下载 URL
- `src/app/tools/pdf-to-word/page.tsx`：
  - 上传 → 点击转换 → 等待 → 自动下载
- 页数上限：200 页（Free 50 页），超限拒绝

### P1.4 合并 PDF
- `src/lib/pdf/merge.ts` — pdf-lib 实现
  - `PDFDocument.load()` 逐个加载
  - `copyPages()` 复制页面到新文档
  - 按用户指定的顺序拼接
- `/api/merge/route.ts`：
  - 接收 fileId[] + order[] → 从 R2 下载各文件 → 合并 → 上传结果 R2
- `src/app/tools/merge-pdf/page.tsx`：
  - 多文件上传 → 拖拽排序（dnd-kit 或原生 HTML5 DnD）→ 点击合并 → 下载
- 最多 20 个文件，页数总上限 500 页

### P1.5 压缩 PDF
- `src/lib/pdf/compress.ts` — Ghostscript 实现
  - 标准：`gs -sDEVICE=pdfwrite -dPDFSETTINGS=/ebook`
  - 高压缩：`gs -sDEVICE=pdfwrite -dPDFSETTINGS=/screen`
  - 极限：`gs -sDEVICE=pdfwrite -dPDFSETTINGS=/screen -dCompressPages=true`
- `/api/compress/route.ts`：
  - 接收 fileId + level → 从 R2 下载 → Ghostscript 压缩 → 上传结果 R2
- `src/app/tools/compress-pdf/page.tsx`：
  - 上传 → 选压缩级别（标准/高/极限，极限 Pro 专享） → 压缩 → 显示前后大小对比 → 下载
- 压缩后检测：若结果体积 ≥ 原文件，返回原文件 + 提示"已优化无需压缩"

### P1.6 通用 API 模式
- 统一错误响应格式：`{ error: string, code: string }`
- 统一处理超时（60s）
- 文件处理完成后立即从 R2 删除源文件

### P1 验收
- 对照验收标准 F1-F4（三个功能正常处理）
- 对照验收标准 D1-D3, D5-D8（页面展示）
- 对照验收标准 I1-I8（交互流程）
- 对照验收标准 E1-E7（异常场景）

---

## P2：用户体系（4-6h）

### P2.1 认证系统
- `src/lib/auth.ts` — NextAuth.js v5 配置
  - 邮箱密码登录（Credentials Provider + bcrypt）
  - Google OAuth 登录
  - JWT session 策略
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/middleware.ts` — 保护 `/tools/*` 和 `/dashboard`，未登录跳转 `/auth/login`
- `src/app/auth/login/page.tsx` — 登录页
- `src/app/auth/register/page.tsx` — 注册页
- Header 登录状态显示（已登录显示头像 + 用量，未登录显示"登录"按钮）

### P2.2 额度系统
- `src/lib/rate-limit.ts`：
  - `checkQuota(userId, fileSize)` 返回 `{ allowed: boolean, reason?: string }`
  - Free：日 3 次，≤5MB，≤50 页
  - Pro：不限次，≤100MB，≤200 页
- 每次处理成功后 `dailyUsage +1`，跨天自动重置
- API 入口统一调用 `checkQuota`，不放行则返回 402/403

### P2.3 Stripe 支付
- Stripe Dashboard：创建 Pro 产品（$9.9/月）
- `src/lib/stripe.ts` — Stripe 客户端初始化
- `/api/stripe/checkout/route.ts` — 创建 Checkout Session，返回 URL
- `/api/stripe/webhook/route.ts` — 处理事件：
  - `checkout.session.completed` → 升级为 Pro，写入 stripeCustomerId
  - `customer.subscription.deleted` → 降级为 Free
  - `charge.refunded` → 降级为 Free
- `src/app/pricing/page.tsx` — 定价页（Free vs Pro 对比表）
- 定时任务：每小时对账（检查 Pro 用户 Stripe 订阅状态，自动修正）

### P2.4 Dashboard
- `src/app/dashboard/page.tsx`：
  - 当前套餐（Free/Pro）+ 到期时间（Pro 显示）
  - 今日已用次数 / 总限额
  - 累计处理文件数
  - Pro 用户显示管理订阅入口（Stripe Customer Portal）

### P2 验收
- 对照验收标准 F5-F12（免费/Pro 所有功能校验）
- 对照验收标准 D4（额度耗尽提示）
- Stripe 测试模式走通付费流程
- Stripe Webhook 测试：付钱→变 Pro，到期→变 Free
- Dashboard 数据准确

---

## P3：打磨上线（3-4h）

### P3.1 异常处理加固
- 所有 API 加 try-catch，统一返回格式
- 60s 超时统一拦截（对照 E1）
- 压缩反增检测（对照 E3）
- 文件过期检测（对照 E6）
- 网络断开/下载失败重试（对照 E4, I8）
- 加密 PDF 检测（对照 F11）
- 非 PDF 文件拦截（对照 F10）
- 关闭页面上传中确认框（对照 E5）

### P3.2 风控
- 单 IP 注册频率限制（每小时 3 个）
- 单用户处理频率限制（Free 5/min, Pro 20/min）
- 文件头 Magic Number 校验（%PDF）

### P3.3 界面打磨
- 首页工具卡片设计（三张卡 + 底部说明）
- 响应式（768px 断点，移动端上下布局）
- 深色/浅色模式（next-themes）
- 加载动画（处理中不可重复点击）
- 额度超限弹窗（含升级入口）

### P3.4 数据埋点
- 创建 `src/lib/analytics.ts`（事件上报封装）
- 在对应位置埋入 M1-M12（页面进入、上传、处理、完成、失败、付费转化）
- 上报到 Plausible 或自建（不依赖 GA，按你的 C 盘红线原则）
- 确认所有埋点不含文件名、文件内容、用户隐私

### P3.5 清理
- 移除开发调试日志
- `.env.example` 完善注释
- README 补充本地开发和部署说明
- 代码 Review 关键路径（转换、合并、压缩 + 付费 Webhook）

### P3 验收
- 全部 48 条验收标准通过
- `npm run build` 无报错
- Railway 部署后完整回归测试
- Stripe 测试模式全流程（注册→免费用 3 次→超额弹窗→升级 Pro→处理大文件→自动续费/到期降级）

---

## 依赖关系

```
P0 基础设施 ──→ P1 MVP 核心 ──→ P2 用户体系 ──→ P3 打磨上线
                    │                │                │
                    └── 可独立验证 ──┘                │
                    └── 处理功能无需  认证 ────────────┘
```

P1 和 P2 可并行开发：P1 的工具 API 先不加权限校验（默认允许），P2 开发完成后接入中间件即可。

---

## 关键文件清单

| 文件 | 阶段 | 说明 |
|------|------|------|
| `Dockerfile` | P0 | Railway 部署，含 LibreOffice + Ghostscript |
| `prisma/schema.prisma` | P0 | 数据库模型 |
| `src/lib/r2.ts` | P0 | R2 客户端 |
| `src/lib/db.ts` | P0 | Prisma 单例 |
| `src/lib/pdf/convert.ts` | P1 | PDF 转 Word（含接口抽象） |
| `src/lib/pdf/merge.ts` | P1 | PDF 合并 |
| `src/lib/pdf/compress.ts` | P1 | PDF 压缩 |
| `src/app/api/upload/route.ts` | P1 | 上传 API |
| `src/app/api/convert/route.ts` | P1 | 转换 API |
| `src/app/api/merge/route.ts` | P1 | 合并 API |
| `src/app/api/compress/route.ts` | P1 | 压缩 API |
| `src/components/shared/UploadZone.tsx` | P1 | 上传组件 |
| `src/components/shared/ToolLayout.tsx` | P1 | 工具页布局 |
| `src/app/page.tsx` | P1 | 首页 |
| `src/lib/auth.ts` | P2 | NextAuth 配置 |
| `src/middleware.ts` | P2 | 路由保护 |
| `src/lib/rate-limit.ts` | P2 | 额度检查 |
| `src/lib/stripe.ts` | P2 | Stripe 客户端 |
| `src/app/api/stripe/webhook/route.ts` | P2 | Stripe Webhook |
| `src/app/dashboard/page.tsx` | P2 | 用户面板 |
| `src/lib/analytics.ts` | P3 | 埋点 |

---

## 环境变量清单

```bash
DATABASE_URL=           # Railway PostgreSQL 连接串
AUTH_SECRET=            # NextAuth 密钥 (openssl rand -base64 32)
AUTH_GOOGLE_ID=         # Google OAuth Client ID
AUTH_GOOGLE_SECRET=     # Google OAuth Client Secret
STRIPE_SECRET_KEY=      # Stripe Secret Key
STRIPE_WEBHOOK_SECRET=  # Stripe Webhook 签名密钥
STRIPE_PRICE_ID=        # Pro 订阅 Price ID
R2_ACCOUNT_ID=          # Cloudflare Account ID
R2_ACCESS_KEY=          # R2 Access Key
R2_SECRET_KEY=          # R2 Secret Key
R2_BUCKET=              # R2 Bucket 名称
R2_ENDPOINT=            # R2 Endpoint URL
PDF_CONVERTER=          # libreoffice | cloudconvert（默认 libreoffice）
```
