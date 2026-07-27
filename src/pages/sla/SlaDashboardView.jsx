import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone, PhoneMissed, Trophy, TrendingUp, Zap, Gauge, Clock3,
  ChevronDown, ChevronRight, Building2, RefreshCw, AlertCircle, Radio, Settings2,
} from 'lucide-react';
import {
  fetchSlaCompanies, fetchAdminSlaDashboard, fetchSupervisorSlaDashboard, fetchDesks,
} from '../../services/api';
import SlaFilterBar, { computeDateRange, emptyFilters, groupSeriesForChart } from './SlaFilterBar';
import { DonutChart, BarChart } from './SlaCharts';
import { ComplianceGauge, TopQueuesByVolume, AnswerRateTrend, QueuesNeedingAttention } from './SlaLiveCharts';
import ImportPanel from './ImportPanel';
import './SlaDashboardView.css';

const DONUT_PALETTE = ['#E8643A', '#F5A05A', '#7B8FD4', '#4CB3A4', '#C79FE0', '#F0C36D', '#8FA0B3'];

function topDesksByVolume(companyList, max = 6) {
  const desks = companyList.flatMap((c) => c.children || []);
  const sorted = [...desks].sort((a, b) => (b.offered || 0) - (a.offered || 0));
  const top = sorted.slice(0, max);
  const rest = sorted.slice(max);
  const segments = top.map((d, i) => ({ label: d.name, value: d.offered || 0, color: DONUT_PALETTE[i % DONUT_PALETTE.length] }));
  if (rest.length) {
    segments.push({
      label: 'Other',
      value: rest.reduce((s, d) => s + (d.offered || 0), 0),
      color: '#D8DCE6',
    });
  }
  return segments;
}

