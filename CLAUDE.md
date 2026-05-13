# PilotOS — Guide Claude Code

## Stack

```
Frontend  : React 19 + Vite + TypeScript strict
Backend   : Supabase (Auth + PostgreSQL + Storage + Edge Functions)
Hosting   : Vercel (auto-deploy depuis GitHub)
Email     : Gmail SMTP V0 → Infomaniak V1 (dès 2 clients payants)
Paiement  : Stripe (liens de paiement + webhooks via Edge Functions)
IA        : Anthropic claude-sonnet-4-20250514
Charts    : Recharts
Process   : React Flow
```

## Règles absolues

1. **Zéro manipulation manuelle Supabase** — tout passe par `supabase/migrations/`
2. **RLS sur TOUTES les tables** — `ENABLE ROW LEVEL SECURITY` + politique
3. **`organisation_id` sur TOUTES les tables métier**
4. **`visibility` + `visibility_user_ids` sur TOUTES les tables de contenu**
5. **`admin_audit_log` pour TOUTES les actions superadmin**
6. **TypeScript strict — zéro `any`**
7. **Composants fonctionnels + hooks uniquement**
8. **Email : uniquement via `src/lib/email.ts`** — jamais appeler SMTP directement
9. **Après chaque migration** : `supabase gen types typescript > src/types/database.ts`

## Structure

```
src/
  components/
    ui/          — Composants réutilisables (Button, Input, Badge, Dialog...)
    layout/      — Sidebar, BottomNav, PageHeader...
    modules/     — Composants métier (ActionCard, ProcessCard, FeedbackButton...)
  pages/
    public/      — Landing, Pricing, Roadmap (pas d'auth requise)
    auth/        — Login, Register, Onboarding
    terrain/     — TerrainApp (3 écrans, bottom nav uniquement)
    contributor/ — ContributorApp
    manager/     — ManagerApp
    director/    — DirectorApp
    admin/       — AdminApp
    superadmin/  — SuperAdminApp
  hooks/
    useBreakpoint.ts  — "mobile" | "tablet" | "desktop" (768/1024px)
    useRole.ts        — rôle + helpers isAtLeast(), useAppShell()
    useAuth.ts        — session Supabase
    useOrganisation.ts — org + modules actifs
  lib/
    supabase.ts  — client Supabase + helpers Storage
    email.ts     — wrapper SMTP UNIQUE (jamais bypasser)
    ai.ts        — wrapper Anthropic API (via Edge Functions)
    stripe.ts    — helpers Stripe + PLANS constants
  types/
    database.ts  — types générés depuis le schéma SQL
  utils/
    formatting.ts — dates, montants, pourcentages
```

## Responsive — Desktop-First

```
Desktop  ≥ 1024px → Sidebar rétractable (52px/210px)
Tablette 768-1023px → Bottom nav
Mobile   < 768px   → Bottom nav

useBreakpoint() → "mobile" | "tablet" | "desktop"
```

**Terrain** : bottom nav uniquement (3 écrans max)
**Superadmin** : sidebar dark bg-slate-900

## Profils UX

| Rôle | App | Navigation |
|------|-----|-----------|
| terrain | TerrainApp | Bottom nav (3 items) |
| contributor | ContributorApp | Sidebar desktop / Bottom nav mobile |
| manager | ManagerApp | Sidebar desktop / Bottom nav mobile |
| director | DirectorApp | Sidebar desktop / Bottom nav mobile |
| admin | AdminApp | Sidebar desktop / Bottom nav mobile |
| superadmin | SuperAdminApp | Sidebar dark |

## Conventions CSS

- Cards : `card` (base) / `card-hover` (cliquable)
- Badges : `badge badge-success/warning/danger/neutral/brand`
- Boutons : `btn-primary` / `btn-secondary` / `btn-danger`
- Inputs : `input` + `label`
- Couleur brand : `#444ce7` (brand-600)
- Background app : `bg-slate-50`
- Superadmin : `bg-slate-900` + composants slate-800

## Migrations SQL

Nommage : `YYYYMMDD_NNN_description.sql`

```
20260420_001_init_schema.sql      — organisations, sites, membres, profils
20260420_002_kpis_templates.sql   — catalogue KPIs + templates sectoriels
20260420_003_pilotage.sql         — objectifs, CODIR, projets
20260420_004_processes.sql        — processus, revues, NC, kaizen, terrain_reports
20260420_005_actions.sql          — actions, commentaires
20260420_006_circular_fks.sql     — terrain_reports.action_id (FK circulaire)
20260420_007_indicators.sql       — indicateurs, valeurs
20260420_008_ged.sql              — GED, versionning, émargements
20260420_009_payments_gamification.sql — Stripe, gamification, notifications, audit, IA
20260420_010_cms_feedback.sql     — CMS, blog, roadmap, feedback, bounties
20260420_011_rls_policies.sql     — Toutes les politiques RLS
```

