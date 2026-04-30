# Règles de nommage des migrations PilotOS

## Format obligatoire

```
YYYYMMDDNNN_description.sql
```

- `YYYYMMDD` — date du jour (8 chiffres)
- `NNN` — numéro séquentiel sur 3 chiffres, **sans séparateur après la date**
- `_description` — courte description en minuscules, mots séparés par `_`

### Exemples valides

```
20260430021_add_invitations_table.sql   ✅
20260501001_add_stripe_webhooks.sql     ✅
```

### Exemples INVALIDES

```
20260430_021_add_invitations_table.sql  ❌  underscore entre date et numéro
20260430021add_invitations_table.sql    ❌  pas d'underscore avant la description
```

---

## Pourquoi ce format est critique

Supabase CLI extrait la **version** d'un fichier en lisant uniquement le préfixe
numérique continu (tous les chiffres consécutifs depuis le début du nom). Il
s'arrête au premier caractère non numérique.

| Nom de fichier | Préfixe extrait | Résultat |
|---|---|---|
| `20260430021_foo.sql` | `20260430021` | ✅ unique |
| `20260430_021_foo.sql` | `20260430` | ❌ collision avec tout fichier du même jour |

Un underscore entre la date et le numéro tronque la version à 8 chiffres. Si
plusieurs fichiers partagent la même date, Supabase CLI tente d'insérer plusieurs
fois la même version dans `schema_migrations` → `duplicate key value violates
unique constraint "schema_migrations_pkey"`.

---

## Règles

1. **Toujours utiliser** : `supabase migration new <description>`
   Jamais créer un fichier `.sql` à la main.

2. **Vérifier localement** avant de pousser :
   ```bash
   bash scripts/check-migration-names.sh
   ```

3. **Tester en local avant de commiter** :
   ```bash
   supabase db push  # sur projet de dev
   ```

4. **Ne jamais commiter une migration** sans l'avoir vue apparaître
   dans `supabase migration list` avec Local ET Remote alignés.

5. **Si le CI bloque** : NE PAS créer de nouvelle migration.
   Contacter l'admin pour repair manuel depuis
   le dashboard Supabase → SQL Editor.

---

## CI Guard

Le script `scripts/check-migration-names.sh` est exécuté automatiquement dans
les workflows `ci.yml`, `deploy-staging.yml` et `deploy-production.yml` **avant**
tout `db push`. Une PR avec un nom de fichier invalide échoue en CI avant même
d'atteindre la base de données.

---

## Exception historique

Le fichier `20260430_016_blog_enrichissement.sql` conserve son nom avec underscore
car il a été appliqué en base avec la version `20260430` avant que ce check
n'existe. Le renommer nécessiterait un repair SQL manuel :

```sql
-- À exécuter dans Supabase SQL Editor AVANT de renommer le fichier local
UPDATE supabase_migrations.schema_migrations
SET version = '20260430016',
    name    = '20260430016_blog_enrichissement'
WHERE version = '20260430';
```

Ne pas ajouter d'autres exceptions.

---

## En cas de désynchronisation

Aller dans le dashboard Supabase → SQL Editor et exécuter :

```sql
SELECT version, name FROM supabase_migrations.schema_migrations
ORDER BY version;
```

Comparer avec `ls supabase/migrations/`.
Identifier les écarts et contacter l'équipe.
