# Confess+ | Platformă Anonimă pentru Confesiuni cu Suport AI

🌟 **Cea mai sigură platformă pentru confesiuni anonime cu răspunsuri empatice generate de AI**

## 🚀 Features Implementate

### ✨ Core Features
- **Confesiuni Anonime**: Partajează gândurile în siguranță completă
- **AI Empatic**: Răspunsuri generate de Lovable AI (Gemini 2.5 Flash)
- **Deep Insights Premium**: Analize psihologice profunde cu AI avansat
- **Real-time Feed**: Actualizări live cu Supabase Realtime
- **Like & Share**: Interacționează cu confesiunile comunității
- **Moderare AI**: Conținut verificat automat pentru siguranță

### 💎 Monetizare (Stripe)
- **Plan Lunar**: $4.99/lună
- **Plan Anual**: $39.99/an (40% economie)
- **Customer Portal**: Gestionare abonamente self-service
- **Auto-sync**: Verificare automată status abonament

### 🎁 Viral Growth
- **Program Referral**: 7 zile Premium gratuit per prieten invitat
- **Cod Unic**: Fiecare utilizator primește un cod de referral
- **Social Sharing**: Facebook, Twitter, WhatsApp, Email
- **Analytics**: Tracking complet al referralurilor

### 📊 Analytics & Tracking
- **Event Tracking**: Page views, confesiuni, likes, shares, upgrades
- **User Behavior**: Date stocate securizat pentru optimizare
- **RLS Policies**: Fiecare utilizator vede doar datele proprii

### 🔐 Securitate & Auth
- **Supabase Auth**: Email/Password cu validare Zod
- **Auto-confirm**: Email confirmation activată automat
- **RLS**: Row Level Security pe toate tabelele
- **Error Boundary**: Captare și handling elegant al erorilor

### 🎨 UX/UI Premium
- **Onboarding**: Dialog de introducere în 3 pași
- **Skeleton Loaders**: Loading states frumoase
- **Dark/Light Mode**: Design system complet cu theme tokens
- **Responsive**: Optimizat pentru mobile și desktop
- **Animations**: Tranziții smooth cu Tailwind

### 🔍 SEO Optimizat
- **Meta Tags**: Title, description, keywords
- **Open Graph**: Social media sharing optimizat
- **Twitter Cards**: Preview-uri frumoase
- **Robots.txt**: Configurație pentru indexare
- **PWA Ready**: Manifest.json pentru instalare

### 🌍 Social Proof
- **Live Stats**: Număr utilizatori, confesiuni, likes
- **Trust Badges**: Shield, Lock, Moderare AI
- **Community Feel**: Design care inspiră încredere

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Lovable Cloud (Supabase)
- **Database**: PostgreSQL cu RLS
- **Auth**: Supabase Auth
- **AI**: Lovable AI Gateway (Gemini 2.5)
- **Payments**: Stripe Checkout & Subscriptions
- **Real-time**: Supabase Realtime

## 📁 Structura Proiectului

```
src/
├── components/
│   ├── ConfessionCard.tsx        # Card pentru afișare confesiuni
│   ├── NewConfessionDialog.tsx   # Dialog pentru confesiuni noi
│   ├── PremiumDialog.tsx         # Dialog upgrade premium
│   ├── SubscriptionPlans.tsx     # Planuri abonament Stripe
│   ├── ReferralCard.tsx          # Card program referral
│   ├── OnboardingDialog.tsx      # Onboarding utilizatori noi
│   ├── SocialProofStats.tsx      # Statistici live
│   ├── TrustBadges.tsx           # Badge-uri de încredere
│   ├── ErrorBoundary.tsx         # Error handling
│   └── ui/                       # shadcn/ui components
├── pages/
│   ├── Index.tsx                 # Pagina principală
│   ├── Auth.tsx                  # Login/Signup
│   ├── Profile.tsx               # Profil utilizator
│   └── NotFound.tsx              # 404
├── hooks/
│   └── useAnalytics.ts           # Hook pentru tracking
└── integrations/
    └── supabase/                 # Client & types

supabase/
├── functions/
│   ├── ai-confession-response/   # Răspunsuri AI
│   ├── ai-moderation/            # Moderare conținut
│   ├── create-checkout-session/  # Stripe checkout
│   ├── check-subscription/       # Verificare abonament
│   ├── customer-portal/          # Portal Stripe
│   └── process-referral/         # Procesare referral
└── migrations/                   # Database migrations
```

