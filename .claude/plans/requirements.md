# PDF 工具箱需求文档

## 已实现（13 个）

**转换**
- [x] PDF 转 Word（LibreOffice + pdf2docx）
- [x] PDF 转 JPG（PyMuPDF，200 DPI）
- [x] 提取图片（PyMuPDF）
- [x] 图片转 PDF（pdf-lib，JPG/PNG/WebP）
- [x] Office 转 PDF（LibreOffice，Word/Excel/PPT）

**编辑**
- [x] 合并 PDF（pdf-lib）
- [x] 拆分 PDF（pdf-lib，范围选取）
- [x] 旋转 PDF（pdf-lib，90°/180°/270°）
- [x] 页面排序（pdf-lib，拖拽调序）

**优化与安全**
- [x] 压缩 PDF（Ghostscript，标准/高/极限）
- [x] PDF 加水印（PyMuPDF，文字水印）
- [x] 加密 / 解锁（Ghostscript，打开密码）

---

## 待实现

### 标记类
- [ ] PDF 页码（页眉页脚、自动页码）
- [ ] PDF 标注（高亮、下划线、批注）
- [ ] 图片水印

### 转换类
- [ ] HTML 转 PDF
- [ ] OCR 识别（Tesseract，扫描件 → 可编辑文字）

### 安全类
- [ ] PDF 签名（手写/图片签名放置）
- [ ] PDF 元数据编辑（标题、作者）

### 效率类
- [ ] 批量处理（多文件同时操作）
- [ ] 优先处理队列

### 高级
- [ ] PDF 对比（差异高亮）
- [ ] PDF 内容编辑（直接改文字）
- [ ] PDF 表单填写

---

## 基础设施

- [ ] Stripe 支付接入
- [ ] Cloudflare R2 存储
- [ ] Railway 到期后迁移
- [ ] 移动端适配

### 权限与限额控制

**前端**
- [ ] Pro 专享工具页面前端校验，Free 用户弹「升级 Pro」提示
- [ ] 首页 Pro 卡片点击跳定价页

**后端**
- [ ] API 路由校验 JWT plan 字段，Free 调 Pro 接口返回 403
- [ ] 方案：游客按 IP 每日 3 次，登录 Free 每日 5 次，Pro 不限
- [ ] 计数器模块，支持按 IP 和按用户统计
- [ ] 定价页功能清单可动态配置（哪个功能免费/收费）
