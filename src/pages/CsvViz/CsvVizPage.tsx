import { useCallback, useEffect, useMemo, useState } from 'react';
import UploadSection from './UploadSection';
import ControlPanelSection from './ControlPanelSection';
import ChartSection from './ChartSection';
import StatsSection from './StatsSection';
import ModelPriceSection from './ModelPriceSection';
import type { Granularity, IUsageRecord } from '@/data/usage';

export default function CsvVizPage() {
  const [records, setRecords] = useState<IUsageRecord[]>([]);
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  const models = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) set.add(r.model);
    return Array.from(set);
  }, [records]);

  // 记录变化时重置时间范围 + 模型筛选
  useEffect(() => {
    if (records.length === 0) {
      setStartDate('');
      setEndDate('');
      setSelectedModels([]);
      return;
    }
    const dates = records.map((r) => r.date);
    const min = dates.reduce((a, b) => (a < b ? a : b));
    const max = dates.reduce((a, b) => (a > b ? a : b));
    setStartDate(min);
    setEndDate(max);
    setSelectedModels(models);
  }, [records, models]);

  const handleRecordsChange = useCallback((newRecords: IUsageRecord[]) => {
    setRecords(newRecords);
  }, []);

  const handleToggleModel = useCallback((model: string) => {
    setSelectedModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model],
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedModels.length === models.length && models.length > 0) {
      setSelectedModels([]);
    } else {
      setSelectedModels(models);
    }
  }, [selectedModels.length, models]);

  const minDate = useMemo(() => {
    if (records.length === 0) return '';
    return records.map((r) => r.date).reduce((a, b) => (a < b ? a : b));
  }, [records]);

  const maxDate = useMemo(() => {
    if (records.length === 0) return '';
    return records.map((r) => r.date).reduce((a, b) => (a > b ? a : b));
  }, [records]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <main className="py-8 md:py-10 space-y-6 md:space-y-8">
        <UploadSection
          records={records}
          onRecordsChange={handleRecordsChange}
        />
        <ControlPanelSection
          granularity={granularity}
          onGranularityChange={setGranularity}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          minDate={minDate}
          maxDate={maxDate}
          models={models}
          selectedModels={selectedModels}
          onToggleModel={handleToggleModel}
          onSelectAll={handleSelectAll}
        />
        <ChartSection
          records={records}
          granularity={granularity}
          selectedModels={selectedModels}
          startDate={startDate}
          endDate={endDate}
        />
        <StatsSection records={records} startDate={startDate} endDate={endDate} />
        <ModelPriceSection records={records} startDate={startDate} endDate={endDate} />
      </main>
    </div>
  );
}
