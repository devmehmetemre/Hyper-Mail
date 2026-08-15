require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "10mb" }));

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: { error: "Çok fazla istek. 15 dakika sonra tekrar dene." },
});
app.use("/api/", limiter);

// Brevo SMTP transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_EMAIL, // your brevo account email
      pass: process.env.BREVO_SMTP_KEY, // brevo SMTP key
    },
  });
};

// Auth middleware - simple token check
const authMiddleware = (req, res, next) => {
  const token = req.headers["x-auth-token"];
  if (!token || token !== process.env.APP_SECRET) {
    return res.status(401).json({ error: "Yetkisiz erişim." });
  }
  next();
};

// ─── ROUTES ───────────────────────────────────────────────────────────────────

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Login
app.post("/api/login", (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Şifre gerekli." });

  if (password === process.env.APP_PASSWORD) {
    res.json({ token: process.env.APP_SECRET, email: process.env.MY_EMAIL });
  } else {
    res.status(401).json({ error: "Yanlış şifre." });
  }
});

// Send email
app.post("/api/send", authMiddleware, async (req, res) => {
  const { to, subject, body, replyTo } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ error: "Alıcı, konu ve içerik zorunlu." });
  }

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"${process.env.MY_NAME}" <${process.env.MY_EMAIL}>`,
      to,
      subject,
      html: body,
      text: body.replace(/<[^>]*>/g, ""),
      replyTo: replyTo || process.env.MY_EMAIL,
    });

    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error("Mail gönderme hatası:", err);
    res.status(500).json({ error: "Mail gönderilemedi: " + err.message });
  }
});

// Verify SMTP connection
app.get("/api/verify-smtp", authMiddleware, async (req, res) => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    res.json({ success: true, message: "SMTP bağlantısı başarılı." });
  } catch (err) {
    res.status(500).json({ error: "SMTP bağlantı hatası: " + err.message });
  }
});

// ─── SERVE REACT BUILD ────────────────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/build")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/build/index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`✉️  MailApp server running on port ${PORT}`);
});
