import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  fetchFullProfile,
  updateFullProfile,
  updatePassword,
  uploadProfilePicture,
  fetchDesks,
  assetUrl,
} from '../../services/api';
import DashboardLayout from '../../layouts/DashboardLayout';
import {
  Eye, EyeOff, CheckCircle, AlertCircle, User, Briefcase,
  Camera, Lock, IdCard, Award,
} from 'lucide-react';

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const TABS = [
  { key: 'account',      label: 'Account',      icon: IdCard },
  { key: 'personal',     label: 'Personal Info', icon: User },
  { key: 'professional', label: 'Professional',  icon: Briefcase },
  { key: 'security',     label: 'Security',      icon: Lock },
];

export default function SettingsPage() {
  const { user, token, login, setAvatar } = useAuth();

  const [tab, setTab] = useState('account');
  const [profile, setProfile] = useState(null);
  const [desks, setDesks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [profileData, desksData] = await Promise.all([
          fetchFullProfile(token),
          fetchDesks(token),
        ]);
        if (!cancelled) {
          if (profileData.profile) setProfile(profileData.profile);
          if (desksData.desks) setDesks(desksData.desks);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  function handleProfileUpdated(patch) {
    setProfile((prev) => ({ ...prev, ...patch }));
    if (patch.name) login(token, { ...user, name: patch.name });
    if (patch.profile_picture !== undefined) setAvatar(patch.profile_picture);
  }

  return (
    <DashboardLayout pageTitle="Settings">
      <div className="settings-page">

        <div className="settings-tabs">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`settings-tab${tab === key ? ' active' : ''}`}
              onClick={() => setTab(key)}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="profile-card profile-loading">Loading settings…</div>
        ) : (
          <>
            <AvatarCard profile={profile} token={token} onUpdated={handleProfileUpdated} />

            {tab === 'account' && (
              <AccountTab profile={profile} token={token} onUpdated={handleProfileUpdated} />
            )}
            {tab === 'personal' && (
              <PersonalTab profile={profile} token={token} onUpdated={handleProfileUpdated} />
            )}
            {tab === 'professional' && (
              <ProfessionalTab profile={profile} token={token} desks={desks} onUpdated={handleProfileUpdated} />
            )}
            {tab === 'security' && <SecurityTab token={token} />}
          </>
        )}

      </div>
    </DashboardLayout>
  );
}

function AvatarCard({ profile, token, onUpdated }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr('');
    try {
      const data = await uploadProfilePicture(token, file);
      if (data.error) setErr(data.error);
      else onUpdated({ profile_picture: data.path });
    } catch {
      setErr('Upload failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="profile-card settings-avatar-card">
      {profile?.profile_picture ? (
        <img className="profile-avatar-lg profile-avatar-img" src={assetUrl(profile.profile_picture)} alt={profile?.name} />
      ) : (
        <div className="profile-avatar-lg">{getInitials(profile?.name)}</div>
      )}
      <div className="settings-avatar-info">
        <div className="profile-header-name">{profile?.name}</div>
        <div className="profile-header-email">{profile?.email}</div>
        <label className="settings-upload-btn">
          <Camera size={13} /> {busy ? 'Uploading…' : 'Change photo'}
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleFile} disabled={busy} />
        </label>
        {err && <div className="profile-msg-err profile-msg-err--spaced"><AlertCircle size={14} /> {err}</div>}
      </div>
    </div>
  );
}

