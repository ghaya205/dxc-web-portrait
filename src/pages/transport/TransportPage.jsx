import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import {
  fetchTransportAgents, createTransportDraft, fetchMyTransportDrafts,
  fetchMyTransportHistory, fetchTransportDetail, addTransportItems,
  updateTransportItem, deleteTransportItem, applyTransportToAll, sendTransportRequest,
} from '../../services/api';
import {
  Bus, Plus, Trash2, Send, Clock, MapPin, AlertCircle, CheckCircle2,
  History as HistoryIcon, Pencil, X, Users,
} from 'lucide-react';
import './TransportPage.css';

const DIRECTIONS = [
  { value: 'aller_retour', label: 'Aller / Retour' },
  { value: 'aller', label: 'Aller' },
  { value: 'retour', label: 'Retour' },
];

const VEHICLE_TYPES = [
  { value: 'taxi', label: 'Taxi (max 4 agents)' },
  { value: 'bus', label: 'Bus' },
];

function StatusPill({ status }) {
  const map = {
    draft: 'transport-pill--draft',
    pending: 'transport-pill--pending',
    approved: 'transport-pill--approved',
    rejected: 'transport-pill--rejected',
  };
  return <span className={`transport-pill ${map[status] ?? ''}`}>{status}</span>;
}

function DaysPicker({ days, onChange }) {
  const [next, setNext] = useState('');

  function add() {
    if (!next || days.includes(next)) return;
    onChange([...days, next].sort());
    setNext('');
  }

  function remove(day) {
    onChange(days.filter((d) => d !== day));
  }

  return (
    <div className="transport-days-picker">
      <div className="transport-days-chips">
        {days.length === 0 && <span className="transport-days-empty">No days selected</span>}
        {days.map((d) => (
          <span key={d} className="transport-day-chip">
            {d}
            <button type="button" onClick={() => remove(d)}><X size={11} /></button>
          </span>
        ))}
      </div>
      <div className="transport-days-add">
        <input className="profile-input" type="date" value={next} onChange={(e) => setNext(e.target.value)} />
        <button type="button" className="profile-save-btn profile-save-btn--outline" onClick={add}>
          <Plus size={13} /> Add day
        </button>
      </div>
    </div>
  );
}

