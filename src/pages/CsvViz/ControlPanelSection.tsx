import { memo } from 'react';
import { Calendar, Layers, Cpu } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Input } from '@/components/ui/input';
import type { Granularity } from '@/data/usage';
import { CHART_COLORS } from '@/lib/chart-colors';

interface ControlPanelProps {
  granularity: Granularity;
  onGranularityChange: (g: Granularity) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  minDate: string;
  maxDate: string;
  models: string[];
  selectedModels: string[];
  onToggleModel: (model: string) => void;
  onSelectAll: () => void;
}

export default memo(function ControlPanel({
  granularity,
  onGranularityChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  minDate,
  maxDate,
  models,
  selectedModels,
  onToggleModel,
  onSelectAll,
}: ControlPanelProps) {
  const allSelected = selectedModels.length === models.length && models.length > 0;

  return (
    <section className="w-full">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="rounded-xl border border-border/60 bg-card p-4 md:p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
            {/* 汇总粒度 */}
            <div className="md:col-span-4">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="size-4 text-muted-foreground" />
                <Label className="text-sm font-medium">汇总粒度</Label>
              </div>
              <ToggleGroup
                type="single"
                value={granularity}
                onValueChange={(v) => v && onGranularityChange(v as Granularity)}
                className="justify-start"
              >
                <ToggleGroupItem value="day" className="flex-1 md:flex-none">
                  日
                </ToggleGroupItem>
                <ToggleGroupItem value="week" className="flex-1 md:flex-none">
                  周
                </ToggleGroupItem>
                <ToggleGroupItem value="month" className="flex-1 md:flex-none">
                  月
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* 时间范围 */}
            <div className="md:col-span-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="size-4 text-muted-foreground" />
                <Label className="text-sm font-medium">时间范围</Label>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={startDate}
                  min={minDate}
                  max={maxDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="text-sm"
                />
                <span className="text-muted-foreground text-xs">至</span>
                <Input
                  type="date"
                  value={endDate}
                  min={minDate}
                  max={maxDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>

            {/* 模型筛选 */}
            <div className="md:col-span-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Cpu className="size-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">模型筛选</Label>
                </div>
                <button
                  onClick={onSelectAll}
                  className="text-xs text-primary hover:underline"
                  type="button"
                >
                  {allSelected ? '取消全选' : '全选'}
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {models.map((model, i) => {
                  const color = CHART_COLORS[i % CHART_COLORS.length];
                  const checked = selectedModels.includes(model);
                  return (
                    <label
                      key={model}
                      className="flex items-center gap-2 cursor-pointer select-none"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => onToggleModel(model)}
                        style={
                          checked
                            ? { ['--color-primary' as string]: color, backgroundColor: color, borderColor: color }
                            : undefined
                        }
                      />
                      <span
                        className="text-sm"
                        style={{ color: checked ? color : undefined }}
                      >
                        {model}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
