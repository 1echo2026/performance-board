# 业绩看板系统 (performance-board)

团队业绩看板 —— 四级架构（基地负责人 → 主管 → 组长 → 老师）逐级汇总、月度归档锁定、基地密钥隔离、全量操作审计。

## 功能清单

| 模块 | 说明 |
| --- | --- |
| 前台总览 | KPI 指标卡、分基地业绩柱状图、环形占比、主管/组长业绩 TOP |
| 姓名查询 | 模糊搜索、完整组织链路、团队业绩 |
| 组织架构 | 四级架构树、搜索过滤、节点详情 |
| 订单明细 | 分页、筛选、导出 |
| 基地密钥 | 前台密钥隔离（24h 记住）、总览无需密钥 |
| 管理后台 | 订单/架构/归档/密钥/日志/设置 六大模块 |
| 归档锁定 | 锁定月订单冻结、架构调整不影响锁定月归属 |
| 审计日志 | 所有写操作留痕、高危操作红色高亮、不可删除 |

## 快速开始

### 方式 1：本地单机演示（默认）

1. [Releases](https://github.com/1echo2026/performance-board/releases) 下载 ZIP 或 clone 仓库
2. 浏览器直接打开 `index.html`（或用 Python `python -m http.server` 起服务）
3. 初始数据：2 基地 / 4 主管 / 8 组长 / 24 老师 / 144 条订单
4. 前台：首页即总览；点"选择基地"输入密钥进入
5. 后台：浏览器地址栏加 `#/admin/login`；默认账号 `admin / admin123`

**本地模式下数据存本浏览器 localStorage，刷新不丢但多人不共享。**

### 方式 2：多人在线共享（Supabase）

1. 注册 [Supabase](https://supabase.com) 免费账号，新建 Project
2. SQL Editor 粘贴 `supabase/schema.sql` 执行（自动建表 + 触发器 + RLS + 种子）
3. 在 `index.html` 的 `<head>` 顶部追加：

```html
<script>
  window.APP_CONFIG = {
    supabaseUrl: 'https://xxxxxxxx.supabase.co',
    supabaseKey: 'your-anon-public-key'
  };
</script>
```

4. 推送到 GitHub 并开启 Pages（Settings → Pages → Source: main / /root）
5. 多人访问同一份数据，刷新即见最新

> 生产环境建议把前端 REST 调用改为带 Auth 的专用后端接口（本仓库 `store.js` 适配器已预留接口）。

## 核心业务规则

| 规则 | 实现 |
| --- | --- |
| 逐级汇总 | `engine.js` 自底向上聚合，校验：老师合计 = 组长 = 主管 = 基地负责人 |
| 跨月隔离 | 锁定月保存 `org_snapshots`，未锁定月用当前架构；计算时按月份匹配 |
| 姓名匹配 | 严格文字一致；导入时校验不在架构内的老师 → 失败明细 |
| 锁定月冻结 | `archives.locked = true` → 订单新增/编辑/删除控件置灰 + 触发器 DB 级校验 |
| 解锁高危 | 红色二次确认 + 日志 risk=true 红色高亮 |
| 基地密钥 | `base_keys` 表；`localStorage pb_v1_base_auth` 24h 记住 |
| 管理员鉴权 | 哈希存储；24h 会话；后台写接口全量鉴权；日志不可删 |

## 默认内置数据

- **组织**：基地A（负责人 王建国）+ 基地B（负责人 赵宏伟），各 1 负责人 → 2 主管 → 4 组长 → 12 老师
- **订单**：144 条，覆盖 2026-03 / 04 / 05，其中 **2026-03 已锁定**
- **基地密钥**：基地A → `baseA123`；基地B → `baseB123`
- **管理员**：`admin / admin123`

## 目录结构

```
performance-board/
├── index.html            # 入口（hash 路由）
├── css/app.css           # 全局样式
├── js/
│   ├── app.js            # 路由总表
│   ├── router.js         # hash 路由
│   ├── layout.js         # 公共布局/守卫
│   ├── store.js          # 数据层（localStorage 适配器）
│   ├── engine.js         # 业绩逐级汇总引擎
│   ├── ui.js             # DOM/Toast/Modal/格式化
│   ├── charts.js         # SVG 柱状/环形图
│   └── pages/            # 10 个页面模块
├── supabase/schema.sql   # Supabase 建表 + RLS + 触发器
└── docs/                 # PRD 与验收用例（可选）
```

## 部署到 GitHub Pages

```powershell
git add -A
git commit -m "feat: 业绩看板系统首版"
git push origin main
# GitHub → Settings → Pages → Source: main branch / /root → Save
# 几分钟后访问 https://1echo2026.github.io/performance-board/
```

## 验收标准（与 PRD 对齐）

- [x] A1 逐级汇总：老师合计=组长=主管=基地负责人
- [x] A2 锁定隔离：锁定月订单不可增删改
- [x] A3 跨月隔离：锁定月归属固定，未锁定月按新架构重算
- [x] A4 前台只读：无编辑/导入/删除按钮、无后台入口
- [x] A5 密钥隔离：输错密钥无法进入名单类页面
- [x] A6 后台全量：管理员可见全部数据
- [x] A7 日志审计：全部写操作留痕 + 不可删除 + 可筛选导出

## 技术栈

- 纯原生 ES 模块 + hash 路由（无 Node 依赖、无构建工具）
- SVG 零依赖图表（自实现柱状图 + 环形图）
- localStorage 单机 / Supabase 多人（数据层适配器模式）
- 深蓝办公风 UI（CSS 变量令牌体系）

## License

Private — 仅限内部团队使用。
