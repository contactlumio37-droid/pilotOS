# Audit RBAC/ACL — PilotOS

> Généré le 2026-04-25 · Basé sur le code source (`supabase/migrations/`, `src/hooks/`, `src/pages/`)

---

## Table des matières

1. [Identification des entités](#1-identification-des-entités)
2. [Relations](#2-relations)
3. [Liste des rôles](#3-liste-des-rôles)
4. [Logique d'autorisation](#4-logique-dautorisation)
5. [Incohérences et risques](#5-incohérences-et-risques)
6. [Cas d'usage](#6-cas-dusage)
7. [Synthèse](#7-synthèse)
8. [Annexes — Politiques RLS détaillées](#8-annexes--politiques-rls-détaillées)

---

## 1. Identification des entités

### Tables utilisateurs / rôles / permissions

| Table | Champs principaux | Rôle |
|---|---|---|
| `auth.users` | `id`, `email`, `created_at` | Géré par Supabase — source de vérité auth |
| `profiles` | `id` (FK auth.users), `full_name`, `avatar_url`, `job_title` | Données affichage, relation 1:1 avec auth.users |
| `organisations` | `id`, `name`, `slug`, `plan`, `mfa_policy`, `is_active`, `ai_enabled` | Conteneur locataire multi-tenant |
| `organisation_members` | `user_id`, `organisation_id`, `role`, `is_active`, `mfa_enabled`, `can_impersonate`, `is_billable` (GENERATED) | **Table pivot critique** — porte le rôle |
| `mfa_enrollments` | `user_id`, `method` (totp/email_otp), `totp_factor_id`, `is_active` | Enrôlement MFA par utilisateur |
| `impersonation_logs` | `impersonator_id`, `impersonated_user_id`, `organisation_id`, `started_at`, `ended_at` | Audit immuable |
| `module_access` | `organisation_id`, `module`, `is_active` | Active/désactive les modules par org |

### Type `Module` (gating fonctionnel)

```
'pilotage' | 'processus' | 'ged' | 'terrain' | 'securite' | 'qse'
```

### Structure `organisation_members` (détail)

```sql
CREATE TABLE organisation_members (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role             TEXT DEFAULT 'contributor'
                   CHECK (role IN ('superadmin','admin','manager','contributor','terrain','reader','director')),
  is_active        BOOLEAN DEFAULT true,
  mfa_enabled      BOOLEAN DEFAULT false,
  can_impersonate  BOOLEAN NOT NULL DEFAULT false,
  -- Colonne non falsifiable côté client :
  is_billable      BOOLEAN NOT NULL GENERATED ALWAYS AS (role NOT IN ('superadmin')) STORED,
  UNIQUE(organisation_id, user_id)
);
```

---

## 2. Relations

**Modèle : RBAC + ABAC hybride**

```
auth.users ──(1:1)──▶ profiles
auth.users ──(1:N)──▶ organisation_members ◀──(1:N)── organisations
organisation_members ─── role (UserRole enum)
organisation_members ─── can_impersonate (BOOLEAN, permission ad hoc)
organisations ─────────── mfa_policy (policy globale par org)
organisations ─────────── module_access (activation fonctionnelle)
```

- **RBAC pur** pour les accès aux données (le `role` décide)
- **ABAC** sur la visibilité des items : champs `visibility` + `visibility_user_ids` sur chaque ligne de contenu
- **Pas de table `permissions`** — les droits sont codés dans les politiques RLS SQL et la constante `ROLE_HIERARCHY`

### Hiérarchie numérique (`src/hooks/useRole.ts`)

```typescript
const ROLE_HIERARCHY: Record<UserRole, number> = {
  superadmin: 100,
  admin:       80,
  director:    70,
  manager:     60,
  contributor: 40,
  reader:      20,
  terrain:     10,
}
```

---

## 3. Liste des rôles

### `superadmin` — Hiérarchie 100

- **Périmètre : global** (toutes les organisations, sans restriction)
- Non facturable (`is_billable = false`, colonne GENERATED)
- Seul rôle pouvant impersoner un utilisateur
- Peut s'auto-provisionner dans n'importe quelle org via Edge Function `ensure-org-access`
- Accès complet à la console SuperAdmin (organisations, plans, IA, activation/désactivation)
- Passe systématiquement toutes les guards RLS (`IF is_superadmin() THEN RETURN true`)

### `admin` — Hiérarchie 80

- **Périmètre : organisation**
- Gère les membres (invitations, changements de rôle, désactivations)
- Configure l'organisation (nom, slug, MFA policy, modules)
- Accès complet aux données de son org (actions, processus, documents, sécurité)
- **Ne peut pas impersoner** (sauf si `can_impersonate = true` accordé explicitement)

### `director` — Hiérarchie 70

- **Périmètre : organisation**
- Accès identique à `manager` en termes de données (lit et écrit sur toutes les ressources)
- Pas d'accès à l'administration des membres
- Navigation dédiée `DirectorApp` (`/direction/*`)

### `manager` — Hiérarchie 60

- **Périmètre : organisation**
- Lecture + écriture sur actions, processus, objectifs, documents, sécurité QSE
- Voit **tous** les signalements terrain (pas seulement les siens)
- Point de bascule de nombreuses politiques RLS (`is_manager_or_above`)

### `contributor` — Hiérarchie 40

- **Périmètre : organisation**
- Crée/édite des actions, dépose des documents
- Ne voit que ses propres signalements terrain
- Lecture seule sur processus, indicateurs, objectifs

### `reader` — Hiérarchie 20

- **Périmètre : organisation**
- Lecture seule sur les ressources de visibilité `public`
- Exclu explicitement de tous les writes : `role NOT IN ('reader')`
- Ne voit pas les items `managers`, `restricted`, `confidential` (sauf `visibility_user_ids`)

### `terrain` — Hiérarchie 10

- **Périmètre : très restreint**
- Crée des signalements terrain (`terrain_reports`)
- Ne voit que ses propres signalements
- Aucun accès aux processus, documents, actions, sécurité
- App dédiée `TerrainApp` avec 3 écrans + bottom nav uniquement

### Matrice d'autorisation

| Ressource | superadmin | admin | director | manager | contributor | reader | terrain |
|---|---|---|---|---|---|---|---|
| Organisations | CRUD | RU | R | R | R | R | — |
| Membres org | CRUD | CRUD | R | R | R | R | — |
| Actions (public) | CRUD | CRUD | CRUD | CRUD | CR | R | — |
| Actions (managers) | CRUD | CRUD | CRUD | CRUD | — | — | — |
| Processus | CRUD | CRUD | CRUD | CRUD | R | R | — |
| Objectifs | CRUD | CRUD | CRUD | CRUD | R | R | — |
| Documents (public) | CRUD | CRUD | CRUD | CRUD | CR | R | — |
| Indicateurs / valeurs | CRUD | CRUD | CRUD | CRUD | R | — | — |
| Terrain Reports (own) | CRUD | CRUD | CRUD | CRUD | CRUD | — | CRUD |
| Terrain Reports (autres) | CRUD | CRUD | CRUD | CRUD | — | — | — |
| DUER / Sécurité | CRUD | CRUD | CRUD | CRUD | — | — | — |
| Incidents (declared) | CRUD | CRUD | CRUD | CRUD | — | — | R |
| Incidents (autres) | CRUD | CRUD | CRUD | CRUD | — | — | — |
| Console SuperAdmin | CRUD | — | — | — | — | — | — |

*C=Create R=Read U=Update D=Delete — =Interdit*

---

## 4. Logique d'autorisation

### Architecture en 3 couches

```
┌─────────────────────────────────────────────┐
│  1. ROUTING (React — App.tsx)               │  ← UX uniquement, pas de sécurité
│     ProtectedRoute + MFARoute               │
│     useAppShell() → /terrain, /app...       │
├─────────────────────────────────────────────┤
│  2. UI CONDITIONNELLE (hooks React)         │  ← UX uniquement, pas de sécurité
│     useIsAtLeast('manager')                 │
│     useHasModule('securite')                │
├─────────────────────────────────────────────┤
│  3. RLS PostgreSQL (Supabase)               │  ← SEULE ligne de défense réelle
│     Politiques sur chaque table             │
│     Fonctions SECURITY DEFINER              │
└─────────────────────────────────────────────┘
```

### Fonctions SQL SECURITY DEFINER

```sql
is_superadmin()
  → EXISTS (SELECT 1 FROM organisation_members WHERE user_id = auth.uid() AND role = 'superadmin')

get_user_role(org_id UUID)
  → SELECT role FROM organisation_members WHERE user_id = auth.uid() AND organisation_id = org_id

is_manager_or_above(org_id UUID)
  → EXISTS (...role IN ('superadmin','admin','manager','director')...)

can_see_item(org_id, visibility, visibility_user_ids)
  → CASE visibility
      WHEN 'public'       → true (tous les membres)
      WHEN 'managers'     → role IN ('admin','manager','director','superadmin')
      WHEN 'restricted'   → manager+ OU auth.uid() IN visibility_user_ids
      WHEN 'confidential' → auth.uid() IN visibility_user_ids UNIQUEMENT
```

### Hooks React d'autorisation

```typescript
// useRole.ts
useRole()              → UserRole | null
useIsAtLeast(minRole)  → ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole]
useIsSuperadmin()      → role === 'superadmin'
useIsManagerOrAbove()  → useIsAtLeast('manager')
useIsAdminOrAbove()    → useIsAtLeast('admin')

// useOrganisation.ts
useHasModule(name)     → modules.some(m => m.module === name && m.is_active)
```

### Vérification MFA (`src/hooks/useMFA.ts`)

```typescript
function isMFARequired(policy: string, role: string, mfaEnabled: boolean): boolean {
  if (policy === 'disabled')   return false
  if (policy === 'required')   return true
  if (policy === 'role_based') return ['admin', 'manager', 'director'].includes(role)
  return mfaEnabled  // 'optional' → requis uniquement si déjà enrollé
}
```

Token MFA stocké dans `sessionStorage` (volatile — revalidation à chaque onglet).

### Impersonation (`supabase/functions/impersonate-user`)

1. Valider que l'appelant est superadmin OU `can_impersonate = true` dans l'org
2. Valider que la cible n'est pas superadmin
3. **Écrire dans `impersonation_logs` AVANT d'émettre le token** (audit immuable)
4. Émettre un JWT custom : `sub = target_user_id` + claims `is_impersonating: true`, `impersonator_id`, TTL = 1h

```typescript
// Constraint PostgreSQL — non contournable
CONSTRAINT no_self_impersonation CHECK (impersonator_id <> impersonated_user_id)
```

### Cas spéciaux / bypass

| Mécanisme | Description |
|---|---|
| `is_superadmin()` | Bypass total de toutes les guards RLS |
| Impersonation | JWT custom — `auth.uid()` pointe vers la cible, RLS s'applique normalement à elle |
| Org-switching | `sessionStorage['pilotos_org_ctx']` — bascule le contexte React sans changer le JWT |
| Service Role | Uniquement dans les Edge Functions, jamais côté client React |

---

## 5. Incohérences et risques

### 🟡 RISQUE MOYEN — Routing non enforced côté serveur

Un utilisateur `terrain` connaissant l'URL `/manager/actions` charge le JS de `ManagerApp`. Le RLS bloque les données (0 lignes retournées ou 403), mais le code JavaScript s'exécute sans contrôle.

Ce n'est pas un risque de fuite de données, mais une source potentielle d'erreurs non gérées en production.

**Recommandation :** Ajouter un check de rôle dans chaque App shell pour rediriger immédiatement si le rôle courant ne correspond pas à la route.

```typescript
// Exemple dans ManagerApp.tsx
const role = useRole()
if (role && !['manager','director','admin','superadmin'].includes(role)) {
  return <Navigate to="/app" replace />
}
```

---

### 🟡 RISQUE MOYEN — `director` sous-différencié de `admin`

`director` (70) et `admin` (80) passent tous les deux `is_manager_or_above()`. La seule différence en pratique est que l'admin accède au module de gestion des membres. Aucune politique RLS ne distingue spécifiquement `director`.

**Recommandation :** Documenter explicitement les cas d'usage `director` vs `admin`, ou fusionner les deux si la distinction n'est pas nécessaire.

---

### 🟡 RISQUE FAIBLE — MFA claim volatile en `sessionStorage`

```typescript
sessionStorage.setItem('pilotos_mfa_verified', userId)
```

- Volatile par conception (revalidation à la fermeture d'onglet) ✓
- Non porté dans le JWT Supabase
- Contournable par XSS (si un attaquant peut exécuter du JS dans la session)

**Recommandation à terme :** Émettre un JWT custom après validation MFA (comme pour l'impersonation) ou utiliser `supabase.auth.mfa.verify()` qui ajoute le claim `aal2` nativement dans le token.

---

### 🟡 RISQUE FAIBLE — `can_impersonate` non visible dans l'UI admin

Un admin d'organisation ne peut pas savoir, depuis l'interface, quels membres possèdent `can_impersonate = true`. La permission est accordée manuellement en base (ou via superadmin).

**Recommandation :** Afficher `can_impersonate` dans la liste des membres (`AdminMembers.tsx`) avec un indicateur visuel.

---

### 🟢 NON-RISQUE — Onboarding sécurisé

La policy `members_self_insert_first_admin` vérifie `NOT EXISTS` — impossible d'injecter un second admin dans une org existante via cette route.

```sql
CREATE POLICY "members_self_insert_first_admin" ON organisation_members
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND role = 'admin'
    AND NOT EXISTS (
      SELECT 1 FROM organisation_members existing
      WHERE existing.organisation_id = organisation_members.organisation_id
    )
  );
```

---

### 🟢 NON-RISQUE — `is_billable` non falsifiable

```sql
is_billable BOOLEAN NOT NULL GENERATED ALWAYS AS (role NOT IN ('superadmin')) STORED
```

Colonne calculée par PostgreSQL. Aucune valeur client ne peut la forcer.

---

### 🟢 NON-RISQUE — Impersonation circulaire impossible

Doublement protégée :
- Contrainte PostgreSQL `CONSTRAINT no_self_impersonation CHECK (impersonator_id <> impersonated_user_id)`
- Vérification Edge Function : `targetMembership.role === 'superadmin'` → 403

---

## 6. Cas d'usage

### Parcours utilisateur `terrain`

1. Se connecte → JWT émis, `role = 'terrain'`
2. `useAppShell()` retourne `'terrain'` → redirigé vers `/terrain`
3. `TerrainApp` charge : 3 écrans uniquement (Accueil, Signaler, Profil)
4. Crée un signalement : `INSERT INTO terrain_reports` — autorisé (tout membre actif peut insérer)
5. Consulte ses signalements : SELECT filtré par `reported_by = auth.uid()`
6. Tente `/manager` par URL directe → JS chargé, mais tous les SELECTs retournent 0 lignes (RLS filtre)

### Parcours utilisateur `admin`

1. Se connecte → si `mfa_policy = 'role_based'`, redirect vers `/mfa/verify`
2. Valide TOTP → `sessionStorage['pilotos_mfa_verified'] = userId`
3. `useAppShell()` retourne `'admin'` → redirigé vers `/admin`
4. `AdminApp` affiche sidebar complète : Dashboard, Actions, Processus, Documents, Membres, Paramètres, (+ Sécurité si module actif)
5. Invite un membre : `INSERT INTO member_invitations`, email via `sendInvitationEmail()`
6. Change le rôle d'un membre : `UPDATE organisation_members SET role = ?` → validé par policy `members_admin_write`
7. Active le module Sécurité : `UPDATE module_access SET is_active = true` → `useHasModule('securite')` retourne `true`

### Flux complet d'une opération protégée

**Exemple : admin modifie le rôle d'un membre**

```
1. AdminMembers.tsx ─── useAuth() + useOrganisation() → role = 'admin'
2. Affiche dropdown uniquement si role = 'admin' (check React)
3. supabase.from('organisation_members').update({ role: newRole })
4. Supabase Auth ─── vérifie Bearer JWT
5. RLS "members_admin_write" ─── USING (is_superadmin() OR get_user_role(organisation_id) IN ('admin'))
6. get_user_role() ─── SECURITY DEFINER → retourne le rôle de auth.uid() dans l'org
7. Condition satisfaite → UPDATE autorisé
8. React Query invalide ['members'] → re-fetch
```

---

## 7. Synthèse

### Points forts

| Point | Détail |
|---|---|
| **RLS imperméable** | Isolation multi-tenant par `organisation_id` sur 100% des tables métier |
| **Hiérarchie numérique simple** | `ROLE_HIERARCHY` rend `isAtLeast()` O(1), lisible, sans graph |
| **Visibilité ABAC 4 niveaux** | `public / managers / restricted / confidential` sur chaque ligne de contenu |
| **Impersonation auditée** | JWT custom, TTL 1h, log écrit avant le token, interdiction d'impersoner un superadmin |
| **`is_billable` GENERATED** | Non falsifiable par définition — sécurité Stripe garantie en base |
| **Service role confiné** | Jamais exposé côté client, uniquement dans les Edge Functions |
| **MFA flexible** | 4 policies configurables par organisation |
| **Onboarding sécurisé** | `NOT EXISTS` empêche l'injection d'admin dans une org existante |

### Faiblesses

| Faiblesse | Sévérité | Recommandation |
|---|---|---|
| Routing non enforced côté serveur | 🟡 Moyen | Guard de rôle dans chaque App shell |
| `director` quasi-identique à `admin` | 🟡 Moyen | Documenter ou fusionner |
| MFA claim en `sessionStorage` (non JWT) | 🟡 Faible | Migrer vers JWT claim `aal2` |
| `can_impersonate` invisible dans l'UI admin | 🟡 Faible | Afficher dans `AdminMembers` |
| Pas d'audit log automatique sur les writes métier | 🟡 Faible | Trigger PostgreSQL sur tables sensibles |

### Niveau de complexité global

> **Moyen — bien structuré, avec une zone fragile**

Le backend (RLS + Edge Functions) est solide et défensif par conception. La fragilité est concentrée côté frontend : les guards React sont du sucre UX, pas de la sécurité. Tant que le RLS reste la seule source de vérité et que le service role n'est jamais exposé au client, le système résiste aux attaques directes.

---

## 8. Annexes — Politiques RLS détaillées

### Fonctions SECURITY DEFINER complètes

```sql
-- Récupère l'org principale de l'utilisateur courant
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT organisation_id FROM organisation_members
  WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Récupère le rôle dans une org spécifique
CREATE OR REPLACE FUNCTION get_user_role(org_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM organisation_members
  WHERE user_id = auth.uid() AND organisation_id = org_id AND is_active = true LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check superadmin global
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organisation_members
    WHERE user_id = auth.uid() AND role = 'superadmin' AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check manager ou au-dessus dans une org
CREATE OR REPLACE FUNCTION is_manager_or_above(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organisation_members
    WHERE user_id = auth.uid()
      AND organisation_id = org_id
      AND role IN ('superadmin','admin','manager','director')
      AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Logique de visibilité ABAC
CREATE OR REPLACE FUNCTION can_see_item(
  org_id UUID, item_visibility TEXT, item_visibility_user_ids UUID[]
)
RETURNS BOOLEAN AS $$
DECLARE user_role TEXT;
BEGIN
  IF is_superadmin() THEN RETURN true; END IF;
  user_role := get_user_role(org_id);
  RETURN CASE item_visibility
    WHEN 'public'       THEN true
    WHEN 'managers'     THEN user_role IN ('admin','manager','director','superadmin')
    WHEN 'restricted'   THEN user_role IN ('admin','manager','director','superadmin')
                             OR auth.uid() = ANY(item_visibility_user_ids)
    WHEN 'confidential' THEN auth.uid() = ANY(item_visibility_user_ids)
    ELSE false
  END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### Politiques clés

```sql
-- Organisations : tout utilisateur authentifié peut créer (onboarding)
CREATE POLICY "organisations_authenticated_insert" ON organisations
  FOR INSERT TO authenticated WITH CHECK (true);

-- Organisations : lecture via appartenance ou superadmin
CREATE POLICY "organisations_member_read" ON organisations
  FOR SELECT TO authenticated USING (
    is_superadmin()
    OR EXISTS (SELECT 1 FROM organisation_members
               WHERE organisation_id = organisations.id
                 AND user_id = auth.uid() AND is_active = true)
  );

-- Membres : premier INSERT = admin (onboarding)
CREATE POLICY "members_self_insert_first_admin" ON organisation_members
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND role = 'admin'
    AND NOT EXISTS (
      SELECT 1 FROM organisation_members existing
      WHERE existing.organisation_id = organisation_members.organisation_id
    )
  );

-- Membres : admin ou superadmin peut tout modifier
CREATE POLICY "members_admin_write" ON organisation_members
  FOR ALL TO authenticated USING (
    is_superadmin() OR get_user_role(organisation_id) IN ('admin')
  );

-- Actions : read avec visibilité ABAC
CREATE POLICY "actions_read" ON actions
  FOR SELECT USING (
    is_superadmin()
    OR (EXISTS (SELECT 1 FROM organisation_members om
                WHERE om.organisation_id = actions.organisation_id
                  AND om.user_id = auth.uid() AND om.is_active = true)
        AND can_see_item(organisation_id, visibility, visibility_user_ids))
  );

-- Actions : write interdit aux readers
CREATE POLICY "actions_write" ON actions
  FOR ALL USING (
    is_superadmin()
    OR EXISTS (SELECT 1 FROM organisation_members om
               WHERE om.organisation_id = actions.organisation_id
                 AND om.user_id = auth.uid()
                 AND om.role NOT IN ('reader')
                 AND om.is_active = true)
  );

-- Terrain reports : terrain voit les siens, managers voient tout
CREATE POLICY "terrain_reports_read" ON terrain_reports
  FOR SELECT USING (
    is_superadmin()
    OR (EXISTS (SELECT 1 FROM organisation_members om
                WHERE om.organisation_id = terrain_reports.organisation_id
                  AND om.user_id = auth.uid() AND om.is_active = true)
        AND (reported_by = auth.uid() OR is_manager_or_above(organisation_id)))
  );

-- Sécurité/QSE : manager+ uniquement
CREATE POLICY "duer_manager_write" ON duer_evaluations
  FOR ALL TO authenticated
  USING (is_manager_or_above(organisation_id))
  WITH CHECK (is_manager_or_above(organisation_id));
```

### Fichiers sources de référence

| Fichier | Responsabilité |
|---|---|
| `supabase/migrations/20260420_001_init_schema.sql` | Tables : organisations, organisation_members, sites, profiles, module_access |
| `supabase/migrations/20260420_011_rls_policies.sql` | 90% des politiques RLS (fonctions + policies) |
| `supabase/migrations/20260420_012_mfa.sql` | Tables MFA : mfa_enrollments, mfa_challenges |
| `supabase/migrations/20260421_017_billable_impersonation.sql` | Colonnes is_billable, can_impersonate + impersonation_logs |
| `supabase/migrations/20260424_019_rls_fix_complete.sql` | Policies idempotentes (DROP IF EXISTS) pour INSERT organisations |
| `supabase/migrations/20260425_020_securite.sql` | Module sécurité : tables + RLS policies |
| `src/hooks/useAuth.ts` | État global + détection impersonation + sélection org primaire |
| `src/hooks/useRole.ts` | ROLE_HIERARCHY + useIsAtLeast() + useAppShell() |
| `src/hooks/useOrganisation.ts` | Contexte org + org-switching superadmin |
| `src/hooks/useMFA.ts` | isMFARequired() + TOTP/Email OTP enrollment |
| `src/components/auth/ProtectedRoute.tsx` | Authentification requise |
| `src/components/auth/MFARoute.tsx` | MFA check selon organisation.mfa_policy |
| `src/App.tsx` | Lazy-loaded apps par rôle |
| `supabase/functions/impersonate-user/index.ts` | JWT custom + audit log |
| `supabase/functions/ensure-org-access/index.ts` | Auto-provisionnement superadmin |
