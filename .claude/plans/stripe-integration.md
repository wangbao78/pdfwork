# Stripe 支付集成方案

## 概述

订阅制付费：Free 免费，Pro ¥9.9/月。后端 Stripe API + Webhook 已完整，本方案聚焦前端接入。

## 现有后端（已完成，不动）

- `src/lib/stripe.ts`：`createCheckoutSession(userId, email)` → Stripe Checkout URL
- `/api/stripe/checkout`：POST，需登录，返回 `{ url }` 或 401/500
- `/api/stripe/webhook`：`checkout.session.completed` 升级 PRO，`customer.subscription.deleted` 降级 FREE
- User 表 `plan`、`stripeCustomerId`、`stripeSubscriptionId`

## 用户流程

### 1. 定价页 → 升级 Pro

```
Free 用户进入 /pricing
├─ 看到 Free / Pro 双栏对比，Pro 高亮 + "推荐"标签，¥9.9/月
├─ Free 栏按钮："当前套餐"（disabled，灰色）
├─ Pro 栏按钮："升级 Pro"（主色，可点击）
│
└─ 点击"升级 Pro"
   ├─ 未登录 → 跳到 /auth/login?callback=/pricing（登录后回到定价页）
   ├─ 已登录 Free → 按钮变 loading → POST /api/stripe/checkout
   │   ├─ 成功 → window.location.href = url（跳转 Stripe 付款页）
   │   └─ 失败 → toast "支付服务暂不可用，请稍后重试"
   └─ 已是 Pro → 按钮显示"当前套餐"（disabled）
```

### 2. 付款成功 → 回跳仪表盘

```
Stripe 付款完成 → 跳回 /dashboard?upgraded=true
└─ 仪表盘顶部显示绿色成功横幅
   ┌──────────────────────────────────────────┐
   │ ✓ 升级成功！你现在是 Pro 用户，全部 18   │
   │   个工具不限使用。            [✕]        │
   └──────────────────────────────────────────┘
   - 用户点 ✕ 关闭，横幅消失
   - 套餐卡片自动显示 Pro 权益
   - 使用统计自动切换为 Pro 模式
```

### 3. Pro 用户 → 管理订阅

```
Pro 用户进入 /dashboard
├─ 套餐卡片显示 Pro 权益
├─ 底部按钮："管理订阅"（outline 样式）
│
└─ 点击"管理订阅"
   ├─ loading → POST /api/stripe/portal
   │   ├─ 成功 → window.location.href = url（跳转 Stripe Customer Portal）
   │   │       在 Stripe 页面可：
   │   │       - 查看账单历史
   │   │       - 更新支付方式
   │   │       - 取消订阅（取消后 webhook 自动降级为 FREE）
   │   └─ 失败 → toast "操作失败，请稍后重试"
   └─ 按钮不置灰，不做权限判断（Pro 用户才有这个按钮）
```

### 4. 取消订阅 → 降级

```
用户在 Stripe Customer Portal 取消订阅
→ Stripe 回调 webhook customer.subscription.deleted
→ User.plan = "FREE", stripeSubscriptionId = null
→ 用户下次访问 /dashboard，套餐卡显示 Free + 升级按钮
→ 历史文件不丢失，但新操作受 Free 限额
```

## 定价页交互细节

### 状态对应

| 用户状态 | Free 栏按钮 | Pro 栏按钮 |
|---------|-----------|-----------|
| 未登录 | "当前套餐" disabled | "升级 Pro" → 跳登录 |
| 已登录 Free | "当前套餐" disabled | "升级 Pro" → 调 checkout |
| 已登录 Pro | — | "当前套餐" disabled |

- 两个按钮公用一个 loading 标记，避免重复点击
- loading 时按钮显示 spinner + "处理中..."

### Pricing 页改为客户端组件

当前 `pricing/page.tsx` 是服务端组件，无法用 `useSession` 和 `useState`。需要改为 `"use client"`，用 `useSession` 拿登录状态和 plan。

## 仪表盘交互细节

### 升级成功横幅

- 读取 URL search params `?upgraded=true`
- 显示条件：upgraded=true 且 user.plan === "PRO"
- 用户关闭横幅：客户端 state 控制，不写 URL
- 刷新页面：URL 参数还在则重新显示，用户再次关闭

### 管理订阅按钮

- 替换当前 disabled 占位按钮
- 点击 → POST `/api/stripe/portal` → 跳转返回的 url
- 错误处理：按钮恢复，toast 提示（需要一个简单的 toast 或直接 setError）

## 新增/修改文件清单

| 文件 | 操作 | 内容 |
|------|------|------|
| `src/app/pricing/page.tsx` | 改 | 改为客户端组件；"升级 Pro" onClick 逻辑；登录状态判断 |
| `src/app/dashboard/page.tsx` | 改 | 读取 upgraded 参数显示横幅；管理订阅按钮接 portal API |
| `src/lib/stripe.ts` | 改 | 新增 `createPortalSession(userId, returnUrl)` |
| `src/app/api/stripe/portal/route.ts` | 新增 | POST，需登录，调用 createPortalSession，返回 `{ url }` |

### `createPortalSession` 实现

```typescript
export async function createPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<string | null> {
  const stripe = getStripe()
  if (!stripe) return null

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return portal.url
}
```

- 用 User 表的 `stripeCustomerId`，付款时 Stripe 写入的
- `returnUrl` 为 `/dashboard`，从 portal 回来继续管理
- 如果用户没人 `stripeCustomerId`（手动改库的 Pro 用户），portal API 返回错误提示

## 边界情况

| 场景 | 处理 |
|------|------|
| Stripe 密钥未配（本地开发） | checkout/portal API 返回 500，前端捕获后 toast "支付服务暂未配置" |
| 用户重复点击"升级 Pro" | loading 状态禁用按钮，防止重复请求 |
| 付款中途关闭页面 | 无影响，下次点可重新发起 |
| 已是 Pro 直接访问 checkout API | API 不过滤（可重复创建 session），前端按钮 disabled |
| 无 stripeCustomerId 的 Pro 用户点管理订阅 | portal API 返回 "未找到订阅信息，请联系客服" |
| Stripe webhook 延迟 | 付款后可能几秒才更新 plan，仪表盘查 DB 能拿到最新 plan（回跳时 DB 大概率已更新），万一没更新下次刷新即可 |
| 降级后 dailyUsage | 不变，继续按 FREE_DAILY=5 判断，超限即拦截 |

## 不在此范围

- 优惠券/折扣码
- 年付方案
- 发票/收据页面
- 支付方式管理（Stripe Customer Portal 自带）
- 邮件通知（Stripe 自带）
- 升级成功横幅的美化动画
