-- Sprint 2 / BLOC 2.4 — Seed CMS system pages content
-- Populates home page blocks from LandingPage hardcoded content.
-- Adds mentions-legales system page.
-- Idempotent: only updates when sections = '[]' (not yet seeded).

-- ── mentions-legales ──────────────────────────────────────────────────────────
INSERT INTO cms_pages (slug, title, is_system, page_url, sections, published, seo_title, seo_description)
VALUES (
  'mentions-legales',
  'Mentions légales',
  true,
  '/mentions-legales',
  jsonb_build_array(
    jsonb_build_object(
      'id',   'aa100000-0000-0000-0000-000000000001',
      'type', 'hero',
      'config', jsonb_build_object(
        'title',    'Mentions légales',
        'subtitle', 'Informations légales relatives à PilotOS'
      )
    ),
    jsonb_build_object(
      'id',   'aa100000-0000-0000-0000-000000000002',
      'type', 'text',
      'config', jsonb_build_object(
        'content', '<h2>Éditeur</h2><p>PilotOS SAS — Éditez ce contenu depuis le SuperAdmin → CMS → Mentions légales.</p><h2>Hébergement</h2><p>AWS Paris (eu-west-3) via Supabase — hébergement 100 % France, données RGPD.</p><h2>Contact</h2><p><a href="mailto:hello@pilotos.app">hello@pilotos.app</a></p>'
      )
    )
  ),
  true,
  'Mentions légales — PilotOS',
  'Mentions légales de PilotOS SAS.'
)
ON CONFLICT (slug) DO UPDATE SET
  is_system       = true,
  page_url        = '/mentions-legales',
  seo_title       = COALESCE(cms_pages.seo_title, EXCLUDED.seo_title),
  seo_description = COALESCE(cms_pages.seo_description, EXCLUDED.seo_description),
  sections        = CASE
    WHEN cms_pages.sections = '[]'::jsonb THEN EXCLUDED.sections
    ELSE cms_pages.sections
  END;

