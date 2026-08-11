import { memo, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { formatNumber, formatUsd, type Granularity, aggregateByGranularity } from '@/data/usage';
import { CHART_COLORS } from '@/lib/chart-colors';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type ChartMetric = 'tokens' | 'cost';

interface ChartSectionProps {
  records: { date: string; model: string; total_tokens: number; cost_usd: number; requests: number }[];
  granularity: Granularity;
  selectedModels: string[];
  startDate: string;
  endDate: string;
}

export default memo(function ChartSection({
  records,
  granularity,
  selectedModels,
  startDate,
  endDate,
}: ChartSectionProps) {
  const [metric, setMetric] = useState<ChartMetric>('tokens');

  const option = useMemo<EChartsOption>(() => {
    // 筛选 + 聚合
    const filtered = records.filter((r) => r.date >= startDate && r.date <= endDate);
    const aggregated = aggregateByGranularity(filtered as any, granularity);

    // 取所有 period（去重排序）
    const periods = Array.from(new Set(aggregated.map((a) => a.period))).sort();

    const getValue = (rec: (typeof aggregated)[number]) =>
      metric === 'cost' ? rec.cost_usd : rec.total_tokens;

    // 模型：只保留 selectedModels 中的
    const series = selectedModels.map((model, i) => {
      const modelRecords = aggregated.filter((a) => a.model === model);
      const data = periods.map((p) => {
        const found = modelRecords.find((r) => r.period === p);
        return found ? getValue(found) : null;
      });
      return {
        name: model,
        type: 'line',
        data,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        emphasis: { focus: 'series' },
        lineStyle: { width: 2, color: CHART_COLORS[i % CHART_COLORS.length] },
        itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
      };
    });

    // x 轴 label 格式化
    const xLabels = periods.map((p) => {
      if (granularity === 'day') {
        // MM/DD
        const parts = p.split('-');
        return `${parts[1]}/${parts[2]}`;
      }
      if (granularity === 'week') {
        const parts = p.split('-');
        return `${parts[1]}/${parts[2]} 周`;
      }
      // month
      return p.replace('-', '/');
    });

    return {
      color: CHART_COLORS,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: 'rgba(0, 0, 0, 0.08)',
        borderWidth: 1,
        textStyle: { color: '#111', fontSize: 12 },
        formatter: (params: any) => {
          const list = Array.isArray(params) ? params : [params];
          if (list.length === 0) return '';
          const title = `<div style="font-weight:600;margin-bottom:4px;">${list[0].axisValueLabel}</div>`;
          const rows = list
            .filter((p) => p.value !== null && p.value !== undefined)
            .map((p) => {
              const color = p.color;
              const value =
                metric === 'cost' ? formatUsd(p.value) : formatNumber(p.value);
              return `<div style="display:flex;justify-content:space-between;gap:16px;font-size:12px;">
                <span style="display:flex;align-items:center;gap:6px;">
                  <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;"></span>
                  ${p.seriesName}
                </span>
                <span style="font-weight:600;">${value}</span>
              </div>`;
            })
            .join('');
          return title + rows;
        },
      },
      legend: {
        type: 'scroll',
        bottom: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { fontSize: 12, color: '#666' },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '14%',
        top: '4%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: xLabels,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisTick: { show: false },
        axisLabel: { color: '#6b7280', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
        axisLabel: {
          color: '#6b7280',
          fontSize: 11,
          formatter: (value: number) =>
            metric === 'cost' ? formatUsd(value) : formatNumber(value),
        },
      },
      series,
    } as EChartsOption;
  }, [records, granularity, selectedModels, startDate, endDate, metric]);

  const hasData = selectedModels.length > 0 && records.length > 0;
  const granularityLabel = granularity === 'day' ? '日' : granularity === 'week' ? '周' : '月';

  return (
    <section className="w-full">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="rounded-xl border border-border/60 bg-card p-4 md:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold">
                {metric === 'cost' ? '费用趋势' : 'Token 使用趋势'}
              </h2>
              <ToggleGroup
                type="single"
                size="sm"
                value={metric}
                onValueChange={(v) => v && setMetric(v as ChartMetric)}
              >
                <ToggleGroupItem value="tokens">用量</ToggleGroupItem>
                <ToggleGroupItem value="cost">费用</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <span className="text-xs text-muted-foreground">
              按 {granularityLabel} 汇总 · {metric === 'cost' ? 'cost_usd' : 'total_tokens'}
            </span>
          </div>
          {hasData ? (
            <ReactECharts
              option={option}
              theme="ud"
              className="w-full h-[420px] md:h-[480px]"
              notMerge
              lazyUpdate
            />
          ) : (
            <div className="w-full h-[420px] md:h-[480px] flex items-center justify-center text-muted-foreground text-sm">
              {records.length === 0 ? '暂无数据' : '请至少选择一个模型'}
            </div>
          )}
        </div>
      </div>
    </section>
  );
});
