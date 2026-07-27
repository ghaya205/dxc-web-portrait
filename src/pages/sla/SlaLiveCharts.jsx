import './SlaLiveCharts.css';

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

function hourFrame(hourly) {
  const byHour = new Map((hourly || []).map((r) => [Number(r.hour), r]));
  return Array.from({ length: 24 }, (_, h) => {
    const row = byHour.get(h);
    const offered = Number(row?.offered) || 0;
    const handled = Number(row?.handled) || 0;
    const abandoned = Number(row?.abandoned) || 0;
    const answeredLt40 = Number(row?.answered_lt40) || 0;
    return {
      hour: h,
      offered,
      handled,
      abandoned,
      answeredRate: offered > 0 ? answeredLt40 / offered : null,
    };
  });
}

function flattenQueues(companies) {
  const queues = [];
  for (const c of companies || []) {
    for (const desk of c.children || []) {
      for (const q of desk.children || []) {
        if (q.offered > 0) queues.push(q);
      }
    }
  }
  return queues;
}

export function ComplianceGauge({ companies, title = 'Overall SLA Compliance' }) {
  const queues = flattenQueues(companies).filter((q) => q.meets_answer_target !== null && q.meets_answer_target !== undefined);
  const total = queues.length;
  const onTarget = queues.filter((q) => q.meets_answer_target).length;
  const rate = total > 0 ? onTarget / total : null;

  const size = 150;
  const r = size / 2 - 12;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const sweep = rate !== null ? rate * circumference : 0;

  const color = rate === null ? '#D8DCE6' : rate >= 0.9 ? '#4CB3A4' : rate >= 0.7 ? '#F0C36D' : 'var(--dxc-coral)';

  return (
    <div className="sla-live-chart sla-live-chart--center">
      <div className="sla-live-chart-title">{title}</div>
      <div className="sla-live-gauge-body">
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EEF0F5" strokeWidth={12} />
          {rate !== null && (
            <circle
              cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={12}
              strokeDasharray={`${sweep} ${circumference}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          )}
          <text x={cx} y={cy - 2} textAnchor="middle" className="sla-live-gauge-value">
            {rate !== null ? pct(rate) : '—'}
          </text>
          <text x={cx} y={cy + 16} textAnchor="middle" className="sla-live-gauge-sub">
            {total > 0 ? `${onTarget}/${total} queues on target` : 'No data for today yet.'}
          </text>
        </svg>
      </div>
    </div>
  );
}

export function TopQueuesByVolume({ companies, title = 'Top 5 Busiest Queues' }) {
  const queues = flattenQueues(companies);
  const top = [...queues].sort((a, b) => (b.offered || 0) - (a.offered || 0)).slice(0, 5);

  return (
    <div className="sla-live-chart">
      <div className="sla-live-chart-title">{title}</div>
      {top.length === 0 ? (
        <div className="sla-live-chart-empty">No data for today yet.</div>
      ) : (
        <div className="sla-live-hbar-list">
          {top.map((q) => {
            const max = top[0].offered || 1;
            const w = Math.max(4, (q.offered / max) * 100);
            return (
              <div key={q.name} className="sla-live-hbar-row">
                <div className="sla-live-hbar-label">{q.name}</div>
                <div className="sla-live-hbar-track">
                  <div className="sla-live-hbar-fill" style={{ width: `${w}%` }} />
                </div>
                <div className="sla-live-hbar-value">{q.offered}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AnswerRateTrend({ hourly, targetRate = 0.9, title = 'Answer Rate Trend (Today)' }) {
  const frame = hourFrame(hourly);
  const active = frame.filter((f) => f.offered > 0);

  const width = 320, height = 170;
  const padL = 30, padR = 10, padT = 14, padB = 22;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  if (active.length === 0) {
    return (
      <div className="sla-live-chart">
        <div className="sla-live-chart-title">{title}</div>
        <div className="sla-live-chart-empty">No data for today yet.</div>
      </div>
    );
  }

  const x = (h) => padL + (h / 23) * innerW;
  const y = (v) => padT + innerH - v * innerH;

  const withData = frame.filter((f) => f.answeredRate !== null);
  const linePoints = withData.map((f) => `${x(f.hour)},${y(f.answeredRate)}`).join(' ');
  const areaPoints = withData.length
    ? `${x(withData[0].hour)},${y(0)} ${linePoints} ${x(withData[withData.length - 1].hour)},${y(0)}`
    : '';

  return (
    <div className="sla-live-chart">
      <div className="sla-live-chart-title">{title}</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="sla-live-chart-svg" preserveAspectRatio="none">
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={padL} x2={width - padR} y1={y(g)} y2={y(g)} className="sla-live-grid" />
        ))}
        <line x1={padL} x2={width - padR} y1={y(targetRate)} y2={y(targetRate)} className="sla-live-target-line" />
        {areaPoints && <polygon points={areaPoints} className="sla-live-trend-area" />}
        <polyline points={linePoints} className="sla-live-trend-line" fill="none" />
        {withData.map((f) => (
          <circle key={f.hour} cx={x(f.hour)} cy={y(f.answeredRate)} r={2.6} className="sla-live-trend-dot" />
        ))}
        {[0, 6, 12, 18, 23].map((h) => (
          <text key={h} x={x(h)} y={height - 6} textAnchor="middle" className="sla-live-axis-label">{String(h).padStart(2, '0')}h</text>
        ))}
        <text x={2} y={y(1) + 4} className="sla-live-axis-label">100%</text>
        <text x={2} y={y(0)} className="sla-live-axis-label">0%</text>
      </svg>
      <div className="sla-live-chart-legend">
        <span><span className="sla-live-dot" style={{ background: 'var(--dxc-coral)' }} /> Answered &lt;40s</span>
        <span><span className="sla-live-dash" /> Target {pct(targetRate)}</span>
      </div>
    </div>
  );
}

export function QueuesNeedingAttention({ companies, title = 'Queues Needing Attention' }) {
  const queues = flattenQueues(companies).filter((q) => q.meets_answer_target === false);
  const worst = [...queues].sort((a, b) => (a.answer_rate ?? 1) - (b.answer_rate ?? 1)).slice(0, 5);

  return (
    <div className="sla-live-chart">
      <div className="sla-live-chart-title">{title}</div>
      {worst.length === 0 ? (
        <div className="sla-live-chart-empty">All queues on target 🎉</div>
      ) : (
        <ul className="sla-live-attention-list">
          {worst.map((q) => (
            <li key={q.name} className="sla-live-attention-row">
              <span className="sla-live-attention-dot" />
              <span className="sla-live-attention-name">{q.name}</span>
              <span className="sla-live-attention-rate">{pct(q.answer_rate)}</span>
              <span className="sla-live-attention-sub">avg {secs(q.avg_aht)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
