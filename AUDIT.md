# AUDIT — PilotOS Auth, Navigation & Hooks
**Date :** 2026-04-29
**Branche :** `claude/audit-pilotOS-auth-nav-bUzuP`

---

## Résumé

| Catégorie | ✅ OK | ⚠️ Partiel | ❌ Bug |
|-----------|-------|-----------|-------|
| Auth & Login | 7 | 1 | 0 |
| Navigation & Routes | 6 | 1 | 2 |
| Hooks & Fetching | 9 | 2 | 2 |
| Pages métier | 5 | 1 | 0 |
| **Total** | **27** | **5** | **4** |

**Criticité globale : BLOQUANT** (2 bugs ❌ bloquants + 2 bugs ❌ majeurs)

---

## ÉTAPE 1 — Auth & Login

| Point | Statut | Détail |
|-------|--------|--------|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` lus depuis `import.meta.env` | ✅ | `src/lib/supabase.ts:3-4` — `throw` si manquantes |
| Client Supabase instancié une seule fois | ✅ | Export unique dans `src/lib/supabase.ts` |
| `/login` : email + password + erreur affichée | ✅ | `src/pages/auth/LoginPage.tsx` — validation Zod + `setError` |
| `/register` : profile + organisation + membre admin + module 'pilotage' | ✅ | Trigger DB `handle_new_user` crée le profil ; `RegisterPage.tsx` crée l'org, l'admin et active le module |
| `useAuth()` retourne session, user, profile, organisation, role, loading | ✅ | `src/hooks/useAuth.ts:26-38` |
| Redirect post-login vers `/app` (dashboard) | ✅ | `LoginPage.tsx:63` — `navigate(from ?? '/app')` ; route `/app` affiche `DashboardPage` |
| Redirect vers `/login` si session null | ✅ | `ProtectedRoute.tsx:22` — `<Navigate to="/login">` |
| Logout vide session Supabase + state local | ✅ | `useAuth.ts:199-202` — `clearMfaVerified()` + `supabase.auth.signOut()` |
| Persistence de session (onAuthStateChange) | ✅ | `useAuth.ts:127-137` — subscription avec cleanup `unsubscribe()` |
| Redirect post-login : ordre membership MFA | ⚠️ | `LoginPage.tsx:44-49` — La vérification MFA utilise `.order('created_at', asc).limit(1)` (membership le plus ancien) alors que `useAuth` utilise le membership avec le rôle le plus élevé. Incohérence en cas de multi-organisation. |

---

## ÉTAPE 2 — Navigation & Routes

| Point | Statut | Détail |
|-------|--------|--------|
| Toutes les routes `/app/*` derrière `<ProtectedRoute>` | ✅ | `App.tsx:67-72` — toutes les routes rôle-spécifiques encapsulées dans `<ProtectedRoute><MFARoute>` |
| Chaque entrée de nav pointe vers une route existante | ✅ | Vérifié pour les 6 shells |
| Aucune route ne renvoie vers un composant inexistant | ✅ | Tous les imports de pages vérifiés |
| `<RoleRoute>` bloque selon le rôle | ⚠️ | Pas de composant `<RoleRoute>` — la protection côté frontend repose uniquement sur `AppRedirect` au login. Un utilisateur terrain peut naviguer manuellement vers `/superadmin`. Les données restent protégées par RLS. |
| `useModuleAccess` masque les sections inactives | ✅ | `ManagerApp.tsx:33-35` / `AdminApp.tsx:43-44` — `useHasModule('securite')` conditionne l'entrée nav |
| Sidebar : lien actif visuellement distingué | ✅ | `Sidebar.tsx:76-80` — `NavLink` avec `isActive → bg-brand-600 text-white` |
| Mobile : bottom nav < 768 px, sidebar cachée | ✅ | `useBreakpoint() === 'desktop'` contrôle l'affichage dans tous les shells |
| Redirections 404 définies | ✅ | `App.tsx:75` — catch-all `path="*"` vers `AppRedirect` ou `/` |
| Aucun import de page inexistant | ✅ | Tous les fichiers importés existent sur le disque |
| **Profile SuperAdmin** | ❌ | `SuperAdminApp.tsx:122-126` — `<Sidebar>` sans `profileTo` prop → défaut `/profil` (absolu). Aucune route `/profil` dans `App.tsx`. Clic sur "Mon profil" → catch-all → redirect `/superadmin`. La page profil est inaccessible pour les superadmins. |
| **Route `/app/dashboard`** | ❌ | `App.tsx:68` — la route est `/app/*` et le dashboard s'affiche sur `/app` (index). Le nav ContributorApp utilise `to="/app" end={true}` ce qui est correct. Aucun lien externe ne pointe vers `/app/dashboard` donc pas de route 404, mais le chemin attendu par la spec `/app/dashboard` n'existe pas comme route nommée — redirection vers `/app` via le shell. *(Mineur, comportement correct en pratique.)* |

### Routes manquantes ou orphelines

| Route | Problème |
|-------|---------|
| `/profil` (absolu) | Lien "Mon profil" du Sidebar dans `SuperAdminApp` pointe vers `/profil` — route inexistante dans le routeur principal. Catch-all renvoie vers `/superadmin`. |
| `/superadmin/profil` | Route absente dans `SuperAdminApp` — nécessaire pour afficher `ProfilePage` aux superadmins. |
| `/cgu` | `RegisterPage.tsx:385` — lien `<a href="/cgu">` pointe vers une route inexistante. *(Mineur)* |

---

## ÉTAPE 3 — Hooks & Fonctions

| Point | Statut | Détail |
|-------|--------|--------|
| `useEffect` avec cleanup (pas de fuites mémoire) | ✅ | `useAuth.ts:136` — `subscription.unsubscribe()` ; `useOrganisation.ts:39` — `removeEventListener` ; `useBreakpoint.ts:25` — `observer.disconnect()` |
| États `loading` et `error` exposés | ✅ | Tous les hooks `useQuery` exposent `isLoading` ; `useAuth` expose `loading` |
| Pas d'appels Supabase doubles au montage | ✅ | `useAuth` : `getSession` + `onAuthStateChange` est le pattern officiel Supabase |
| `organisation_id` toujours filtré | ✅ | Vérifié dans `useActions`, `usePilotage`, `useProcesses`, `useIndicators`, `useDocuments`, `useDashboardKPIs` |
| Données d'autres organisations inaccessibles | ✅ | Double protection : filtre `organisation_id` en JS + RLS PostgreSQL |
| Mutations invalident/re-fetchent les données | ✅ | `onSuccess: () => qc.invalidateQueries(...)` dans toutes les mutations |
| Zéro `any` TypeScript masquant un problème | ✅ | Les quelques `as unknown as X` sont justifiés (données JSON, réponses Supabase) |
| Erreurs Supabase catchées et loguées | ✅ | Toutes les `queryFn` propagent les erreurs via `throw error` |
| `useKpiConfig` — filtre `user_id` manquant | ❌ | `src/hooks/useDashboardKPIs.ts:160-166` — La requête filtre par `organisation_id` seulement, sans `user_id`. Dans une org multi-membres, retourne la config du **premier** membre trouvé, pas celle de l'utilisateur connecté. |
| `useSaveKpiConfig` — filtre `user_id` manquant | ❌ | `src/hooks/useDashboardKPIs.ts:181-184` — Le `UPDATE` sur `organisation_members` filtre uniquement par `organisation_id`. Sans filtre `user_id`, la requête tente de mettre à jour TOUS les membres de l'org. RLS limite l'impact à la propre ligne de l'utilisateur, mais la requête est sémantiquement incorrecte et peut échouer silencieusement si la politique RLS ne correspond pas. |
| `console.log` de debug en production | ⚠️ | `useActions.ts:135,136,148,161,162,174,175` + `useProfile.ts:29,33,43,53,59` — Logs de debug visibles en production |
| Login MFA : ordre membership incohérent | ⚠️ | `LoginPage.tsx:44-49` — `.order('created_at', asc)` retourne le membership le plus ancien, alors que `useAuth` prend le rôle le plus élevé. En multi-org, la politique MFA vérifiée au login peut différer de celle de la session active. |
| Pages métier — état vide (`EmptyState`) | ✅ | `DashboardPage`, `StrategyPage`, `ManagerDashboard` affichent tous un état vide avec CTA |
| Pages métier — skeletons pendant le fetch | ✅ | `isLoading && <div className="animate-pulse">` partout |
| Pages métier — validation avant submit | ✅ | Zod + `react-hook-form` sur tous les formulaires |
| TerrainApp — 4 items bottom nav | ⚠️ | `TerrainApp.tsx:10-15` — 4 items (Signaler, Remontées, Actions, **Profil**). CLAUDE.md spécifie "3 écrans max" pour terrain. Le profil alourdit la nav. |

---

## Bugs bloquants (à corriger en priorité)

### BUG-1 — SuperAdminApp : lien "Mon profil" mort
**Fichier :** `src/pages/superadmin/SuperAdminApp.tsx:122`
**Ligne :** `<Sidebar items={NAV_ITEMS} dark headerSlot={...} />`
**Description :** Aucun `profileTo` passé → défaut `/profil` (absolu) → route inexistante → catch-all redirige vers `/superadmin`. Les superadmins ne peuvent pas accéder à leur profil.
**Correction :**
```tsx
// SuperAdminApp.tsx : passer profileTo + ajouter la route
<Sidebar items={NAV_ITEMS} dark profileTo="/superadmin/profil" headerSlot={...} />
// Dans <Routes> :
<Route path="/profil" element={<ProfilePage />} />
```

### BUG-2 — `useKpiConfig` : filtre `user_id` manquant
**Fichier :** `src/hooks/useDashboardKPIs.ts:160`
**Description :** La requête retourne la config KPI du premier membre de l'org, pas celle de l'utilisateur connecté.
**Correction :**
```typescript
// Ajouter .eq('user_id', user!.id) dans le queryFn et dans useSaveKpiConfig
```

### BUG-3 — `useSaveKpiConfig` : UPDATE sans `user_id`
**Fichier :** `src/hooks/useDashboardKPIs.ts:181`
**Description :** `.update(...).eq('organisation_id', organisation!.id)` sans `.eq('user_id', user!.id)`. Tente de mettre à jour tous les membres. Sémantiquement incorrect même si RLS limite la portée réelle.
**Correction :**
```typescript
.eq('organisation_id', organisation!.id)
.eq('user_id', user!.id)  // ← ajouter
```

### BUG-4 — `LoginPage` : vérification MFA sur le mauvais membership
**Fichier :** `src/pages/auth/LoginPage.tsx:44`
**Description :** `.order('created_at', { ascending: true }).limit(1)` retourne le membership le plus ancien, pas celui avec le rôle le plus élevé. Un admin (rôle élevé dans org B) pourrait se connecter sans MFA si son membership le plus ancien (org A) ne l'exige pas.
**Correction :** Retirer l'`order` et appliquer la même logique de sélection par poids de rôle que `useAuth`.

---

## Bugs mineurs / améliorations

### MINOR-1 — TerrainApp : 4 items bottom nav (CLAUDE.md → 3 max)
**Fichier :** `src/pages/terrain/TerrainApp.tsx:10-15`
**Description :** Le profil est exposé dans la bottom nav terrain — augmente la charge cognitive. Selon CLAUDE.md "Terrain: bottom nav uniquement (3 écrans max)".
**Correction :** Retirer `{ to: '/terrain/profil', label: 'Profil', icon: UserCircle }` de `NAV_ITEMS` (la route `/profil` reste accessible par lien direct).

### MINOR-2 — `console.log` de debug en production
**Fichiers :**
- `src/hooks/useActions.ts:135,136,148,161,162,174,175`
- `src/hooks/useProfile.ts:29,33,43,53,59`
**Description :** Logs de debug envoyés en production (données utilisateur, payloads).
**Correction :** Supprimer les `console.log` et `console.warn` de debug. Conserver uniquement `console.error` pour les vraies erreurs.

### MINOR-3 — Lien `/cgu` inexistant
**Fichier :** `src/pages/auth/RegisterPage.tsx:385`
**Description :** `<a href="/cgu">CGU</a>` pointe vers une route qui n'existe pas.
**Correction :** Pointer vers une URL externe ou créer la page — sans changer la structure actuelle, remplacer par `href="#"` temporairement ou une page dédiée.

---

## Routes manquantes ou orphelines

| Route | Shell | Statut |
|-------|-------|--------|
| `/profil` (absolu) | Global router | ❌ Inexistante — utilisée par défaut dans Sidebar |
| `/superadmin/profil` | SuperAdminApp | ❌ Inexistante — nécessaire pour profil superadmin |
| `/app/dashboard` | ContributorApp | ⚠️ Non définie explicitement (fonctionne via `/app` index) |
| `/cgu` | Global | ⚠️ Lien externe, page absente |
