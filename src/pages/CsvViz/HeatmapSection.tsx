import { memo, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { CalendarDays, Flame } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatDateShort, formatNumber, formatUsd, type IUsageRecord } from '@/data/usage';

type HeatmapMetric = 'tokens' | 'cost';

interface IDayCell {
  date: string;
  inRange: boolean;
  tokens: number;
  cost: number;
  requests: number;
}

interface HeatmapSectionProps {
  records: IUsageRecord[];
  selectedModels: string[];
  startDate: string;
  endDate: string;
}

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
// 左侧只显示 一 / 三 / 五 / 日，减少标签噪音
const WEEKDAY_SHOWN = new Set([0, 2, 4, 6]);

// 热力色阶：Token 用主色靛蓝，费用沿用统计卡片的绿色语义
const TOKEN_LEVEL_COLORS = [
  'hsl(220 16% 93%)',
  'hsl(225 58% 91%)',
  'hsl(225 65% 79%)',
  'hsl(225 72% 65%)',
  'hsl(225 78% 51%)',
];
const COST_LEVEL_COLORS = [
  'hsl(220 16% 93%)',
  'hsl(152 40% 90%)',
  'hsl(152 42% 76%)',
  'hsl(152 48% 58%)',
  'hsl(152 55% 40%)',
];

function toUtcDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 0 = 周一 ... 6 = 周日 */
function weekdayIndex(dateStr: string): number {
  return (toUtcDate(dateStr).getUTCDay() + 6) % 7;
}

function formatDayTitle(dateStr: string): string {
  return `${dateStr} 周${WEEKDAY_LABELS[weekdayIndex(dateStr)]}`;
}

/**
 * 按分位数分档（类似 GitHub 贡献图）：不依赖最大值，数据分布再偏也能拉开颜色层次
 */
function getLevel(value: number, thresholds: number[]): number {
  if (value <= 0) return 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (value < thresholds[i]) return i + 1;
  }
  return 4;
}

function buildThresholds(values: number[]): number[] {
  const positive = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (positive.length === 0) return [];
  const pick = (p: number) => positive[Math.min(positive.length - 1, Math.floor(p * positive.length))];
  return [pick(0.25), pick(0.5), pick(0.75)];
}

interface TooltipState {
  cell: IDayCell;
  x: number;
  y: number;
  below: boolean;
}

