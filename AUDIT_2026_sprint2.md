# AUDIT PilotOS — 2026-05-13

> Audit post-Sprint 1. Périmètre : RLS/SQL, architecture React, fonctionnement, UX, CI/CD.
> Basé sur AUDIT.md (2026-05-07) — seuls les nouveaux problèmes sont signalés.
> Migrations neuves auditées : 20260508001 → 20260513003.

---

## Résumé exécutif

| Criticité | Nombre | Description |
|-----------|--------|-------------|
| 🔴 Critique | 3 | Fix immédiat — fonctionnalités silencieusement cassées |
| 🟠 Haut | 6 | Fix sprint suivant — comportements inattendus |
| 🟡 Normal | 8 | Backlog — features partielles, documentation |
| 🟢 Amélioration | 6 | Dette technique légère |

**Migration corrective créée :** `supabase/migrations/20260513004_audit_sprint2_fixes.sql`

---

## Confirmations post-Sprint 1

### Résolus (confirmés par cet audit)

| Ref | Description | Résolu dans |
|-----|-------------|-------------|
| C-01 | admin_audit_log INSERT bloqué | 20260507005_audit_fixes.sql |
| C-02 | action_comments fuite confidential | 20260507005_audit_fixes.sql |
| C-03 | import_logs : INSERT impossible | 20260507005_audit_fixes.sql (policy) |
| C-04 | is_superadmin() sur membership inactif | 20260507004 + 20260507005 |
| C-05 | document_versions : aucune policy INSERT | 20260507005_audit_fixes.sql |
| H-02 | terrain_reports_write : reader peut créer | 20260507005_audit_fixes.sql |
| H-07 | Index manquants haute fréquence | 20260507005_audit_fixes.sql ✅ |
| H-08 | Votes anonymes multiples possibles | 20260507005_audit_fixes.sql |
| BUG-002 à BUG-012 | Tous bugs critiques Sprint 0 | Voir BUGS.md |
| N-08 (partiel) | useAppShell retourne 'contributor' pour reader | Comportement confirmé — guards manquants → voir ARCH-H-01 |
| Org membres policy | Superadmin impersonation | 20260513001_fix_members_cms_rls.sql |
| CMS pages policy | PageEditor visible pour superadmin | 20260513001_fix_members_cms_rls.sql |
| Profiles FK | JOIN full_name/avatar_url | 20260513002_fix_members_profiles_fk.sql |

### Ouverts inchangés (portés depuis l'audit précédent)

| Ref | Description | Statut |
|-----|-------------|--------|
| N-02 | Kaizen : drawer uniquement, pas de page dédiée | ⚠️ Inchangé |
| N-03 | document_versions : non implémenté frontend | ⚠️ Inchangé |
| N-04 | document_acknowledgments : non implémenté frontend | ⚠️ Inchangé |
| N-05 | superadmin_automations : runner absent | ⚠️ Partiellement actif (AutomationsTab lit les logs) |
| H-09 | actions.responsible_id + responsible_ids coexistence | ⚠️ DROP planifié V2, inchangé |

---

## 🔴 Critique

### [NEW-C-01] notifications : colonnes entity_type / entity_id manquantes → alertes EPI/habilitations entièrement cassées

**Fichier :** `supabase/migrations/20260513003_sprint2_epi_habilitations.sql`, lignes 265–336

La fonction `notify_epi_habilitation_alerts()` tente d'insérer dans `notifications` avec les colonnes `entity_type` et `entity_id` :

```sql
INSERT INTO notifications (organisation_id, user_id, type, title, body, entity_type, entity_id)
VALUES (...)
ON CONFLICT DO NOTHING;
```

Or la table `notifications` (migration 20260420009) ne possède PAS ces colonnes. Chaque appel échoue avec `column "entity_type" of relation "notifications" does not exist`. Toutes les alertes d'expiration EPI et habilitations sont silencieusement perdues.

**Bonus — ON CONFLICT sans cible :** Le `ON CONFLICT DO NOTHING` sans contrainte UNIQUE définie sur la table est inopérant — il ne prévient aucun doublon si la fonction est appelée plusieurs fois.

**Impact :** Toutes les notifications de contrôle EPI et de renouvellement d'habilitation ne seront jamais envoyées. Fonctionnalité sécurité critique inopérante.

**Fix migration :** `20260513004_audit_sprint2_fixes.sql` — voir section migration corrective.

