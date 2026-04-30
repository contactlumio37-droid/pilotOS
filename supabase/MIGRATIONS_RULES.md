# Règles de nommage des migrations PilotOS

## Format obligatoire

```
[DATE][NUMERO]_[description].sql
```

Exemple : `20260430002_add_invitations_table.sql`

## Règles

1. **Toujours utiliser** : `supabase migration new [description]`
   Jamais créer un fichier `.sql` à la main.

2. **Tester en local avant de commiter** :
   ```
   supabase db push  (sur projet de dev)
   ```

3. **Ne jamais commiter une migration** sans l'avoir vue apparaître
   dans `supabase migration list` avec Local ET Remote alignés.

4. **Si le CI bloque** : NE PAS créer de nouvelle migration.
   Contacter l'admin pour repair manuel depuis
   le dashboard Supabase → SQL Editor.

## En cas de désynchronisation

Aller dans le dashboard Supabase → SQL Editor et exécuter :

```sql
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version;
```

Comparer avec `ls supabase/migrations/`.
Identifier les écarts et contacter l'équipe.
