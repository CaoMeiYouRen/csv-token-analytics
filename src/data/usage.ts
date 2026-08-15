// EXPORTS: IUsageRecord, parseCsv, formatNumber, formatUsd, formatDateShort, aggregateByGranularity

export interface IUsageRecord {
  date: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  requests: number;
  sessions: number;
}

function normalizeDate(raw: string): string {
  const m = raw.trim().match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (!m) return raw;
  const [, y, mo, d] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/**
 * 解析 CSV 文本为 IUsageRecord[]
 * 支持带 BOM、引号包裹字段、换行符在引号内等常见场景
 * 日期支持 YYYY-MM-DD 或 YYYY/M/D 等分隔符与不补零写法，统一规范化为 YYYY-MM-DD
 */
export function parseCsv(text: string): IUsageRecord[] {
  const cleaned = text.replace(/^\uFEFF/, '').trim();
  if (!cleaned) return [];

  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inQuotes) {
      if (ch === '"') {
        if (cleaned[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && cleaned[i + 1] === '\n') i++;
        currentRow.push(currentField);
        lines.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += ch;
      }
    }
  }
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    lines.push(currentRow);
  }

  if (lines.length < 2) return [];

  const header = lines[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);

  const records: IUsageRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (row.length === 1 && row[0] === '') continue;
    records.push({
      date: normalizeDate((row[idx('date')] || '').trim()),
      model: (row[idx('model')] || '').trim(),
      input_tokens: Number(row[idx('input_tokens')]) || 0,
      output_tokens: Number(row[idx('output_tokens')]) || 0,
      total_tokens: Number(row[idx('total_tokens')]) || 0,
      cost_usd: Number(row[idx('cost_usd')]) || 0,
      requests: Number(row[idx('requests')]) || 0,
      sessions: Number(row[idx('sessions')]) || 0,
    });
  }
  return records;
}

export function formatNumber(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.round(n).toLocaleString('en-US');
}

export function formatUsd(n: number): string {
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 1) return '$' + n.toFixed(2);
  return '$' + n.toFixed(4);
}

export function formatDateShort(d: string): string {
  // YYYY-MM-DD → MM/DD
  const parts = d.split('-');
  if (parts.length !== 3) return d;
  return `${parts[1]}/${parts[2]}`;
}

export type Granularity = 'day' | 'week' | 'month';

interface AggregatedRecord {
  period: string; // display label (date or week label or month)
  model: string;
  total_tokens: number;
  cost_usd: number;
  requests: number;
  sessions: number;
  input_tokens: number;
  output_tokens: number;
}

/**
 * 按粒度聚合数据。返回按 period 升序、model 分组的聚合记录。
 * - day: 原始日粒度
 * - week: 按 ISO 周（周一为一周开始）聚合，label 为周起始日期 YYYY-MM-DD
 * - month: 按自然月聚合，label 为 YYYY-MM
 */
export function aggregateByGranularity(
  records: IUsageRecord[],
  granularity: Granularity,
): AggregatedRecord[] {
  if (granularity === 'day') {
    return records
      .slice()
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((r) => ({
        period: r.date,
        model: r.model,
        total_tokens: r.total_tokens,
        cost_usd: r.cost_usd,
        requests: r.requests,
        sessions: r.sessions,
        input_tokens: r.input_tokens,
        output_tokens: r.output_tokens,
      }));
  }

  const map = new Map<string, AggregatedRecord>();

  for (const r of records) {
    const period = getPeriodLabel(r.date, granularity);
    const key = `${period}__${r.model}`;
    const existing = map.get(key);
    if (existing) {
      existing.total_tokens += r.total_tokens;
      existing.cost_usd += r.cost_usd;
      existing.requests += r.requests;
      existing.sessions += r.sessions;
      existing.input_tokens += r.input_tokens;
      existing.output_tokens += r.output_tokens;
    } else {
      map.set(key, {
        period,
        model: r.model,
        total_tokens: r.total_tokens,
        cost_usd: r.cost_usd,
        requests: r.requests,
        sessions: r.sessions,
        input_tokens: r.input_tokens,
        output_tokens: r.output_tokens,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => (a.period < b.period ? -1 : 1));
}

function getPeriodLabel(dateStr: string, granularity: Granularity): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (granularity === 'month') {
    return dateStr.slice(0, 7); // YYYY-MM
  }
  // week: ISO week start (Monday)
  const day = d.getDay(); // 0=Sun, 1=Mon ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  return monday.toISOString().slice(0, 10);
}
