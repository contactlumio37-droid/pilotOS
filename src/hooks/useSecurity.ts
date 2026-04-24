import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganisation } from './useOrganisation'

// ── Types inline (full generated types will come from database.ts) ─────────

export interface DuerEvaluation {
  id: string
  organisation_id: string
  site_id: string | null
  work_unit: string
  hazard: string
  risk_description: string
  probability: number
  severity: number
  risk_score: number
  prevention_measures: string | null
  residual_risk: number | null
  responsible_id: string | null
  review_date: string | null
  status: 'active' | 'archived' | 'under_review'
  visibility: string
  visibility_user_ids: string[]
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Incident {
  id: string
  organisation_id: string
  site_id: string | null
  ref: string | null
  incident_type: 'accident' | 'near_miss' | 'dangerous_situation' | 'first_aid'
  title: string
  description: string | null
  occurred_at: string
  location: string | null
  victim_id: string | null
  declared_by: string | null
  root_causes: string | null
  contributing_factors: string | null
  action_id: string | null
  terrain_report_id: string | null
  status: 'open' | 'under_analysis' | 'action_in_progress' | 'closed'
  closed_at: string | null
  closed_by: string | null
  visibility: string
  visibility_user_ids: string[]
  created_at: string
  updated_at: string
}

export interface SafetyVisit {
  id: string
  organisation_id: string
  site_id: string | null
  visit_type: 'planned' | 'unannounced' | 'audit' | 'inspection'
  planned_at: string
  conducted_at: string | null
  inspector_id: string | null
  scope: string | null
  observations: string | null
  action_count: number
  action_id: string | null
  status: 'planned' | 'completed' | 'cancelled'
  visibility: string
  visibility_user_ids: string[]
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface RegulatoryItem {
  id: string
  organisation_id: string
  obligation: string
  legal_reference: string | null
  category: 'inspection' | 'training' | 'document' | 'equipment' | 'other'
  frequency: string | null
  due_date: string | null
  last_done_at: string | null
  responsible_id: string | null
  status: 'ok' | 'due_soon' | 'overdue' | 'na'
  notes: string | null
  visibility: string
  visibility_user_ids: string[]
  created_by: string | null
  created_at: string
  updated_at: string
}

// ── DUER ──────────────────────────────────────────────────────

export function useDuerEvaluations() {
  const { organisation } = useOrganisation()
  const orgId = organisation?.id

  return useQuery({
    queryKey: ['duer', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duer_evaluations')
        .select('*')
        .eq('organisation_id', orgId!)
        .eq('status', 'active')
        .order('risk_score', { ascending: false })
      if (error) throw error
      return (data ?? []) as DuerEvaluation[]
    },
  })
}

export function useUpsertDuer() {
  const qc = useQueryClient()
  const { organisation } = useOrganisation()

  return useMutation({
    mutationFn: async (values: Partial<DuerEvaluation> & { work_unit: string; hazard: string; risk_description: string; probability: number; severity: number }) => {
      const payload = { ...values, organisation_id: organisation!.id }
      if (values.id) {
        const { error } = await supabase.from('duer_evaluations').update(payload).eq('id', values.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('duer_evaluations').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['duer', organisation?.id] }),
  })
}

export function useDeleteDuer() {
  const qc = useQueryClient()
  const { organisation } = useOrganisation()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('duer_evaluations').update({ status: 'archived' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['duer', organisation?.id] }),
  })
}

// ── Incidents ─────────────────────────────────────────────────

export function useIncidents() {
  const { organisation } = useOrganisation()
  const orgId = organisation?.id

  return useQuery({
    queryKey: ['incidents', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('organisation_id', orgId!)
        .order('occurred_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Incident[]
    },
  })
}

export function useUpsertIncident() {
  const qc = useQueryClient()
  const { organisation } = useOrganisation()

  return useMutation({
    mutationFn: async (values: Partial<Incident> & { title: string; incident_type: Incident['incident_type']; occurred_at: string }) => {
      const payload = { ...values, organisation_id: organisation!.id }
      if (values.id) {
        const { error } = await supabase.from('incidents').update(payload).eq('id', values.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('incidents').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents', organisation?.id] }),
  })
}

// ── Safety visits ─────────────────────────────────────────────

export function useSafetyVisits() {
  const { organisation } = useOrganisation()
  const orgId = organisation?.id

  return useQuery({
    queryKey: ['safety_visits', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('safety_visits')
        .select('*')
        .eq('organisation_id', orgId!)
        .order('planned_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as SafetyVisit[]
    },
  })
}

export function useUpsertSafetyVisit() {
  const qc = useQueryClient()
  const { organisation } = useOrganisation()

  return useMutation({
    mutationFn: async (values: Partial<SafetyVisit> & { planned_at: string }) => {
      const payload = { ...values, organisation_id: organisation!.id }
      if (values.id) {
        const { error } = await supabase.from('safety_visits').update(payload).eq('id', values.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('safety_visits').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['safety_visits', organisation?.id] }),
  })
}

// ── Regulatory register ───────────────────────────────────────

export function useRegulatoryRegister() {
  const { organisation } = useOrganisation()
  const orgId = organisation?.id

  return useQuery({
    queryKey: ['regulatory', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regulatory_register')
        .select('*')
        .eq('organisation_id', orgId!)
        .order('due_date', { ascending: true })
      if (error) throw error
      return (data ?? []) as RegulatoryItem[]
    },
  })
}

export function useUpsertRegulatory() {
  const qc = useQueryClient()
  const { organisation } = useOrganisation()

  return useMutation({
    mutationFn: async (values: Partial<RegulatoryItem> & { obligation: string }) => {
      const payload = { ...values, organisation_id: organisation!.id }
      if (values.id) {
        const { error } = await supabase.from('regulatory_register').update(payload).eq('id', values.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('regulatory_register').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['regulatory', organisation?.id] }),
  })
}

// ── Dashboard KPIs sécurité ───────────────────────────────────

export interface SecurityKPIs {
  daysWithoutIncident: number
  atOpen: number
  nearMissOpen: number
  visitsPlanned: number
  regulatoryOverdue: number
  lastIncidentDate: string | null
}

export function useSecurityKPIs(): { data: SecurityKPIs | null; isLoading: boolean } {
  const { organisation } = useOrganisation()
  const orgId = organisation?.id

  const result = useQuery({
    queryKey: ['security_kpis', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const [incidents, visits, regulatory] = await Promise.all([
        supabase.from('incidents').select('incident_type, status, occurred_at').eq('organisation_id', orgId!).neq('status', 'closed'),
        supabase.from('safety_visits').select('status, planned_at').eq('organisation_id', orgId!).eq('status', 'planned').gte('planned_at', new Date().toISOString().slice(0, 10)),
        supabase.from('regulatory_register').select('status').eq('organisation_id', orgId!).eq('status', 'overdue'),
      ])

      // Last closed accident for days-without-incident
      const { data: lastAT } = await supabase
        .from('incidents')
        .select('occurred_at')
        .eq('organisation_id', orgId!)
        .eq('incident_type', 'accident')
        .order('occurred_at', { ascending: false })
        .limit(1)

      const lastIncidentDate = lastAT?.[0]?.occurred_at ?? null
      const daysWithoutIncident = lastIncidentDate
        ? Math.floor((Date.now() - new Date(lastIncidentDate).getTime()) / 86400000)
        : 999

      const openIncidents = incidents.data ?? []
      return {
        daysWithoutIncident,
        atOpen:            openIncidents.filter(i => i.incident_type === 'accident').length,
        nearMissOpen:      openIncidents.filter(i => i.incident_type === 'near_miss').length,
        visitsPlanned:     (visits.data ?? []).length,
        regulatoryOverdue: (regulatory.data ?? []).length,
        lastIncidentDate,
      } satisfies SecurityKPIs
    },
  })
  return { data: result.data ?? null, isLoading: result.isLoading }
}
