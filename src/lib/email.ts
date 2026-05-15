// PilotOS — Wrapper email unique
// RÈGLE ABSOLUE : tout email passe par ce fichier — jamais appeler SMTP directement.
// V0 : Gmail SMTP via Supabase · V1 : Resend (RESEND_API_KEY)

import { supabase } from './supabase'
import {
  welcomeEmailHtml,
  invitationEmailHtml,
  actionAssignedEmailHtml,
  actionLateReminderEmailHtml,
  actionDueSoonEmailHtml,
  documentApprovalRequestEmailHtml,
  documentApprovedEmailHtml,
  feedbackResolvedEmailHtml,
  mfaCodeEmailHtml,
  weeklyDigestEmailHtml,
  joinRequestReceivedHtml,
  joinRequestAcceptedHtml,
  joinRequestRejectedHtml,
} from './emailTemplates'

export interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const { error } = await supabase.functions.invoke('send-email', { body: payload })
  if (error) throw new Error(`Échec envoi email : ${error.message}`)
}

// ── Templates ──────────────────────────────────────────────────

export async function sendWelcomeEmail(params: {
  to: string
  name: string
  orgName: string
  loginUrl: string
}): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: `Bienvenue sur PilotOS — ${params.orgName}`,
    html: welcomeEmailHtml(params),
    text: `Bienvenue ${params.name} ! Votre organisation ${params.orgName} est prête. Connectez-vous : ${params.loginUrl}`,
  })
}

export async function sendInvitationEmail(params: {
  to: string
  inviterName: string
  orgName: string
  inviteUrl: string
  role?: string
}): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: `${params.inviterName} vous invite sur PilotOS — ${params.orgName}`,
    html: invitationEmailHtml(params),
    text: `${params.inviterName} vous invite à rejoindre ${params.orgName} sur PilotOS. Lien : ${params.inviteUrl}`,
  })
}

export async function sendActionAssignedEmail(params: {
  to: string
  assigneeName: string
  assignerName: string
  actionTitle: string
  dueDate: string | null
  orgName: string
  actionUrl: string
}): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: `Action assignée : ${params.actionTitle}`,
    html: actionAssignedEmailHtml(params),
    text: `Action assignée : ${params.actionTitle}${params.dueDate ? ` — Échéance : ${params.dueDate}` : ''}. Voir : ${params.actionUrl}`,
  })
}

export async function sendActionLateReminderEmail(params: {
  to: string
  name: string
  orgName: string
  appUrl: string
  actions: { title: string; dueDate: string }[]
}): Promise<void> {
  const n = params.actions.length
  await sendEmail({
    to: params.to,
    subject: `${n} action${n > 1 ? 's' : ''} en retard — ${params.orgName}`,
    html: actionLateReminderEmailHtml(params),
    text: `Vous avez ${n} action${n > 1 ? 's' : ''} en retard dans ${params.orgName}. Accéder : ${params.appUrl}`,
  })
}

export async function sendActionDueSoonEmail(params: {
  to: string
  name: string
  orgName: string
  appUrl: string
  actions: { title: string; dueDate: string }[]
}): Promise<void> {
  const n = params.actions.length
  await sendEmail({
    to: params.to,
    subject: `Actions à échéance dans 2 jours — ${params.orgName}`,
    html: actionDueSoonEmailHtml(params),
    text: `${n} action${n > 1 ? 's arrivent' : ' arrive'} à échéance dans 2 jours dans ${params.orgName}. Accéder : ${params.appUrl}`,
  })
}

export async function sendDocumentApprovalRequestEmail(params: {
  to: string
  reviewerName: string
  requesterName: string
  documentTitle: string
  orgName: string
  documentUrl: string
}): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: `Validation requise : ${params.documentTitle}`,
    html: documentApprovalRequestEmailHtml(params),
    text: `${params.requesterName} vous demande de valider "${params.documentTitle}". Accéder : ${params.documentUrl}`,
  })
}

export async function sendDocumentApprovedEmail(params: {
  to: string
  authorName: string
  approverName: string
  documentTitle: string
  orgName: string
  documentUrl: string
}): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: `Document approuvé : ${params.documentTitle}`,
    html: documentApprovedEmailHtml(params),
    text: `Votre document "${params.documentTitle}" a été approuvé par ${params.approverName}. Voir : ${params.documentUrl}`,
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
    html: feedbackResolvedEmailHtml(params),
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
    html: mfaCodeEmailHtml(params),
    text: `Votre code PilotOS : ${params.code} (expire dans 10 minutes)`,
  })
}

export async function sendWeeklyDigestEmail(params: {
  to: string
  name: string
  orgName: string
  appUrl: string
  lateCount: number
  dueSoonCount: number
  doneThisWeek: number
  newReports: number
}): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: `Résumé de la semaine — ${params.orgName}`,
    html: weeklyDigestEmailHtml(params),
    text: `Résumé ${params.orgName} : ${params.lateCount} en retard, ${params.doneThisWeek} terminées cette semaine. Accéder : ${params.appUrl}`,
  })
}

export async function sendJoinRequestReceivedEmail(params: {
  to: string
  adminName: string
  requesterName: string
  requesterEmail: string
  orgName: string
  message: string | null
  reviewUrl: string
}): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: `Demande d'adhésion — ${params.requesterName} → ${params.orgName}`,
    html: joinRequestReceivedHtml(params),
    text: `${params.requesterName} (${params.requesterEmail}) souhaite rejoindre ${params.orgName}. Gérer : ${params.reviewUrl}`,
  })
}

export async function sendJoinRequestAcceptedEmail(params: {
  to: string
  userName: string
  orgName: string
  appUrl: string
}): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: `Bienvenue dans ${params.orgName} !`,
    html: joinRequestAcceptedHtml(params),
    text: `Votre demande d'adhésion à ${params.orgName} a été acceptée. Accéder : ${params.appUrl}`,
  })
}

export async function sendJoinRequestRejectedEmail(params: {
  to: string
  userName: string
  orgName: string
}): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: `Demande d'adhésion — ${params.orgName}`,
    html: joinRequestRejectedHtml(params),
    text: `Votre demande d'adhésion à ${params.orgName} n'a pas été retenue.`,
  })
}
