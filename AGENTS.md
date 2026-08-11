# CSV 数据可视化工具 - 需求拆解文档

## 产品概述

- **产品类型**: CSV 数据可视化分析工具
- **场景类型**: <scene_type>prototype-app</scene_type>
- **目标用户**: 需要分析 API 使用量、Token 消耗、费用明细的开发者/运营/管理者
- **核心价值**: 上传 CSV 后快速生成多维度的 Token 使用趋势图，支持粒度切换、时间筛选和模型筛选，直观洞察 API 用量变化
- **界面语言**: 中文
- **主题偏好**: 浅色（用户提到「深色/浅色主题切换（可选）」，默认浅色，深色模式作为可选增强）
- **导航模式**: 无导航（单页工具型应用）

---

## 页面结构总览

**页面文件**: `CsvVizPage.tsx`

| 区域 | 说明 |
|-----|------|
| Header 顶部区 | 标题 + 文件上传区域（拖拽上传 + 点击上传 + 粘贴文本切换） |
| Control Panel 控制面板 | 时间范围选择器、汇总粒度切换（日/周/月）、模型多选筛选 |
| Chart Area 主图表区 | 大尺寸折线图，日期为横轴，total_tokens 为纵轴，按 model 分组 |
| Stats Cards 统计卡片区 | 总 tokens、总费用、总请求数、日均 tokens 等关键指标卡片 |

---

## 页面布局建议

- **布局模式**: 上下分区（纵向流式布局）—— 控制面板在图表上方，便于操作与查看联动；统计卡片在底部，作为数据汇总收尾
- **视觉重心**: 主图表区 —— 折线图占页面主要空间（约 60% 视高），是用户的核心关注区域
- **结果承载区**: 主图表区 + 底部统计卡片；初始态为**示例数据预加载**（页面加载时自动 fetch 示例 CSV 并渲染），上传/粘贴新数据后实时替换
- **源材料承载区**: 顶部上传区，支持拖拽态高亮、文件名展示、粘贴文本模态框/展开区

---

## 数据来源声明

| 数据/操作 | 来源类型 | 实现要求 | mock 兜底 |
|---|---|---|---|
| 示例 CSV 数据加载 | real-api | 页面加载时通过 fetch 请求 `https://aka.doubaocdn.com/s/fBfud2qsPj`，解析为结构化数据后渲染图表 | 若请求失败，展示错误提示 toast，并保留上传入口供用户手动上传 |
| CSV 文件上传解析 | real-file | 使用 `<input type="file">` + FileReader 读取 CSV 文件，解析为 JSON 数组后 setState | 无（上传是用户主动行为，无兜底数据） |
| 粘贴 CSV 文本解析 | real-file（文本输入） | 提供文本框供用户粘贴 CSV 内容，解析后 setState | 无 |
| 图表与统计数据 | demo-mock（衍生数据） | 基于已加载的 CSV 数据，前端进行汇总计算（日/周/月粒度、时间范围筛选、模型筛选）后渲染 | ✅ 数据本身来自 CSV，计算结果为衍生数据 |

> 说明：核心数据来源于 CSV 文件（上传/粘贴/远程示例三种方式），图表和统计卡片的数据均为前端基于 CSV 原始数据的实时计算结果。

---

## 功能列表

- **页面**: CSV 数据可视化工具页
  - **页面目标**: 用户上传或粘贴 CSV 数据后，通过交互式折线图和统计卡片快速分析 API Token 使用趋势
  - **功能点**:
    - **CSV 文件上传与解析**：支持拖拽上传 + 点击选择文件，解析 CSV 为结构化数据（8 个字段），上传后自动渲染图表和统计卡片；支持粘贴 CSV 文本模式切换
    - **示例数据自动加载**：页面加载时自动 fetch 远程示例 CSV 文件（`opencode-usage-2026-08-10.csv`）并解析渲染，用户首屏即可看到效果
    - **折线图渲染与交互**：以日期为横轴、total_tokens 为纵轴、按 model 分组绘制多折线图；支持 hover 显示具体数值（日期、模型、tokens 数）；响应式适配不同屏幕
    - **汇总粒度切换**：提供「日/周/月」三档按钮切换；切换时前端按对应粒度对数据进行分组求和，图表实时更新（日粒度为原始日数据；周粒度按 ISO 周汇总；月粒度按自然月汇总）
    - **时间范围筛选**：提供起止日期选择器（date picker），筛选后仅展示该时间范围内的数据；初始范围为 CSV 数据的最小日期到最大日期
    - **模型多选筛选**：自动从 CSV 中提取所有 model 列表，以 checkbox 形式展示；勾选/取消勾选实时控制图表中显示的折线；默认全选
    - **统计卡片展示**：在底部展示 4 个核心 KPI 卡片——总 total_tokens、总 cost_usd、总 requests、日均 total_tokens；数值随筛选条件实时联动更新

---

## 数据分析参考（供实现使用）

