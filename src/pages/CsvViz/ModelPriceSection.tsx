import { memo, useMemo } from 'react';
import { Receipt } from 'lucide-react';
import { formatNumber, formatUsd, type IUsageRecord } from '@/data/usage';
import { CHART_COLORS } from '@/lib/chart-colors';

interface ModelPriceSectionProps {
  records: IUsageRecord[];
  startDate: string;
  endDate: string;
}

interface ModelPriceRow {
  model: string;
  color: string;
  totalTokens: number;
  totalCost: number;
  pricePerM: number | null; // 每百万 token 价格（$）
  tokensPerDollar: number | null; // 1$ 可购 token 数
}

function formatPricePerM(n: number | null): string {
  if (n === null) return '—';
  if (n >= 0.01) return '$' + n.toFixed(2);
  if (n >= 0.0001) return '$' + n.toFixed(4);
  return '<$0.0001';
}

function formatTokensPerDollar(n: number | null): string {
  if (n === null) return '—';
  return formatNumber(n);
}

export default memo(function ModelPriceSection({
  records,
  startDate,
  endDate,
}: ModelPriceSectionProps) {
  const rows = useMemo<ModelPriceRow[]>(() => {
    const sumByModel = new Map<string, { tokens: number; cost: number }>();
    for (const r of records) {
      if (r.date < startDate || r.date > endDate) continue;
      const entry = sumByModel.get(r.model) ?? { tokens: 0, cost: 0 };
      entry.tokens += r.total_tokens;
      entry.cost += r.cost_usd;
      sumByModel.set(r.model, entry);
    }
    const colorIndex = new Map<string, number>();
    Array.from(sumByModel.keys()).forEach((model, i) => colorIndex.set(model, i));
    return Array.from(sumByModel.entries())
      .map(([model, { tokens, cost }]) => ({
        model,
        color: CHART_COLORS[colorIndex.get(model)! % CHART_COLORS.length],
        totalTokens: tokens,
        totalCost: cost,
        pricePerM: tokens > 0 ? (cost / tokens) * 1e6 : null,
        tokensPerDollar: cost > 0 ? tokens / cost : null,
      }))
      .sort((a, b) => b.totalTokens - a.totalTokens);
  }, [records, startDate, endDate]);

  return (
    <section className="w-full">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="rounded-xl border border-border/60 bg-card p-4 md:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Receipt className="size-4 text-muted-foreground" />
              模型单价分析
            </h2>
            <span className="text-xs text-muted-foreground">
              {startDate} ~ {endDate} · 按实际用量与费用折算
            </span>
          </div>
          {rows.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              当前时间范围内暂无数据
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="text-left font-medium py-2 pr-4 whitespace-nowrap">模型</th>
                    <th className="text-right font-medium py-2 px-4 whitespace-nowrap">总 Tokens</th>
                    <th className="text-right font-medium py-2 px-4 whitespace-nowrap">总费用</th>
                    <th className="text-right font-medium py-2 px-4 whitespace-nowrap">
                      每百万 Token 价格
                    </th>
                    <th className="text-right font-medium py-2 pl-4 whitespace-nowrap">
                      $1 可购 Tokens
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.model} className="border-b border-border/50 last:border-0">
                      <td className="py-3 pr-4">
                        <span className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full shrink-0"
                            style={{ background: r.color }}
                          />
                          <span className="font-medium font-mono text-xs whitespace-nowrap">
                            {r.model}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {formatNumber(r.totalTokens)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {formatUsd(r.totalCost)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-semibold">
                        {formatPricePerM(r.pricePerM)}
                      </td>
                      <td className="py-3 pl-4 text-right tabular-nums">
                        {formatTokensPerDollar(r.tokensPerDollar)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            注：单价为时间范围内 cost_usd ÷ total_tokens 折算的平均单价（含输入 + 输出 tokens）。
          </p>
        </div>
      </div>
    </section>
  );
});
