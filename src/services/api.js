const BASE = "/api";

export function assetUrl(path) {
  if (!path) return "";
  return `${BASE}/${path}`;
}

export async function loginUser(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function registerUser(name, email, password, role, enterpriseCode = '') {
  const body = { name, email, password, role };
  if (enterpriseCode) body.enterprise_code = enterpriseCode;

  const res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

export async function fetchProtected(token) {
  const res = await fetch(`${BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function updateProfile(token, payload) {
  const res = await fetch(`${BASE}/auth/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updatePassword(token, payload) {
  const res = await fetch(`${BASE}/auth/password`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function fetchAllUsers(token) {
  const res = await fetch(`${BASE}/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function approveUser(token, userId) {
  const res = await fetch(`${BASE}/admin/users/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ user_id: userId }),
  });
  return res.json();
}

export async function rejectUser(token, userId) {
  const res = await fetch(`${BASE}/admin/users/reject`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ user_id: userId }),
  });
  return res.json();
}

export async function fetchFullProfile(token) {
  const res = await fetch(`${BASE}/auth/profile/full`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function updateFullProfile(token, payload) {
  const res = await fetch(`${BASE}/auth/profile/full`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function uploadProfilePicture(token, file) {
  const formData = new FormData();
  formData.append("picture", file);
  const res = await fetch(`${BASE}/auth/profile/picture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  return res.json();
}

export async function markPresence(token) {
  const res = await fetch(`${BASE}/presence/mark`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function fetchMyPresence(token) {
  const res = await fetch(`${BASE}/presence/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function fetchPresenceToday(token) {
  const res = await fetch(`${BASE}/admin/presence`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function fetchDesks(token) {
  const res = await fetch(`${BASE}/desks`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function createDesk(token, payload) {
  const res = await fetch(`${BASE}/desks/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateDesk(token, payload) {
  const res = await fetch(`${BASE}/desks/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function adminCreateUser(token, payload) {
  const res = await fetch(`${BASE}/admin/users/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function createRequest(token, payload) {
  const res = await fetch(`${BASE}/requests/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function fetchMyRequests(token) {
  const res = await fetch(`${BASE}/requests/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function fetchAllRequests(token) {
  const res = await fetch(`${BASE}/requests/all`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function replyRequest(token, payload) {
  const res = await fetch(`${BASE}/requests/reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function fetchMyQualifications(token) {
  const res = await fetch(`${BASE}/qualifications/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function createQualification(token, formData) {
  const res = await fetch(`${BASE}/qualifications/create`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  return res.json();
}

export async function deleteQualification(token, id) {
  const res = await fetch(`${BASE}/qualifications/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id }),
  });
  return res.json();
}

export async function fetchAllQualifications(token) {
  const res = await fetch(`${BASE}/admin/qualifications`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function adminDeleteQualification(token, id) {
  const res = await fetch(`${BASE}/admin/qualifications/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id }),
  });
  return res.json();
}

export async function approveQualification(token, id) {
  const res = await fetch(`${BASE}/admin/qualifications/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id }),
  });
  return res.json();
}

export async function fetchMyDocuments(token) {
  const res = await fetch(`${BASE}/documents/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function uploadDocument(token, formData) {
  const res = await fetch(`${BASE}/documents/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  return res.json();
}

export async function deleteDocument(token, id) {
  const res = await fetch(`${BASE}/documents/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id }),
  });
  return res.json();
}

export async function fetchOpportunities(token, { search = "", category = "" } = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (category) params.set("category", category);
  const qs = params.toString();
  const res = await fetch(`${BASE}/opportunities${qs ? `?${qs}` : ""}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function createOpportunity(token, payload) {
  const res = await fetch(`${BASE}/opportunities/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteOpportunity(token, id) {
  const res = await fetch(`${BASE}/opportunities/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id }),
  });
  return res.json();
}

export async function createCareBulletin(token, formData) {
  const res = await fetch(`${BASE}/insurance/create`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  return res.json();
}

export async function fetchMyCareBulletins(token) {
  const res = await fetch(`${BASE}/insurance/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function fetchAllCareBulletins(token) {
  const res = await fetch(`${BASE}/insurance/all`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function updateCareBulletinStatus(token, payload) {
  const res = await fetch(`${BASE}/insurance/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function fetchTransportAgents(token) {
  const res = await fetch(`${BASE}/transport/agents`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function createTransportDraft(token) {
  const res = await fetch(`${BASE}/transport/drafts/create`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function fetchMyTransportDrafts(token) {
  const res = await fetch(`${BASE}/transport/drafts/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function fetchMyTransportHistory(token) {
  const res = await fetch(`${BASE}/transport/requests/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function fetchTransportDetail(token, id) {
  const res = await fetch(`${BASE}/transport/requests/detail?id=${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function addTransportItems(token, payload) {
  const res = await fetch(`${BASE}/transport/items/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateTransportItem(token, payload) {
  const res = await fetch(`${BASE}/transport/items/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteTransportItem(token, itemId) {
  const res = await fetch(`${BASE}/transport/items/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ item_id: itemId }),
  });
  return res.json();
}

export async function applyTransportToAll(token, payload) {
  const res = await fetch(`${BASE}/transport/items/apply-all`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function sendTransportRequest(token, requestId) {
  const res = await fetch(`${BASE}/transport/requests/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ request_id: requestId }),
  });
  return res.json();
}

export async function fetchPendingTransport(token) {
  const res = await fetch(`${BASE}/admin/transport/pending`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function fetchAllTransport(token) {
  const res = await fetch(`${BASE}/admin/transport/all`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function decideTransportRequest(token, payload) {
  const res = await fetch(`${BASE}/admin/transport/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function downloadTransportCsv(token, id, vehicleType) {
  const qs = vehicleType ? `&vehicle_type=${vehicleType}` : "";
  const res = await fetch(`${BASE}/admin/transport/export?id=${id}${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transport_plan_${id}${vehicleType ? `_${vehicleType}` : ""}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function fetchSlaCompanies(token) {
  const res = await fetch(`${BASE}/sla/companies`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function fetchSlaTargets(token) {
  const res = await fetch(`${BASE}/sla/targets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function createSlaTarget(token, payload) {
  const res = await fetch(`${BASE}/sla/targets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteSlaTarget(token, id) {
  const res = await fetch(`${BASE}/sla/targets/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ id }),
  });
  return res.json();
}

export async function linkDeskCompany(token, payload) {
  const res = await fetch(`${BASE}/sla/link-desk-company`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function fetchAdminSlaDashboard(token, { companyId, dateFrom, dateTo, deskName } = {}) {
  const params = new URLSearchParams();
  if (companyId) params.set('company_id', companyId);
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);
  if (deskName) params.set('desk_name', deskName);
  const res = await fetch(`${BASE}/sla/dashboard?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function fetchSupervisorSlaDashboard(token, { dateFrom, dateTo, deskName } = {}) {
  const params = new URLSearchParams();
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);
  if (deskName) params.set('desk_name', deskName);
  const res = await fetch(`${BASE}/sla/dashboard/mine?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export function slaStreamUrl(token, { companyId, dateFrom, dateTo, deskName } = {}) {
  const params = new URLSearchParams();
  params.set('token', token);
  if (companyId) params.set('company_id', companyId);
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);
  if (deskName) params.set('desk_name', deskName);
  return `${BASE}/sla/stream?${params.toString()}`;
}

export async function importSlaTargets(token, file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE}/sla/import-targets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  return res.json();
}

export async function importSlaData(token, file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE}/sla/import-data`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  return res.json();
}

export async function lookupAgentForAudit(token, email) {
  const res = await fetch(`${BASE}/case-audits/lookup-agent?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function createCaseAudit(token, payload) {
  const res = await fetch(`${BASE}/case-audits`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function fetchCaseAudits(token, agentId) {
  const res = await fetch(`${BASE}/case-audits?agent_id=${agentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function downloadCaseAuditsCsv(token, agentId) {
  const res = await fetch(`${BASE}/case-audits/export?agent_id=${agentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `case_audits_agent_${agentId}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function fetchMyCaseAudits(token) {
  const res = await fetch(`${BASE}/case-audits/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