---

### [NEW-C-02] notify-weekly-digest : cron planifié mais Edge Function inexistante → erreur silencieuse hebdomadaire

**Fichier :** `supabase/migrations/20260508001_cron_notify.sql`, lignes 33–45

La migration crée un job pg_cron appelant `https://.../functions/v1/notify-weekly-digest` tous les lundis à 7h. Mais `supabase/functions/notify-weekly-digest/` **n'existe pas**.

```sql
-- Extrait de 20260508001_cron_notify.sql
PERFORM cron.schedule(
  'notify-weekly-digest',
  '0 7 * * 1',         -- tous les lundis
  $job$
    SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/notify-weekly-digest',
      ...
    )
  $job$
);
```

Chaque lundi, la requête HTTP retourne 404. L'erreur est absorbée par pg_cron sans alerte.

**Impact :** Aucun digest hebdomadaire envoyé. Les utilisateurs et managers ne reçoivent pas de résumé de leurs actions en retard.

**Fix :** Créer `supabase/functions/notify-weekly-digest/index.ts` ou désactiver le job cron jusqu'à implémentation.

---

### [NEW-C-03] reader role : boutons de création visibles sans guards dans ContributorApp

**Fichiers :** `src/hooks/useRole.ts:51`, `src/pages/shared/ActionsPage.tsx`, `src/pages/contributor/ContributorApp.tsx`

`useAppShell()` mappe correctement le rôle `reader` vers l'app `contributor` (comportement documenté). Mais `ContributorApp` et les pages partagées n'implémentent aucun guard de rôle côté UI : le bouton "Nouvelle action" (ActionsPage), "Nouveau document" (DocumentsPage), et "Nouveau processus" (ProcessesPage) sont affichés pour tous les rôles — y compris `reader`.

Le rôle `reader` est bloqué en écriture par RLS côté Supabase, mais l'UI expose des boutons d'action qui provoquent des erreurs PostgREST silencieuses et créent une expérience trompeuse.

**Impact :** UX dégradée, erreurs 403 silencieuses pour les readers, exposition d'une fonctionnalité inexistante.

**Fix :**
```tsx
// Dans ActionsPage.tsx, DocumentsPage.tsx, ProcessesPage.tsx
const { isAtLeast } = useRole()
// Rendre le bouton de création conditionnel :
{isAtLeast('contributor') && <button ...>Nouvelle action</button>}
```

---

## 🟠 Haut

### [ARCH-H-01] Appels Supabase directs dans 13+ pages et composants (anti-pattern)

**Fichiers :**
- `src/pages/shared/TerrainReportsManager.tsx`
- `src/pages/shared/TerrainReportPage.tsx`
- `src/pages/admin/Invitations.tsx`
- `src/pages/admin/AdminSettings.tsx`
- `src/pages/public/RoadmapPage.tsx`
- `src/pages/auth/RegisterPage.tsx`
- `src/pages/superadmin/SuperAdminOrgs.tsx`
- `src/pages/superadmin/tabs/NewsletterTab.tsx` (5+ appels)
- `src/components/modules/FeedbackDrawer.tsx:56`
- `src/components/cms/NavigationEditor.tsx` (4 appels)

Ces pages effectuent `supabase.from(...).insert()/.update()/.delete()` directement, contournant l'abstraction par hooks. Aucun retry React Query, aucune gestion de cache, pas d'invalidation cohérente.

**Impact :** Cache incohérent, gestion d'erreur hétérogène, difficulté de test et de maintenance.

**Fix :** Créer des hooks dédiés (`useTerrainReportMutation`, `useInvitationMutation`, `useNewsletterMutation`) pour encapsuler ces mutations.

---

### [NEW-H-01] demo_requests : absence de FK organisation pour le filtrage superadmin

**Fichier :** `supabase/migrations/20260508003_demo_requests.sql`, lignes 1–23

La table `demo_requests` stocke `organisation_name` en texte libre sans FK vers `organisations`. Un superadmin gérant plusieurs orgs ne peut pas filtrer les demandes par organisation du système — il doit faire une correspondance textuelle manuelle.

**Fix :** Ajouter `referral_site_id UUID REFERENCES sites(id) ON DELETE SET NULL` pour contextualiser les demandes de démo provenant d'un site client.

---

### [NEW-H-02] demo_requests : formulaire public sans protection anti-spam

