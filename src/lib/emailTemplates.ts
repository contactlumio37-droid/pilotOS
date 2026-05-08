// PilotOS — Branded email templates
// Tous les emails doivent passer par ces templates pour garantir le branding cohérent.
// RÈGLE : ne jamais écrire du HTML inline dans email.ts ou les Edge Functions.

const BRAND_COLOR = '#444ce7'

function base(content: string, preheader = ''): string {
  const year = new Date().getFullYear()
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,ui-sans-serif,system-ui,sans-serif;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;">${preheader}&nbsp;</div>` : ''}
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">
  <tr><td>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="background:${BRAND_COLOR};border-radius:12px 12px 0 0;padding:20px 32px;">
        <span style="font-size:18px;font-weight:700;color:#fff;letter-spacing:-0.3px;">PilotOS</span>
      </td></tr>
    </table>
  </td></tr>
  <tr><td>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="background:#fff;border-radius:0 0 12px 12px;padding:32px;color:#0f172a;font-size:15px;line-height:1.6;">
        ${content}
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:24px 0 0;text-align:center;color:#94a3b8;font-size:12px;line-height:1.8;">
    <p style="margin:0 0 6px;">© ${year} PilotOS — Logiciel de pilotage qualité &amp; performance</p>
    <p style="margin:0;">
      <a href="https://pilotos.app/confidentialite" style="color:#94a3b8;text-decoration:underline;">Confidentialité</a>
      &nbsp;·&nbsp;
      <a href="https://pilotos.app/cgu" style="color:#94a3b8;text-decoration:underline;">CGU</a>
      &nbsp;·&nbsp;
      <a href="mailto:support@pilotos.app" style="color:#94a3b8;text-decoration:underline;">Support</a>
    </p>
    <p style="margin:8px 0 0;font-size:11px;">Vous recevez cet email en tant que membre d'une organisation PilotOS.<br/>
    Gérez vos préférences dans <a href="https://pilotos.app/app/profil" style="color:#94a3b8;">votre profil</a>.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

const btn = (label: string, url: string) =>
  `<a href="${url}" style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin:20px 0;">${label}</a>`

const h1 = (text: string) =>
  `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">${text}</h1>`

const p = (text: string) =>
  `<p style="margin:0 0 16px;color:#334155;">${text}</p>`

const hr = () =>
  `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>`

const box = (text: string, bg = '#f0f4ff', border = BRAND_COLOR) =>
  `<div style="background:${bg};border-left:4px solid ${border};border-radius:0 8px 8px 0;padding:14px 16px;margin:16px 0;font-size:14px;color:#334155;">${text}</div>`

// ── Templates ──────────────────────────────────────────────────

export function welcomeEmailHtml(params: {
  name: string
  orgName: string
  loginUrl: string
}): string {
  return base(
    h1('Bienvenue sur PilotOS 🎉') +
    p(`Bonjour ${params.name},`) +
    p(`Votre compte et l'organisation <strong>${params.orgName}</strong> sont prêts. Invitez vos collaborateurs, créez vos premiers processus et centralisez vos actions.`) +
    btn('Accéder à PilotOS', params.loginUrl) +
    hr() +
    p(`Besoin d'aide ? Écrivez-nous à <a href="mailto:support@pilotos.app" style="color:${BRAND_COLOR};">support@pilotos.app</a>.`),
    `Bienvenue dans ${params.orgName} — votre espace PilotOS est prêt.`,
  )
}

export function invitationEmailHtml(params: {
  inviterName: string
  orgName: string
  inviteUrl: string
  role?: string
}): string {
  const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrateur', director: 'Directeur', manager: 'Manager',
    contributor: 'Contributeur', reader: 'Lecteur', terrain: 'Terrain',
  }
  const roleName = params.role ? (ROLE_LABELS[params.role] ?? params.role) : 'Membre'
  return base(
    h1(`Invitation à rejoindre ${params.orgName}`) +
    p(`<strong>${params.inviterName}</strong> vous invite à rejoindre <strong>${params.orgName}</strong> sur PilotOS en tant que <strong>${roleName}</strong>.`) +
    box('PilotOS centralise les actions, processus et indicateurs pour piloter votre performance qualité.') +
    btn("Accepter l'invitation", params.inviteUrl) +
    p(`<span style="font-size:13px;color:#94a3b8;">Ce lien expire dans 7 jours. Si vous n'êtes pas concerné, ignorez simplement cet email.</span>`),
    `${params.inviterName} vous invite sur PilotOS — ${params.orgName}`,
  )
}

