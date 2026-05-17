import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { SignatureRequest } from '@/types/database'

interface SignatureRequestWithDoc extends SignatureRequest {
  documents: { title: string; doc_code: string | null } | null
  profiles: { full_name: string | null } | null
}

// ── Recipient: my pending + recent requests ───────────────────────────────────

export function useMySignatureRequests() {
  const { user } = useAuth()
  return useQuery<SignatureRequestWithDoc[]>({
    queryKey: ['my_signature_requests', user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('signature_requests')
        .select('*, documents(title, doc_code), profiles!sent_by(full_name)')
        .eq('recipient_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as SignatureRequestWithDoc[]
    },
  })
}

// ── Manager: all requests for a specific document ────────────────────────────

interface SignatureRequestWithRecipient extends SignatureRequest {
  profiles: { full_name: string | null } | null
}

export function useDocumentSignatureRequests(documentId: string | undefined) {
  return useQuery<SignatureRequestWithRecipient[]>({
    queryKey: ['doc_signature_requests', documentId],
    enabled: !!documentId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('signature_requests')
        .select('*, profiles!recipient_id(full_name)')
        .eq('document_id', documentId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as SignatureRequestWithRecipient[]
    },
  })
}

// ── Mutation: sign or reject a request ───────────────────────────────────────

export function useUpdateSignatureRequest() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({
      id,
      action,
      signatureStoragePath,
    }: {
      id: string
      action: 'signed' | 'rejected'
      signatureStoragePath?: string
    }) => {
      const { error } = await supabase
        .from('signature_requests')
        .update({
          status: action,
          signed_at: action === 'signed' ? new Date().toISOString() : null,
          signature_storage_path: signatureStoragePath ?? null,
        })
        .eq('id', id)
        .eq('recipient_id', user?.id)
        .eq('status', 'pending')
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my_signature_requests'] })
      qc.invalidateQueries({ queryKey: ['pending_signatures'] })
      qc.invalidateQueries({ queryKey: ['doc_signature_requests'] })
      qc.invalidateQueries({ queryKey: ['signature_requests'] })
    },
  })
}

// ── Mutation: cancel a pending request (sender or manager) ───────────────────

export function useCancelSignatureRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('signature_requests')
        .delete()
        .eq('id', id)
        .eq('status', 'pending')
      if (error) throw error
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['doc_signature_requests'] })
      qc.invalidateQueries({ queryKey: ['signature_requests', id] })
    },
  })
}
