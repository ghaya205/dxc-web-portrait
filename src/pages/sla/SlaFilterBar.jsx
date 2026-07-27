import { RefreshCw } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad(n) { return String(n).padStart(2, '0'); }

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function weeksInMonth(year, monthIndex) {
  const total = daysInMonth(year, monthIndex);
  const weeks = [];
  let start = 1;
  let w = 1;
  while (start <= total) {
    const end = Math.min(start + 6, total);
    weeks.push({ label: `Week ${w}`, start, end });
    start = end + 1;
    w += 1;
  }
  return weeks;
}

export function computeDateRange({ year, month, week, dayNum }) {
  if (year && month !== '' && dayNum) {
    const y = Number(year);
    const m = Number(month);
    const dateStr = `${y}-${pad(m + 1)}-${pad(Number(dayNum))}`;
    return { dateFrom: dateStr, dateTo: dateStr };
  }

  if (year && month !== '' && week !== '') {
    const y = Number(year);
    const m = Number(month);
    const weeks = weeksInMonth(y, m);
    const wk = weeks[Number(week)];
    if (wk) {
      return {
        dateFrom: `${y}-${pad(m + 1)}-${pad(wk.start)}`,
        dateTo: `${y}-${pad(m + 1)}-${pad(wk.end)}`,
      };
    }
  }

  if (year && month !== '') {
    const y = Number(year);
    const m = Number(month);
    return {
      dateFrom: `${y}-${pad(m + 1)}-01`,
      dateTo: `${y}-${pad(m + 1)}-${pad(daysInMonth(y, m))}`,
    };
  }

  if (year) {
    return { dateFrom: `${year}-01-01`, dateTo: `${year}-12-31` };
  }

  return { dateFrom: null, dateTo: null };
}

const YEARS = [2024, 2025, 2026];

export default function SlaFilterBar({
  activeTab, onTabChange,
  filters, onFiltersChange,
  desks = [], companies = [], showCompanyFilter = false,
  onRefresh, loading,
}) {
  function set(field, value) {
    const next = { ...filters, [field]: value };
    
    if (field === 'year') { next.month = ''; next.week = ''; next.dayNum = ''; }
    if (field === 'month') { next.week = ''; next.dayNum = ''; }
    if (field === 'week') { next.dayNum = ''; }
    onFiltersChange(next);
  }

  const weekOptions = filters.year && filters.month !== ''
    ? weeksInMonth(Number(filters.year), Number(filters.month))
    : [];

  const dayCount = filters.year && filters.month !== ''
    ? daysInMonth(Number(filters.year), Number(filters.month))
    : 31;

  return (
    <div className="sla-filterbar">
      <div className="sla-filterbar-tabs">
        <button
          type="button"
          className={`sla-filterbar-tab${activeTab === 'realtime' ? ' active' : ''}`}
          onClick={() => onTabChange('realtime')}
        >
          Real Time Data
        </button>
        <button
          type="button"
          className={`sla-filterbar-tab${activeTab === 'historical' ? ' active' : ''}`}
          onClick={() => onTabChange('historical')}
        >
          Historical Data
        </button>
      </div>

      <div className="sla-filterbar-controls">
        {activeTab === 'historical' && (
          <>
            <select className="sla-select" value={filters.year} onChange={(e) => set('year', e.target.value)}>
              <option value="">All Years</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>

            <select className="sla-select" value={filters.month} onChange={(e) => set('month', e.target.value)} disabled={!filters.year}>
              <option value="">All Months</option>
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>

            <select className="sla-select" value={filters.week} onChange={(e) => set('week', e.target.value)} disabled={!filters.year || filters.month === ''}>
              <option value="">All Weeks</option>
              {weekOptions.map((w, i) => <option key={w.label} value={i}>{w.label}</option>)}
            </select>

            <select
              className="sla-select"
              value={filters.dayNum}
              onChange={(e) => set('dayNum', e.target.value)}
              disabled={!filters.year || filters.month === ''}
            >
              <option value="">All Days</option>
              {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </>
        )}

        <select className="sla-select" value={filters.deskName} onChange={(e) => set('deskName', e.target.value)}>
          <option value="">All Desks</option>
          {desks.map((d) => <option key={d.id ?? d.name} value={d.name}>{d.name}</option>)}
        </select>

        {showCompanyFilter && (
          <select className="sla-select" value={filters.companyId} onChange={(e) => set('companyId', e.target.value)}>
            <option value="">All Companies</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        <button type="button" className="sla-refresh-btn" onClick={onRefresh} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'sla-spin' : ''} /> Refresh
        </button>
      </div>
    </div>
  );
}

export function emptyFilters() {
  return { year: '', month: '', week: '', day: '', dayNum: '', deskName: '', companyId: '' };
}

export function groupSeriesForChart(series, filters) {
  const rows = series || [];

  if (!filters.year) {
    const byYear = new Map();
    rows.forEach((r) => {
      const y = (r.the_date || '').slice(0, 4);
      if (!y) return;
      const cur = byYear.get(y) || { a: 0, b: 0 };
      cur.a += Number(r.handled) || 0;
      cur.b += Number(r.abandoned) || 0;
      byYear.set(y, cur);
    });
    return [...byYear.entries()]
      .sort(([y1], [y2]) => y1.localeCompare(y2))
      .map(([label, v]) => ({ label, ...v }));
  }

  if (filters.month === '') {
    const byMonth = Array.from({ length: 12 }, () => ({ a: 0, b: 0 }));
    rows.forEach((r) => {
      const m = Number((r.the_date || '').slice(5, 7)) - 1;
      if (m < 0 || m > 11) return;
      byMonth[m].a += Number(r.handled) || 0;
      byMonth[m].b += Number(r.abandoned) || 0;
    });
    return MONTHS.map((label, i) => ({ label: label.slice(0, 3), ...byMonth[i] }));
  }

  const y = Number(filters.year);
  const m = Number(filters.month);

  if (filters.week === '') {
    const weeks = weeksInMonth(y, m);
    return weeks.map((wk) => {
      const acc = { a: 0, b: 0 };
      rows.forEach((r) => {
        const d = Number((r.the_date || '').slice(8, 10));
        const rm = Number((r.the_date || '').slice(5, 7)) - 1;
        const ry = Number((r.the_date || '').slice(0, 4));
        if (ry === y && rm === m && d >= wk.start && d <= wk.end) {
          acc.a += Number(r.handled) || 0;
          acc.b += Number(r.abandoned) || 0;
        }
      });
      return { label: wk.label, ...acc };
    });
  }

  const weeks = weeksInMonth(y, m);
  const wk = weeks[Number(filters.week)];
  if (!wk) return [];
  const days = [];
  for (let d = wk.start; d <= wk.end; d++) {
    const dateStr = `${y}-${pad(m + 1)}-${pad(d)}`;
    const row = rows.find((r) => r.the_date === dateStr);
    days.push({
      label: String(d),
      a: row ? Number(row.handled) || 0 : 0,
      b: row ? Number(row.abandoned) || 0 : 0,
    });
  }
  return days;
}
