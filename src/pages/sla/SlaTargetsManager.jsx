import { useEffect, useState } from 'react';
import { Plus, Trash2, X, Link2, ChevronDown, ChevronUp } from 'lucide-react';
import {
  fetchDesks, fetchSlaCompanies, fetchSlaTargets,
  createSlaTarget, deleteSlaTarget, linkDeskCompany,
} from '../../services/api';
import './SlaTargetsManager.css';

const SLA_TYPES = ['SLA1', 'SLA2', 'SLA1(30sec)', 'SLA2(45sec)'];
const ABD_TYPES = ['Abd1', 'Abd2', 'Abd1(30sec)'];

function emptyForm() {
  return {
    queue_name: '', desk_name: '', company_name: '',
    timeframe_bh: '60', timeframe_ooh: '60',
    sla_type: 'SLA1', abd_type: 'Abd1', other_type: '',
    target_ans_rate: '', target_abd_rate: '', target_other: '',
  };
}

export default function SlaTargetsManager({ token, onChanged }) {
  const [companies, setCompanies] = useState([]);
  const [desks, setDesks] = useState([]);
  const [targets, setTargets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [addingNewCompany, setAddingNewCompany] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function loadAll() {
    const [c, d, t] = await Promise.all([
      fetchSlaCompanies(token), fetchDesks(token), fetchSlaTargets(token),
    ]);
    if (c.companies) setCompanies(c.companies);
    if (d.desks) setDesks(d.desks);
    if (t.targets) setTargets(t.targets);
  }

  useEffect(() => { loadAll(); }, []); 

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.queue_name.trim()) {
      setMsg({ ok: false, text: 'Queue name is required.' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await createSlaTarget(token, form);
      if (res.error) {
        setMsg({ ok: false, text: res.error });
      } else {
        setMsg({ ok: true, text: 'Queue saved.' });
        setForm(emptyForm());
        setAddingNewCompany(false);
        await loadAll();
        onChanged?.();
      }
    } catch {
      setMsg({ ok: false, text: 'Could not save this queue — please try again.' });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this queue and its SLA target?')) return;
    await deleteSlaTarget(token, id);
    await loadAll();
    onChanged?.();
  }

  async function handleLink(deskId, companyId) {
    await linkDeskCompany(token, { desk_id: deskId, company_id: companyId || null });
    await loadAll();
    onChanged?.();
  }

  return (
    <div className="sla-manager">
      <div className="sla-manager-header">
        <button type="button" className="sla-manager-toggle" onClick={() => setShowForm((v) => !v)}>
          <Plus size={14} /> Add Queue
        </button>
        <button type="button" className="sla-manager-toggle sla-manager-toggle--ghost" onClick={() => setShowLinks((v) => !v)}>
          <Link2 size={14} /> Link desks to companies
        </button>
      </div>

      {showForm && (
        <form className="sla-add-queue-card" onSubmit={handleSubmit}>
          <div className="sla-add-queue-title">
            Add Queue
            <button type="button" className="sla-icon-btn" onClick={() => setShowForm(false)}><X size={14} /></button>
          </div>

          <div className="sla-add-queue-grid">
            <input
              className="sla-input" placeholder="Queue name" value={form.queue_name}
              onChange={(e) => set('queue_name', e.target.value)} required
            />

            {addingNewCompany ? (
              <input
                className="sla-input" placeholder="New company name" value={form.company_name}
                onChange={(e) => set('company_name', e.target.value)}
              />
            ) : (
              <select className="sla-input" value={form.company_name} onChange={(e) => {
                if (e.target.value === '__new__') { setAddingNewCompany(true); set('company_name', ''); }
                else set('company_name', e.target.value);
              }}>
                <option value="">Select company…</option>
                {companies.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                <option value="__new__">+ Add new company…</option>
              </select>
            )}
            {addingNewCompany && (
              <button type="button" className="sla-link-existing" onClick={() => { setAddingNewCompany(false); set('company_name', ''); }}>
                Use existing company instead
              </button>
            )}

            <select className="sla-input" value={form.desk_name} onChange={(e) => set('desk_name', e.target.value)}>
              <option value="">Select desk…</option>
              {desks.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>

            <input
              className="sla-input" type="number" placeholder="Timeframe BH (sec)" value={form.timeframe_bh}
              onChange={(e) => set('timeframe_bh', e.target.value)}
            />
            <input
              className="sla-input" type="number" placeholder="Timeframe OOH (sec)" value={form.timeframe_ooh}
              onChange={(e) => set('timeframe_ooh', e.target.value)}
            />

            <select className="sla-input" value={form.sla_type} onChange={(e) => set('sla_type', e.target.value)}>
              {SLA_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="sla-input" value={form.abd_type} onChange={(e) => set('abd_type', e.target.value)}>
              {ABD_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            <input
              className="sla-input" type="number" min="0" max="100" step="0.1" placeholder="Target answer rate (%)"
              value={form.target_ans_rate} onChange={(e) => set('target_ans_rate', e.target.value)}
            />
            <input
              className="sla-input" type="number" min="0" max="100" step="0.1" placeholder="Target abandon rate (%)"
              value={form.target_abd_rate} onChange={(e) => set('target_abd_rate', e.target.value)}
            />
          </div>

          <button type="button" className="sla-advanced-toggle" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Other SLA (optional)
          </button>
          {showAdvanced && (
            <div className="sla-add-queue-grid">
              <input
                className="sla-input" placeholder="Other SLA type" value={form.other_type}
                onChange={(e) => set('other_type', e.target.value)}
              />
              <input
                className="sla-input" type="number" min="0" max="100" step="0.1" placeholder="Other target rate (%)"
                value={form.target_other} onChange={(e) => set('target_other', e.target.value)}
              />
            </div>
          )}

          {msg && <div className={`sla-manager-msg ${msg.ok ? 'sla-manager-msg--ok' : 'sla-manager-msg--bad'}`}>{msg.text}</div>}

          <div className="sla-add-queue-actions">
            <button type="submit" className="sla-btn sla-btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Add'}</button>
            <button type="button" className="sla-btn sla-btn--ghost" onClick={() => { setShowForm(false); setForm(emptyForm()); }}>Cancel</button>
          </div>
        </form>
      )}

      {showLinks && (
        <div className="sla-add-queue-card">
          <div className="sla-add-queue-title">
            Link desks to companies
            <button type="button" className="sla-icon-btn" onClick={() => setShowLinks(false)}><X size={14} /></button>
          </div>
          <div className="sla-table-wrap">
            <table className="sla-table">
              <thead><tr><th>Desk</th><th>Company</th></tr></thead>
              <tbody>
                {desks.map((d) => (
                  <tr key={d.id}>
                    <td className="sla-cell-name">{d.name}</td>
                    <td>
                      <select
                        className="sla-input sla-input--compact"
                        value={d.company_id ?? ''}
                        onChange={(e) => handleLink(d.id, e.target.value ? Number(e.target.value) : null)}
                      >
                        <option value="">Not linked</option>
                        {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
                {desks.length === 0 && <tr><td colSpan={2} className="sla-empty-cell">No desks yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {targets.length > 0 && (
        <div className="sla-table-wrap sla-manager-list">
          <table className="sla-table">
            <thead>
              <tr><th>Queue</th><th>Desk</th><th>Company</th><th>BH</th><th>OOH</th><th>Target Ans.</th><th>Target Abd.</th><th></th></tr>
            </thead>
            <tbody>
              {targets.map((t) => (
                <tr key={t.id}>
                  <td className="sla-cell-name">{t.queue_name}</td>
                  <td>{t.desk_name || '—'}</td>
                  <td>{t.company_name || '—'}</td>
                  <td>{t.timeframe_bh ?? '—'}</td>
                  <td>{t.timeframe_ooh ?? '—'}</td>
                  <td>{t.target_ans_rate != null ? `${(t.target_ans_rate * 100).toFixed(0)}%` : '—'}</td>
                  <td>{t.target_abd_rate != null ? `${(t.target_abd_rate * 100).toFixed(0)}%` : '—'}</td>
                  <td>
                    <button type="button" className="sla-icon-btn sla-icon-btn--danger" onClick={() => handleDelete(t.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
