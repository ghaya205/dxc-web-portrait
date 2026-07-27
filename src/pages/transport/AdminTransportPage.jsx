import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import {
  fetchPendingTransport, fetchAllTransport, fetchTransportDetail,
  decideTransportRequest, updateTransportItem, deleteTransportItem, downloadTransportCsv,
} from '../../services/api';
import {
  Bus, CheckCircle2, XCircle, AlertCircle, Download, Clock, Trash2, Pencil,
} from 'lucide-react';
import './TransportPage.css';

const DIRECTIONS = [
  { value: 'aller_retour', label: 'Aller / Retour' },
  { value: 'aller', label: 'Aller' },
  { value: 'retour', label: 'Retour' },
];

const VEHICLE_TYPES = [
  { value: 'taxi', label: 'Taxi' },
  { value: 'bus', label: 'Bus' },
];

function StatusPill({ status }) {
  const map = {
    pending: 'transport-pill--pending',
    approved: 'transport-pill--approved',
    rejected: 'transport-pill--rejected',
  };
  return <span className={`transport-pill ${map[status] ?? ''}`}>{status}</span>;
}

export default function AdminTransportPage() {
  const { token } = useAuth();
  const [view, setView] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [showReject, setShowReject] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = view === 'pending' ? await fetchPendingTransport(token) : await fetchAllTransport(token);
      setRequests(data.requests ?? []);
    } finally {
      setLoading(false);
    }
  }, [token, view]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

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

  async function handleApprove() {
    setErr(''); setMsg('');
    const data = await decideTransportRequest(token, { request_id: activeId, status: 'approved' });
    if (data.error) { setErr(data.error); return; }
    if (data.mail_warnings && data.mail_warnings.length) {
      setErr('Approved, but: ' + data.mail_warnings.join(' | '));
    } else {
      setMsg('Request approved. Planning CSV emailed to the transport company.');
    }
    setActiveId(null);
    setActive(null);
    await load();
  }

  async function handleReject() {
    setErr(''); setMsg('');
    const data = await decideTransportRequest(token, { request_id: activeId, status: 'rejected', admin_note: rejectNote });
    if (data.error) { setErr(data.error); return; }
    setMsg('Request rejected.');
    setShowReject(false);
    setRejectNote('');
    setActiveId(null);
    setActive(null);
    await load();
  }

  async function handleDeleteItem(itemId) {
    await deleteTransportItem(token, itemId);
    await loadActive(activeId);
  }

  return (
    <DashboardLayout pageTitle="Transport Approvals">
      <div className="profile-page transport-page">
        <div className="profile-card">
          <div className="transport-header">
            <div className="transport-header-title"><Bus size={19} color="#7c3aed" /> Transport Requests</div>
            <div className="transport-header-actions">
              <button
                className={`profile-save-btn profile-save-btn--outline${view === 'pending' ? ' active' : ''}`}
                onClick={() => { setView('pending'); setActiveId(null); setActive(null); }}
              >
                Pending
              </button>
              <button
                className={`profile-save-btn profile-save-btn--outline${view === 'all' ? ' active' : ''}`}
                onClick={() => { setView('all'); setActiveId(null); setActive(null); }}
              >
                All Requests
              </button>
            </div>
          </div>

          {msg && <div className="profile-msg-ok"><CheckCircle2 size={14} /> {msg}</div>}
          {err && <div className="profile-msg-err"><AlertCircle size={14} /> {err}</div>}

          {!activeId && (
            loading ? (
              <div className="ins-state-msg">Loading…</div>
            ) : requests.length === 0 ? (
              <div className="ins-state-msg">No transport requests to show.</div>
            ) : (
              <div className="ins-table-wrap">
                <table className="ins-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Supervisor</th>
                      <th>Agents</th>
                      <th>Sent</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <tr key={r.id}>
                        <td>#{r.id}</td>
                        <td>{r.supervisor_name}</td>
                        <td>{r.agent_count}</td>
                        <td className="ins-cell-muted">{r.sent_at ? new Date(r.sent_at.replace(' ', 'T')).toLocaleString() : '—'}</td>
                        <td><StatusPill status={r.status} /></td>
                        <td>
                          <div className="ins-action-group">
                            <button className="ins-action-btn ins-action-btn--approve" onClick={() => setActiveId(r.id)}>View Detail</button>
                            {r.status === 'approved' && (
                              <>
                                <button className="ins-action-btn" onClick={() => downloadTransportCsv(token, r.id, 'taxi')}>
                                  <Download size={12} /> Taxi
                                </button>
                                <button className="ins-action-btn" onClick={() => downloadTransportCsv(token, r.id, 'bus')}>
                                  <Download size={12} /> Bus
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {activeId && active && (
            <div className="transport-editor">
              <button className="transport-back-link" onClick={() => { setActiveId(null); setActive(null); }}>&larr; Back to requests</button>

              <div className="transport-detail-meta">
                <div><strong>Request #{active.id}</strong> <StatusPill status={active.status} /></div>
                {active.admin_note && <div className="ins-cell-muted">Note: {active.admin_note}</div>}
              </div>

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
                      {active.status === 'pending' && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {active.items.map((item) => (
                      <AdminItemRow
                        key={item.id}
                        item={item}
                        editable={active.status === 'pending'}
                        token={token}
                        onChanged={() => loadActive(activeId)}
                        onDelete={handleDeleteItem}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {active.status === 'pending' && (
                <div className="transport-send-row">
                  <button className="profile-save-btn" onClick={handleApprove}>
                    <CheckCircle2 size={14} /> Approve &amp; Notify Transport Company
                  </button>
                  <button className="profile-save-btn profile-save-btn--outline" onClick={() => setShowReject(true)}>
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              )}

              {active.status === 'approved' && (
                <div className="transport-send-row">
                  <button className="profile-save-btn" onClick={() => downloadTransportCsv(token, active.id, 'taxi')}>
                    <Download size={14} /> Download Taxi CSV
                  </button>
                  <button className="profile-save-btn" onClick={() => downloadTransportCsv(token, active.id, 'bus')}>
                    <Download size={14} /> Download Bus CSV
                  </button>
                </div>
              )}

              {showReject && (
                <div className="transport-confirm-box">
                  <span>Reason for rejection (optional)</span>
                  <textarea className="profile-input" rows={2} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
                  <div>
                    <button className="profile-save-btn" onClick={handleReject}>Confirm Rejection</button>
                    <button className="profile-save-btn profile-save-btn--outline" onClick={() => setShowReject(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function AdminItemRow({ item, editable, token, onChanged, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [vehicleType, setVehicleType] = useState(item.vehicle_type);
  const [direction, setDirection] = useState(item.direction);
  const [pickup, setPickup] = useState(item.pickup_time ?? '');
  const [ret, setRet] = useState(item.return_time ?? '');

  async function save() {
    await updateTransportItem(token, {
      item_id: item.id,
      vehicle_type: vehicleType,
      direction,
      pickup_time: pickup,
      return_time: direction !== 'aller' ? ret : null,
    });
    setEditing(false);
    onChanged();
  }

  return (
    <tr>
      <td>{item.agent_name}</td>
      {editing ? (
        <>
          <td>
            <select className="profile-input" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
              {VEHICLE_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </td>
          <td>
            <select className="profile-input" value={direction} onChange={(e) => setDirection(e.target.value)}>
              {DIRECTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </td>
          <td><input className="profile-input" type="time" value={pickup} onChange={(e) => setPickup(e.target.value)} /></td>
          <td>{direction !== 'aller' && <input className="profile-input" type="time" value={ret} onChange={(e) => setRet(e.target.value)} />}</td>
        </>
      ) : (
        <>
          <td className="ins-cell-muted">{VEHICLE_TYPES.find((v) => v.value === item.vehicle_type)?.label ?? item.vehicle_type}</td>
          <td>{DIRECTIONS.find((d) => d.value === item.direction)?.label ?? item.direction}</td>
          <td className="ins-cell-muted"><Clock size={11} /> {item.pickup_time ?? '—'}</td>
          <td className="ins-cell-muted">{item.return_time ?? '—'}</td>
        </>
      )}
      <td className="ins-cell-muted">{item.days}</td>
      <td className="ins-cell-muted">{item.distance_km ?? '—'} km</td>
      <td className="ins-cell-muted">{item.duration_min ?? '—'} min</td>
      {editable && (
        <td>
          <div className="ins-action-group">
            {editing ? (
              <>
                <button className="ins-action-btn ins-action-btn--approve" onClick={save}>Save</button>
                <button className="ins-action-btn ins-action-btn--reject" onClick={() => setEditing(false)}>Cancel</button>
              </>
            ) : (
              <>
                <button className="ins-action-btn ins-action-btn--approve" onClick={() => setEditing(true)}><Pencil size={12} /></button>
                <button className="ins-action-btn ins-action-btn--reject" onClick={() => onDelete(item.id)}><Trash2 size={12} /></button>
              </>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}
