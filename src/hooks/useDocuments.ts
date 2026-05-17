import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { checkAndAwardBadges } from '@/services/gamification.service'
import type { Document, DocumentFolder, DocType, DocStatus } from '@/types/database'

export interface DocumentVersion {
  id: string
  document_id: string
  version_label: string
  file_path: string | null
  content: Record<string, unknown> | null
  change_summary: string | null
  archived_at: string
  archived_by: string | null
}

export interface DocumentAcknowledgment {
  id: string
  document_id: string
  user_id: string
  acknowledged_at: string
  ip_address: string | null
}

// ── Folders ──────────────────────────────────────────────────

export function useFolders() {
  const { organisation } = useAuth()
  return useQuery({
    queryKey: ['document_folders', organisation?.id],
    enabled: !!organisation,
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_folders')
        .select('*')
        .eq('organisation_id', organisation!.id)
        .order('sort_order')
      if (error) throw error
      return data as DocumentFolder[]
    },
  })
}

export function useCreateFolder() {
  const qc = useQueryClient()
  const { organisation } = useAuth()
  return useMutation({
    mutationFn: async (payload: { name: string; parent_id?: string | null }) => {
      const { data, error } = await supabase
        .from('document_folders')
        .insert({ ...payload, organisation_id: organisation!.id, sort_order: 0 })
        .select()
        .single()
      if (error) throw error
      return data as DocumentFolder
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['document_folders'] }),
  })
}

export function useRenameFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('document_folders')
        .update({ name })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['document_folders'] }),
  })
}

// ── Documents ─────────────────────────────────────────────────

export function useDocuments(folderId?: string | null) {
  const { organisation } = useAuth()
  return useQuery({
    queryKey: ['documents', organisation?.id, folderId],
    enabled: !!organisation,
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase
        .from('documents')
        .select('*')
        .eq('organisation_id', organisation!.id)
        .neq('status', 'obsolete')
        .order('title')
      if (folderId !== undefined) {
        if (folderId === null) q = q.is('folder_id', null)
        else q = q.eq('folder_id', folderId)
      }
      const { data, error } = await q
      if (error) throw error
      return data as Document[]
    },
  })
}

export function useUploadDocument() {
  const qc = useQueryClient()
  const { organisation, user } = useAuth()
  return useMutation({
    mutationFn: async ({
      file,
      title,
      folderId,
      docType,
    }: {
      file: File
      title: string
      folderId: string | null
      docType: DocType | null
    }) => {
      const ext = file.name.split('.').pop()
      const path = `${organisation!.id}/${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadErr) throw uploadErr

      const { data, error } = await supabase
        .from('documents')
        .insert({
          organisation_id: organisation!.id,
          folder_id: folderId,
          title,
          doc_type: docType,
          source: 'upload',
          file_path: path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          status: 'draft',
          version_major: 1,
          version_minor: 0,
          validation_required: false,
          is_master_document: false,
          distribution_list: [],
          acknowledgment_required: false,
          visibility: 'public',
          visibility_user_ids: [],
          uploaded_by: user?.id ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data as Document
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      if (user && organisation) {
        checkAndAwardBadges(user.id, organisation.id, null).catch(() => {})
      }
    },
  })
}

export function useUpdateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Document> & { id: string }) => {
      const { data, error } = await supabase
        .from('documents')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Document
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}

export function useDocumentUrl(filePath: string | null) {
  return useQuery({
    queryKey: ['document_url', filePath],
    enabled: !!filePath,
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath!, 3600)
      return data?.signedUrl ?? null
    },
  })
}

export const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  draft:      'Brouillon',
  in_review:  'En révision',
  approved:   'Approuvé',
  active:     'En vigueur',
  archived:   'Archivé',
  obsolete:   'Obsolète',
}

export const DOC_STATUS_CLASS: Record<DocStatus, string> = {
  draft:      'badge-neutral',
  in_review:  'badge-warning',
  approved:   'badge-brand',
  active:     'badge-success',
  archived:   'badge bg-slate-100 text-slate-400',
  obsolete:   'badge bg-slate-100 text-slate-400',
}

// ── Document versions ─────────────────────────────────────────

export function useDocumentVersions(documentId: string | undefined) {
  return useQuery({
    queryKey: ['document_versions', documentId],
    enabled: !!documentId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_versions')
        .select('*')
        .eq('document_id', documentId!)
        .order('archived_at', { ascending: false })
      if (error) throw error
      return data as DocumentVersion[]
    },
  })
}

export function useCreateDocumentVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      document_id: string
      version_label: string
      change_summary?: string | null
      file_path?: string | null
      archived_by?: string | null
    }) => {
      const { error } = await supabase
        .from('document_versions')
        .insert(payload)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['document_versions', vars.document_id] })
    },
  })
}

// ── Document acknowledgments ──────────────────────────────────

export function useDocumentAcknowledgment(documentId: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['document_acknowledgment', documentId, user?.id],
    enabled: !!documentId && !!user,
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('document_acknowledgments')
        .select('*')
        .eq('document_id', documentId!)
        .eq('user_id', user!.id)
        .maybeSingle()
      return data as DocumentAcknowledgment | null
    },
  })
}

export function useAcknowledgeDocument() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('document_acknowledgments')
        .insert({ document_id: documentId, user_id: user!.id })
      if (error) throw error
    },
    onSuccess: (_, documentId) => {
      qc.invalidateQueries({ queryKey: ['document_acknowledgment', documentId] })
    },
  })
}

export const DOC_TYPE_LABEL: Record<string, string> = {
  NS:          'Note de service',
  PROC:        'Procédure',
  CR:          'Compte-rendu',
  FORM:        'Formulaire',
  REPORT:      'Rapport',
  INSTRUCTION: 'Instruction',
  OTHER:       'Autre',
}