export function actionAssignedEmailHtml(params: {
  assigneeName: string
  assignerName: string
  actionTitle: string
  dueDate: string | null
  orgName: string
  actionUrl: string
}): string {
  return base(
    h1('Nouvelle action assignée') +
    p(`Bonjour ${params.assigneeName},`) +
    p(`<strong>${params.assignerName}</strong> vous a assigné une action dans <strong>${params.orgName}</strong>.`) +
    box(
      `<strong>${params.actionTitle}</strong>` +
      (params.dueDate ? `<br/><span style="font-size:13px;color:#64748b;">Échéance : ${params.dueDate}</span>` : ''),
    ) +
    btn("Voir l'action", params.actionUrl),
    `Action assignée : ${params.actionTitle}`,
  )
}

export function actionLateReminderEmailHtml(params: {
  name: string
  orgName: string
  appUrl: string
  actions: { title: string; dueDate: string }[]
}): string {
  const rows = params.actions.map(a =>
    `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;">${a.title}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;white-space:nowrap;color:#ef4444;font-size:13px;">Échu le ${a.dueDate}</td>
    </tr>`,
  ).join('')
  const n = params.actions.length
  return base(
    h1(`${n} action${n > 1 ? 's' : ''} en retard`) +
    p(`Bonjour ${params.name},`) +
    p(`Vous avez ${n} action${n > 1 ? 's' : ''} en retard dans <strong>${params.orgName}</strong>.`) +
    `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:16px 0 24px;">${rows}</table>` +
    btn('Voir mes actions', params.appUrl) +
    p(`<span style="font-size:12px;color:#94a3b8;">Ce rappel est envoyé quotidiennement tant que des actions restent en retard.</span>`),
    `${n} action${n > 1 ? 's' : ''} en retard dans ${params.orgName}`,
  )
}

export function actionDueSoonEmailHtml(params: {
  name: string
  orgName: string
  appUrl: string
  actions: { title: string; dueDate: string }[]
}): string {
  const rows = params.actions.map(a =>
    `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;">${a.title}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;white-space:nowrap;color:#f59e0b;font-size:13px;">Échéance ${a.dueDate}</td>
    </tr>`,
  ).join('')
  const n = params.actions.length
  return base(
    h1('Actions à échéance dans 2 jours') +
    p(`Bonjour ${params.name},`) +
    p(`${n} action${n > 1 ? 's arrivent' : ' arrive'} à échéance dans 2 jours dans <strong>${params.orgName}</strong>.`) +
    `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:16px 0 24px;">${rows}</table>` +
    btn('Voir mes actions', params.appUrl),
    `Actions à échéance dans 2 jours — ${params.orgName}`,
  )
}

export function documentApprovalRequestEmailHtml(params: {
  reviewerName: string
  requesterName: string
  documentTitle: string
  orgName: string
  documentUrl: string
}): string {
  return base(
    h1('Demande de validation de document') +
    p(`Bonjour ${params.reviewerName},`) +
    p(`<strong>${params.requesterName}</strong> vous demande de valider un document dans <strong>${params.orgName}</strong>.`) +
    box(
      `<strong>${params.documentTitle}</strong><br/><span style="font-size:13px;color:#64748b;">Statut : En attente de validation</span>`,
    ) +
    btn('Valider le document', params.documentUrl),
    `Validation requise : ${params.documentTitle}`,
  )
}

