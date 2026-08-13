# csv-token-analytics

CSV 数据可视化分析工具 —— 上传 CSV 后快速生成多维度的 Token 使用趋势图，支持粒度切换、时间筛选和模型筛选，直观洞察 API 用量变化。

纯前端应用，所有数据均来自用户提供的 CSV 文件（上传 / 粘贴），在浏览器本地完成解析与汇总，不经过任何服务器。

## 功能特性

- **CSV 导入**：拖拽上传、点击选择、粘贴文本三种方式；自动解析 `date, model, input_tokens, output_tokens, total_tokens, cost_usd, requests, sessions` 字段
- **折线图分析**：以日期为横轴、按 model 分组绘制多条折线，支持 Token 用量 / 费用两种指标，hover 显示具体数值
- **汇总粒度切换**：日 / 周（ISO 周）/ 月三档粒度，前端实时分组求和
- **时间范围筛选**：起止日期选择器，默认覆盖数据全集
- **模型多选筛选**：自动提取模型列表，checkbox 实时控制图表折线
- **统计卡片**：总 Tokens、总费用、总请求数、日均 Tokens，随筛选条件联动更新
- **模型单价分析**：按时间范围折算各模型每百万 Token 平均单价

## 快速开始

```bash
npm install
npm run dev      # 开发服务器（默认 http://localhost:8001）
npm run build    # 构建静态站点到 dist/
npm run preview  # 本地预览构建产物
npm run lint     # typecheck + eslint
```

## CSV 格式

需包含表头，字段建议为：

```
date,model,input_tokens,output_tokens,total_tokens,cost_usd,requests,sessions
2026-06-11,deepseek-v4-flash,12345,6789,19134,0.0012,12,3
```

| 字段 | 类型 | 说明 |
|------|------|------|
| date | string | 日期，`YYYY-MM-DD` |
| model | string | 模型名称 |
| input_tokens | number | 输入 tokens 数 |
| output_tokens | number | 输出 tokens 数 |
| total_tokens | number | 总 tokens 数 |
| cost_usd | number | 费用（美元） |
| requests | number | 请求数 |
| sessions | number | 会话数 |

`input_tokens` / `output_tokens` / `requests` / `sessions` 缺失时按 0 处理；`date` 与 `model` 为图表分组必需字段。

## 技术栈

- React 19 + TypeScript + Vite
- Tailwind CSS v4 + shadcn/ui
- ECharts（图表渲染）
- react-router-dom / sonner / framer-motion 等

## 部署

构建产物为纯静态站点（`dist/`），可部署到任意静态托管服务（Nginx、Vercel、GitHub Pages、Cloudflare Pages 等）。

## License

[MIT](./LICENSE)
