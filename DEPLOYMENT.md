# DEPLOYMENT.md — PilotOS

## Architecture de déploiement

```
GitHub (push) → Supabase (migrations auto) → Vercel (frontend auto)
```

## Variables d'environnement requises

### Vercel (prod + preview)
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_STRIPE_PUBLIC_KEY
VITE_APP_URL=https://pilotos.fr
```

### Supabase Edge Functions (secrets)
```
STRIPE_WEBHOOK_SECRET
ANTHROPIC_API_KEY
SMTP_HOST=smtp.gmail.com       # V0 Gmail
SMTP_PORT=587
SMTP_USER
SMTP_PASS                      # Mot de passe d'application Gmail
SMTP_FROM=noreply@pilotos.fr
```

## Déploiement

### Preview (automatique)
Tout push sur une branche autre que `main` déclenche un déploiement preview Vercel.

### Production (manuel)
```
GitHub Actions → "Deploy Production" → workflow_dispatch → confirm: "yes"
```

### Migrations Supabase
Tout fichier dans `supabase/migrations/` poussé sur GitHub est appliqué automatiquement par Supabase.

**RÈGLE** : jamais `supabase db push` en prod sans vérification préalable sur preview.

## Migration SMTP V0 → V1

Quand : dès 2 clients payants

1. Configurer SMTP Infomaniak dans Supabase secrets
2. Modifier les variables dans `src/lib/email.ts` (un seul endroit)
3. Tester sur preview avant prod

## Checklist avant mise en production

- [ ] TypeScript check passe (`npm run typecheck`)
- [ ] Lint passe (`npm run lint`)
- [ ] Migration SQL testée sur preview
- [ ] RLS vérifié sur les nouvelles tables
- [ ] Variables d'environnement à jour dans Vercel
- [ ] SMTP testé (email de test reçu)
- [ ] Stripe webhooks configurés
- [ ] Test des 6 profils UX

## On-Premise (V2)

```bash
git clone https://github.com/contactlumio37-droid/pilotos
cp .env.example .env
# Remplir .env avec les valeurs
docker-compose up -d
```

Docker Compose : app (React/Nginx) + Supabase self-hosted