function AccountTab({ profile, token, onUpdated }) {
  const [name, setName] = useState(profile?.name ?? '');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setMsg(''); setErr('');
    if (!name.trim()) { setErr('Name cannot be empty.'); return; }
    setLoading(true);
    try {
      const data = await updateFullProfile(token, { name: name.trim() });
      if (data.error) setErr(data.error);
      else {
        onUpdated({ name: name.trim() });
        setMsg('Account information updated successfully.');
      }
    } catch {
      setErr('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="profile-card">
      <div className="profile-card-title">Account Information</div>

      {msg && <div className="profile-msg-ok"><CheckCircle size={14} /> {msg}</div>}
      {err && <div className="profile-msg-err"><AlertCircle size={14} /> {err}</div>}

      <form onSubmit={handleSave}>
        <div className="profile-field">
          <label>Full Name</label>
          <input className="profile-input" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="profile-field">
          <label>Email Address</label>
          <input className="profile-input" type="email" value={profile?.email ?? ''} disabled readOnly />
        </div>
        <button className="profile-save-btn" type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

function PersonalTab({ profile, token, onUpdated }) {
  const [form, setForm] = useState({
    national_id: profile?.national_id ?? '',
    phone: profile?.phone ?? '',
    address: profile?.address ?? '',
    governorate: profile?.governorate ?? '',
    latitude: profile?.latitude ?? '',
    longitude: profile?.longitude ?? '',
    marital_status: profile?.marital_status ?? '',
    child_number: profile?.child_number ?? '',
  });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleLocate() {
    if (!navigator.geolocation) {
      setErr('Geolocation is not supported by this browser.');
      return;
    }
    setLocating(true);
    setErr('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(7),
          longitude: pos.coords.longitude.toFixed(7),
        }));
        setLocating(false);
      },
      () => {
        setErr('Could not get your location. Please allow location access.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSave(e) {
    e.preventDefault();
    setMsg(''); setErr(''); setLoading(true);
    try {
      const data = await updateFullProfile(token, form);
      if (data.error) setErr(data.error);
      else {
        onUpdated(form);
        setMsg('Personal information updated successfully.');
      }
    } catch {
      setErr('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="profile-card">
      <div className="profile-card-title">Personal Information</div>

      {msg && <div className="profile-msg-ok"><CheckCircle size={14} /> {msg}</div>}
      {err && <div className="profile-msg-err"><AlertCircle size={14} /> {err}</div>}

      <form onSubmit={handleSave}>
        <div className="profile-field-row">
          <div className="profile-field">
            <label>National ID</label>
            <input className="profile-input" type="text" value={form.national_id} onChange={(e) => set('national_id', e.target.value)} />
          </div>
          <div className="profile-field">
            <label>Contact Phone</label>
            <input className="profile-input" type="text" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
        </div>

        <div className="profile-field">
          <label>Residential Address</label>
          <input className="profile-input" type="text" value={form.address} onChange={(e) => set('address', e.target.value)} />
        </div>

        <div className="profile-field">
          <label>Exact GPS Location</label>
          <div className="profile-field-row">
            <input className="profile-input" type="text" placeholder="Latitude" value={form.latitude} onChange={(e) => set('latitude', e.target.value)} />
            <input className="profile-input" type="text" placeholder="Longitude" value={form.longitude} onChange={(e) => set('longitude', e.target.value)} />
            <button type="button" className="profile-save-btn profile-save-btn--outline" onClick={handleLocate} disabled={locating}>
              {locating ? 'Locating…' : 'Use my location'}
            </button>
          </div>
        </div>

        <div className="profile-field-row">
          <div className="profile-field">
            <label>Governorate</label>
            <input className="profile-input" type="text" value={form.governorate} onChange={(e) => set('governorate', e.target.value)} />
          </div>
          <div className="profile-field">
            <label>Marital Status</label>
            <select className="profile-input" value={form.marital_status} onChange={(e) => set('marital_status', e.target.value)}>
              <option value="">Select…</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
            </select>
          </div>
        </div>

        <div className="profile-field">
          <label>Number of Children</label>
          <input className="profile-input" type="number" min="0" value={form.child_number} onChange={(e) => set('child_number', e.target.value)} />
        </div>

        <button className="profile-save-btn" type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

function ProfessionalTab({ profile, token, desks, onUpdated }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qualificationsPath = { 1: '/agent/qualifications', 2: '/supervisor/qualifications', 3: '/admin/qualifications' }[user?.role_id] ?? '/agent/qualifications';
  const [form, setForm] = useState({
    title: profile?.title ?? '',
    desk_id: profile?.desk_id ?? '',
    manager_name: profile?.manager_name ?? '',
    hr_manager_name: profile?.hr_manager_name ?? '',
    language: profile?.language ?? '',
    shift: profile?.shift ?? '',
  });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setMsg(''); setErr(''); setLoading(true);
    try {
      const data = await updateFullProfile(token, form);
      if (data.error) setErr(data.error);
      else {
        const desk = desks.find((d) => String(d.id) === String(form.desk_id));
        onUpdated({ ...form, desk_name: desk?.name });
        setMsg('Professional information updated successfully.');
      }
    } catch {
      setErr('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="profile-card">
      <div className="profile-card-title">Professional Information</div>

      {msg && <div className="profile-msg-ok"><CheckCircle size={14} /> {msg}</div>}
      {err && <div className="profile-msg-err"><AlertCircle size={14} /> {err}</div>}

      <form onSubmit={handleSave}>
        <div className="profile-field-row">
          <div className="profile-field">
            <label>Title</label>
            <input className="profile-input" type="text" value={form.title} onChange={(e) => set('title', e.target.value)} />
          </div>
          <div className="profile-field">
            <label>Assigned Project</label>
            <select className="profile-input" value={form.desk_id} onChange={(e) => set('desk_id', e.target.value)}>
              <option value="">Select a project…</option>
              {desks.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.acronym})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="profile-field">
          <label>Diplomas &amp; Certifications</label>
          <button
            type="button"
            className="profile-save-btn profile-save-btn--outline"
            onClick={() => navigate(qualificationsPath)}
          >
            <Award size={14} /> Manage Qualifications
          </button>
        </div>

        <div className="profile-field-row">
          <div className="profile-field">
            <label>Language</label>
            <input className="profile-input" type="text" value={form.language} onChange={(e) => set('language', e.target.value)} placeholder="e.g. English, French" />
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

        <div className="profile-field-row">
          <div className="profile-field">
            <label>Manager</label>
            <input className="profile-input" type="text" value={form.manager_name} onChange={(e) => set('manager_name', e.target.value)} />
          </div>
          <div className="profile-field">
            <label>HR Manager</label>
            <input className="profile-input" type="text" value={form.hr_manager_name} onChange={(e) => set('hr_manager_name', e.target.value)} />
          </div>
        </div>

        <button className="profile-save-btn" type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

function SecurityTab({ token }) {
  const [currentPwd, setCurrentPwd]   = useState('');
  const [newPwd, setNewPwd]           = useState('');
  const [confirmPwd, setConfirmPwd]   = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setMsg(''); setErr('');
    if (!currentPwd) { setErr('Current password is required.'); return; }
    if (newPwd.length < 8) { setErr('New password must be at least 8 characters.'); return; }
    if (newPwd !== confirmPwd) { setErr('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const data = await updatePassword(token, { current_password: currentPwd, new_password: newPwd });
      if (data.error) setErr(data.error);
      else {
        setMsg('Password changed successfully.');
        setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      }
    } catch {
      setErr('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="profile-card">
      <div className="profile-card-title">Change Password</div>

      {msg && <div className="profile-msg-ok"><CheckCircle size={14} /> {msg}</div>}
      {err && <div className="profile-msg-err"><AlertCircle size={14} /> {err}</div>}

      <form onSubmit={handleSave}>
        <div className="profile-field">
          <label>Current Password</label>
          <div className="profile-input-wrap">
            <input
              className="profile-input"
              type={showCurrent ? 'text' : 'password'}
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              placeholder="Enter current password"
            />
            <button type="button" className="profile-input-eye" onClick={() => setShowCurrent((v) => !v)}>
              {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div className="profile-field-row">
          <div className="profile-field">
            <label>New Password</label>
            <div className="profile-input-wrap">
              <input
                className="profile-input"
                type={showNew ? 'text' : 'password'}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="Min. 8 characters"
              />
              <button type="button" className="profile-input-eye" onClick={() => setShowNew((v) => !v)}>
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="profile-field">
            <label>Confirm New Password</label>
            <div className="profile-input-wrap">
              <input
                className="profile-input"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Repeat new password"
              />
              <button type="button" className="profile-input-eye" onClick={() => setShowConfirm((v) => !v)}>
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        </div>

        <button className="profile-save-btn" type="submit" disabled={loading}>
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