### 数据字段

| 字段 | 类型 | 说明 |
|-----|------|------|
| date | string (YYYY-MM-DD) | 日期 |
| model | string | 模型名称 |
| input_tokens | number | 输入 tokens 数 |
| output_tokens | number | 输出 tokens 数 |
| total_tokens | number | 总 tokens 数 |
| cost_usd | number | 费用（美元） |
| requests | number | 请求数 |
| sessions | number | 会话数 |

### 数据概览

- **行数**: 约 70+ 行
- **时间范围**: 2026-06-11 ~ 2026-08-10（约 2 个月）
- **模型数量**: 4 个（deepseek-v4-flash、deepseek-v4-pro、qwen3.7-plus、glm-5.2）
- **主要模型**: deepseek-v4-flash 占绝对主导（token 量级远高于其他模型）

### 统计卡片指标

| 指标名称 | 计算方式 | 数据字段 |
|---------|---------|---------|
| 总 Tokens | 筛选范围内所有记录 total_tokens 之和 | total_tokens |
| 总费用 | 筛选范围内所有记录 cost_usd 之和 | cost_usd |
| 总请求数 | 筛选范围内所有记录 requests 之和 | requests |
| 日均 Tokens | 总 tokens ÷ 筛选范围内的天数（去重日期数） | total_tokens, date |

-------

<scene_type>dashboard-app</scene_type>

# UI 设计指南

## 1. 设计推导依据

- **参考意图**: Free Direction —— 用户给出完整功能需求与示例数据，无视觉参考，按数据工具语义自主设计。
- **核心情绪 / 应用类型**: 精确、克制、数据优先的 AI Token 使用量分析工具。
- **独特记忆点**: 上传区与图表区用同一套细线网格底纹呼应 CSV 数据结构；图表折线端点在 hover 时出现轻微"数据脉冲"光晕。

## 2. Art Direction

- **方向名**: 精密数据工作台
- **Design Style**: Swiss Minimalist + Grid 网格辅助 —— 数据密度高、信息层级多，需要强秩序感和低干扰阅读环境。
- **DNA 参数**: 圆角 subtle (rounded-md) / 阴影 subtle (shadow-sm) / 间距 standard (gap-4, p-6) / 字体方向 几何无衬线 + 数字等宽 / 装饰手法 细点网格、极细描边、单色图标。
- **应用类型**: Dashboard / 数据看板 —— 顶部控制 + 中部大图 + 底部指标卡的三段式布局。

## 3. Color System

**色彩关系**: 冷靛蓝主色 + 同色系极浅反馈底 + 近白冷灰背景 + 深墨文字。
**配色设计理由**: primary 冷靛蓝承担主按钮、图表激活线和关键高亮；accent 用极淡靛蓝承接 hover/selected 状态；中性色偏冷调强化数据工具的精密感，避免暖色干扰阅读。
**主色推导**: 从 AI / 开发者工具的冷静精确语义出发，选择 225° 色相的靛蓝，既区别于常见 SaaS 蓝，又保持专业可信；明度 55% 确保在白底上有足够对比度且不刺眼。
**使用比例**: 65% 中性 / 25% 辅助 / 10% primary；primary 仅用于主 CTA、tab 激活下划线、图表主折线与品牌锚点。

| 角色 | CSS 变量 | Tailwind Class | HSL 值 | 设计说明 |
|---|---|---|---|---|
| bg | `--background` | `bg-background` | hsl(220 25% 98%) | 冷调极浅灰背景，带微弱蓝感 |
| card | `--card` | `bg-card` | hsl(0 0% 100%) | 纯白卡片，承载图表与表单 |
| text | `--foreground` | `text-foreground` | hsl(222 30% 12%) | 深墨蓝灰正文 |
| textMuted | `--muted-foreground` | `text-muted-foreground` | hsl(220 12% 48%) | 次级说明、占位符 |
| primary | `--primary` | `bg-primary` / `text-primary` | hsl(225 75% 55%) | 冷靛蓝主色 |
| primaryForeground | `--primary-foreground` | `text-primary-foreground` | hsl(0 0% 100%) | 主色上的白文字 |
| accent | `--accent` | `bg-accent` | hsl(225 60% 96%) | 极浅靛蓝，hover/选中底 |
| accentForeground | `--accent-foreground` | `text-accent-foreground` | hsl(225 45% 35%) | accent 上的深靛蓝文字 |
| border | `--border` | `border-border` | hsl(220 15% 90%) | 细浅灰边界 |