## 🗄️ Database Schema

```sql
-- Profiles (utilizatori)
profiles
  - user_id (FK auth.users)
  - is_premium (boolean)
  - subscription_status (text)
  - stripe_customer_id (text)
  - stripe_subscription_id (text)
  - referral_code (text, unique)
  - referred_by (FK auth.users)
  - total_referrals (integer)

-- Confessions
confessions
  - id (uuid)
  - user_id (FK auth.users, nullable pentru anonimat)
  - content (text)
  - ai_response (text)
  - ai_deep_insight (text)
  - likes_count (integer)
  - views_count (integer)
  - shared_count (integer)
  - is_reported (boolean)

-- Analytics Events
analytics_events
  - user_id (FK auth.users)
  - event_type (text)
  - event_data (jsonb)
  - created_at (timestamp)

-- Referrals
referrals
  - referrer_user_id (FK auth.users)
  - referred_user_id (FK auth.users)
  - referral_code (text)
  - status (pending/completed)
  - reward_claimed (boolean)

-- Payment History
payment_history
  - user_id (FK auth.users)
  - stripe_payment_id (text)
  - amount (integer)
  - currency (text)
  - status (text)
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ & npm
- Stripe Account (pentru payments)
- Lovable Cloud (sau Supabase account)

### Installation

```bash
# Clone repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Variabilele sunt pre-configurate prin Lovable Cloud:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### Stripe Setup

1. **Activează Customer Portal**: https://dashboard.stripe.com/test/settings/billing/portal
2. **Verifică Products**: Planurile sunt deja create
   - Monthly: `price_1SIVcRR7kygIyYg9aPdkdzCD`
   - Yearly: `price_1SIVcgR7kygIyYg9fvcIPq5R`

## 📈 Deployment

### Lovable Publish

```bash
# Din Lovable interface
Publish → Deploy
```

### Custom Domain

1. Mergi la Settings → Domains
2. Connect Domain
3. Adaugă DNS records (A record către 185.158.133.1)
4. SSL este configurat automat

## 🔒 Security Best Practices

✅ **Implementate:**
- Row Level Security (RLS) pe toate tabelele
- Email validation cu Zod
- Stripe Secret Key în environment variables
- CORS headers pe toate edge functions
- Error handling comprehensive
- Input sanitization

⚠️ **De activat manual:**
- Leaked Password Protection în Supabase Auth Settings

## 📊 Analytics & Monitoring

**Events Tracked:**
- `page_view` - Vizite pe pagină
- `confession_created` - Confesiuni noi
- `confession_liked` - Like-uri
- `confession_shared` - Partajări
- `deep_insight_generated` - Insights Premium
- `premium_upgrade_clicked` - Click upgrade
- `auth_signup` / `auth_login` - Autentificare
- `referral_shared` - Partajări referral

## 🤝 Contributing

Acest proiect este generat de Lovable. Pentru modificări:

1. Folosește Lovable pentru editări rapide
2. Sau editează local și push la Git
3. Sincronizarea este automată

## 📝 License

[Your License Here]

## 🎯 Roadmap

- [ ] Notificări push
- [ ] Sistem de badge-uri/achievements
- [ ] Chat privat între utilizatori
- [ ] Export confesiuni (PDF/Email)
- [ ] Dark patterns pentru creștere
- [ ] A/B testing pentru conversie

## 💬 Support

Pentru probleme tehnice sau întrebări:
- Email: support@confessplus.app
- Discord: [Link Discord]

---

**Built with ❤️ using [Lovable](https://lovable.dev)**