-- ── home page blocks ─────────────────────────────────────────────────────────
-- Only seeds when still empty (first deploy). Superadmin can override.
UPDATE cms_pages
SET sections = $$[
  {
    "id": "a1000000-0000-0000-0000-000000000001",
    "type": "hero",
    "config": {
      "title": "Pilotez votre organisation. Vraiment.",
      "subtitle": "Une décision prise en CODIR devient une action assignée, suivie, mesurée — sans réunion de suivi.",
      "cta_label": "Démarrer gratuitement",
      "cta_url": "/register"
    }
  },
  {
    "id": "a1000000-0000-0000-0000-000000000002",
    "type": "stats",
    "config": {
      "items": [
        {"value": "< 5 min", "label": "Pour démarrer"},
        {"value": "🇫🇷", "label": "Hébergement France"},
        {"value": "ISO 9001", "label": "Compatible"},
        {"value": "100%", "label": "RGPD compliant"}
      ]
    }
  },
  {
    "id": "a1000000-0000-0000-0000-000000000003",
    "type": "features",
    "config": {
      "title": "Tout ce dont votre organisation a besoin",
      "items": [
        {"icon": "📊", "title": "Pilotage stratégique", "description": "Objectifs, CODIR, indicateurs — tout relié. Décidez en confiance."},
        {"icon": "🔀", "title": "Processus ISO 9001",   "description": "Cartographiez, révisez et améliorez vos processus. Audit sans stress."},
        {"icon": "📁", "title": "GED maîtrisée",         "description": "Versionning, circuit de validation, registre audit. Zéro chaos documentaire."},
        {"icon": "⚠️", "title": "Terrain connecté",      "description": "Un signalement en 30 secondes. Une action dans le tableau du manager en temps réel."}
      ]
    }
  },
  {
    "id": "a1000000-0000-0000-0000-000000000004",
    "type": "columns",
    "config": {
      "title": "Comment ça marche ?",
      "columns": [
        {"content": "<div class='text-center'><div class='text-brand-600 font-bold text-xl mb-2'>01</div><h3 class='font-semibold mb-2'>Créez votre espace en 5 minutes</h3><p class='text-sm text-slate-500'>Choisissez votre secteur, importez vos données ou repartez d''un modèle. Aucune formation requise.</p></div>"},
        {"content": "<div class='text-center'><div class='text-brand-600 font-bold text-xl mb-2'>02</div><h3 class='font-semibold mb-2'>Invitez votre équipe</h3><p class='text-sm text-slate-500'>Chaque rôle voit exactement ce qui le concerne. Terrain, managers, direction — une seule plateforme.</p></div>"},
        {"content": "<div class='text-center'><div class='text-brand-600 font-bold text-xl mb-2'>03</div><h3 class='font-semibold mb-2'>Pilotez et améliorez</h3><p class='text-sm text-slate-500'>Les décisions deviennent des actions, les actions génèrent des indicateurs, les indicateurs informent les décisions.</p></div>"}
      ]
    }
  },
  {
    "id": "a1000000-0000-0000-0000-000000000005",
    "type": "testimonials",
    "config": {
      "title": "Ce qu'en disent nos clients",
      "items": [
        {"author": "Sophie M.",   "role": "Responsable QSE, PME industrielle",    "quote": "Notre dernier audit ISO 9001 s'est passé sans stress. Tous les enregistrements étaient là, tracés, accessibles en un clic."},
        {"author": "Jean-Luc D.", "role": "Chef de groupement, SDIS 47",            "quote": "Les remontées terrain de nos équipes arrivent directement dans le tableau de bord. On a divisé par 3 le temps de traitement des signalements."},
        {"author": "Aurélie R.", "role": "DG, Collectivité territoriale",           "quote": "Enfin un outil qui relie nos CODIR à nos plans d'action. Le suivi est automatique, la direction est informée en temps réel."}
      ]
    }
  },
  {
    "id": "a1000000-0000-0000-0000-000000000006",
    "type": "cta",
    "config": {
      "title": "Prêt à piloter autrement ?",
      "subtitle": "Gratuit pour commencer. Aucune CB requise.",
      "button_label": "Créer mon espace gratuit",
      "button_url": "/register"
    }
  },
  {
    "id": "a1000000-0000-0000-0000-000000000007",
    "type": "faq",
    "config": {
      "title": "Questions fréquentes",
      "items": [
        {
          "question": "PilotOS convient-il aux petites organisations ?",
          "answer": "Absolument. Notre plan Free est conçu pour les structures de 1 à quelques personnes. Les PME à partir de 5 collaborateurs peuvent activer le plan Team pour un pilotage complet."
        },
        {
          "question": "Nos données sont-elles hébergées en France ?",
          "answer": "Oui. PilotOS utilise Supabase avec hébergement AWS Paris (eu-west-3). Vos données ne quittent jamais l'Union européenne."
        },
        {
          "question": "Peut-on importer nos processus existants ?",
          "answer": "Oui, vous pouvez importer des fichiers CSV pour les actions, et notre bibliothèque propose des templates sectoriels pré-remplis pour les SDIS, PME industrielles et collectivités."
        },
        {
          "question": "Quelle est la différence avec un simple Excel de suivi ?",
          "answer": "PilotOS relie tout : une décision CODIR génère une action, l'action met à jour un indicateur, l'indicateur alerte le responsable. Un Excel ne peut pas faire ça en temps réel avec 20 personnes."
        },
        {
          "question": "Comment fonctionne le support ?",
          "answer": "Les plans Free bénéficient du support communautaire (forum + FAQ). Les plans Team et supérieur incluent le support email avec réponse sous 24h ouvrées."
        }
      ]
    }
  }
]$$::jsonb
WHERE slug = 'home' AND sections = '[]'::jsonb;

-- ── login page — left-panel marketing copy ────────────────────────────────────
UPDATE cms_pages
SET sections = $$[
  {
    "id": "b1000000-0000-0000-0000-000000000001",
    "type": "features",
    "config": {
      "title": "PilotOS",
      "quote": "Un problème signalé sur le terrain devient une action dans le tableau de bord du manager — en 30 secondes.",
      "items": [
        {"title": "Pilotage stratégique relié au terrain"},
        {"title": "Processus ISO 9001 sans effort"},
        {"title": "GED maîtrisée, zéro chaos documentaire"}
      ]
    }
  }
]$$::jsonb
WHERE slug = 'login' AND sections = '[]'::jsonb;

-- ── register page — step titles ───────────────────────────────────────────────
UPDATE cms_pages
SET sections = $$[
  {
    "id": "c1000000-0000-0000-0000-000000000001",
    "type": "features",
    "config": {
      "steps": [
        {"id": "account", "title": "Créer mon compte",    "subtitle": "Votre espace personnel sécurisé"},
        {"id": "org",     "title": "Votre organisation",  "subtitle": "Configurez votre espace de travail"},
        {"id": "sector",  "title": "Votre secteur",       "subtitle": "Personnalisez PilotOS pour votre activité"}
      ]
    }
  }
]$$::jsonb
WHERE slug = 'register' AND sections = '[]'::jsonb;