**语义色提示**:
- 成功：`hsl(152 60% 45%)`，三态 bg=hsl(152 65% 96%) / border=hsl(152 55% 85%) / text=hsl(152 60% 35%)；饱和度低于 primary，保持克制。
- 警告：`hsl(38 90% 50%)`，三态 bg=hsl(45 90% 96%) / border=hsl(40 85% 82%) / text=hsl(30 80% 35%)；暖黄偏橙，饱和度与 primary 对齐。
- 错误：`hsl(0 75% 55%)`，三态 bg=hsl(0 80% 97%) / border=hsl(0 70% 85%) / text=hsl(0 70% 40%)；红色饱和度略低于 primary，避免报警感过载。
- 图表系列色：从 primary 衍生，通过色相偏移 +15°/−15°、明度 ±8% 生成 4 条折线色（深靛 / 青蓝 / 紫蓝 / 青绿），保持同一色温与饱和度区间。

## 4. 字体与节奏

- **font-display**: Inter + Noto Sans SC —— 几何无衬线，数字形态清晰，适合数据看板标题与指标数字。
- **font-body**: Inter + Noto Sans SC —— 正文与控件标签统一字体，减少视觉噪音；数字使用 `font-variant-numeric: tabular-nums` 保证等宽对齐。
- **字号**: H1 text-2xl ~ text-3xl；H2 text-lg ~ text-xl；统计卡主数字 text-3xl ~ text-4xl font-semibold；body text-sm；muted text-xs。
- **圆角**: 中小 (rounded-md) —— 数据工具不过分圆润，保持理性；卡片 8px、按钮 6px、输入框 6px。

## 5. 全局布局契约

- **Reference Layout Use**: 按需求结构推导；顶部上传区、中部控制面板、主图表区、底部统计卡四段式垂直堆叠。
- **Page / Section Order**: Header(标题+上传) → Control Bar(时间范围+粒度+模型筛选) → Chart Area(主折线图) → Stats Grid(指标卡片)。
- **Standard Content Zone**: 后台 `max-w-[1400px]` + `mx-auto`，适配大尺寸折线图与多指标卡。
- **Shell / Frame Alignment**: 同宽 —— 内容区与页面框架共享同一 max-width 与左右 padding 节奏。
- **Padding & Rhythm**: `px-4 md:px-6 lg:px-8 py-6 md:py-8`，区块间 `gap-6`，卡片内 `p-5 md:p-6`。
- **Full-bleed Zones**: 无全宽区域；图表和卡片均在标准内容区内，保持统一留白。
- **Local Narrowing**: 粘贴文本弹窗内 textarea 可局部收窄到 `max-w-2xl`。
- **Overflow Strategy**: 图表容器 `overflow-hidden`；模型筛选标签过多时使用横向滚动 `overflow-x-auto`。
- **Flexibility Boundary**: 允许移动端控制面板堆叠、统计卡从 4 列变 2 列/1 列；不允许改变主色、圆角、阴影语言和图表底色。

## 6. 视觉与动效

- **装饰**: 细点网格底纹（上传区背景）、极细 1px 描边卡片、单色线性图标。
- **阴影/边界**: 轻 —— 卡片用 `shadow-sm` + 边框，上传区 hover 时阴影微增。
- **动效**: 克制 —— hover/active 用 150ms 过渡；图表数据切换（粒度/筛选）使用 300ms 折线形变过渡；上传成功有短暂绿勾脉冲。

## 7. 组件原则

- 按钮、日期选择器、下拉多选、卡片必须有 Default / Hover / Active / Focus-visible / Disabled 状态。
- 粒度切换使用 segmented control 样式：accent 底作选中态，primary 字 + 细下划线作强调，避免整块填色。
- 上传拖拽区默认虚线边框，dragover 时变为 primary 实线 + accent 浅底。
- 统计卡采用"上图标 + 中大数字 + 下说明标签"结构，数字用 tabular-nums。
- 加载与空状态延续细点网格与线描图标风格，不使用默认骨架屏。

## 8. Image Direction

- **Image Role**: 无强制图片需求，优先通过排版、细点网格装饰、图表本身的色彩节奏建立视觉记忆点。
- **Image Art Direction**: 无强制图片需求
- **Image Prompt Keywords**: 无
- **Image Avoidance**: 避免通用科技感插图、商务人物素材图、无主题抽象渐变图。

## 9. Anti-patterns

- **Split personality**: 深浅主题切换时改变圆角或间距系统；两套主题只换色值，不动结构与形态。
- **Phantom tokens**: 编造图表专用 CSS 变量；图表色从语义色提示和 primary 衍生，复用现有 token。
- **Default SaaS drift**: 回到渐变蓝紫按钮 + 大圆角卡片 + 厚重阴影；保持冷靛蓝主色、细边、轻阴影的精密工作台气质。
- **Invisible interaction**: 日期选择器和模型下拉只有 hover 没有 focus-visible；每个可交互元素都要有 2px primary 外描边键盘态。
- **Mono-hue tyranny**: 主按钮、tab 激活、图标、边框、链接、折线全用 primary；按 65-25-10 比例，primary 只锚定 CTA 与图表主系列。
- **Status color drift**: 成功/警告/错误色饱和度过高，与冷静主色脱节；语义色饱和度控制在 primary ±15% 以内。