# BUGS.md — PilotOS

> Tracker des bugs et issues connues. Mise à jour à chaque sprint.

## Format

```
## [BUG-NNN] Titre court
- **Statut** : new | confirmed | in_progress | resolved
- **Priorité** : critical | high | normal | low
- **Résolu en** : vX.X (si résolu)
- **Description** : Ce qui se passe vs ce qui devrait se passer
- **Reproduce** : Étapes pour reproduire
- **Note** : Contexte technique
```

---

## Bugs ouverts (Audit 2026-05-07)

### [BUG-002] admin_audit_log : INSERT bloqué — colonnes manquantes + RLS trop restrictif
- **Statut** : resolved
- **Priorité** : critical
- **Résolu en** : migration 20260507005_audit_fixes.sql
- **Description** : Double blocage — (1) `logger.ts` insère `actor_id / organisation_id / metadata` mais la table n'a que `admin_id / before_state / after_state` → PostgREST retourne 400 (colonne inconnue) ; (2) la policy `FOR ALL USING (is_superadmin())` bloquait aussi tous les non-superadmins. Aucun log d'audit Stripe n'a jamais été persisté depuis le lancement.
- **Note** : Colonnes manquantes ajoutées via `ADD COLUMN IF NOT EXISTS`. Policy scindée en `audit_log_superadmin_read` (SELECT) + `audit_log_authenticated_insert` (INSERT pour tout utilisateur authentifié).

---

### [BUG-003] action_comments_read : fuite de commentaires d'actions confidentielles
- **Statut** : resolved
- **Priorité** : critical
- **Résolu en** : migration 20260507005_audit_fixes.sql
- **Description** : La policy `action_comments_read` ne vérifiait pas la visibilité de l'action parente. Un utilisateur connaissant un `action_id` pouvait lire les commentaires d'une action `confidential`.
- **Note** : Ajout de `can_see_item(a.organisation_id, a.visibility, a.visibility_user_ids)` dans le JOIN.

---

### [BUG-004] import_logs : table inaccessible en écriture + jamais alimentée
- **Statut** : resolved (partial)
- **Priorité** : critical
- **Résolu en** : migration 20260507005_audit_fixes.sql (policy INSERT)
- **Description** : La table `import_logs` n'avait pas de policy INSERT. De plus, `ImportActionsModal.tsx` ne loguait jamais les imports. Les imports CSV n'étaient pas tracés.
- **Note** : Policy INSERT ajoutée. L'alimentation depuis `ImportActionsModal.tsx` reste à implémenter (backlog).

---

### [BUG-005] is_superadmin() : membership inactif = perte d'accès totale
- **Statut** : resolved
- **Priorité** : critical
- **Résolu en** : migration 20260507005_audit_fixes.sql
- **Description** : `is_superadmin()` ne fonctionnait que si `is_active = true` dans `organisation_members`. Si le membership était désactivé par erreur, toutes les policies RLS basées sur `is_superadmin()` retournaient false.
- **Reproduce** : Désactiver `is_active` sur le membership superadmin → tentative de connexion → accès refusé sur toutes les tables.
- **Note** : Colonne `profiles.is_superadmin` ajoutée comme source primaire + `is_superadmin()` réécrite avec fallback sur `organisation_members`. Backfill des superadmins actifs effectué.

---

### [BUG-006] document_versions : aucune policy INSERT — versionning impossible
- **Statut** : resolved
- **Priorité** : critical
- **Résolu en** : migration 20260507005_audit_fixes.sql
- **Description** : La table `document_versions` n'avait que la policy SELECT. Tout INSERT via le client authentifié était bloqué par RLS sans message d'erreur explicite.
- **Note** : Policies INSERT/UPDATE/DELETE ajoutées (contributor+ pour INSERT, manager+ pour UPDATE/DELETE).

---

### [BUG-007] terrain_reports_write : le rôle reader peut créer des signalements
- **Statut** : resolved
- **Priorité** : high
- **Résolu en** : migration 20260507005_audit_fixes.sql
- **Description** : La policy `terrain_reports_write` autorisait tout membre actif sans filtre de rôle. Les `reader` (lecture seule partout ailleurs) pouvaient créer, modifier et supprimer des signalements terrain.
- **Note** : Ajout de `AND om.role NOT IN ('reader')` dans la policy.

---

### [BUG-008] useOrganisation : ctxOrgId corrompu non nettoyé après échec
- **Statut** : resolved
- **Priorité** : high
- **Résolu en** : `src/hooks/useOrganisation.ts`
- **Description** : Quand le superadmin switchait vers une org puis que cette org était supprimée, le `ctxOrgId` restait en sessionStorage. Au rechargement, le hook retentait et retombait silencieusement sur le membership par défaut sans effacer le contexte.
- **Note** : `clearOrgContext()` appelé si `ctxRows` retourne vide.

---

### [BUG-009] useOrganisation : erreur réseau redirige vers /onboarding
- **Statut** : resolved
- **Priorité** : high
- **Résolu en** : `src/hooks/useOrganisation.ts`
- **Description** : Si la query `organisation_members` échouait (réseau temporairement inaccessible), le hook retournait `member = null` + `loading = false`, ce qui déclenchait une redirection vers `/onboarding` même pour un utilisateur existant.
- **Note** : La query lève maintenant une exception sur erreur (au lieu de retourner null), React Query effectue 2 retries. `isError` est exposé et fait rester `loading = true` pour éviter la redirection.

---

### [BUG-010] blog_posts.cover_image_url : colonne dupliquée
- **Statut** : resolved
- **Priorité** : high
- **Résolu en** : migration 20260507005_audit_fixes.sql
- **Description** : Deux colonnes pour la même donnée : `cover_image_url` (migration 010) et `cover_image` (migration 20260501002). `BlogTab.tsx` lisait les deux en cascade. Données migrées, ancienne colonne supprimée.

---

### [BUG-011] roadmap_votes / feedback_votes : votes anonymes multiples possibles
- **Statut** : resolved
- **Priorité** : high
- **Résolu en** : migration 20260507005_audit_fixes.sql
- **Description** : `UNIQUE(item_id, user_id)` avec `user_id` nullable autorisait plusieurs votes avec `user_id = NULL` (NULL ≠ NULL dans les index PostgreSQL). Un script non authentifié pouvait gonfler artificiellement les votes.
- **Note** : Policy INSERT WITH CHECK `user_id = auth.uid() AND auth.uid() IS NOT NULL` bloque les votes anonymes.

---

### [BUG-012] user_badges : aucune policy INSERT — attribution de badges impossible
- **Statut** : resolved
- **Priorité** : normal
- **Résolu en** : migration 20260507005_audit_fixes.sql
- **Description** : `user_badges` n'avait que la policy SELECT. `gamification.service.ts` (appelé via le client authentifié) ne pouvait pas insérer de badges — toutes les attributions échouaient silencieusement.
- **Note** : Policy INSERT ajoutée pour `user_id = auth.uid()`.

---

## Bugs résolus (Audit précédent — 2026-04-29)

### [BUG-001] Superadmin membership inactif (workaround useAuth)
- **Statut** : resolved
- **Priorité** : critical
- **Résolu en** : migration 20260507005_audit_fixes.sql (fix structurel), workaround client conservé
- **Description** : Le membership superadmin pouvait se retrouver avec `is_active = false`, bloquant l'accès. Workaround JavaScript dans `useAuth.ts` (fallback sur membership inactif pour superadmin) conservé comme filet de sécurité.

---

*Dernière mise à jour : 2026-05-07 (sprint audit complet)*
