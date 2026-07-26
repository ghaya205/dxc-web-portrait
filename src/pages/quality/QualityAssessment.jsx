import { useState, Fragment } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import {
  lookupAgentForAudit,
  createCaseAudit,
  fetchCaseAudits,
  downloadCaseAuditsCsv,
} from "../../services/api";
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from "lucide-react";

const TYPES = [
  { key: "call", label: "Call Assessment", field: "call_questions" },
  { key: "case", label: "Case Assessment", field: "case_questions" },
  { key: "chat", label: "Chat Assessment", field: "chat_questions" },
];

const COACHING_THRESHOLD = 70;

export default function QualityAssessment() {
  const { token } = useAuth();

  const [email, setEmail] = useState("");
  const [loadingAgent, setLoadingAgent] = useState(false);
  const [lookupErr, setLookupErr] = useState("");

  const [agent, setAgent] = useState(null);
  const [desk, setDesk] = useState(null);
  const [stats, setStats] = useState(null);

  const [assessmentType, setAssessmentType] = useState("call");
  const [ticketRef, setTicketRef] = useState("");
  const [channel, setChannel] = useState("");
  const [answers, setAnswers] = useState({});
  const [comments, setComments] = useState({});

  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [result, setResult] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);

  async function handleLoad(e) {
    e.preventDefault();
    setLookupErr("");
    setResult(null);
    if (!email.trim()) {
      setLookupErr("Please enter the agent's email.");
      return;
    }
    setLoadingAgent(true);
    try {
      const data = await lookupAgentForAudit(token, email.trim());
      if (data.error) {
        setLookupErr(data.error);
        setAgent(null);
        setDesk(null);
        setStats(null);
        setHistoryLoaded(false);
        return;
      }
      setAgent(data.agent);
      setDesk(data.desk);
      setStats(data.stats);
      setAnswers({});
      setComments({});
      setTicketRef("");
      setChannel("");
      setHistoryLoaded(false);

      const hist = await fetchCaseAudits(token, data.agent.id);
      setHistory(hist.audits ?? []);
      setHistoryLoaded(true);
    } catch {
      setLookupErr("Network error. Please try again.");
    } finally {
      setLoadingAgent(false);
    }
  }

  const currentType = TYPES.find((t) => t.key === assessmentType);
  const questions = desk ? (desk[currentType.field] ?? []) : [];

  function setAnswer(qKey, value) {
    setAnswers((prev) => ({ ...prev, [qKey]: value }));
  }

  function setComment(qKey, value) {
    setComments((prev) => ({ ...prev, [qKey]: value }));
  }

  function switchType(type) {
    setAssessmentType(type);
    setAnswers({});
    setComments({});
    setResult(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitErr("");
    setResult(null);

    if (!agent || !desk) {
      setSubmitErr("Load an agent and desk first.");
      return;
    }
    if (questions.length === 0) {
      setSubmitErr(
        "This desk has no questions configured for this assessment type.",
      );
      return;
    }
    const answeredCount = questions.filter(
      (_, i) => answers[`q${i}`] !== undefined,
    ).length;
    if (answeredCount < questions.length) {
      setSubmitErr("Please answer every question before confirming.");
      return;
    }

    const weights = {};
    let eliminatorFailed = false;
    questions.forEach((q, i) => {
      const key = `q${i}`;
      weights[key] = Number(q.weight) > 0 ? Number(q.weight) : 1;
      if (q.eliminator && Number(answers[key]) === 0) eliminatorFailed = true;
    });

    const feedback = {};
    questions.forEach((q, i) => {
      const key = `q${i}`;
      if (comments[key]?.trim()) feedback[key] = comments[key].trim();
    });

    setSubmitting(true);
    try {
      const data = await createCaseAudit(token, {
        agent_id: agent.id,
        desk_id: desk.id,
        assessment_type: assessmentType,
        ticket_ref: ticketRef.trim(),
        channel: channel.trim(),
        answers,
        weights,
        feedback,
        eliminator_failed: eliminatorFailed,
      });
      if (data.error) {
        setSubmitErr(data.error);
      } else {
        setResult({ score: data.score, needs_coaching: data.needs_coaching });
        const hist = await fetchCaseAudits(token, agent.id);
        setHistory(hist.audits ?? []);
        const statsRes = await lookupAgentForAudit(token, agent.email);
        if (statsRes.stats) setStats(statsRes.stats);
      }
    } catch {
      setSubmitErr("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout pageTitle="Quality Assessment">
      <div className="profile-card">
        <div className="profile-card-title">Load Agent</div>
        <form onSubmit={handleLoad} className="qa-lookup-row">
          <div className="profile-field qa-lookup-input">
            <label>Agent Email</label>
            <input
              className="profile-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@company.com"
            />
          </div>
          <button
            className="profile-save-btn qa-lookup-btn"
            type="submit"
            disabled={loadingAgent}
          >
            <Search size={14} /> {loadingAgent ? "Loading…" : "Load"}
          </button>
        </form>
        {lookupErr && (
          <div className="profile-msg-err">
            <AlertTriangle size={14} /> {lookupErr}
          </div>
        )}

        {agent && (
          <div className="qa-agent-summary">
            <div>
              <span className="qa-agent-label">Name</span>
              <span className="qa-agent-value">{agent.name}</span>
            </div>
            <div>
              <span className="qa-agent-label">Email</span>
              <span className="qa-agent-value">{agent.email}</span>
            </div>
            <div>
              <span className="qa-agent-label">Agent ID</span>
              <span className="qa-agent-value">{agent.id}</span>
            </div>
            <div>
              <span className="qa-agent-label">Desk</span>
              <span className="qa-agent-value">
                {desk ? `${desk.name} (${desk.acronym})` : "No desk assigned"}
              </span>
            </div>
            <div>
              <span className="qa-agent-label">Avg Score</span>
              <span className="qa-agent-value">
                {stats?.avg_score != null ? `${stats.avg_score}%` : "—"}
              </span>
            </div>
            <div>
              <span className="qa-agent-label">Last Score</span>
              <span className="qa-agent-value">
                {stats?.last_score != null ? `${stats.last_score}%` : "—"}
              </span>
            </div>
          </div>
        )}
      </div>

      {agent && desk && (
        <div className="profile-card">
          <div className="desk-mode-tabs">
            {TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`desk-mode-tab${assessmentType === t.key ? " active" : ""}`}
                onClick={() => switchType(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="profile-field-row mgmt-field-spaced">
            <div className="profile-field">
              <label>Ticket Reference</label>
              <input
                className="profile-input"
                type="text"
                value={ticketRef}
                onChange={(e) => setTicketRef(e.target.value)}
                placeholder="Ex: INC0012345"
              />
            </div>
            <div className="profile-field">
              <label>Channel (optional)</label>
              <input
                className="profile-input"
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder="e.g. Phone, Chat, Email"
              />
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="mgmt-state-msg">
              No questions are configured for {currentType.label.toLowerCase()}{" "}
              on this desk yet. Add some from Management → Desks.
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="qa-question-list">
                {questions.map((q, i) => {
                  const key = `q${i}`;
                  const value = answers[key];
                  return (
                    <div
                      key={key}
                      className={`qa-question-row${q.eliminator ? " qa-question-row--eliminator" : ""}`}
                    >
                      <div className="qa-question-text">
                        <span className="qa-question-index">Q{i + 1}.</span>{" "}
                        {q.question || "(untitled question)"}
                        {q.eliminator && (
                          <span className="qa-eliminator-badge">
                            ELIMINATOR
                          </span>
                        )}
                        {q.category && (
                          <span className="qa-category-badge">
                            {q.category}
                          </span>
                        )}
                      </div>
                      <div className="qa-yesno-group">
                        <button
                          type="button"
                          className={`qa-yesno-btn qa-yesno-btn--yes${value === 1 ? " active" : ""}`}
                          onClick={() => setAnswer(key, 1)}
                        >
                          <CheckCircle2 size={14} /> Yes
                        </button>
                        <button
                          type="button"
                          className={`qa-yesno-btn qa-yesno-btn--no${value === 0 ? " active" : ""}`}
                          onClick={() => setAnswer(key, 0)}
                        >
                          <XCircle size={14} /> No
                        </button>
                      </div>
                      <input
                        className="profile-input qa-comment-input"
                        type="text"
                        placeholder="Add comment…"
                        value={comments[key] || ""}
                        onChange={(e) => setComment(key, e.target.value)}
                      />
                    </div>
                  );
                })}
              </div>

              {submitErr && (
                <div className="profile-msg-err">
                  <AlertTriangle size={14} /> {submitErr}
                </div>
              )}

              <button
                className="profile-save-btn"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Confirming…" : "Confirm Case"}
              </button>
            </form>
          )}

          {result && (
            <div
              className={`qa-result-box${result.needs_coaching ? " qa-result-box--low" : " qa-result-box--good"}`}
            >
              <div className="qa-result-score">{result.score}%</div>
              {result.needs_coaching ? (
                <div className="qa-result-msg">
                  <AlertTriangle size={16} />
                  This score is below the {COACHING_THRESHOLD}% target. The
                  agent will be notified.
                </div>
              ) : (
                <div className="qa-result-msg qa-result-msg--good">
                  <CheckCircle2 size={16} /> Great result
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {agent && historyLoaded && (
        <div className="profile-card">
          <div className="qa-history-header">
            <div className="profile-card-title" style={{ marginBottom: 0 }}>
              <ClipboardList
                size={16}
                style={{ verticalAlign: -3, marginRight: 6 }}
              />
              Assessment History
            </div>
            <button
              type="button"
              className="profile-save-btn--outline qa-export-btn"
              onClick={() => downloadCaseAuditsCsv(token, agent.id)}
            >
              <Download size={13} /> Export CSV
            </button>
          </div>
          {history.length === 0 ? (
            <div className="mgmt-state-msg">
              No assessments recorded for this agent yet.
            </div>
          ) : (
            <div className="mgmt-table-wrap">
              <table className="mgmt-table">
                <thead>
                  <tr>
                    {[
                      "",
                      "Date",
                      "Type",
                      "Ticket",
                      "Auditor",
                      "Score",
                      "Coaching",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => {
                    const isOpen = expandedHistoryId === row.id;
                    return (
                      <Fragment key={row.id}>
                        <tr
                          className="qa-history-row"
                          onClick={() =>
                            setExpandedHistoryId((prev) =>
                              prev === row.id ? null : row.id,
                            )
                          }
                        >
                          <td>
                            {isOpen ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )}
                          </td>
                          <td>{row.assessed_at}</td>
                          <td className="mgmt-cell-strong">
                            {row.assessment_type}
                          </td>
                          <td className="mgmt-cell-muted">
                            {row.ticket_ref || "—"}
                          </td>
                          <td>{row.auditor_name || "—"}</td>
                          <td>
                            <span
                              className={`mgmt-status-pill ${row.score < COACHING_THRESHOLD ? "mgmt-status-pill--pending" : "mgmt-status-pill--approved"}`}
                            >
                              {row.score}%
                            </span>
                          </td>
                          <td>
                            {row.feedback?.coaching_note ? "Scheduled" : "—"}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={7} className="qa-breakdown-cell">
                              {row.breakdown?.length ? (
                                <div className="qa-breakdown-list">
                                  {row.breakdown.map((b) => (
                                    <div
                                      key={b.key}
                                      className={`qa-breakdown-item${b.answer === "no" ? " qa-breakdown-item--no" : ""}`}
                                    >
                                      <div className="qa-breakdown-question">
                                        {b.answer === "no" ? (
                                          <AlertTriangle size={14} />
                                        ) : (
                                          <CheckCircle2 size={14} />
                                        )}
                                        {b.question}
                                      </div>
                                      <span
                                        className={`qa-breakdown-answer${b.answer === "no" ? " qa-breakdown-answer--no" : ""}`}
                                      >
                                        {b.answer === "no" ? "No" : "Yes"}
                                      </span>
                                      {b.comment && (
                                        <div className="qa-breakdown-comment">
                                          <MessageSquare size={12} />{" "}
                                          {b.comment}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="mgmt-state-msg">
                                  No per-question detail available for this
                                  assessment.
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