export default function TransportPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState('planning');
  const [agents, setAgents] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const [selectedAgents, setSelectedAgents] = useState([]);
  const [vehicleType, setVehicleType] = useState('taxi');
  const [direction, setDirection] = useState('aller_retour');
  const [pickupTime, setPickupTime] = useState('07:30');
  const [returnTime, setReturnTime] = useState('17:00');
  const [days, setDays] = useState([]);
  const [showApplyAll, setShowApplyAll] = useState(false);

  const loadLists = useCallback(async () => {
    setLoading(true);
    try {
      const [agentsData, draftsData, historyData] = await Promise.all([
        fetchTransportAgents(token),
        fetchMyTransportDrafts(token),
        fetchMyTransportHistory(token),
      ]);
      setAgents(agentsData.agents ?? []);
      setDrafts(draftsData.requests ?? []);
      setHistory(historyData.requests ?? []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    (async () => {
      await loadLists();
    })();
  }, [loadLists]);

  const loadActive = useCallback(async (id) => {
    const data = await fetchTransportDetail(token, id);
    setActive(data.request ?? null);
  }, [token]);

  useEffect(() => {
    if (activeId) {
      (async () => {
        await loadActive(activeId);
      })();
    }
  }, [activeId, loadActive]);

  async function handleNewDraft() {
    setErr(''); setMsg('');
    const data = await createTransportDraft(token);
    if (data.error) { setErr(data.error); return; }
    await loadLists();
    setActiveId(data.id);
  }

  function toggleAgent(id) {
    setSelectedAgents((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  }

  async function handleAddAgents() {
    setErr(''); setMsg('');
    if (!selectedAgents.length) { setErr('Select at least one agent.'); return; }
    if (!days.length) { setErr('Select at least one day.'); return; }
    const data = await addTransportItems(token, {
      request_id: activeId,
      agent_ids: selectedAgents,
      vehicle_type: vehicleType,
      direction,
      pickup_time: pickupTime,
      return_time: direction !== 'aller' ? returnTime : null,
      days,
    });
    if (data.error) { setErr(data.error); return; }
    setSelectedAgents([]);
    setMsg('Agents added to the plan.');
    await loadActive(activeId);
    await loadLists();
  }

  async function handleDeleteItem(itemId) {
    await deleteTransportItem(token, itemId);
    await loadActive(activeId);
    await loadLists();
  }

  async function handleApplyAll() {
    await applyTransportToAll(token, {
      request_id: activeId,
      vehicle_type: vehicleType,
      direction,
      pickup_time: pickupTime,
      return_time: direction !== 'aller' ? returnTime : null,
      days,
    });
    setShowApplyAll(false);
    setMsg('Changes applied to all agents in this plan.');
    await loadActive(activeId);
  }

  async function handleSend() {
    setErr(''); setMsg('');
    const data = await sendTransportRequest(token, activeId);
    if (data.error) { setErr(data.error); return; }
    setActiveId(null);
    setActive(null);
    setMsg('Transport plan sent to HR.');
    await loadLists();
    setTab('history');
  }

  return (
    <DashboardLayout pageTitle="Transport">
      <div className="profile-page transport-page">
        <div className="profile-card">
          <div className="transport-header">
            <div className="transport-header-title"><Bus size={19} color="#7c3aed" /> Agent Transport Planning</div>
            <div className="transport-header-actions">
              <button
                className={`profile-save-btn profile-save-btn--outline${tab === 'planning' ? ' active' : ''}`}
                onClick={() => { setTab('planning'); setActiveId(null); setActive(null); }}
              >
                Planning
              </button>
              <button
                className={`profile-save-btn profile-save-btn--outline${tab === 'history' ? ' active' : ''}`}
                onClick={() => { setTab('history'); setActiveId(null); setActive(null); }}
              >
                <HistoryIcon size={14} /> History
              </button>
            </div>
          </div>

          {msg && <div className="profile-msg-ok"><CheckCircle2 size={14} /> {msg}</div>}
          {err && <div className="profile-msg-err"><AlertCircle size={14} /> {err}</div>}

          {tab === 'planning' && !activeId && (
            <div className="transport-drafts">
              <button className="profile-save-btn" onClick={handleNewDraft}>
                <Plus size={15} /> New Transport Plan
              </button>
              {loading ? (
                <div className="ins-state-msg">Loading…</div>
              ) : drafts.length === 0 ? (
                <div className="ins-state-msg">No draft plans yet.</div>
              ) : (
                <div className="transport-draft-list">
                  {drafts.map((d) => (
                    <button key={d.id} className="transport-draft-card" onClick={() => setActiveId(d.id)}>
                      <div className="transport-draft-card-title">Draft #{d.id}</div>
                      <div className="transport-draft-card-meta">
                        <Users size={13} /> {d.agent_count} agent(s)
                      </div>
                      <div className="transport-draft-card-meta">
                        Created {new Date(d.created_at.replace(' ', 'T')).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'planning' && activeId && active && (
            <div className="transport-editor">
              <button className="transport-back-link" onClick={() => { setActiveId(null); setActive(null); }}>&larr; Back to plans</button>

              <div className="transport-form-grid">
                <div className="profile-field transport-agent-picker">
                  <label>Select Agents</label>
                  <div className="transport-agent-list">
                    {agents.length === 0 ? (
                      <div className="ins-state-msg">No agents assigned to your team.</div>
                    ) : (
                      agents.map((a) => (
                        <label key={a.id} className="transport-agent-row">
                          <input
                            type="checkbox"
                            checked={selectedAgents.includes(a.id)}
                            onChange={() => toggleAgent(a.id)}
                          />
                          <span className="transport-agent-name">{a.name}</span>
                          {a.desk_name && <span className="transport-agent-desk">{a.desk_name}</span>}
                          <span className="transport-agent-address">
                            <MapPin size={11} /> {a.address || 'No address set'}
                            {a.latitude && a.longitude ? '' : ' (no GPS)'}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div className="transport-config">
                  <div className="profile-field">
                    <label>Vehicle</label>
                    <select className="profile-input" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
                      {VEHICLE_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                    </select>
                  </div>
                  <div className="profile-field">
                    <label>Direction</label>
                    <select className="profile-input" value={direction} onChange={(e) => setDirection(e.target.value)}>
                      {DIRECTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                  <div className="profile-field-row">
                    <div className="profile-field">
                      <label>Pickup Time</label>
                      <input className="profile-input" type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
                    </div>
                    {direction !== 'aller' && (
                      <div className="profile-field">
                        <label>Return Time</label>
                        <input className="profile-input" type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} />
                      </div>
                    )}
                  </div>
                  <div className="profile-field">
                    <label>Days</label>
                    <DaysPicker days={days} onChange={setDays} />
                  </div>
                  <div className="transport-config-actions">
                    <button className="profile-save-btn" onClick={handleAddAgents}>
                      <Plus size={14} /> Add to Plan
                    </button>
                    <button className="profile-save-btn profile-save-btn--outline" onClick={() => setShowApplyAll(true)}>
                      Apply These Settings to All
                    </button>
                  </div>
                  {showApplyAll && (
                    <div className="transport-confirm-box">
                      <span>Apply direction, times and days above to every agent already in this plan?</span>
                      <div>
                        <button className="profile-save-btn" onClick={handleApplyAll}>Confirm</button>
                        <button className="profile-save-btn profile-save-btn--outline" onClick={() => setShowApplyAll(false)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="profile-card-title transport-items-title">Agents in this Plan</div>
              <TransportItemsTable
                items={active.items}
                token={token}
                onChanged={() => loadActive(activeId)}
                onDelete={handleDeleteItem}
              />

              <div className="transport-send-row">
                <button className="profile-save-btn" onClick={handleSend} disabled={!active.items.length}>
                  <Send size={14} /> Send to HR
                </button>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <TransportHistoryTable history={history} loading={loading} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function TransportItemsTable({ items, token, onChanged, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [editDays, setEditDays] = useState([]);
  const [editVehicle, setEditVehicle] = useState('taxi');
  const [editDirection, setEditDirection] = useState('aller_retour');
  const [editPickup, setEditPickup] = useState('');
  const [editReturn, setEditReturn] = useState('');

  function startEdit(item) {
    setEditingId(item.id);
    setEditDays(item.days ? item.days.split(',').filter(Boolean) : []);
    setEditVehicle(item.vehicle_type);
    setEditDirection(item.direction);
    setEditPickup(item.pickup_time ?? '');
    setEditReturn(item.return_time ?? '');
  }

  async function saveEdit(itemId) {
    await updateTransportItem(token, {
      item_id: itemId,
      vehicle_type: editVehicle,
      direction: editDirection,
      pickup_time: editPickup,
      return_time: editDirection !== 'aller' ? editReturn : null,
      days: editDays,
    });
    setEditingId(null);
    onChanged();
  }

  if (!items.length) {
    return <div className="ins-state-msg">No agents added yet.</div>;
  }

  return (
    <div className="ins-table-wrap">
      <table className="ins-table">
        <thead>
          <tr>
            <th>Agent</th>
            <th>Vehicle</th>
            <th>Direction</th>
            <th>Pickup</th>
            <th>Return</th>
            <th>Days</th>
            <th>Distance</th>
            <th>Duration</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.agent_name}</td>
              {editingId === item.id ? (
                <>
                  <td>
                    <select className="profile-input" value={editVehicle} onChange={(e) => setEditVehicle(e.target.value)}>
                      {VEHICLE_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="profile-input" value={editDirection} onChange={(e) => setEditDirection(e.target.value)}>
                      {DIRECTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </td>
                  <td><input className="profile-input" type="time" value={editPickup} onChange={(e) => setEditPickup(e.target.value)} /></td>
                  <td>
                    {editDirection !== 'aller' && (
                      <input className="profile-input" type="time" value={editReturn} onChange={(e) => setEditReturn(e.target.value)} />
                    )}
                  </td>
                  <td><DaysPicker days={editDays} onChange={setEditDays} /></td>
                  <td className="ins-cell-muted">{item.distance_km ?? '—'} km</td>
                  <td className="ins-cell-muted">{item.duration_min ?? '—'} min</td>
                  <td>
                    <div className="ins-action-group">
                      <button className="ins-action-btn ins-action-btn--approve" onClick={() => saveEdit(item.id)}>Save</button>
                      <button className="ins-action-btn ins-action-btn--reject" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td className="ins-cell-muted">{VEHICLE_TYPES.find((v) => v.value === item.vehicle_type)?.label.split(' ')[0] ?? item.vehicle_type}</td>
                  <td>{DIRECTIONS.find((d) => d.value === item.direction)?.label ?? item.direction}</td>
                  <td className="ins-cell-muted"><Clock size={11} /> {item.pickup_time ?? '—'}</td>
                  <td className="ins-cell-muted">{item.return_time ?? '—'}</td>
                  <td className="ins-cell-muted">{item.days}</td>
                  <td className="ins-cell-muted">{item.distance_km ?? '—'} km</td>
                  <td className="ins-cell-muted">{item.duration_min ?? '—'} min</td>
                  <td>
                    <div className="ins-action-group">
                      <button className="ins-action-btn ins-action-btn--approve" onClick={() => startEdit(item)}><Pencil size={12} /></button>
                      <button className="ins-action-btn ins-action-btn--reject" onClick={() => onDelete(item.id)}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransportHistoryTable({ history, loading }) {
  if (loading) return <div className="ins-state-msg">Loading…</div>;
  if (!history.length) return <div className="ins-state-msg">No transport requests sent yet.</div>;

  return (
    <div className="ins-table-wrap">
      <table className="ins-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Agents</th>
            <th>Sent</th>
            <th>Status</th>
            <th>Admin Note</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.id}>
              <td>#{h.id}</td>
              <td>{h.agent_count}</td>
              <td className="ins-cell-muted">{h.sent_at ? new Date(h.sent_at.replace(' ', 'T')).toLocaleString() : '—'}</td>
              <td><StatusPill status={h.status} /></td>
              <td className="ins-cell-muted">{h.admin_note ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
