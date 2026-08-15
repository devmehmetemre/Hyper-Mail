import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const API = process.env.REACT_APP_API_URL || "";

// ─── API HELPERS ──────────────────────────────────────────────────────────────
const api = {
  login: async (password) => {
    const r = await fetch(`${API}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    return r.json();
  },
  send: async (token, data) => {
    const r = await fetch(`${API}/api/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-auth-token": token },
      body: JSON.stringify(data),
    });
    return r.json();
  },
  verifySmtp: async (token) => {
    const r = await fetch(`${API}/api/verify-smtp`, {
      headers: { "x-auth-token": token },
    });
    return r.json();
  },
};

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`toast toast--${type}`}>
      <span>{message}</span>
      <button onClick={onClose}>×</button>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    const res = await api.login(pw);
    setLoading(false);
    if (res.token) {
      onLogin(res.token, res.email);
    } else {
      setErr(res.error || "Giriş başarısız.");
      setPw("");
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-icon">✉</div>
        <h1 className="login-title">Posta</h1>
        <p className="login-sub">Özel alan adı posta sistemi</p>
        <form onSubmit={submit} className="login-form">
          <input
            type="password"
            placeholder="Şifre"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="login-input"
            autoFocus
          />
          {err && <p className="login-err">{err}</p>}
          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? "Giriş yapılıyor…" : "Giriş yap"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── COMPOSE ──────────────────────────────────────────────────────────────────
function Compose({ token, myEmail, onClose, onSent, draft }) {
  const [to, setTo] = useState(draft?.to || "");
  const [subject, setSubject] = useState(draft?.subject || "");
  const [body, setBody] = useState(draft?.body || "");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    if (!to || !subject || !body) {
      setErr("Alıcı, konu ve içerik zorunlu.");
      return;
    }
    setSending(true);
    setErr("");
    const res = await api.send(token, { to, subject, body });
    setSending(false);
    if (res.success) {
      onSent({ to, subject, body, sentAt: new Date().toISOString() });
      onClose();
    } else {
      setErr(res.error || "Gönderilemedi.");
    }
  };

  return (
    <div className="compose-overlay">
      <div className="compose-panel">
        <div className="compose-header">
          <span className="compose-title">Yeni mesaj</span>
          <button className="compose-close" onClick={onClose}>×</button>
        </div>
        <div className="compose-fields">
          <div className="compose-row">
            <label>Kimden</label>
            <span className="compose-from">{myEmail}</span>
          </div>
          <div className="compose-row">
            <label>Kime</label>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="alici@ornek.com"
              type="email"
            />
          </div>
          <div className="compose-row">
            <label>Konu</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Mail konusu"
            />
          </div>
        </div>
        <textarea
          className="compose-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Mesajını buraya yaz…"
        />
        {err && <p className="compose-err">{err}</p>}
        <div className="compose-footer">
          <button
            className="btn btn--primary"
            onClick={send}
            disabled={sending}
          >
            {sending ? "Gönderiliyor…" : "Gönder"}
          </button>
          <button className="btn btn--ghost" onClick={onClose}>
            İptal
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SENT LIST ────────────────────────────────────────────────────────────────
function SentItem({ mail, onClick, active }) {
  const d = new Date(mail.sentAt);
  const timeStr = d.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
  });
  return (
    <div
      className={`mail-item ${active ? "mail-item--active" : ""}`}
      onClick={onClick}
    >
      <div className="mail-item-row">
        <span className="mail-item-to">{mail.to}</span>
        <span className="mail-item-time">{dateStr} {timeStr}</span>
      </div>
      <div className="mail-item-subject">{mail.subject}</div>
      <div className="mail-item-preview">
        {mail.body.replace(/<[^>]*>/g, "").slice(0, 80)}…
      </div>
    </div>
  );
}