**Fichier :** `supabase/migrations/20260508003_demo_requests.sql:14`

La policy INSERT autorise les insertions anonymes sans limite (`WITH CHECK (true)`). Sans CAPTCHA ni rate limiting côté application, un acteur peut générer des milliers de demandes de démo.

**Fix :** Ajouter un CAPTCHA (hCaptcha/Cloudflare Turnstile) côté frontend avant soumission.

---

### [DB-H-01] src/types/database.ts obsolète — types Sprint 2 manquants

**Fichier :** `src/types/database.ts`

`database.ts` a été généré avant les migrations Sprint 2 (20260508001–20260513003). Les tables suivantes sont absentes des types TypeScript :
- `epi_items`, `epi_attributions`
- `habilitations`, `habilitation_attributions`
- `demo_requests`
- `notification_prefs` (20260507006)

`useSecurity.ts` compile sans erreur grâce à des types manuels inline, mais le CI TypeScript check ne valide pas la cohérence avec le schéma réel.

**Fix :**
```bash
supabase gen types typescript --local > src/types/database.ts
```
À exécuter après chaque groupe de migrations (règle absolue CLAUDE.md §9).

---

### [NEW-H-03] notify_epi_habilitation_alerts() créée mais jamais planifiée

**Fichier :** `supabase/migrations/20260513003_sprint2_epi_habilitations.sql`, lignes 246–347

La fonction SQL d'alerte EPI/habilitation est créée mais aucun job pg_cron ne l'appelle. Contrairement à `notify-late-actions` (migration 20260508001, ligne 15), aucun `cron.schedule(...)` n'est défini pour la fonction EPI.

**Fix :** Ajouter un job cron dans la migration corrective (voir NEW-C-01).

---

### [CI-H-01] Node 24 (unstable) utilisé dans les 4 workflows CI/CD

**Fichiers :** `.github/workflows/ci.yml:28`, `deploy-production.yml:117`, `deploy-staging.yml`, `deploy-preview.yml`

Node 24 est la branche Odd = Non-LTS (non supportée en production). Node 22 est l'Active LTS jusqu'à avril 2027.

**Fix :** Remplacer `node-version: '24'` par `node-version: '22'` dans les 4 workflows.

---

## 🟡 Normal

### [NEW-N-01] habilitation_attributions : contrainte UNIQUE absente

**Fichier :** `supabase/migrations/20260513003_sprint2_epi_habilitations.sql`, lignes 75–89

La table permet plusieurs attributions actives de la même habilitation pour le même utilisateur dans la même organisation. Sans contrainte UNIQUE sur `(organisation_id, habilitation_id, user_id)`, des insertions concurrentes peuvent créer des doublons.

**Fix :**
```sql
ALTER TABLE habilitation_attributions
  ADD CONSTRAINT uniq_hab_attr_active
  UNIQUE (organisation_id, habilitation_id, user_id);
```

---

### [FUNC-N-01] import_logs : table toujours non alimentée depuis ImportActionsModal

**Fichier :** `src/components/actions/ImportActionsModal.tsx`

Inchangé depuis l'audit précédent (C-03 partiellement résolu). La policy INSERT existe maintenant, mais `ImportActionsModal.tsx` n'écrit toujours jamais dans `import_logs`. Les imports CSV ne sont pas tracés.

---

### [FUNC-N-02] document_versions : versionning non implémenté en frontend

**Fichier :** `src/hooks/useDocuments.ts`

Inchangé depuis l'audit précédent (N-03). `useDocuments.ts` gère l'upload et la mise à jour de documents sans jamais créer d'entrée dans `document_versions`.

---

### [FUNC-N-03] document_acknowledgments : émargement non implémenté

Inchangé depuis l'audit précédent (N-04). Aucun composant frontend ne lit ni n'écrit dans `document_acknowledgments`.

---

### [FUNC-N-04] Gamification : 2 badges sur 8 implémentés

**Fichier :** `src/services/gamification.service.ts`, lignes 115–128

`checkAndAwardBadges()` vérifie uniquement `streak_7` et `streak_30`. Les 6 autres badges définis (action_10, action_50, process_author, kaizen_starter, document_uploader, team_player) n'ont aucun trigger. Les utilisateurs peuvent gagner au maximum 2 badges quelles que soient leurs activités.

---

### [CI-N-01] Variables d'environnement documentées mais inutilisées

**Fichier :** `CLAUDE.md`, section "Variables d'environnement Frontend"

