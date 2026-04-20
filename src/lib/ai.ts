// PilotOS — Wrapper Anthropic API
// Modèle : claude-sonnet-4-20250514
// Appels via Edge Function Supabase (clé API côté serveur uniquement)

import { supabase } from './supabase'

export interface AiResult {
  content: string
  tokensUsed?: number
}

// Appel générique à l'Edge Function IA
async function callAi(feature: string, prompt: string): Promise<AiResult> {
  const { data, error } = await supabase.functions.invoke('ai-assistant', {
    body: { feature, prompt },
  })
  if (error) throw new Error(`Erreur IA : ${error.message}`)
  return data as AiResult
}

// ============================================================
// Fonctionnalités IA V0
// ============================================================

// Rédaction assistée d'action (langage naturel → RACI + priorité + échéance)
export async function generateActionFromNaturalLanguage(description: string): Promise<{
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  suggestedDueDays: number
  origin: string
}> {
  const prompt = `Tu es un assistant qualité ISO 9001 pour une PME.
L'utilisateur décrit une action à créer : "${description}"

Réponds en JSON strict avec ces champs :
{
  "title": "Titre court et actionnable (max 80 caractères)",
  "description": "Description détaillée",
  "priority": "low|medium|high|critical",
  "suggestedDueDays": nombre de jours pour l'échéance (7, 14, 30, 60, 90),
  "origin": "manual|process_review|codir|audit|incident|kaizen|terrain"
}`

  const result = await callAi('action_creation', prompt)
  return JSON.parse(result.content)
}

// Résumé revue de processus
export async function summarizeProcessReview(findings: string): Promise<{
  findings: string
  conclusions: string
  suggestedActions: string[]
}> {
  const prompt = `Tu es un expert processus ISO 9001.
Voici les constats d'une revue de processus :
"${findings}"

Génère un résumé structuré en JSON :
{
  "findings": "Résumé des constats (3-5 phrases)",
  "conclusions": "Conclusions et recommandations (2-3 phrases)",
  "suggestedActions": ["Action 1 suggérée", "Action 2 suggérée", "Action 3 suggérée"]
}`

  const result = await callAi('process_review_summary', prompt)
  return JSON.parse(result.content)
}

// Rapport CODIR automatique
export async function generateCodirReport(params: {
  period: string
  actions: Array<{ title: string; status: string; responsible: string }>
  kpis: Array<{ label: string; value: number; target: number; unit: string }>
  objectives: Array<{ title: string; status: string }>
}): Promise<string> {
  const prompt = `Tu es un assistant pour un CODIR d'entreprise.
Génère un rapport de direction synthétique pour la période ${params.period}.

Données :
- Actions : ${JSON.stringify(params.actions)}
- KPIs : ${JSON.stringify(params.kpis)}
- Objectifs : ${JSON.stringify(params.objectives)}

Format : texte structuré avec sections (Synthèse, Avancement actions, KPIs, Points d'attention, Recommandations).
Ton professionnel, concis, orienté décision. Maximum 500 mots.`

  const result = await callAi('codir_report', prompt)
  return result.content
}

// Analyse des tendances non-conformités
export async function analyzeNcTrends(ncs: Array<{
  title: string
  severity: string
  process: string
  date: string
}>): Promise<{
  patterns: string[]
  riskAreas: string[]
  recommendations: string[]
}> {
  const prompt = `Tu es un expert qualité ISO 9001.
Analyse ces non-conformités et identifie les patterns :
${JSON.stringify(ncs)}

Réponds en JSON :
{
  "patterns": ["Pattern 1", "Pattern 2"],
  "riskAreas": ["Zone de risque 1", "Zone de risque 2"],
  "recommendations": ["Recommandation 1", "Recommandation 2", "Recommandation 3"]
}`

  const result = await callAi('nc_analysis', prompt)
  return JSON.parse(result.content)
}

// Vérification quota IA par organisation
export async function checkAiQuota(organisationId: string): Promise<{
  allowed: boolean
  remaining: number
  plan: string
}> {
  const { data, error } = await supabase.functions.invoke('check-ai-quota', {
    body: { organisation_id: organisationId },
  })
  if (error) throw new Error(`Erreur quota IA : ${error.message}`)
  return data
}
