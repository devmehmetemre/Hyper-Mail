# ✉ Posta — Kişisel Webmail Sistemi

Kendi domain'inle ücretsiz iş maili. Railway üzerinde çalışır.

## Mimari

```
[sen@domain.com] ──gelen──▶ ImprovMX/Cloudflare → Gmail/mevcut mailin
                 ──giden──▶ Brevo SMTP (ücretsiz, günde 300)
                            ↑
                     Bu web UI aracılığıyla
```

---

## 1. Brevo Hesabı Aç (ücretsiz SMTP)

1. [brevo.com](https://brevo.com) → ücretsiz kayıt
2. Sol menu → **SMTP & API** → **SMTP** sekmesi
3. **Generate a new SMTP Key** → kopyala (bir daha görmezsin!)
4. Not al:
   - `Login`: Brevo hesap emailin
   - `Password`: SMTP Key
   - `Host`: `smtp-relay.brevo.com`
   - `Port`: `587`

---

## 2. Gelen Mailleri Yönlendir (ücretsiz)

### Seçenek A: ImprovMX (en kolay)
1. [improvmx.com](https://improvmx.com) → domain gir
2. `sen@domain.com` → `mevcut@gmail.com` yönlendirmesi ekle
3. Sana verilen MX kayıtlarını DNS'ine ekle

### Seçenek B: Cloudflare Email Routing
1. Domain'ini Cloudflare'e taşı (veya NS'lerini değiştir)
2. Email → Email Routing → Enable
3. Custom address ekle: `sen@domain.com` → `mevcut@gmail.com`

---

## 3. SPF Kaydı Ekle (Brevo için)

DNS'ine bir TXT kaydı ekle:

```
Tür:   TXT
İsim:  @  (veya domain.com.)
Değer: v=spf1 include:sendinblue.com ~all
```

---

## 4. Railway'e Deploy

### Railway hesabı aç → New Project → Deploy from GitHub

Veya Railway CLI ile:
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Environment Variables (Railway dashboard → Variables):

```
BREVO_EMAIL=brevo_hesabindaki@email.com
BREVO_SMTP_KEY=xsmtpsib-xxxxxxxxxxxxxxxx
MY_EMAIL=sen@domain.com
MY_NAME=Adın Soyadın
APP_PASSWORD=guclu_sifre_sec
APP_SECRET=cok_uzun_rastgele_bir_string_buraya_yaz
NODE_ENV=production
PORT=3000
```

### Build & Start komutları (Railway otomatik algılar, railway.json'dan):
- Build: `npm run build`
- Start: `npm start`

---

## 5. Test

1. Railway URL'ini aç (örn. `https://mailapp.up.railway.app`)
2. `APP_PASSWORD` ile giriş yap
3. Ayarlar → **Bağlantıyı test et** → SMTP çalışıyor mu kontrol et
4. Bir test maili gönder

---

## Proje Yapısı

```
mailapp/
├── server/
│   ├── index.js        ← Express + Nodemailer backend
│   ├── package.json
│   └── .env.example    ← ortam değişkeni şablonu
├── client/
│   ├── src/
│   │   ├── App.js      ← React webmail UI
│   │   ├── App.css
│   │   └── index.js
│   └── package.json
├── railway.json         ← Railway deploy config
└── package.json         ← Build + start script
```

---

## Ücretsiz Limitler

| Servis   | Limit               |
|----------|---------------------|
| Brevo    | 300 mail/gün        |
| ImprovMX | Sınırsız yönlendirme|
| Railway  | 500 saat/ay (ücretsiz plan) |

---

## Notlar

- Gönderilen mailler tarayıcı localStorage'ında tutulur (çıkış yapınca kaybolmaz)
- Gelen mailler bu UI'de görünmez — doğrudan Gmail/Outlook'una düşer
- DKIM eklemek istersen Brevo dashboard → Senders & Dedicated IPs