`VITE_APP_URL` et `VITE_STRIPE_PUBLISHABLE_KEY` sont documentés dans CLAUDE.md mais `grep` ne trouve aucune occurrence de ces variables dans `src/`. Clarifier : réservées pour une feature future ou à supprimer de la documentation ?

---

### [CI-N-02] VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID non documentés dans CLAUDE.md

**Fichiers :** `.github/workflows/deploy-production.yml`, `.github/workflows/deploy-staging.yml`, `.github/workflows/deploy-preview.yml`

Ces 3 secrets sont requis pour tout déploiement Vercel mais absents de la documentation CLAUDE.md. Un nouveau développeur configurant le CI ne saurait pas qu'ils sont requis.

**Fix :** Ajouter une section "Secrets CI/CD" dans CLAUDE.md.

---

### [NEW-N-02] epi_items.site_id : optionnel sans enforcement UI

**Fichier :** `supabase/migrations/20260513003_sprint2_epi_habilitations.sql:19`

`site_id` est nullable (`ON DELETE SET NULL`). Dans une organisation multi-sites, un EPI sans site assigné crée une ambiguïté d'inventaire. La policy INSERT ne vérifie pas que `site_id` est renseigné.

Acceptable si l'UI force la sélection d'un site. À documenter comme contrainte métier.

---

## 🟢 Améliorations Architecture

### [ARCH-A-01] ManagerApp : StrategyPage absente de la sidebar

**Fichier :** `src/pages/manager/ManagerApp.tsx`

La route `/manager/strategie` existe et fonctionne mais n'est pas dans `PILOTAGE_GROUP` (sidebar). Accessible uniquement par URL directe. DirectorApp l'affiche correctement dans sa navigation.

**Fix :** Ajouter `{ to: '/manager/strategie', label: 'Stratégie', icon: Target }` dans `PILOTAGE_GROUP.children`.

---

### [ARCH-A-02] ProcessReviewDrawer : mutations sans onError

**Fichier :** `src/components/modules/ProcessReviewDrawer.tsx`, lignes 35–59

Les mutations `useMutation` de création et mise à jour de révisions de processus enregistrent `onSuccess` mais pas `onError`. Les erreurs PostgREST sont absorbées silencieusement sans toast utilisateur.

---

### [ARCH-A-03] TerrainReportsManager : boutons sans disabled sur mutation

**Fichier :** `src/pages/shared/TerrainReportsManager.tsx`

Les boutons `acknowledge` et `createIncident` n'ont pas `disabled={isPending}`. Un double-clic peut déclencher deux mutations simultanées.

---

### [ARCH-A-04] useInvitation : fetch via useEffect plutôt que react-query

**Fichier :** `src/hooks/useInvitation.ts`, lignes 21–49

Ce hook utilise `useEffect` + `useState` pour un fetch unique. Incohérent avec le reste de la codebase (react-query). Pas de retry automatique, pas de cache.

---

### [SQL-A-01] actions.responsible_id : DROP toujours planifié V2

**Fichier :** `src/hooks/useActions.ts:174`

Coexistence `responsible_id` + `responsible_ids` inchangée depuis l'audit précédent (H-09). La synchronisation manuelle `responsible_id = responsible_ids[0]` reste fragile. Planifier le DROP pour Sprint 3.

---

### [SQL-A-02] Composite index manquant sur epi_attributions

**Fichier :** `supabase/migrations/20260513003_sprint2_epi_habilitations.sql:54`

La fonction `notify_epi_habilitation_alerts()` filtre par `(organisation_id, next_control_date, is_active)`. L'index existant `idx_epi_attr_ctrl` est sur `(next_control_date) WHERE is_active = true`. Un index composite `(organisation_id, next_control_date)` serait plus efficace pour les organisations avec beaucoup d'attributions.

---

## Tables mortes — statut mis à jour

| Table | Statut | Changement depuis audit 2026-05-07 |
|-------|--------|------------------------------------|
| `import_logs` | Morte | Inchangé — policy INSERT existe, aucun code ne l'alimente |
| `document_versions` | Dormante | Inchangé — policies OK, aucun frontend |
| `document_acknowledgments` | Dormante | Inchangé — aucun frontend |
| `site_sections` | **ACTIVE** | Désormais utilisée dans `SeoGlobalEditor.tsx` ✅ |
| `templates` | **ACTIVE** | Désormais utilisée dans `RegisterPage.tsx` (onboarding sectoriel) ✅ |
| `superadmin_automation_logs` | **PARTIELLEMENT ACTIVE** | `AutomationsTab.tsx` lit les logs — runner toujours absent |

