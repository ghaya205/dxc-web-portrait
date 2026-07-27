import './SlaCharts.css';

function polarPoint(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const p1 = polarPoint(cx, cy, rOuter, endAngle);
  const p2 = polarPoint(cx, cy, rOuter, startAngle);
  const p3 = polarPoint(cx, cy, rInner, startAngle);
  const p4 = polarPoint(cx, cy, rInner, endAngle);
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 1 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ');
}

function fmtPct(v) {
  return `${(v * 100).toFixed(1)}%`;
}

export function DonutChart({ title, segments, size = 132, centerLabel }) {
  const total = segments.reduce((s, seg) => s + (seg.value || 0), 0);
  const r = size / 2;
  const rInner = r * 0.62;

  let angle = 0;
  const arcs = total > 0
    ? segments
        .filter((seg) => seg.value > 0)
        .map((seg) => {
          const start = angle;
          const sweep = (seg.value / total) * 360;
          angle += sweep;
          return { ...seg, start, end: angle };
        })
    : [];

  return (
    <div className="sla-donut">
      {title && <div className="sla-donut-title">{title}</div>}
      <div className="sla-donut-body">
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="sla-donut-svg">
          {total === 0 && (
            <circle cx={r} cy={r} r={rInner + (r - rInner) / 2} fill="none" stroke="#EEF0F5" strokeWidth={r - rInner} />
          )}
          {arcs.map((seg) => (
            <path key={seg.label} d={arcPath(r, r, r, rInner, seg.start, seg.end)} fill={seg.color} />
          ))}
          <text x={r} y={r - 2} textAnchor="middle" className="sla-donut-center-value">
            {centerLabel ?? total}
          </text>
          <text x={r} y={r + 14} textAnchor="middle" className="sla-donut-center-sub">total</text>
        </svg>
        <ul className="sla-donut-legend">
          {segments.map((seg) => (
            <li key={seg.label}>
              <span className="sla-donut-dot" style={{ background: seg.color }} />
              <span className="sla-donut-legend-label">{seg.label}</span>
              <span className="sla-donut-legend-value">
                {seg.value}{total > 0 ? ` · ${fmtPct(seg.value / total)}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function BarChart({ groups, seriesA, seriesB, height = 220 }) {
  const width = 640;
  const padL = 40, padR = 12, padT = 16, padB = 26;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  if (!groups || groups.length === 0) {
    return <div className="sla-trend-empty">No data for this period yet.</div>;
  }

  const maxV = Math.max(1, ...groups.flatMap((g) => [g.a || 0, g.b || 0]));
  const groupW = innerW / groups.length;
  const barW = Math.min(28, groupW * 0.32);
  const gap = 4;

  const y = (v) => padT + innerH - (v / maxV) * innerH;
  const barH = (v) => innerH - (y(v) - padT);

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="sla-trend">
      <svg viewBox={`0 0 ${width} ${height}`} className="sla-trend-svg" preserveAspectRatio="none">
        {gridLines.map((g) => (
          <line key={g} x1={padL} x2={width - padR} y1={padT + innerH * (1 - g)} y2={padT + innerH * (1 - g)} className="sla-trend-grid" />
        ))}
        {groups.map((grp, i) => {
          const cx = padL + groupW * i + groupW / 2;
          const xa = cx - barW - gap / 2;
          const xb = cx + gap / 2;
          return (
            <g key={grp.label}>
              <rect x={xa} y={y(grp.a || 0)} width={barW} height={barH(grp.a || 0)} fill={seriesA.color} rx="2" />
              <rect x={xb} y={y(grp.b || 0)} width={barW} height={barH(grp.b || 0)} fill={seriesB.color} rx="2" />
              <text x={cx} y={height - 6} textAnchor="middle" className="sla-trend-axis-label">{grp.label}</text>
            </g>
          );
        })}
        <text x={4} y={padT + 4} className="sla-trend-axis-label">{maxV}</text>
        <text x={4} y={padT + innerH} className="sla-trend-axis-label">0</text>
      </svg>
      <div className="sla-trend-legend">
        <span><span className="sla-donut-dot" style={{ background: seriesA.color }} /> {seriesA.label}</span>
        <span><span className="sla-donut-dot" style={{ background: seriesB.color }} /> {seriesB.label}</span>
      </div>
    </div>
  );
}
