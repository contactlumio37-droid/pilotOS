# AUDIT PILOTOS — 2026-05-07

> Audit exhaustif : sécurité RLS, cohérence base de données, bugs frontend/hooks, tables mortes, simplifications.
> L'audit précédent (2026-04-29, auth/navigation) est conservé en section 7.

---

## Résumé exécutif

| Criticité | Nombre | Description |
|-----------|--------|-------------|
| 🔴 Critique | 5 | Fix immédiat — données silencieusement perdues ou fuite RLS |
| 🟠 Haut | 9 | Fix sprint suivant — comportements inattendus ou dégradation UX |
| 🟡 Normal | 8 | Backlog — features partiellement implémentées ou dead code |
| 🟢 Améliorations | 7 | Simplifications et dettes techniques |

**Migration corrective :** `supabase/migrations/20260507004_audit_fixes.sql`
**Périmètre :** 27 migrations SQL, 22 hooks React, 8 services, ~50 tables.

---

## 🔴 Critique (fix immédiat)

### [C-01] admin_audit_log : INSERT bloqué silencieusement pour les non-superadmins
**Fichiers :** `supabase/migrations/20260420011_rls_policies.sql`, `src/lib/logger.ts`

La policy `audit_log_superadmin` est `FOR ALL USING (is_superadmin())`. En PostgreSQL RLS, `USING` sans `WITH CHECK` explicite s'applique aussi aux INSERT — seuls les superadmins peuvent donc écrire dans cette table. Or `logEvent()` dans `src/lib/logger.ts` est appelé depuis `src/services/stripe.service.ts` avec le JWT de l'utilisateur courant. Si ce dernier n'est pas superadmin, l'INSERT échoue silencieusement (le `catch` ne fait que `console.error`). **Les logs d'audit Stripe ne sont jamais persistés pour les organisations classiques.**

**Fix migration :** Scinder la policy en SELECT superadmin-only + INSERT pour tout utilisateur authentifié.

---

### [C-02] action_comments_read : fuite de commentaires d'actions confidentielles
**Fichier :** `supabase/migrations/20260420011_rls_policies.sql`

```sql
-- Politique actuelle — ne vérifie PAS la visibilité de l'action parente
CREATE POLICY "action_comments_read" ON action_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM actions a
      JOIN organisation_members om ON om.organisation_id = a.organisation_id
      WHERE a.id = action_comments.action_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
      -- MANQUE : AND can_see_item(a.organisation_id, a.visibility, a.visibility_user_ids)
    )
  );
```

Un utilisateur connaissant un `action_id` (lien direct, URL partagée) peut lire tous les commentaires de cette action même si elle est `visibility = 'confidential'`.

**Fix migration :** Ajouter `AND can_see_item(a.organisation_id, a.visibility, a.visibility_user_ids)` dans le JOIN.

---

### [C-03] import_logs : table morte + INSERT impossible pour les utilisateurs authentifiés
**Fichiers :** `supabase/migrations/20260420009_payments_gamification.sql`, `src/components/actions/ImportActionsModal.tsx`

La table `import_logs` n'a qu'une policy `SELECT` (`import_logs_admin_read`) — aucune policy `INSERT`. `ImportActionsModal.tsx` crée des actions directement via `useCreateAction()` sans jamais écrire dans `import_logs`. La table est **à la fois inaccessible en écriture et jamais alimentée**. Les imports CSV ne sont pas tracés.

**Fix migration :** Ajouter une policy INSERT pour les admins.

---

### [C-04] is_superadmin() : membership inactif = perte totale d'accès superadmin
**Fichiers :** `supabase/migrations/20260420011_rls_policies.sql`, `src/hooks/useAuth.ts`, `supabase/manual-fixes/superadmin_bypass.sql`

`is_superadmin()` exige `is_active = true` dans `organisation_members`. Si ce membership est désactivé par erreur, **toutes les policies qui appelent `is_superadmin()` retournent false** et le superadmin perd l'accès intégral. L'existence de `manual-fixes/superadmin_bypass.sql` confirme que ce cas s'est déjà produit.

**Fix migration :** Ajouter `profiles.is_superadmin BOOLEAN DEFAULT false` + réécrire `is_superadmin()` pour lire cette colonne (SECURITY DEFINER → pas de récursion).

