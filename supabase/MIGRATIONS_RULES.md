# Règles de nommage des migrations PilotOS

## Formats acceptés

```
YYYYMMDDNNN_description.sql        ← 11 chiffres (legacy, ok)
YYYYMMDDHHMMSS_description.sql     ← 14 chiffres (recommandé)
```

- `YYYYMMDD` — date du jour (8 chiffres)
- `NNN` — numéro séquentiel sur 3 chiffres, **collé à la date, sans séparateur**
- `HHMMSS` — heure/minute/seconde, collés à la date (format recommandé)
- `_description` — mots en minuscules séparés par `_`
- Préfixe numérique total : **≥ 11 chiffres**

### ✅ Valides

```
20260501001_add_stripe_webhooks.sql       ← 11 chiffres (legacy ok)
20260501000100_add_stripe_webhooks.sql    ← 14 chiffres (recommandé)
20260501000200_add_notification_types.sql
```

### ❌ Invalides

```
20260501_001_add_stripe_webhooks.sql   ← underscore entre date et numéro
20260501001AddStripeWebhooks.sql       ← majuscules, pas d'underscore
20260501_webhooks.sql                  ← pas de numéro séquentiel (8 chiffres)
```

---

## Pourquoi ce format est critique

Supabase CLI extrait la **version** d'un fichier en lisant uniquement le **préfixe
numérique continu** (tous les chiffres consécutifs depuis le début du nom).
Il s'arrête au premier caractère non numérique.

| Nom de fichier | Version extraite | Statut |
|---|---|---|
| `20260430017_foo.sql` | `20260430017` | ✅ unique (11 chiffres) |
| `20260430000100_foo.sql` | `20260430000100` | ✅ unique (14 chiffres) |
| `20260430_017_foo.sql` | `20260430` | ❌ collision — toute migration du même jour partage cette version |

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

## Script de correction automatique (renommage YYYYMMDDHHMMSS)

Convertit tous les fichiers mal nommés vers le format 14-chiffres en préservant
l'ordre logique. Chaque numéro séquentiel `NNN` devient `NNN × 100` en HHMMSS :
`017` → `001700`, `020` → `002000`.

```bash
# Dry-run : affiche les git mv + SQL à exécuter, sans rien modifier
bash scripts/rename-migrations-to-timestamp.sh

# Afficher uniquement les requêtes SQL (à appliquer en base)
bash scripts/rename-migrations-to-timestamp.sh --sql-only

# Appliquer les renommages locaux (après avoir exécuté le SQL en base)
bash scripts/rename-migrations-to-timestamp.sh --apply
```

**Ordre impératif pour les migrations déjà appliquées en base :**

1. `--sql-only` → exécuter le SQL dans `supabase_migrations.schema_migrations`
2. `--apply` → renommer les fichiers locaux
3. `bash scripts/check-migration-names.sh` → vérifier
4. `git add supabase/migrations/ && git commit`

---

## Exception historique

Le fichier `20260430_016_blog_enrichissement.sql` conserve son nom avec underscore
car il a été appliqué en base avec la version `20260430` avant que ce check
n'existe. **Ne pas ajouter d'autres exceptions.**

Pour corriger proprement ce fichier :

```bash
# 1. Mettre à jour la version en base (dans une transaction)
SUPABASE_DB_PASSWORD=... supabase db query --password "$SUPABASE_DB_PASSWORD" "
BEGIN;
UPDATE supabase_migrations.schema_migrations
   SET version = '20260430001600',
       name    = '20260430001600_blog_enrichissement'
 WHERE version = '20260430'
   AND name    = '20260430_016_blog_enrichissement';
COMMIT;
"

# 2. Renommer le fichier local
git mv supabase/migrations/20260430_016_blog_enrichissement.sql \
       supabase/migrations/20260430001600_blog_enrichissement.sql

# 3. Retirer l'entrée KNOWN_EXCEPTIONS dans scripts/check-migration-names.sh
```

---

## Cas de base corrompue

### Diagnostic

```bash
SUPABASE_DB_PASSWORD=... bash scripts/diagnose-migrations.sh
```

### Détection des doublons (pattern CI)

```bash
DUPLICATES=$(
  ls supabase/migrations \
  | sed -E 's/^([0-9]+).*/\1/' \
  | sort | uniq -d
)
[ -n "$DUPLICATES" ] && echo "Doublons : $DUPLICATES"
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

| Env | Récupération recommandée | Interdite |
|---|---|---|
| Dev | `DEV_RESET=1 bash scripts/db-push.sh` (reset complet) | — |
| Staging | Repair ciblé dans transaction (`repair-migrations.sh`) | `db reset` |
| Prod | Snapshot → SQL ciblé dans transaction → validation | `db reset`, DELETE direct sans transaction |

#### Récupération DEV (reset total, détruit toutes les données)

```bash
# Repart de zéro : applique toutes les migrations depuis le début
DEV_RESET=1 bash scripts/db-push.sh
```

#### Récupération PROD (nettoyage ciblé, préserve les données)

```sql
-- Dans une transaction — supprimer la version fantôme uniquement
BEGIN;

-- Identifier la version à supprimer (préfixe court / dupliquée)
SELECT version, name, inserted_at
FROM supabase_migrations.schema_migrations
WHERE LENGTH(version) < 11
   OR version IN (
     SELECT version FROM supabase_migrations.schema_migrations
     GROUP BY version HAVING COUNT(*) > 1
   )
ORDER BY version;

-- Supprimer uniquement la ligne fautive (la plus ancienne en cas de doublon)
DELETE FROM supabase_migrations.schema_migrations
 WHERE version = '<version_fantome>'
   AND inserted_at = (
     SELECT MIN(inserted_at)
     FROM supabase_migrations.schema_migrations
     WHERE version = '<version_fantome>'
   );

COMMIT;
```

---

## Bonnes pratiques — Checklist PR

Avant de merger une PR contenant des migrations :

- [ ] `bash scripts/check-migration-names.sh` → exit 0
- [ ] Préfixe ≥ 11 chiffres, pas d'underscore entre date et numéro
- [ ] Version unique (pas de doublon avec les fichiers existants)
- [ ] Migration créée avec `supabase migration new` (pas à la main)
- [ ] Toutes les tables ont `ENABLE ROW LEVEL SECURITY`
- [ ] `CREATE TABLE IF NOT EXISTS` (idempotence)
- [ ] `CREATE INDEX IF NOT EXISTS` (idempotence)
- [ ] `CREATE OR REPLACE VIEW` si applicable
- [ ] `DROP TRIGGER IF EXISTS` avant `CREATE TRIGGER`
