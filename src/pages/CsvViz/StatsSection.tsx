import { memo, useMemo } from 'react';
import { Zap, DollarSign, Send, TrendingUp } from 'lucide-react';
import { formatNumber, formatUsd, type IUsageRecord } from '@/data/usage';

interface StatsSectionProps {
  records: IUsageRecord[];
  startDate: string;
  endDate: string;
}

export default memo(function StatsSection({ records, startDate, endDate }: StatsSectionProps) {
  const stats = useMemo(() => {
    const filtered = records.filter((r) => r.date >= startDate && r.date <= endDate);
    const totalTokens = filtered.reduce((s, r) => s + r.total_tokens, 0);
    const totalCost = filtered.reduce((s, r) => s + r.cost_usd, 0);
    const totalRequests = filtered.reduce((s, r) => s + r.requests, 0);

    const uniqueDates = new Set(filtered.map((r) => r.date)).size;
    const avgDailyTokens = uniqueDates > 0 ? totalTokens / uniqueDates : 0;

    return { totalTokens, totalCost, totalRequests, avgDailyTokens, recordCount: filtered.length };
  }, [records, startDate, endDate]);

  const cards = [
    {
      label: '总 Tokens',
      value: formatNumber(stats.totalTokens),
      icon: Zap,
      tint: 'bg-primary/10 text-primary',
    },
    {
      label: '总费用',
      value: formatUsd(stats.totalCost),
      icon: DollarSign,
      tint: 'bg-emerald-100 text-emerald-700',
    },
    {
      label: '总请求数',
      value: formatNumber(stats.totalRequests),
      icon: Send,
      tint: 'bg-amber-100 text-amber-700',
    },
    {
      label: '日均 Tokens',
      value: formatNumber(stats.avgDailyTokens),
      icon: TrendingUp,
      tint: 'bg-violet-100 text-violet-700',
    },
  ];

  return (
    <section className="w-full">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <h2 className="text-base font-semibold mb-3">数据概览</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {cards.map((c) => (
            <div
              key={c.label}
              className="rounded-xl border border-border/60 bg-card p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={'size-9 rounded-lg flex items-center justify-center ' + c.tint}>
                  <c.icon className="size-5" />
                </div>
                <span className="text-xs text-muted-foreground">{c.label}</span>
              </div>
              <div className="text-xl md:text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {c.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
