# PDF 工具箱网站 — 实施计划

## 背景

开发一个 PDF 在线工具站，后续收费运营。核心功能：PDF 转 Word、合并 PDF、压缩 PDF，免费增值模式。

## 关键架构决策

**Vercel 的 Serverless Function 请求体限制 4.5MB（所有套餐），与付费用户 100MB 需求矛盾。** 文件不能通过 Vercel API 路由处理。

方案：**Next.js 全栈部署在 Railway**，不用 Vercel。

| | Vercel + 独立后端 | Railway 全栈 |
|---|---|---|
| 文件大小限制 | 无（后端单独处理） | 无 |
| 部署复杂度 | 两个服务，两个域名 | 一个服务 |
| 代码库 | 前后端分离 | 单个 Next.js 项目 |
| 成本 | Vercel 免费 + Railway $5/月 | Railway $5/月起 |
| PDF 处理 | Python FastAPI（pdf2docx 等） | Node.js 库或调用外部 API |

放弃 Vercel 的理由：反正要额外部署 PDF 处理服务，不如整个放 Railway，还少一个服务。

备选：如果坚持 Vercel，就 Vercel（前端/Auth/Payment）+ Railway（PDF 处理 Python 后端），两服务 CORS 通信。

## 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | Next.js 14 (App Router) | SSR + API Routes 一体 |
| 语言 | TypeScript | 类型安全 |
| 样式 | Tailwind CSS + shadcn/ui | 快速出 UI |
| 图标 | lucide-react | 轻量，和 shadcn/ui 同源 |
| 数据库 | PostgreSQL (Railway 内置) | 用户、用量、支付 |
| ORM | Prisma | TypeScript 生态首选 |
| 认证 | NextAuth.js v5 (Auth.js) | 支持 Google/GitHub/邮箱登录 |
| 支付 | Stripe | SaaS 订阅标准方案 |
| PDF 处理 | pdf-lib（合并/元数据） + Ghostscript（压缩） | Node.js 生态可用 |
| PDF 转 Word | LibreOffice headless（MVP），通过接口抽象预留 CloudConvert 切换 | Dockerfile 装 LibreOffice |
| 文件存储 | Cloudflare R2（S3 兼容） | egress 免费，成本极低 |
| 部署 | Railway | 支持 Docker，无文件大小限制 |
| 域名 | 自购域名绑定 Railway | |

### 决策 1：PDF 转 Word — MVP 用 LibreOffice，代码预留切换口

LibreOffice headless 转换，Dockerfile 里装。代码层面 `lib/pdf/convert.ts` 只暴露一个 `convertPdfToWord(inputPath, options)` 函数，内部实现可切换。上线后如果质量投诉率高，切 CloudConvert API。

```typescript
interface PdfConverter {
  convert(inputPath: string, outputPath: string, options?: ConvertOptions): Promise<void>;
}
class LibreOfficeConverter implements PdfConverter { /* ... */ }
class CloudConvertConverter implements PdfConverter { /* ... */ }
// 通过环境变量 PDF_CONVERTER=libreoffice|cloudconvert 切换
```

### 决策 2：Pro 差异化价值

除了"文件≤100MB"和"无限次数"，Pro 增加：批量处理（一次10个）、OCR 扫描件支持、更高压缩率选项、优先处理队列。用户不是"被限制逼着付费"，而是"为增值功能付费"。

### 决策 3：文件存储用 Cloudflare R2

不用本地 /tmp。R2 的 S3 兼容 API + egress 免费，容器重启不丢文件，1 小时后自动过期。

## 项目结构

```
pdfwork/
├── .claude/
├── .env.local / .env.example
├── next.config.ts / tailwind.config.ts / tsconfig.json
├── package.json
├── prisma/
│   └── schema.prisma
├── public/
├── src/
│   ├── app/
│   │   ├── layout.tsx / page.tsx
│   │   ├── pricing/page.tsx
│   │   ├── auth/login/page.tsx / register/page.tsx
│   │   ├── tools/pdf-to-word/page.tsx / merge-pdf/page.tsx / compress-pdf/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── upload/route.ts / convert/route.ts / merge/route.ts / compress/route.ts
│   │   │   ├── download/[id]/route.ts
│   │   │   └── stripe/webhook/route.ts
│   │   └── dashboard/page.tsx
│   ├── components/
│   │   ├── ui/        # shadcn/ui
│   │   ├── layout/    # Header, Footer, ThemeToggle
│   │   ├── home/      # ToolCard
│   │   ├── upload/    # DropZone, FileList, UploadProgress
│   │   ├── tools/     # ToolLayout, DownloadButton
│   │   └── pricing/   # PricingCard
│   ├── lib/
│   │   ├── auth.ts, db.ts, stripe.ts, r2.ts, rate-limit.ts
│   │   ├── pdf/
│   │   │   ├── types.ts, merge.ts, compress.ts
│   │   │   ├── convert-libreoffice.ts
│   │   │   └── convert-cloudconvert.ts
│   │   └── utils.ts
│   ├── hooks/
│   └── types/
└── Dockerfile
```

## 数据库模型

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  password      String?          // 邮箱登录用 bcrypt
  emailVerified DateTime?
  image         String?
  plan          Plan      @default(FREE)
  stripeCustomerId String?
  stripeSubscriptionId String?
  dailyUsage    Int       @default(0)
  lastUsageDate DateTime?
  totalUsage    Int       @default(0)
  createdAt     DateTime  @default(now())
  files         File[]
}

enum Plan { FREE  PRO }

model File {
  id        String   @id @default(cuid())
  name      String
  size      Int
  type      String      // "pdf-to-word" | "merge" | "compress"
  status    Status  @default(PENDING)
  resultUrl String?
  userId    String
  user      User    @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
  expiresAt DateTime  // 24小时后清理
}

enum Status { PENDING  PROCESSING  DONE  ERROR }
```

## 数据流

```
用户选择文件
  → 前端校验（数量、大小、类型）
  → 服务端生成 R2 预签名上传 URL
  → 前端直传 R2（绕过 Railway 带宽）
  → 回调 API 触发处理，传入 R2 key
  → 处理服务从 R2 读取 → 处理 → 结果写回 R2
  → 返回 R2 预签名下载 URL 给用户
  → 1 小时后 R2 生命周期自动清理
```

## 页面路由

| 路由 | 说明 | 需登录 |
|------|------|--------|
| `/` | 首页工具卡片 | 否 |
| `/pricing` | 定价对比 | 否 |
| `/auth/login` / `/auth/register` | 认证 | 否 |
| `/tools/pdf-to-word` / `/tools/merge-pdf` / `/tools/compress-pdf` | 工具页 | 是 |
| `/dashboard` | 用量管理 | 是 |

## 实施顺序

1. 项目脚手架（Next.js + 依赖 + Prisma + Dockerfile + R2 配置）
2. 认证系统（NextAuth.js + 登录注册 UI + 中间件）
3. 首页 + 布局（Header/Footer/主题切换/工具卡片/定价页）
4. 上传体系（R2 直传 + DropZone + 配额校验）
5. PDF 处理核心（合并/压缩/转换 + API 路由）
6. 工具页面（三个工具页完整交互）
7. 付费系统（Stripe + 额度检查 + Dashboard）
8. 部署（Railway + 环境变量）

## 验证方式

1. 本地 `npm run dev`，访问首页
2. 注册/登录流程
3. 上传 PDF，验证转换/合并/压缩
4. 免费用户超限验证
5. Stripe 测试模式支付流程
6. 移动端响应式 + 深色/浅色模式
7. Railway 部署全流程
