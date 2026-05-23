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
