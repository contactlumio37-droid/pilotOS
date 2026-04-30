#!/bin/bash
# Script de repair des migrations Supabase
# Usage : bash scripts/repair-migrations.sh
# À exécuter en local quand le CI détecte une désynchronisation.
# Nécessite : supabase CLI + SUPABASE_ACCESS_TOKEN + projet lié

set -euo pipefail

echo "→ État actuel des migrations..."
supabase migration list

echo ""
echo "→ Migrations Local sans Remote détectées :"
LOCAL_ONLY=$(supabase migration list 2>&1 \
  | awk -F'|' 'NR>3 {
      gsub(/ /,"",$1);
      gsub(/ /,"",$2);
      if($1!="" && $2=="") print $1
    }')

if [ -z "$LOCAL_ONLY" ]; then
  echo "  Aucune — historique déjà synchronisé ✅"
  echo ""
  echo "→ État final :"
  supabase migration list
  exit 0
fi

echo "$LOCAL_ONLY"
echo ""
read -p "Lancer le repair automatique ? (y/N) " confirm
if [ "$confirm" != "y" ]; then
  echo "Annulé."
  exit 0
fi

echo "$LOCAL_ONLY" | while read version; do
  if [ -n "$version" ]; then
    echo "  Revert $version..."
    supabase migration repair --status reverted "$version" \
      || echo "  ⚠️  $version ignoré (déjà aligné)"
  fi
done

echo ""
echo "→ État après repair :"
supabase migration list
echo ""
echo "✅ Repair terminé. Vérifiez le tableau ci-dessus."
echo ""
echo "Prochaines étapes :"
echo "  git add supabase/"
echo "  git commit -m \"fix: repair migrations désynchronisées\""
echo "  git push"