function pct(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${(v * 100).toFixed(1)}%`;
}

function secs(v) {
  if (v === null || v === undefined) return '—';
  const s = Math.round(v);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="sla-stat-card">
      <div className="sla-stat-icon"><Icon size={16} /></div>
      <div className="sla-stat-label">{label}</div>
      <div className="sla-stat-value">{value}</div>
      {sub && <div className="sla-stat-sub">{sub}</div>}
    </div>
  );
}

function TargetPill({ ok }) {
  if (ok === null || ok === undefined) return <span className="sla-pill sla-pill--muted">No target</span>;
  return ok
    ? <span className="sla-pill sla-pill--good">On target</span>
    : <span className="sla-pill sla-pill--bad">Below target</span>;
}

function DeskRow({ desk }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="sla-row sla-row--desk" onClick={() => setOpen((v) => !v)}>
        <td className="sla-cell-name">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {desk.name}
        </td>
        <td>{desk.offered}</td>
        <td>{desk.handled}</td>
        <td>{desk.abandoned}</td>
        <td>{pct(desk.answer_rate)}</td>
        <td>{pct(desk.abandon_rate)}</td>
        <td>{desk.target_answer_rate != null ? pct(desk.target_answer_rate) : '—'}</td>
        <td><TargetPill ok={desk.meets_answer_target} /></td>
        <td>{secs(desk.avg_asa)}</td>
        <td>{secs(desk.avg_aht)}</td>
        <td>{secs(desk.avg_hold)}</td>
      </tr>
      {open && desk.children?.map((q) => (
        <tr className="sla-row sla-row--queue" key={q.name}>
          <td className="sla-cell-name sla-cell-name--queue">{q.name}</td>
          <td>{q.offered}</td>
          <td>{q.handled}</td>
          <td>{q.abandoned}</td>
          <td>{pct(q.answer_rate)}</td>
          <td>{pct(q.abandon_rate)}</td>
          <td>—</td>
          <td>—</td>
          <td>{secs(q.avg_asa)}</td>
          <td>{secs(q.avg_aht)}</td>
          <td>{secs(q.avg_hold)}</td>
        </tr>
      ))}
    </>
  );
}

function CompanyCard({ company, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="sla-company-card">
      <div className="sla-company-header" onClick={() => setOpen((v) => !v)}>
        <div className="sla-company-title">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <Building2 size={16} className="sla-company-icon" />
          <span>{company.name}</span>
        </div>
        <div className="sla-company-metrics">
          <span>{company.offered} offered</span>
          <span>{pct(company.answer_rate)} answered</span>
          <TargetPill ok={company.meets_answer_target} />
        </div>
      </div>
      {open && (
        <div className="sla-table-wrap">
          <table className="sla-table">
            <thead>
              <tr>
                <th>Desk</th><th>Offered</th><th>Handled</th><th>Abandoned</th>
                <th>Answer rate</th><th>Abandon rate</th><th>Target</th><th>Status</th>
                <th>ASA</th><th>AHT</th><th>Avg hold</th>
              </tr>
            </thead>
            <tbody>
              {company.children.map((desk) => <DeskRow key={desk.name} desk={desk} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LiveDashboard({ connected, data }) {
  const overview = data?.overview;
  const highlights = data?.highlights || {};
  const companyList = data?.companies || [];

  return (
    <div className="sla-live-dashboard">
      <div className={`sla-live-status ${connected ? 'sla-live-status--on' : 'sla-live-status--off'}`}>
        <Radio size={16} />
        {connected ? 'Live — updates automatically as new data arrives' : 'Connecting…'}
      </div>

      {!data && (
        <div className="sla-state-msg"><RefreshCw size={20} className="sla-spin" /> Waiting for live data…</div>
      )}

      {data && (
        <>
          <div className="sla-stats-grid">
            <StatCard icon={Phone} label="Total Handled" value={overview?.handled ?? 0} sub={`of ${overview?.offered ?? 0} offered`} />
            <StatCard icon={PhoneMissed} label="Total Abandoned" value={overview?.abandoned ?? 0}
              sub={overview?.offered ? `${((overview.abandoned / overview.offered) * 100).toFixed(1)}% of offered` : null} />
            <StatCard icon={Trophy} label="Best Answer Rate" value={highlights.best_answer_rate ? pct(highlights.best_answer_rate.value) : '—'}
              sub={highlights.best_answer_rate?.name} />
            <StatCard icon={TrendingUp} label="Highest Volume" value={highlights.highest_volume?.value ?? '—'} sub={highlights.highest_volume?.name} />
            <StatCard icon={Zap} label="Fastest Response" value={highlights.fastest_response ? secs(highlights.fastest_response.value) : '—'}
              sub={highlights.fastest_response?.name} />
            <StatCard icon={Gauge} label="Best Efficiency" value={highlights.best_efficiency ? secs(highlights.best_efficiency.value) : '—'}
              sub={highlights.best_efficiency?.name} />
            <StatCard icon={Clock3} label="Shortest Hold" value={highlights.shortest_hold ? secs(highlights.shortest_hold.value) : '—'}
              sub={highlights.shortest_hold?.name} />
          </div>

          <div className="sla-charts-row">
            <DonutChart
              title="Handled vs Abandoned"
              centerLabel={overview?.offered ?? 0}
              segments={[
                { label: 'Handled', value: overview?.handled ?? 0, color: '#7B8FD4' },
                { label: 'Abandoned', value: overview?.abandoned ?? 0, color: '#E8643A' },
              ]}
            />
            <DonutChart
              title="Volume by Desk"
              centerLabel={overview?.offered ?? 0}
              segments={topDesksByVolume(companyList)}
            />
          </div>

          <div className="sla-live-charts-grid">
            <ComplianceGauge companies={companyList} />
            <TopQueuesByVolume companies={companyList} />
            <AnswerRateTrend hourly={data?.hourly} />
            <QueuesNeedingAttention companies={companyList} />
          </div>
        </>
      )}
    </div>
  );
}

export default function SlaDashboardView({ mode, token }) {
  const [tab, setTab] = useState('historical');
  const [data, setData] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [desks, setDesks] = useState([]);
  const [filters, setFilters] = useState(emptyFilters());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [liveData, setLiveData] = useState(null);
  const [liveConnected, setLiveConnected] = useState(false);

  const { dateFrom, dateTo } = computeDateRange(filters);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = mode === 'admin'
        ? await fetchAdminSlaDashboard(token, { companyId: filters.companyId, dateFrom, dateTo, deskName: filters.deskName })
        : await fetchSupervisorSlaDashboard(token, { dateFrom, dateTo, deskName: filters.deskName });
      if (res.error) setError(res.error);
      else setData(res);
    } catch {
      setError('Could not load the dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
    
  }, [mode, token, filters.companyId, filters.deskName, dateFrom, dateTo]);

  useEffect(() => {
    fetchDesks(token).then((res) => setDesks(res.desks || []));
    if (mode === 'admin') {
      fetchSlaCompanies(token).then((res) => setCompanies(res.companies || []));
    }
    
  }, []);

  useEffect(() => {
    if (tab === 'historical') load();
  }, [load, tab]);

  useEffect(() => {
    if (tab !== 'realtime') {
      setLiveConnected(false);
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const res = mode === 'admin'
          ? await fetchAdminSlaDashboard(token, { companyId: filters.companyId, dateFrom: todayStr, dateTo: todayStr, deskName: filters.deskName })
          : await fetchSupervisorSlaDashboard(token, { dateFrom: todayStr, dateTo: todayStr, deskName: filters.deskName });
        if (cancelled) return;
        if (res.error) {
          setLiveConnected(false);
          return;
        }
        setLiveData(res);
        setLiveConnected(true);
      } catch {
        if (!cancelled) setLiveConnected(false);
      }
    };

    poll(); 
    const intervalId = setInterval(poll, 4000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
    
  }, [tab, token, mode, filters.companyId, filters.deskName, todayStr]);

  const overview = data?.overview;
  const highlights = data?.highlights || {};
  const companyList = data?.companies || [];

  return (
    <div className="sla-dashboard">
      <SlaFilterBar
        activeTab={tab}
        onTabChange={setTab}
        filters={filters}
        onFiltersChange={setFilters}
        desks={desks}
        companies={companies}
        showCompanyFilter={mode === 'admin'}
        onRefresh={load}
        loading={loading}
      />

      {tab === 'realtime' && (
        <LiveDashboard connected={liveConnected} data={liveData} />
      )}

      {tab === 'historical' && (
        <>
          {mode === 'admin' && (
            <div className="sla-toolbar sla-toolbar--import">
              <Link to="/admin/sla-queues" className="sla-manage-queues-link">
                <Settings2 size={14} /> Manage Queues &amp; Import Data
              </Link>
            </div>
          )}

          {loading && !data && (
            <div className="sla-state-msg"><RefreshCw size={20} className="sla-spin" /> Loading SLA data…</div>
          )}

          {!loading && error && (
            <div className="sla-state-msg sla-state-msg--error">
              <AlertCircle size={20} />
              <p>{error}</p>
              {mode === 'admin' && <ImportPanel token={token} onImported={load} />}
            </div>
          )}

          {!error && data && (
            <>
              <div className="sla-stats-grid">
                <StatCard icon={Phone} label="Total Handled" value={overview?.handled ?? 0} sub={`of ${overview?.offered ?? 0} offered`} />
                <StatCard icon={PhoneMissed} label="Total Abandoned" value={overview?.abandoned ?? 0}
                  sub={overview?.offered ? `${((overview.abandoned / overview.offered) * 100).toFixed(1)}% of offered` : null} />
                <StatCard icon={Trophy} label="Best Answer Rate" value={highlights.best_answer_rate ? pct(highlights.best_answer_rate.value) : '—'}
                  sub={highlights.best_answer_rate?.name} />
                <StatCard icon={TrendingUp} label="Highest Volume" value={highlights.highest_volume?.value ?? '—'} sub={highlights.highest_volume?.name} />
                <StatCard icon={Zap} label="Fastest Response" value={highlights.fastest_response ? secs(highlights.fastest_response.value) : '—'}
                  sub={highlights.fastest_response?.name} />
                <StatCard icon={Gauge} label="Best Efficiency" value={highlights.best_efficiency ? secs(highlights.best_efficiency.value) : '—'}
                  sub={highlights.best_efficiency?.name} />
                <StatCard icon={Clock3} label="Shortest Hold" value={highlights.shortest_hold ? secs(highlights.shortest_hold.value) : '—'}
                  sub={highlights.shortest_hold?.name} />
              </div>

              <div className="sla-charts-row">
                <DonutChart
                  title="Handled vs Abandoned"
                  centerLabel={overview?.offered ?? 0}
                  segments={[
                    { label: 'Handled', value: overview?.handled ?? 0, color: '#7B8FD4' },
                    { label: 'Abandoned', value: overview?.abandoned ?? 0, color: '#E8643A' },
                  ]}
                />
                <DonutChart
                  title="Volume by Desk"
                  centerLabel={overview?.offered ?? 0}
                  segments={topDesksByVolume(companyList)}
                />
                <BarChart
                  groups={groupSeriesForChart(data?.series, filters)}
                  seriesA={{ key: 'handled', label: 'Handled', color: '#E8643A' }}
                  seriesB={{ key: 'abandoned', label: 'Abandoned', color: '#9CA3AF' }}
                />
              </div>

              <div className="sla-companies-list">
                {companyList.length === 0 && (
                  <div className="sla-state-msg">No SLA data yet for this scope. Import the SLA targets and interval data to get started.</div>
                )}
                {companyList.map((c, i) => <CompanyCard key={c.name} company={c} defaultOpen={i === 0 && companyList.length === 1} />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