export function documentApprovedEmailHtml(params: {
  authorName: string
  approverName: string
  documentTitle: string
  orgName: string
  documentUrl: string
}): string {
  return base(
    h1('Document approuvé ✓') +
    p(`Bonjour ${params.authorName},`) +
    p(`Votre document <strong>${params.documentTitle}</strong> a été approuvé par <strong>${params.approverName}</strong> dans <strong>${params.orgName}</strong>.`) +
    box('Le document est maintenant en vigueur et accessible à tous les membres autorisés.', '#f0fdf4', '#22c55e') +
    btn('Voir le document', params.documentUrl),
    `Document approuvé : ${params.documentTitle}`,
  )
}

export function feedbackResolvedEmailHtml(params: {
  feedbackTitle: string
  resolutionNote: string
  version: string
}): string {
  return base(
    h1('Signalement résolu ✓') +
    p(`Le signalement <strong>"${params.feedbackTitle}"</strong> a été résolu dans la version <strong>${params.version}</strong>.`) +
    (params.resolutionNote ? box(params.resolutionNote) : '') +
    p('Merci pour votre retour — il contribue à améliorer PilotOS pour tous.') +
    hr() +
    p(`<a href="https://pilotos.app/roadmap" style="color:${BRAND_COLOR};">Voir la roadmap</a> pour suivre les prochaines évolutions.`),
    `Résolu dans v${params.version} : ${params.feedbackTitle}`,
  )
}

export function mfaCodeEmailHtml(params: { name: string; code: string }): string {
  return base(
    h1('Code de vérification') +
    p(`Bonjour ${params.name},`) +
    p('Votre code de connexion à usage unique :') +
    `<div style="text-align:center;margin:24px 0;">
      <div style="display:inline-block;font-size:38px;font-weight:700;letter-spacing:10px;color:${BRAND_COLOR};background:#f0f4ff;border-radius:12px;padding:20px 32px;font-family:'JetBrains Mono',monospace;">${params.code}</div>
    </div>` +
    box('<strong>Ce code expire dans 10 minutes.</strong> Ne le partagez jamais — PilotOS ne vous demandera jamais votre code par téléphone.', '#fefce8', '#eab308'),
    'Votre code de connexion PilotOS',
  )
}

export function weeklyDigestEmailHtml(params: {
  name: string
  orgName: string
  appUrl: string
  lateCount: number
  dueSoonCount: number
  doneThisWeek: number
  newReports: number
}): string {
  const stat = (value: number, label: string, color: string, bg: string) =>
    `<td width="50%" style="padding:0 6px 12px;">
      <div style="background:${bg};border-radius:10px;padding:18px;text-align:center;">
        <div style="font-size:30px;font-weight:700;color:${color};">${value}</div>
        <div style="font-size:12px;color:${color};margin-top:4px;">${label}</div>
      </div>
    </td>`
  return base(
    h1(`Résumé de la semaine — ${params.orgName}`) +
    p(`Bonjour ${params.name}, voici votre bilan de la semaine.`) +
    `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;">
      <tr>
        ${stat(params.lateCount, 'Actions en retard', '#ef4444', '#fef2f2')}
        ${stat(params.dueSoonCount, 'Échéances proches', '#f59e0b', '#fffbeb')}
      </tr>
      <tr>
        ${stat(params.doneThisWeek, 'Terminées cette semaine', '#22c55e', '#f0fdf4')}
        ${stat(params.newReports, 'Signalements terrain', BRAND_COLOR, '#f0f4ff')}
      </tr>
    </table>` +
    btn('Accéder à mon tableau de bord', params.appUrl),
    `Résumé hebdo ${params.orgName} — ${params.lateCount} action${params.lateCount !== 1 ? 's' : ''} en retard`,
  )
}