export default memo(function HeatmapSection({
  records,
  selectedModels,
  startDate,
  endDate,
}: HeatmapSectionProps) {
  const [metric, setMetric] = useState<HeatmapMetric>('tokens');
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // 数据或筛选变化后清掉旧提示，避免残留过期数值
  useEffect(() => {
    setTooltip(null);
  }, [records, selectedModels, startDate, endDate]);

  const heatmap = useMemo(() => {
    if (!startDate || !endDate || startDate > endDate) return null;

    const daily = new Map<string, { tokens: number; cost: number; requests: number }>();
    for (const r of records) {
      if (r.date < startDate || r.date > endDate) continue;
      if (!selectedModels.includes(r.model)) continue;
      const entry = daily.get(r.date) ?? { tokens: 0, cost: 0, requests: 0 };
      entry.tokens += r.total_tokens;
      entry.cost += r.cost_usd;
      entry.requests += r.requests;
      daily.set(r.date, entry);
    }

    const end = toUtcDate(endDate);
    const cursor = toUtcDate(startDate);
    // 对齐到所在周的周一，保证网格从周一开始
    cursor.setUTCDate(cursor.getUTCDate() - weekdayIndex(startDate));

    const cells: IDayCell[] = [];
    while (cursor <= end) {
      const date = toDateStr(cursor);
      const agg = daily.get(date);
      cells.push({
        date,
        inRange: date >= startDate && date <= endDate,
        tokens: agg?.tokens ?? 0,
        cost: agg?.cost ?? 0,
        requests: agg?.requests ?? 0,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    // 补齐最后一周
    while (cells.length % 7 !== 0) {
      cells.push({ date: toDateStr(cursor), inRange: false, tokens: 0, cost: 0, requests: 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    const inRange = cells.filter((c) => c.inRange);
    const totalTokens = inRange.reduce((s, c) => s + c.tokens, 0);
    const totalCost = inRange.reduce((s, c) => s + c.cost, 0);
    const activeDays = inRange.filter((c) => c.tokens > 0 || c.cost > 0).length;

    const peakOf = (key: 'tokens' | 'cost') =>
      inRange.reduce<IDayCell | null>((best, c) => (best === null || c[key] > best[key] ? c : best), null);

    const weeks: IDayCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    // 月份标签：月份首次出现的那一周打标
    const monthLabels: (string | null)[] = new Array(weeks.length).fill(null);
    let prevMonth = '';
    cells.forEach((cell, idx) => {
      if (!cell.inRange) return;
      const month = cell.date.slice(5, 7);
      if (month === prevMonth) return;
      prevMonth = month;
      let col = Math.floor(idx / 7);
      while (col < monthLabels.length && monthLabels[col]) col++;
      if (col < monthLabels.length) monthLabels[col] = `${Number(month)}月`;
    });

    return {
      weeks,
      monthLabels,
      inRange,
      dayCount: inRange.length,
      activeDays,
      totalTokens,
      totalCost,
      peakTokens: peakOf('tokens'),
      peakCost: peakOf('cost'),
    };
  }, [records, selectedModels, startDate, endDate]);

  const thresholds = useMemo(() => {
    if (!heatmap) return [];
    return buildThresholds(
      heatmap.inRange.map((c) => (metric === 'cost' ? c.cost : c.tokens)),
    );
  }, [heatmap, metric]);

  const handleEnter = (event: ReactMouseEvent<HTMLDivElement>, cell: IDayCell) => {
    if (!cell.inRange) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const below = rect.top < 140;
    setTooltip({
      cell,
      x: Math.min(Math.max(rect.left + rect.width / 2, 100), window.innerWidth - 100),
      y: below ? rect.bottom + 8 : rect.top - 8,
      below,
    });
  };

  const hasData = records.length > 0 && selectedModels.length > 0 && heatmap !== null;

  const isCost = metric === 'cost';
  const levelColors = isCost ? COST_LEVEL_COLORS : TOKEN_LEVEL_COLORS;
  const total = heatmap ? (isCost ? heatmap.totalCost : heatmap.totalTokens) : 0;
  const avgPerDay = heatmap && heatmap.dayCount > 0 ? total / heatmap.dayCount : 0;
  const peakCell = heatmap ? (isCost ? heatmap.peakCost : heatmap.peakTokens) : null;
  const formatValue = isCost ? formatUsd : formatNumber;
  const metricLabel = isCost ? '费用' : 'Tokens';

  const weekCount = heatmap?.weeks.length ?? 0;
  // 单元格在限定宽度内自适应：短区间放大、长区间缩小，极窄时横向滚动
  const maxCell =
    weekCount > 34
      ? 14
      : weekCount > 24
        ? 18
        : weekCount > 16
          ? 22
          : weekCount > 10
            ? 28
            : weekCount > 6
              ? 32
              : 44;
  const minCell = 8;
  const gap = weekCount > 24 ? 3 : 5;
  const labelWidth = 16;
  const maxWidth = labelWidth + weekCount * (maxCell + gap);
  const minWidth = labelWidth + weekCount * (minCell + gap);
  const gridTemplate = `${labelWidth}px repeat(${weekCount}, minmax(0, 1fr))`;
  const cellRadius = weekCount > 16 ? 2 : 4;

  return (
    <section className="w-full">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="rounded-xl border border-border/60 bg-card p-4 md:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Flame className="size-4 text-muted-foreground" />
                消耗热力图
              </h2>
              <ToggleGroup
                type="single"
                size="sm"
                value={metric}
                onValueChange={(v) => v && setMetric(v as HeatmapMetric)}
              >
                <ToggleGroupItem value="tokens">用量</ToggleGroupItem>
                <ToggleGroupItem value="cost">费用</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <span className="text-xs text-muted-foreground">
              按天汇总 · {startDate || '—'} ~ {endDate || '—'}
            </span>
          </div>

          {hasData && heatmap ? (
            <div className="flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-6">
              <div className="flex-1 min-w-0">
                <div className="overflow-x-auto pb-1">
                  <div style={{ width: `clamp(${minWidth}px, 100%, ${maxWidth}px)` }}>
                    {/* 月份标签 */}
                    <div
                      className="grid mb-1"
                      style={{ gridTemplateColumns: gridTemplate, gap }}
                    >
                      {heatmap.monthLabels.map((label, i) => (
                        <div
                          key={i}
                          style={{ gridColumn: i + 2, gridRow: 1 }}
                          className="text-[10px] leading-4 text-muted-foreground whitespace-nowrap"
                        >
                          {label}
                        </div>
                      ))}
                    </div>

                    {/* 星期标签 + 日期格子（同一网格保证行对齐） */}
                    <div
                      className="grid"
                      style={{
                        gridTemplateColumns: gridTemplate,
                        gridTemplateRows: 'repeat(7, auto)',
                        gap,
                      }}
                    >
                      {WEEKDAY_LABELS.map((label, i) => (
                        <div
                          key={label}
                          style={{ gridColumn: 1, gridRow: i + 1 }}
                          className="flex items-center justify-center text-[10px] leading-none text-muted-foreground"
                        >
                          {WEEKDAY_SHOWN.has(i) ? label : ''}
                        </div>
                      ))}
                      {heatmap.weeks.flat().map((cell, i) => {
                        const value = isCost ? cell.cost : cell.tokens;
                        const level = getLevel(value, thresholds);
                        return (
                          <div
                            key={cell.date}
                            role="img"
                            aria-label={
                              cell.inRange
                                ? `${formatDayTitle(cell.date)}，${metricLabel} ${formatValue(value)}`
                                : cell.date
                            }
                            onMouseEnter={(e) => handleEnter(e, cell)}
                            onMouseLeave={() => setTooltip(null)}
                            style={{
                              gridColumn: Math.floor(i / 7) + 2,
                              gridRow: (i % 7) + 1,
                              borderRadius: cellRadius,
                              background: cell.inRange ? levelColors[level] : 'transparent',
                              boxShadow: cell.inRange
                                ? 'inset 0 0 0 1px rgba(15, 23, 42, 0.04)'
                                : undefined,
                            }}
                            className={
                              'aspect-square w-full select-none transition-shadow duration-150 ' +
                              (cell.inRange
                                ? 'cursor-default hover:ring-2 hover:ring-primary/50'
                                : '')
                            }
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    少
                    {levelColors.map((color, i) => (
                      <span
                        key={i}
                        className="size-3 rounded-[3px]"
                        style={{ background: color }}
                      />
                    ))}
                    多
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" />
                    共 {heatmap.dayCount} 天 · 活跃 {heatmap.activeDays} 天
                  </span>
                </div>
              </div>

              {/* 汇总信息 */}
              <div className="grid grid-cols-2 gap-3 lg:w-[340px] shrink-0">
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">区间{metricLabel}</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">{formatValue(total)}</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">日均{metricLabel}</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">
                    {formatValue(avgPerDay)}
                  </div>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">峰值日</div>
                  {peakCell ? (
                    <div className="mt-1 flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatDateShort(peakCell.date)}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatValue(isCost ? peakCell.cost : peakCell.tokens)}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-1 text-sm text-muted-foreground">—</div>
                  )}
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">活跃率</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">
                    {heatmap.dayCount > 0
                      ? `${Math.round((heatmap.activeDays / heatmap.dayCount) * 100)}%`
                      : '—'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 flex items-center justify-center text-sm text-muted-foreground">
              {records.length === 0
                ? '暂无数据'
                : selectedModels.length === 0
                  ? '请至少选择一个模型'
                  : '当前时间范围内暂无数据'}
            </div>
          )}
        </div>
      </div>

      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: tooltip.below ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
          }}
        >
          <div className="font-medium mb-1.5 tabular-nums">{formatDayTitle(tooltip.cell.date)}</div>
          <div className="space-y-1 text-muted-foreground">
            <div className="flex items-center justify-between gap-6">
              <span>Tokens</span>
              <span className="font-semibold text-foreground tabular-nums">
                {formatNumber(tooltip.cell.tokens)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span>费用</span>
              <span className="font-semibold text-foreground tabular-nums">
                {formatUsd(tooltip.cell.cost)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span>请求</span>
              <span className="font-semibold text-foreground tabular-nums">
                {formatNumber(tooltip.cell.requests)}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
});
