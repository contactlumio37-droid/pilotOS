// PilotOS — Wrapper SMTP unique
// V0 : Gmail SMTP (Supabase SMTP config)
// V1 : SMTP Infomaniak noreply@pilotos.fr (dès 2 clients payants)
// RÈGLE : jamais appeler SMTP directement — tout passe par ce fichier

import { supabase } from './supabase'

export interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

// Appel à l'Edge Function Supabase (qui gère le SMTP côté serveur)
export async function sendEmail(payload: EmailPayload): Promise<void> {
  const { error } = await supabase.functions.invoke('send-email', {
    body: payload,
  })
  if (error) throw new Error(`Échec envoi email : ${error.message}`)
}

// ============================================================
// Templates d'emails pré-formatés
// ============================================================

export async function sendInvitationEmail(params: {
  to: string
  inviterName: string
  orgName: string
  inviteUrl: string
}): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: `${params.inviterName} vous invite sur PilotOS — ${params.orgName}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0F172A;">Vous avez été invité sur PilotOS</h2>
        <p><strong>${params.inviterName}</strong> vous invite à rejoindre l'organisation <strong>${params.orgName}</strong>.</p>
        <a href="${params.inviteUrl}" style="
          display: inline-block;
          background: #444ce7;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          margin: 16px 0;
        ">Rejoindre l'organisation</a>
        <p style="color: #64748b; font-size: 14px;">Ce lien expire dans 7 jours.</p>
      </div>
    `,
    text: `${params.inviterName} vous invite à rejoindre ${params.orgName} sur PilotOS. Lien : ${params.inviteUrl}`,
  })
}

export async function sendActionAssignedEmail(params: {
  to: string
  assigneeName: string
  actionTitle: string
  dueDate: string | null
  actionUrl: string
}): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: `Action assignée : ${params.actionTitle}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0F172A;">Nouvelle action assignée</h2>
        <p>Bonjour ${params.assigneeName},</p>
        <p>Une action vous a été assignée : <strong>${params.actionTitle}</strong></p>
        ${params.dueDate ? `<p>Échéance : <strong>${params.dueDate}</strong></p>` : ''}
        <a href="${params.actionUrl}" style="
          display: inline-block;
          background: #444ce7;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          margin: 16px 0;
        ">Voir l'action</a>
      </div>
    `,
    text: `Action assignée : ${params.actionTitle}. ${params.dueDate ? `Échéance : ${params.dueDate}.` : ''} Lien : ${params.actionUrl}`,
  })
}

export async function sendFeedbackResolvedEmail(params: {
  to: string | string[]
  feedbackTitle: string
  resolutionNote: string
  version: string
}): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: `Résolu : ${params.feedbackTitle}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Signalement résolu ✓</h2>
        <p>Le signalement <strong>"${params.feedbackTitle}"</strong> a été résolu dans la version <strong>${params.version}</strong>.</p>
        ${params.resolutionNote ? `<blockquote style="border-left: 3px solid #444ce7; padding-left: 16px; color: #475569;">${params.resolutionNote}</blockquote>` : ''}
        <p style="color: #64748b; font-size: 14px;">Merci pour votre retour — il améliore PilotOS pour tous.</p>
      </div>
    `,
    text: `Le signalement "${params.feedbackTitle}" a été résolu dans la version ${params.version}. ${params.resolutionNote}`,
  })
}

export async function sendMfaCodeEmail(params: {
  to: string
  code: string
  name: string
}): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: `Votre code de connexion PilotOS : ${params.code}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0F172A;">Code de vérification</h2>
        <p>Bonjour ${params.name},</p>
        <p>Votre code de connexion à usage unique :</p>
        <div style="
          font-size: 36px;
          font-weight: 700;
          letter-spacing: 8px;
          color: #444ce7;
          text-align: center;
          padding: 24px;
          background: #f0f4ff;
          border-radius: 12px;
          margin: 16px 0;
          font-family: 'JetBrains Mono', monospace;
        ">${params.code}</div>
        <p style="color: #64748b; font-size: 14px;">Ce code expire dans 10 minutes. Ne le partagez jamais.</p>
      </div>
    `,
    text: `Votre code PilotOS : ${params.code} (expire dans 10 minutes)`,
  })
}
