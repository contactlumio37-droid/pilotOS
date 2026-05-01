# Règles de nommage des migrations PilotOS

## Format obligatoire

```
YYYYMMDDNNN_description.sql
```

- `YYYYMMDD` — date du jour (8 chiffres)
- `NNN` — numéro séquentiel sur 3 chiffres, **collé à la date, sans séparateur**
- `_description` — mots en minuscules séparés par `_`
- Préfixe numérique total : **≥ 11 chiffres**

### ✅ Valides

```
20260501001_add_stripe_webhooks.sql
20260501002_add_notification_types.sql
```

### ❌ Invalides

```
20260501_001_add_stripe_webhooks.sql   ← underscore entre date et numéro
20260501001AddStripeWebhooks.sql       ← majuscules, pas d'underscore
20260501_webhooks.sql                  ← pas de numéro séquentiel
```

---

## Pourquoi ce format est critique

Supabase CLI extrait la **version** d'un fichier en lisant uniquement le préfixe
numérique continu (tous les chiffres consécutifs depuis le début du nom).
Il s'arrête au premier caractère non numérique.

| Nom de fichier | Version extraite | Problème |
|---|---|---|
| `20260430021_foo.sql` | `20260430021` | ✅ unique |
| `20260430_021_foo.sql` | `20260430` | ❌ collision — toute migration du même jour partage cette version |

Un underscore entre la date et le numéro tronque la version à 8 chiffres.
Si deux fichiers partagent la même date, Supabase CLI tente d'insérer deux fois
la même valeur dans `schema_migrations` → `duplicate key value violates unique
constraint "schema_migrations_pkey"`.

---

## Workflow obligatoire

```bash
# 1. Créer une migration (génère automatiquement un nom valide avec timestamp)
supabase migration new mon_ajout

# 2. Écrire le SQL dans le fichier généré

# 3. Valider localement
bash scripts/check-migration-names.sh

# 4. Appliquer localement
bash scripts/db-push.sh

# 5. Commiter et pousser
git add supabase/migrations/
git commit -m "feat(db): add mon_ajout"
git push
```

> **Ne jamais créer un fichier `.sql` à la main** dans `supabase/migrations/`.
> Utiliser exclusivement `supabase migration new <description>`.

---

## Gardes-fous en place

| Couche | Mécanisme | Script |
|---|---|---|
| Local (commit) | git pre-commit hook | `.githooks/pre-commit` |
| PR | CI check (ci.yml) | `scripts/check-migration-names.sh` |
| Deploy staging | Avant db push | `scripts/db-push.sh` (étapes 1+2) |
| Deploy prod | Avant db push | `scripts/db-push.sh` (étapes 1+2) |

Installer le hook local après le premier clone :
```bash
bash scripts/install-hooks.sh
```

---

## Exception historique

Le fichier `20260430_016_blog_enrichissement.sql` conserve son nom avec underscore
car il a été appliqué en base avec la version `20260430` avant que ce check
n'existe. **Ne pas ajouter d'autres exceptions.**

Pour corriger proprement ce fichier, exécuter d'abord dans Supabase SQL Editor :

```sql
UPDATE supabase_migrations.schema_migrations
SET version = '20260430016',
    name    = '20260430016_blog_enrichissement'
WHERE version = '20260430'
  AND name = '20260430_016_blog_enrichissement';
```

Puis renommer le fichier local et retirer l'entrée de `KNOWN_EXCEPTIONS`
dans `scripts/check-migration-names.sh`.

---

## Cas de base corrompue

### Diagnostic

```bash
# Via CLI
supabase migration list

# Via SQL Editor
-- Voir scripts/inspect-schema-migrations.sql
```

### Repair

```bash
# Versions orphelines en base (Remote sans Local)
supabase migration repair --status reverted <version>

# Ou via le script dédié
bash scripts/repair-migrations.sh          # interactif
bash scripts/repair-migrations.sh --auto   # non-interactif (CI)
bash scripts/repair-migrations.sh --dry-run # simulation
```

### Stratégie par environnement

| Env | Action possible | Interdite |
|---|---|---|
| Dev | `db reset`, Recovery A/B/C/D | — |
| Staging | Recovery A/B/C/D dans une transaction | `db reset` |
| Prod | Snapshot → Recovery dans transaction → validation | `db reset`, DELETE direct sans transaction |