---

### [C-05] document_versions : aucune policy INSERT — versionning structurellement impossible
**Fichier :** `supabase/migrations/20260420011_rls_policies.sql`

La policy `doc_versions_read` couvre uniquement SELECT. Il n'existe pas de policy INSERT, UPDATE ou DELETE pour `document_versions`. Toute tentative d'insertion via le client authentifié est bloquée par RLS silencieusement.

**Fix migration :** Ajouter les policies INSERT/UPDATE/DELETE (contributor+ pour l'organisation).

---

## 🟠 Haut (fix sprint suivant)

### [H-01] feedback_reports_read : deux versions de policy — migration 011 vs 20260501006
**Fichiers :** `20260420011_rls_policies.sql`, `20260501006_feedback_enrichissement.sql`

Migration 011 crée la policy avec `is_anonymous = false AND status NOT IN ('wont_fix')`. Migration 20260501006 la DROP et recrée avec un filtre plus strict incluant `organisation_id IS NOT NULL` et un EXISTS sur `organisation_members`. La version active est celle de 20260501006 (dernière applied). Aucun bug actif mais confusion lors des relectures du code.

---

### [H-02] terrain_reports_write : le rôle reader peut créer des signalements
**Fichier :** `supabase/migrations/20260420011_rls_policies.sql`

La policy FOR ALL n'a pas de filtre sur le rôle. Un `reader` (lecture seule partout ailleurs) peut créer, modifier et supprimer des signalements terrain.

**Fix migration :** Ajouter `AND om.role NOT IN ('reader')` dans le EXISTS.

---

### [H-03] useOrganisation : ctxOrgId corrompu non nettoyé après échec
**Fichier :** `src/hooks/useOrganisation.ts:52`

Quand `ctxOrgId` est défini (superadmin en org-switching) mais que la query retourne vide (org supprimée), le hook fall-through sur le membership par défaut sans effacer `ctxOrgId` de sessionStorage. Au prochain rechargement, le contexte corrompu est relu.

**Fix frontend :** Appeler `clearOrgContext()` si `ctxRows` retourne vide.

---

### [H-04] useOrganisation : erreur réseau redirige vers /onboarding
**Fichier :** `src/hooks/useOrganisation.ts:64`

Si la query `organisation_members` échoue (réseau), elle retourne `null` → `loading = false` → `member = null` → AppRouter redirige vers `/onboarding`. Un utilisateur perd sa session à cause d'une erreur temporaire.

**Fix frontend :** Utiliser `isError` de React Query pour distinguer erreur réseau de "pas de membership".

---

### [H-05] blog_posts : colonne cover_image_url dupliquée (→ cover_image)
**Fichiers :** `20260420010_cms_feedback.sql`, `20260501002_blog_enrichissement.sql`, `src/pages/superadmin/tabs/BlogTab.tsx:535`

Migration 010 crée `cover_image_url`. Migration 20260501002 ajoute `cover_image`. `BlogTab.tsx` lit les deux (`post.cover_image ?? post.cover_image_url`) et n'écrit que dans `cover_image`.

**Fix migration :** Copier `cover_image_url → cover_image` où null, puis DROP `cover_image_url`.

---

### [H-06] blog_posts : colonne content (TEXT) jamais lue par le frontend
**Fichiers :** `20260420010_cms_feedback.sql`, `20260501002_blog_enrichissement.sql`

`blog_posts.content` (TEXT) créé en migration 010. `content_blocks` (JSONB) ajouté en 20260501002. `BlogTab.tsx` écrit uniquement dans `content_blocks`. Potentielles données historiques dans `content` non migrées.

**Fix :** Planifier migration de données + DROP en V2 après vérification.

---

### [H-07] Index manquants sur tables haute fréquence

| Table | Colonnes manquantes | Impact |
|-------|---------------------|--------|
| `feedback_reports` | `status`, `category`, `reporter_id` | Filtres dashboard feedback |
| `document_acknowledgments` | `user_id` | Liste docs à signer par utilisateur |
| `roadmap_items` | `status`, `is_public` | Affichage roadmap publique |
| `superadmin_automations` | `is_active`, `trigger_type` | Évaluation des triggers |
| `blog_posts` | `published`, `published_at` | Listing blog public |
| `newsletter_subscribers` | `confirmed` | Envoi campagnes aux abonnés confirmés |

---

### [H-08] roadmap_votes / feedback_votes : votes anonymes multiples possibles
**Fichier :** `supabase/migrations/20260420010_cms_feedback.sql`

`UNIQUE(item_id, user_id)` avec `user_id` nullable → PostgreSQL autorise plusieurs lignes avec `user_id = NULL` (NULL ≠ NULL dans les index uniques). Un script peut voter des dizaines de fois sans authentification.

**Fix migration :** Policy INSERT WITH CHECK `user_id = auth.uid()` pour bloquer les votes anonymes.

---

### [H-09] actions.responsible_id + responsible_ids : synchronisation fragile
**Fichiers :** `src/hooks/useActions.ts:174`, `src/components/modules/ActionDrawer.tsx:151`

Les deux colonnes coexistent. Le frontend maintient la cohérence en écrivant `responsible_id = responsible_ids[0]`. Une mise à jour externe qui ne maintient qu'une des deux colonnes casse la synchronisation silencieusement.

**Statut :** Acceptable court terme. Planifier DROP de `responsible_id` et `accountable_id` en V2.

---

## 🟡 Normal (backlog)

### [N-01] kpi_catalog et templates : lecture publique — comportement confirmé
Les templates contiennent des structures génériques sectorielles (non org-spécifiques). Lecture publique acceptable. À réévaluer si des templates personnalisés sont ajoutés.

### [N-02] kaizen_plans : drawer existant, pas de page dédiée
`KaizenDrawer.tsx` et `useProcesses.ts` gèrent les Kaizens mais aucune page `/kaizen` dédiée n'existe. Feature partiellement implémentée.

### [N-03] document_versions : versionning non implémenté en frontend
Table existante + policies manquantes (C-05). `useDocuments.ts` n'archive jamais de versions.

### [N-04] document_acknowledgments : signature électronique non implémentée
Policies RLS définies, aucun composant React ne lit ou écrit dans cette table.

### [N-05] superadmin_automations : UI configurable, runner absent
Aucune Edge Function scheduler. Les automations sont configurables en UI mais jamais exécutées.

### [N-06] decodeJwt sans validation de signature
`src/hooks/useAuth.ts:19` — décode le payload JWT sans vérifier la signature. Utilisé pour les claims d'impersonation UI uniquement. Risque faible avec CSP stricte.

### [N-07] ADMIN_SESSION_KEY en localStorage (refresh_token admin)
`src/hooks/useAuth.ts:173` — En cas de XSS, vol du refresh_token admin. Envisager une durée d'expiration courte pour le mode impersonation.

### [N-08] useAppShell retourne 'contributor' pour le rôle 'reader'
`src/hooks/useRole.ts:36` — Un reader voit l'interface ContributorApp avec potentiellement des boutons de création. Vérifier les guards d'écriture dans ContributorApp.

---

## 🟢 Améliorations / Simplifications

### [A-01] profiles.is_superadmin : source primaire recommandée
Ajouter `profiles.is_superadmin BOOLEAN DEFAULT false` + réécrire `is_superadmin()` via SECURITY DEFINER sur `profiles`. Résout C-04 structurellement.

### [A-02] Consolider blog_posts.cover_image_url → cover_image
Migration de données + DROP COLUMN (voir H-05).

### [A-03] site_sections : table orpheline à planifier en suppression V2
Frontend n'utilise que `cms_pages`. Migrer les données vers `cms_pages.sections` et DROP en V2.

### [A-04] Inline EXISTS → is_org_member()
Uniformiser les policies qui utilisent des blocs `EXISTS (SELECT 1 FROM organisation_members...)` inline avec la fonction `is_org_member()` créée en 20260506005.

### [A-05] get_user_role() : envisager JWT custom claims (V2)
N+1 queries SQL sur chaque requête RLS. Stocker le rôle dans les custom claims JWT via Supabase Auth Hook (V2, breaking change).

### [A-06] trigger update_updated_at() : couverture complète confirmée ✅
Toutes les tables avec `updated_at` utilisent la fonction partagée. Aucune duplication.

### [A-07] members_own_read + members_org_member_read : coexistence justifiée ✅
`members_own_read` reste utile pour le cas onboarding. Pas de conflit.

---

## Matrice RLS complète

| Table | SELECT | INSERT | UPDATE | DELETE | Risque |
|-------|--------|--------|--------|--------|--------|
| organisations | ✅ membre actif | ❌ service_role | ✅ admin | ❌ service_role | OK |
| sites | ✅ membre | ✅ admin | ✅ admin | ✅ admin | OK |
| profiles | ✅ own+collègues actifs | ✅ own | ✅ own | ❌ | OK |
| organisation_members | ✅ membres org | ❌ service_role | ✅ admin | ✅ admin | OK |
| module_access | ✅ membre | ❌ superadmin | ✅ superadmin | ✅ superadmin | OK |
| strategic_objectives | ✅ visibilité | ✅ manager+ | ✅ manager+ | ✅ manager+ | OK |
| codir_decisions | ✅ visibilité | ✅ director+ | ✅ director+ | ✅ director+ | OK |
| projects | ✅ visibilité | ✅ manager+ | ✅ manager+ | ✅ manager+ | OK |
| processes | ✅ visibilité | ✅ manager+ | ✅ manager+ | ✅ manager+ | OK |
| process_reviews | ✅ membre | ✅ manager+ | ✅ manager+ | ✅ manager+ | OK |
| non_conformities | ✅ membre | ✅ contributor+ | ✅ contributor+ | ✅ contributor+ | OK |
| kaizen_plans | ✅ membre | ✅ manager+ | ✅ manager+ | ✅ manager+ | OK |
| actions | ✅ visibilité | ✅ contributor+ | ✅ manager+/own | ✅ manager+ | OK |
| action_comments | ✅ org (sans visibilité parente) | ✅ contributor+ | ✅ own | ✅ own | ⚠️ C-02 |
| terrain_reports | ✅ own+manager | ✅ TOUT membre | ✅ TOUT membre | ✅ TOUT membre | ⚠️ H-02 |
| indicators | ✅ visibilité | ✅ manager+ | ✅ manager+ | ✅ manager+ | OK |
| indicator_values | ✅ hérité indicator | ✅ contributor+ | ✅ contributor+ | ✅ contributor+ | OK |
| document_folders | ✅ membre | ✅ manager+ | ✅ manager+ | ✅ manager+ | OK |
| documents | ✅ visibilité | ✅ contributor+ | ✅ contributor+ | ✅ contributor+ | OK |
| document_versions | ✅ hérité document | ❌ aucune policy | ❌ aucune policy | ❌ aucune policy | ⚠️ C-05 |
| document_acknowledgments | ✅ own+manager | ✅ own | ✅ own | ✅ own | OK |
| subscriptions | ✅ admin org | ❌ superadmin | ❌ | ❌ | OK |
| stripe_events | ✅ superadmin | ✅ superadmin | ❌ | ❌ | OK (webhook=service_role) |
| import_logs | ✅ admin | ❌ aucune policy | ❌ | ❌ | ⚠️ C-03 |
| user_streaks | ✅ own+superadmin | ✅ own | ✅ own | ✅ own | OK |
| user_badges | ✅ own+manager | ❌ aucune policy | ❌ | ❌ | ⚠️ service_role writes |
| notifications | ✅ own | ✅ own | ✅ own | ✅ own | OK |
| admin_audit_log | ✅ superadmin | ❌ superadmin seulement | ❌ | ❌ | ⚠️ C-01 |
| ai_usage | ✅ own+admin | ✅ membre actif | ❌ | ❌ | OK |
| newsletter_subscribers | ✅ superadmin | ✅ public | ❌ | ❌ | OK |
| email_logs | ✅ superadmin | ✅ superadmin | ❌ | ❌ | OK |
| roadmap_items | ✅ public | ❌ superadmin | ✅ superadmin | ✅ superadmin | OK |
| roadmap_votes | ✅ public | ✅ own | ✅ own | ✅ own | ⚠️ H-08 |
| feedback_reports | ✅ own+org+superadmin | ✅ public | ✅ superadmin | ❌ | OK |
| feedback_votes | ✅ public | ✅ own | ✅ own | ✅ own | ⚠️ H-08 |
| feedback_subscribers | ✅ own+superadmin | ✅ own | ✅ own | ✅ own | OK |
| feature_bounties | ✅ public | ❌ superadmin | ❌ | ❌ | OK |
| bounty_pledges | ✅ admin org | ❌ superadmin | ❌ | ❌ | OK |
| site_sections | ✅ public (visible) | ✅ superadmin | ✅ superadmin | ✅ superadmin | OK |
| blog_posts | ✅ public (published) | ✅ superadmin | ✅ superadmin | ✅ superadmin | OK |
| blog_categories | ✅ public | ✅ superadmin | ✅ superadmin | ✅ superadmin | OK |
| newsletter_tags | ✅ superadmin | ✅ superadmin | ✅ superadmin | ✅ superadmin | OK |
| newsletter_campaigns | ✅ superadmin | ✅ superadmin | ✅ superadmin | ✅ superadmin | OK |
| superadmin_automations | ✅ superadmin | ✅ superadmin | ✅ superadmin | ✅ superadmin | OK |
| superadmin_automation_logs | ✅ superadmin | ✅ superadmin | ✅ superadmin | ✅ superadmin | OK |
| cms_pages | ✅ public (published) | ✅ superadmin | ✅ superadmin | ✅ superadmin | OK |
| kpi_catalog | ✅ public | ❌ service_role seed | ❌ | ❌ | OK |
| templates | ✅ public | ❌ service_role seed | ❌ | ❌ | OK |
| mfa_enrollments | ✅ own | ✅ own | ✅ own | ✅ own | OK |
| mfa_challenges | ✅ own | ✅ own | ❌ service_role | ❌ | OK |

---

## Tables mortes identifiées

| Table | Statut | Raison |
|-------|--------|--------|
| `import_logs` | Morte | `ImportActionsModal.tsx` n'écrit pas dedans + pas de policy INSERT |
| `document_versions` | Dormante | Aucun code frontend + policy INSERT manquante |
| `document_acknowledgments` | Dormante | Aucun composant frontend n'implémente la signature |
| `site_sections` | Orpheline | Remplacée par `cms_pages` — frontend n'utilise que `cms_pages` |
| `templates` | Morte | Aucun hook ou page ne consomme cette table |
| `superadmin_automation_logs` | Dormante | Aucune Edge Function runner |

---

## Relations frontend/backend manquantes

| Feature | Table backend | Code frontend | Statut |
|---------|---------------|---------------|--------|
| Import actions tracé | `import_logs` | `ImportActionsModal.tsx` | ❌ Non implémenté |
| Versionning GED | `document_versions` | `useDocuments.ts` | ❌ Non implémenté |
| Émargement documents | `document_acknowledgments` | Aucun composant | ❌ Non implémenté |
| Templates sectoriels | `templates` | Aucun hook | ❌ Non implémenté |
| Automations runner | `superadmin_automation_logs` | Aucune Edge Function | ❌ Non implémenté |
| Kaizen page dédiée | `kaizen_plans` | Drawer uniquement | ⚠️ Partiel |
| Gamification badges (action_10, action_50…) | `user_badges` | Uniquement streak_7/30 | ⚠️ Partiel |
| Audit Stripe logs | `admin_audit_log` | INSERT bloqué par RLS | ❌ Silently failing |

---

## Section 7 — Audit précédent (2026-04-29 : Auth, Navigation & Hooks)

> Conservé pour référence. Tous les bugs bloquants de cet audit ont été résolus.

| Bug | Statut |
|-----|--------|
| BUG-1 SuperAdminApp : lien Mon profil mort | ✅ Résolu |
| BUG-2 useKpiConfig : filtre user_id manquant | ✅ Résolu |
| BUG-3 useSaveKpiConfig : UPDATE sans user_id | ✅ Résolu |
| BUG-4 LoginPage : vérification MFA mauvais membership | ✅ Résolu |
| MINOR-1 TerrainApp : 4 items bottom nav | ✅ Résolu |
| MINOR-2 console.log en production | ✅ Résolu |
| MINOR-3 Lien /cgu inexistant | ✅ Résolu |

---

*Audit réalisé le 2026-05-07 — Migration corrective : `supabase/migrations/20260507004_audit_fixes.sql`*