## Confidentialité

- `visibility = 'confidential'` → élément n'existe pas côté React si non autorisé
- RLS filtre tout côté PostgreSQL
- KPIs calculés sur le périmètre visible uniquement
- Zéro information exposée aux non-autorisés, même dans les URLs

## GED — Règles métier

- `source = 'upload'` → validation optionnelle, statut max "Déposé"
- `source = 'created'` → validation obligatoire avant "En vigueur"
- `doc_code` et `process_code` : suggérés auto, toujours modifiables
- `version_label` : GENERATED ALWAYS (ne pas écrire manuellement)

## IA — Limites par plan

```
Free     → 5 req/mois
Team     → 50 req/mois
Business → 200 req/mois
Pro/Enterprise → Illimité
```

Toujours vérifier le quota avant appel IA : `checkAiQuota(organisationId)`

## Variables d'environnement

### Frontend (`.env` / Vercel)

```
VITE_SUPABASE_URL=          # URL du projet Supabase
VITE_SUPABASE_ANON_KEY=     # Clé anonyme Supabase
```

> Note : `VITE_APP_URL` et `VITE_STRIPE_PUBLISHABLE_KEY` sont documentés pour usage futur — non utilisés dans le code frontend actuel.

### Edge Functions (Supabase Secrets)

```
SUPABASE_URL                # Injecté automatiquement par Supabase
SUPABASE_SERVICE_ROLE_KEY   # Injecté automatiquement par Supabase
RESEND_API_KEY              # Clé API Resend pour l'envoi d'emails (V1)
APP_URL                     # URL publique (ex : https://pilotos.app) — utilisé dans les emails
STRIPE_SECRET_KEY           # Clé secrète Stripe
STRIPE_WEBHOOK_SECRET       # Secret webhook Stripe (stripe listen --forward-to ...)
ANTHROPIC_API_KEY           # Clé API Anthropic pour l'assistant IA
```

Configurer les secrets : `supabase secrets set RESEND_API_KEY=re_xxx`

### Secrets CI/CD (GitHub Actions)

Ces secrets doivent être configurés dans GitHub → Settings → Secrets and variables → Actions :

```
SUPABASE_ACCESS_TOKEN       # Token d'accès Supabase CLI (supabase.com → Account → Access tokens)
SUPABASE_PROJECT_REF        # Référence du projet Supabase (ex : abcdefghijklmnop)
SUPABASE_DB_PASSWORD        # Mot de passe de la base Supabase
VERCEL_TOKEN                # Token d'accès Vercel (vercel.com → Settings → Tokens)
VERCEL_ORG_ID               # ID de l'organisation Vercel
VERCEL_PROJECT_ID           # ID du projet Vercel
VITE_SUPABASE_URL           # Même valeur que la var frontend (requis pour le build CI)
VITE_SUPABASE_ANON_KEY      # Même valeur que la var frontend (requis pour le build CI)
```

## SMTP — Ne JAMAIS bypasser email.ts

```typescript
// ✅ CORRECT
import { sendEmail, sendInvitationEmail } from '@/lib/email'
await sendInvitationEmail({ to, inviterName, orgName, inviteUrl })

// ❌ INTERDIT — jamais appeler directement Supabase functions ou nodemailer
```

### Templates email

Tous les templates HTML sont dans `src/lib/emailTemplates.ts`.
Chaque template exporte une fonction `*Html(params)` → HTML string.
`email.ts` encapsule ces fonctions avec `sendEmail()`.
Jamais écrire du HTML email inline dans les composants ou Edge Functions.

## Design System

- Fonts : Chivo (display) + Inter (body) + JetBrains Mono
- Animations : Framer Motion, 0.2-0.4s, `ease-out`
- Pas de slow drifts — snappy
- Glassmorphism sur sticky headers : `glass-header` (bg-slate-900/80 backdrop-blur)
- Messages vides : toujours une invitation à agir (jamais "Aucun enregistrement")
- Erreurs : langage humain, pas de codes techniques

## Tests & Debug

- BUGS.md pour tracker les problèmes
- Preview Vercel auto par branche
- TypeScript strict comme premier filet de sécurité
- Tester les 6 rôles (terrain/contributor/manager/director/admin/superadmin)
- Vérifier la visibilité RLS sur les items confidentiels