// ─── MAIL DETAIL ──────────────────────────────────────────────────────────────
function MailDetail({ mail, myEmail, onReply }) {
  const d = new Date(mail.sentAt);
  return (
    <div className="mail-detail">
      <div className="mail-detail-header">
        <h2 className="mail-detail-subject">{mail.subject}</h2>
        <div className="mail-detail-meta">
          <div className="mail-meta-row">
            <span className="mail-meta-label">Kimden</span>
            <span>{myEmail}</span>
          </div>
          <div className="mail-meta-row">
            <span className="mail-meta-label">Kime</span>
            <span>{mail.to}</span>
          </div>
          <div className="mail-meta-row">
            <span className="mail-meta-label">Tarih</span>
            <span>
              {d.toLocaleDateString("tr-TR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              {d.toLocaleTimeString("tr-TR")}
            </span>
          </div>
        </div>
      </div>
      <div
        className="mail-detail-body"
        dangerouslySetInnerHTML={{
          __html: mail.body.replace(/\n/g, "<br/>"),
        }}
      />
      <div className="mail-detail-actions">
        <button
          className="btn btn--secondary"
          onClick={() =>
            onReply({ to: mail.to, subject: `Re: ${mail.subject}` })
          }
        >
          ↩ Yanıtla
        </button>
      </div>
    </div>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
function Settings({ token, onClose }) {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    setLoading(true);
    const res = await api.verifySmtp(token);
    setStatus(res.success ? "✓ SMTP bağlantısı başarılı!" : `✗ ${res.error}`);
    setLoading(false);
  };

  return (
    <div className="compose-overlay">
      <div className="compose-panel compose-panel--sm">
        <div className="compose-header">
          <span className="compose-title">Ayarlar</span>
          <button className="compose-close" onClick={onClose}>×</button>
        </div>
        <div className="settings-body">
          <div className="settings-section">
            <h3>SMTP Durumu</h3>
            <p className="settings-desc">
              Brevo SMTP bağlantını kontrol et.
            </p>
            <button className="btn btn--secondary" onClick={verify} disabled={loading}>
              {loading ? "Test ediliyor…" : "Bağlantıyı test et"}
            </button>
            {status && (
              <p className={`settings-status ${status.startsWith("✓") ? "settings-status--ok" : "settings-status--err"}`}>
                {status}
              </p>
            )}
          </div>
          <div className="settings-section">
            <h3>Kurulum Kılavuzu</h3>
            <ol className="settings-list">
              <li>Brevo.com'da ücretsiz hesap aç</li>
              <li>SMTP &amp; API → Generate an SMTP Key</li>
              <li>Railway'de env variable olarak ekle</li>
              <li>DNS'ine SPF + DKIM kayıtlarını ekle</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem("mail_token") || "");
  const [myEmail, setMyEmail] = useState(() => sessionStorage.getItem("mail_email") || "");
  const [sent, setSent] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sent_mails") || "[]"); }
    catch { return []; }
  });
  const [selected, setSelected] = useState(null);
  const [composing, setComposing] = useState(false);
  const [composeDraft, setComposeDraft] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");

  const showToast = (message, type = "success") => setToast({ message, type });

  const handleLogin = (t, email) => {
    sessionStorage.setItem("mail_token", t);
    sessionStorage.setItem("mail_email", email);
    setToken(t);
    setMyEmail(email);
  };

  const handleLogout = () => {
    sessionStorage.clear();
    setToken("");
    setMyEmail("");
  };

  const handleSent = (mail) => {
    const updated = [mail, ...sent];
    setSent(updated);
    localStorage.setItem("sent_mails", JSON.stringify(updated));
    setSelected(mail);
    showToast("Mail gönderildi ✓");
  };

  const handleReply = (draft) => {
    setComposeDraft(draft);
    setComposing(true);
  };

  const filtered = sent.filter(
    (m) =>
      m.to.toLowerCase().includes(search.toLowerCase()) ||
      m.subject.toLowerCase().includes(search.toLowerCase())
  );

  if (!token) return <Login onLogin={handleLogin} />;

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">✉</span>
          <span className="brand-name">Posta</span>
        </div>
        <button
          className="btn btn--primary compose-btn"
          onClick={() => { setComposeDraft(null); setComposing(true); }}
        >
          + Yaz
        </button>
        <nav className="sidebar-nav">
          <div className="nav-item nav-item--active">
            <span className="nav-icon">📤</span>
            <span>Gönderilenler</span>
            {sent.length > 0 && <span className="nav-badge">{sent.length}</span>}
          </div>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-email">{myEmail}</div>
          <div className="sidebar-actions">
            <button className="icon-btn" onClick={() => setShowSettings(true)} title="Ayarlar">⚙</button>
            <button className="icon-btn" onClick={handleLogout} title="Çıkış">⏻</button>
          </div>
        </div>
      </aside>

      {/* Mail list */}
      <div className="mail-list">
        <div className="mail-list-header">
          <h2>Gönderilenler</h2>
          <input
            className="search-input"
            placeholder="Ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {filtered.length === 0 ? (
          <div className="mail-empty">
            <div className="mail-empty-icon">📭</div>
            <p>Henüz gönderilmiş mail yok.</p>
            <button
              className="btn btn--secondary"
              onClick={() => { setComposeDraft(null); setComposing(true); }}
            >
              İlk mailini yaz
            </button>
          </div>
        ) : (
          filtered.map((m, i) => (
            <SentItem
              key={i}
              mail={m}
              onClick={() => setSelected(m)}
              active={selected === m}
            />
          ))
        )}
      </div>

      {/* Mail detail */}
      <main className="mail-main">
        {selected ? (
          <MailDetail mail={selected} myEmail={myEmail} onReply={handleReply} />
        ) : (
          <div className="mail-placeholder">
            <div className="placeholder-icon">✉</div>
            <p>Bir mail seç veya yeni yaz</p>
          </div>
        )}
      </main>

      {/* Overlays */}
      {composing && (
        <Compose
          token={token}
          myEmail={myEmail}
          draft={composeDraft}
          onClose={() => setComposing(false)}
          onSent={handleSent}
        />
      )}
      {showSettings && (
        <Settings token={token} onClose={() => setShowSettings(false)} />
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