---

## Matrice RLS — delta depuis 2026-05-07

| Table | SELECT | INSERT | UPDATE | DELETE | Statut |
|-------|--------|--------|--------|--------|--------|
| `demo_requests` | ✅ superadmin | ✅ public (anon+auth) | ❌ | ❌ | OK — public intentionnel |
| `epi_items` | ✅ org member | ✅ contributor+ | ✅ manager+ | ✅ manager+ | ✅ Complet |
| `epi_attributions` | ✅ org member | ✅ contributor+ | ✅ manager+ | ✅ manager+ | ✅ Complet |
| `habilitations` | ✅ org member | ✅ contributor+ | ✅ manager+ | ✅ manager+ | ✅ Complet |
| `habilitation_attributions` | ✅ org member | ✅ contributor+ | ✅ manager+ | ✅ manager+ | ✅ Complet |
| `notification_prefs` | ✅ own | ✅ own | ✅ own | ✅ own | ✅ (migration 20260507006) |
| `recent_activity` (view) | ✅ security_invoker | N/A | N/A | N/A | ✅ Hardened (20260508005) |
| `notifications` | ✅ own | ✅ own | ✅ own | ✅ own | ⚠️ Colonnes manquantes → NEW-C-01 |

---

## Audit CI/CD — résumé

| Vérification | Statut |
|-------------|--------|
| TypeScript strict + ESLint zero-warnings | ✅ Enforced in CI |
| Vérification idempotence migrations | ✅ Enforced in CI |
| Nommage migrations | ✅ Enforced (scripts/check-migration-names.sh) |
| Build vérifié avant merge | ✅ `npm run build` in CI |
| 10 Edge Functions déployées | ✅ Toutes présentes |
| Functions --no-verify-jwt justifiées | ✅ send-email, check-ai-quota, stripe-webhook (HMAC) |
| node-version | ⚠️ Node 24 (Non-LTS) → CI-H-01 |
| Secrets documentés | ⚠️ VERCEL_* absent de CLAUDE.md → CI-N-02 |
| database.ts régénéré | ❌ Stale — Sprint 2 types manquants → DB-H-01 |

---

## Recommandations prioritaires

### Sprint 2 — À intégrer immédiatement

1. **Appliquer la migration corrective** `20260513004_audit_sprint2_fixes.sql` (colonnes notifications + cron EPI)
2. **Régénérer database.ts** : `supabase gen types typescript --local > src/types/database.ts`
3. **Créer** `supabase/functions/notify-weekly-digest/index.ts` ou désactiver le cron
4. **Ajouter write guards** dans ActionsPage, DocumentsPage, ProcessesPage pour le rôle reader

### Sprint 3 — Planifier

1. **Implémenter** les badges gamification manquants (action_10, action_50, etc.)
2. **Encapsuler** les 13+ appels Supabase directs dans des hooks dédiés
3. **Ajouter** `StrategyPage` dans la sidebar ManagerApp
4. **Ajouter** `onError` dans ProcessReviewDrawer

### Backlog long terme

1. Implémenter `document_versions` + `document_acknowledgments` frontend
2. Alimentation de `import_logs` depuis `ImportActionsModal`
3. Créer le runner d'automations superadmin (Edge Function scheduler)
4. DROP `actions.responsible_id` après migration des données
5. Migrer Node 22 LTS dans les 4 workflows CI/CD

---

## Bilan sécurité global

Depuis l'audit précédent (2026-05-07), **0 nouvelles fuites RLS** introduites. Les migrations 20260508005, 20260513001 et 20260513002 démontrent une bonne pratique de durcissement post-hoc. Les 4 nouvelles tables Sprint 2 (EPI/habilitations) ont des policies complètes et correctes.

Les 3 bugs critiques identifiés concernent des **fonctionnalités manquantes** (colonnes, edge function) plutôt que des fuites de données.

---

*Audit réalisé le 2026-05-13 — Post Sprint 1 (nav groupée, fix RLS membres/CMS, PageEditor refondu, module sécurité Sprint 2)*
*Migration corrective : `supabase/migrations/20260513004_audit_sprint2_fixes.sql`*
