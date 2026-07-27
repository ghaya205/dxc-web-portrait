import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchDesks, createDesk, updateDesk, adminCreateUser, 
  fetchAllQualifications, adminDeleteQualification, approveQualification, assetUrl,
} from '../../services/api';
import {
  UserPlus, Building2, CheckCircle, AlertCircle, Plus, Trash2, Award, GraduationCap, Check,
} from 'lucide-react';

const TOP_TABS = [
  { key: 'user', label: 'Create User', icon: UserPlus },
  { key: 'desk', label: 'Desks', icon: Building2 },
  { key: 'certs', label: 'Certifications', icon: Award },
];

export default function UserManagement() {
  const [tab, setTab] = useState('user');

  return (
    <div className="mgmt-page">
      <div className="settings-tabs">
        {TOP_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`settings-tab${tab === key ? ' active' : ''}`}
            onClick={() => setTab(key)}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'user' && <CreateUserForm />}
      {tab === 'desk' && <DeskManagement />}
      {tab === 'certs' && <CertificationReview />}
    </div>
  );
}

function CertificationReview() {
  const { token } = useAuth();
  const [qualifications, setQualifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllQualifications(token);
      setQualifications(data.qualifications ?? []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  async function handleApprove(id) {
    await approveQualification(token, id);
    load();
  }

  async function handleDelete(id) {
    await adminDeleteQualification(token, id);
    load();
  }

  return (
    <div className="profile-card">
      <div className="profile-card-title">Diplomas &amp; Certifications</div>
      {loading ? (
        <div className="mgmt-state-msg">Loading…</div>
      ) : qualifications.length === 0 ? (
        <div className="mgmt-state-msg">No qualifications submitted yet.</div>
      ) : (
        <div className="mgmt-table-wrap">
          <table className="mgmt-table">
            <thead>
              <tr>
                {['User', 'Type', 'Name', 'Institution', 'Proof', 'Status', 'Actions'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {qualifications.map((q) => {
                const Icon = q.type === 'diploma' ? GraduationCap : Award;
                return (
                  <tr key={q.id}>
                    <td>{q.user_name}<div className="mgmt-sub-email">{q.user_email}</div></td>
                    <td><Icon size={14} className="mgmt-type-icon" />{q.type}</td>
                    <td className="mgmt-cell-strong">{q.name}</td>
                    <td className="mgmt-cell-muted">{q.institution ?? '—'}</td>
                    <td>
                      {q.proof_path ? (
                        <a href={assetUrl(q.proof_path)} target="_blank" rel="noreferrer">View</a>
                      ) : '—'}
                    </td>
                    <td>
                      <span className={`mgmt-status-pill ${q.status === 'approved' ? 'mgmt-status-pill--approved' : 'mgmt-status-pill--pending'}`}>{q.status}</span>
                    </td>
                    <td>
                      <div className="mgmt-action-group">
                        {q.status !== 'approved' && (
                          <button onClick={() => handleApprove(q.id)} className="mgmt-action-btn mgmt-action-btn--approve">
                            <Check size={12} />
                          </button>
                        )}
                        <button onClick={() => handleDelete(q.id)} className="mgmt-action-btn mgmt-action-btn--delete">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CreateUserForm() {
  const { token } = useAuth();
  const [desks, setDesks] = useState([]);
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'agent',
    phone: '', address: '', title: '', desk_id: '', language: '', shift: '',
    manager_name: '', hr_manager_name: '',
  });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchDesks(token).then((data) => {
      if (!cancelled && data.desks) setDesks(data.desks);
    });
    return () => { cancelled = true; };
  }, [token]);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(''); setErr('');
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setErr('Name, email and password are required.');
      return;
    }
    if (form.password.length < 8) {
      setErr('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const data = await adminCreateUser(token, form);
      if (data.error) setErr(data.error);
      else {
        setMsg('User created successfully.');
        setForm({
          name: '', email: '', password: '', role: 'agent',
          phone: '', address: '', title: '', desk_id: '', language: '', shift: '',
          manager_name: '', hr_manager_name: '',
        });
      }
    } catch {
      setErr('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="profile-card">
      <div className="profile-card-title">Create New User</div>

      {msg && <div className="profile-msg-ok"><CheckCircle size={14} /> {msg}</div>}
      {err && <div className="profile-msg-err"><AlertCircle size={14} /> {err}</div>}

      <form onSubmit={handleSubmit}>
        <div className="profile-field-row-3">
          <div className="profile-field">
            <label>Full Name</label>
            <input className="profile-input" type="text" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div className="profile-field">
            <label>Email</label>
            <input className="profile-input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </div>
          <div className="profile-field">
            <label>Temporary Password</label>
            <input className="profile-input" type="text" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Min. 8 characters" required />
          </div>
        </div>

        <div className="profile-field-row-3">
          <div className="profile-field">
            <label>Role</label>
            <select className="profile-input" value={form.role} onChange={(e) => set('role', e.target.value)}>
              <option value="agent">Agent</option>
              <option value="supervisor">Supervisor</option>
            </select>
          </div>
          <div className="profile-field">
            <label>Phone</label>
            <input className="profile-input" type="text" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div className="profile-field">
            <label>Title</label>
            <input className="profile-input" type="text" value={form.title} onChange={(e) => set('title', e.target.value)} />
          </div>
        </div>

        <div className="profile-field-row-3">
          <div className="profile-field">
            <label>Assigned Project</label>
            <select className="profile-input" value={form.desk_id} onChange={(e) => set('desk_id', e.target.value)}>
              <option value="">Select a project…</option>
              {desks.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.acronym})</option>
              ))}
            </select>
          </div>
          <div className="profile-field">
            <label>Language</label>
            <input className="profile-input" type="text" value={form.language} onChange={(e) => set('language', e.target.value)} />
          </div>
          <div className="profile-field">
            <label>Shift</label>
            <select className="profile-input" value={form.shift} onChange={(e) => set('shift', e.target.value)}>
              <option value="">Select a shift…</option>
              <option value="matin">Matin (09:00 – 17:00)</option>
              <option value="nuit">Nuit (21:00 – 06:00)</option>
            </select>
          </div>
        </div>

        <div className="profile-field-row-3">
          <div className="profile-field">
            <label>Manager</label>
            <input className="profile-input" type="text" value={form.manager_name} onChange={(e) => set('manager_name', e.target.value)} />
          </div>
          <div className="profile-field">
            <label>HR Manager</label>
            <input className="profile-input" type="text" value={form.hr_manager_name} onChange={(e) => set('hr_manager_name', e.target.value)} />
          </div>
          <div className="profile-field">
            <label>Address</label>
            <input className="profile-input" type="text" value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>
        </div>

        <button className="profile-save-btn" type="submit" disabled={loading}>
          {loading ? 'Creating…' : 'Create User'}
        </button>
      </form>
    </div>
  );
}

function emptyQuestion() {
  return { question: '', weight: '', category: '', eliminator: false };
}

function QuestionSection({ title, questions, onChange }) {
  function updateQuestion(index, field, value) {
    const next = questions.map((q, i) => (i === index ? { ...q, [field]: value } : q));
    onChange(next);
  }

  function addQuestion() {
    onChange([...questions, emptyQuestion()]);
  }

  function removeQuestion(index) {
    onChange(questions.filter((_, i) => i !== index));
  }

  return (
    <div className="desk-question-section">
      <div className="desk-question-section-title">{title}</div>
      {questions.map((q, i) => (
        <div className="desk-question-row" key={i}>
          <div className="profile-field">
            <label>Question {i + 1}</label>
            <textarea
              className="profile-input"
              rows={2}
              value={q.question}
              onChange={(e) => updateQuestion(i, 'question', e.target.value)}
              placeholder="New question text…"
            />
          </div>
          <div className="profile-field-row">
            <div className="profile-field">
              <label>Weight</label>
              <input className="profile-input" type="number" value={q.weight} onChange={(e) => updateQuestion(i, 'weight', e.target.value)} placeholder="e.g. 5" />
            </div>
            <div className="profile-field">
              <label>Category</label>
              <input className="profile-input" type="text" value={q.category} onChange={(e) => updateQuestion(i, 'category', e.target.value)} placeholder="Category name…" />
            </div>
          </div>
          <div className="desk-question-footer">
            <label className="desk-eliminator-toggle">
              <input type="checkbox" checked={q.eliminator} onChange={(e) => updateQuestion(i, 'eliminator', e.target.checked)} />
              Eliminator
            </label>
            <button type="button" className="desk-remove-btn" onClick={() => removeQuestion(i)}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="desk-add-btn" onClick={addQuestion}>
        <Plus size={13} /> Add Question
      </button>
    </div>
  );
}

function emptyDeskForm() {
  return {
    id: null, name: '', acronym: '', company_id: '', languages: [], languageInput: '',
    call_questions: [], case_questions: [], chat_questions: [],
  };
}

function DeskManagement() {
  const { token } = useAuth();
  const [mode, setMode] = useState('create');
  const [desks, setDesks] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(emptyDeskForm());
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDesks();
  }, [token]);

  async function loadDesks() {
    const data = await fetchDesks(token);
    if (data.desks) setDesks(data.desks);
  }

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addLanguage() {
    const lang = form.languageInput.trim();
    if (!lang) return;
    if (form.languages.includes(lang)) return;
    setForm((prev) => ({ ...prev, languages: [...prev.languages, lang], languageInput: '' }));
  }

  function removeLanguage(lang) {
    setForm((prev) => ({ ...prev, languages: prev.languages.filter((l) => l !== lang) }));
  }

  function loadDeskIntoForm(id) {
    const desk = desks.find((d) => String(d.id) === String(id));
    if (!desk) return;
    setForm({
      id: desk.id,
      name: desk.name,
      acronym: desk.acronym,
      company_id: desk.company_id ?? '',
      languages: desk.languages ?? [],
      languageInput: '',
      call_questions: desk.call_questions ?? [],
      case_questions: desk.case_questions ?? [],
      chat_questions: desk.chat_questions ?? [],
    });
  }

  function handleSelectExisting(id) {
    setSelectedId(id);
    if (id) loadDeskIntoForm(id);
    else setForm(emptyDeskForm());
  }

  function switchMode(next) {
    setMode(next);
    setMsg(''); setErr('');
    setSelectedId('');
    setForm(emptyDeskForm());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(''); setErr('');
    if (!form.name.trim() || !form.acronym.trim()) {
      setErr('Desk name and acronym are required.');
      return;
    }
    if (mode === 'update' && !form.id) {
      setErr('Please select a desk to update.');
      return;
    }
    setLoading(true);
    const payload = {
      name: form.name.trim(),
      acronym: form.acronym.trim(),
      
      languages: form.languages,
      call_questions: form.call_questions,
      case_questions: form.case_questions,
      chat_questions: form.chat_questions,
    };
    try {
      const data = mode === 'create'
        ? await createDesk(token, payload)
        : await updateDesk(token, { ...payload, id: form.id });
      if (data.error) {
        setErr(data.error);
      } else {
        setMsg(mode === 'create' ? 'Desk created successfully.' : 'Desk updated successfully.');
        await loadDesks();
        if (mode === 'create') setForm(emptyDeskForm());
      }
    } catch {
      setErr('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="profile-card">
      <div className="desk-mode-tabs">
        <button type="button" className={`desk-mode-tab${mode === 'create' ? ' active' : ''}`} onClick={() => switchMode('create')}>
          Create New Desk
        </button>
        <button type="button" className={`desk-mode-tab${mode === 'update' ? ' active' : ''}`} onClick={() => switchMode('update')}>
          Update Existing Desk
        </button>
      </div>

      {mode === 'update' && (
        <div className="profile-field mgmt-field-spaced">
          <label>Select Desk</label>
          <select className="profile-input" value={selectedId} onChange={(e) => handleSelectExisting(e.target.value)}>
            <option value="">-- Select a desk --</option>
            {desks.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.acronym})</option>
            ))}
          </select>
        </div>
      )}

      {msg && <div className="profile-msg-ok"><CheckCircle size={14} /> {msg}</div>}
      {err && <div className="profile-msg-err"><AlertCircle size={14} /> {err}</div>}

      <form onSubmit={handleSubmit}>
        <div className="profile-field-row">
          <div className="profile-field">
            <label>Desk Name</label>
            <input className="profile-input" type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Enter desk name" />
          </div>
          <div className="profile-field">
            <label>Desk Acronym</label>
            <input className="profile-input" type="text" value={form.acronym} onChange={(e) => set('acronym', e.target.value)} placeholder="e.g. rn for Renault" />
          </div>
        </div>

        <div className="profile-field">
          <label>Desk Languages</label>
          <div className="desk-lang-input-row">
            <input
              className="profile-input"
              type="text"
              value={form.languageInput}
              onChange={(e) => set('languageInput', e.target.value)}
              placeholder="Language (e.g. English)"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLanguage(); } }}
            />
            <button type="button" className="desk-add-btn" onClick={addLanguage}>
              <Plus size={13} /> Add Language
            </button>
          </div>
          {form.languages.length > 0 && (
            <div className="desk-lang-chips">
              {form.languages.map((lang) => (
                <span className="desk-lang-chip" key={lang}>
                  {lang}
                  <button type="button" onClick={() => removeLanguage(lang)}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="desk-questions-grid">
          <QuestionSection
            title="Call Assessment Questions"
            questions={form.call_questions}
            onChange={(qs) => set('call_questions', qs)}
          />
          <QuestionSection
            title="Case Assessment Questions"
            questions={form.case_questions}
            onChange={(qs) => set('case_questions', qs)}
          />
        </div>
        <QuestionSection
          title="Chat Assessment Questions"
          questions={form.chat_questions}
          onChange={(qs) => set('chat_questions', qs)}
        />

        <button className="profile-save-btn" type="submit" disabled={loading}>
          {loading ? 'Saving…' : mode === 'create' ? 'Create Desk' : 'Update Desk'}
        </button>
      </form>
    </div>
  );
}
