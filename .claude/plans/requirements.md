# PDF 工具箱需求文档

## 已实现（18 个工具）

### 转换（7）
- [x] PDF 转 Word（LibreOffice + pdf2docx）
- [x] PDF 转 JPG（PyMuPDF，200 DPI）
- [x] 提取图片（PyMuPDF）
- [x] 图片转 PDF（pdf-lib，JPG/PNG/WebP，最多 30 张）
- [x] Office 转 PDF（LibreOffice，Word/Excel/PPT）Pro
- [x] HTML 转 PDF（wkhtmltopdf，在线编辑 HTML）Pro
- [x] OCR 识别（Tesseract + chi_sim，扫描件转可编辑 Word）Pro

### 编辑（5）
- [x] 合并 PDF（pdf-lib）
- [x] 拆分 PDF（pdf-lib，页码范围选取）
- [x] 旋转 PDF（pdf-lib，90°/180°/270°）
- [x] 页面排序（pdf-lib，拖拽调序）
- [x] PDF 页码（PyMuPDF，6 种位置 + 字号调节）

### 优化与安全（5）
- [x] 压缩 PDF（Ghostscript，标准/高/极限，极限为 Pro）
- [x] PDF 加水印（PyMuPDF，文字水印 + 中文支持）
- [x] 图片水印（PyMuPDF，PNG 叠加 + 透明度/大小调节）Pro
- [x] 加密 / 解锁（Ghostscript，打开密码 + 解除保护）Pro
- [x] 批量处理（多文件统一操作，结果 ZIP 打包）Pro

### 免费 vs Pro 划分
| 类型 | 工具 |
|------|------|
| Free（11+2）| 转换 5 个（Word/JPG/图片提取/图片转PDF）+ 编辑 5 个 + 压缩标准/高 + 加水印 |
| Pro（7）| Office 转 PDF、HTML 转 PDF、OCR、图片水印、加密、批量、压缩极限 |

---

## 权限与限额系统 ✓

### 规则
| | 游客 | Free 登录 | Pro |
|------|------|------|------|
| 每日次数 | 3 次 | 5 次 | 不限 |
| 文件大小 | ≤10MB | ≤10MB | ≤100MB |
| 页数 | ≤20 页 | ≤30 页 | ≤200 页 |
| Pro 工具 | 每日每工具试用 1 次 | 每日每工具试用 1 次 | 不限 |
| 开关 | ENABLE_QUOTA=true | ENABLE_QUOTA=true | — |

### 实现
- 游客按 IP 计数，存 PostgreSQL `GuestUsage` 表（JSON 文件兜底）
- 登录 Free 存 `User.dailyUsage` 字段（JSON 文件兜底）
- Pro 工具试用存 PostgreSQL `ProTrial` 表（JSON 文件兜底）
- 前端 API 驱动：试用用完返回 403 + `trial: true`，前端显示 UpgradePrompt
- 部署重启不丢数据（DB 持久化）

---

## 待实现

### 功能
- [ ] PDF 标注（高亮、下划线、批注）
- [ ] PDF 签名（手写/图片签名放置）
- [ ] PDF 元数据编辑（标题、作者、关键词）
- [ ] PDF 对比（差异高亮）
- [ ] PDF 内容编辑（直接改文字）
- [ ] PDF 表单填写
- [ ] 优先处理队列

### 基础设施
- [ ] Stripe 支付接入（代码已有 `/api/stripe/*`，需配置密钥）
- [ ] Cloudflare R2 存储（代码已有，R2 密钥为空走本地模式）
- [ ] 移动端适配
- [ ] Railway 到期后迁移
- [ ] 首页 Pro 卡片点击跳定价页

### 可改进
- [ ] 定价页功能清单动态配置（当前硬编码）
- [ ] 用户后台看用量统计
- [ ] 文件下载过期清理（当前 1 小时定时清）
