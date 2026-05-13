// PDF export using browser print API (no external dependency needed)
// Opens a new window with styled HTML and triggers print-to-PDF

interface ActionExportItem {
  title: string
  status: string
  responsible?: string
  due_date?: string
  origin?: string
}

interface ProcessExportItem {
  title: string
  process_code: string
  status?: string
  last_review_date?: string
}

function printWindow(title: string, html: string) {
  const win = window.open('', '_blank')
  if (!win) {
    alert('Autorisez les popups pour exporter en PDF.')
    return
  }
  win.document.write(`<!DOCTYPE html><html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Inter, system-ui, sans-serif; color: #0f172a; background: #fff; padding: 32px; font-size: 13px; }
  h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
  .subtitle { color: #64748b; font-size: 12px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #f8fafc; color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; padding: 8px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; }
  td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
  tr:last-child td { border-bottom: none; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
  .badge-late { background: #fee2e2; color: #dc2626; }
  .badge-done { background: #d1fae5; color: #059669; }
  .badge-todo { background: #f1f5f9; color: #64748b; }
  .badge-in_progress { background: #dbeafe; color: #2563eb; }
  .footer { margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; color: #94a3b8; font-size: 11px; display: flex; justify-content: space-between; }
  @media print { body { padding: 16px; } button { display: none; } }
</style>
</head>
<body>${html}<div class="footer"><span>PilotOS · Exporté le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span><span>${title}</span></div>
<script>setTimeout(() => window.print(), 400);</script>
</body></html>`)
  win.document.close()
}

export function exportActionsPDF(actions: ActionExportItem[], orgName = 'Organisation') {
  const rows = actions.map(a => `
    <tr>
      <td>${a.title}</td>
      <td><span class="badge badge-${a.status}">${a.status}</span></td>
      <td>${a.responsible ?? '—'}</td>
      <td>${a.due_date ? new Date(a.due_date).toLocaleDateString('fr-FR') : '—'}</td>
      <td>${a.origin ?? '—'}</td>
    </tr>`).join('')

  const html = `
    <h1>Plan d'actions</h1>
    <p class="subtitle">${orgName} · ${actions.length} action${actions.length > 1 ? 's' : ''}</p>
    <table>
      <thead><tr><th>Titre</th><th>Statut</th><th>Responsable</th><th>Échéance</th><th>Origine</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`
  printWindow(`Plan d'actions — ${orgName}`, html)
}

export function exportProcessesPDF(processes: ProcessExportItem[], orgName = 'Organisation') {
  const rows = processes.map(p => `
    <tr>
      <td>${p.process_code}</td>
      <td>${p.title}</td>
      <td>${p.status ?? '—'}</td>
      <td>${p.last_review_date ? new Date(p.last_review_date).toLocaleDateString('fr-FR') : '—'}</td>
    </tr>`).join('')

  const html = `
    <h1>Cartographie des processus</h1>
    <p class="subtitle">${orgName} · ${processes.length} processus</p>
    <table>
      <thead><tr><th>Code</th><th>Titre</th><th>Statut</th><th>Dernière révision</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`
  printWindow(`Processus — ${orgName}`, html)
}

interface DuerExportItem {
  work_unit: string
  hazard: string
  risk_description: string
  probability: number
  severity: number
  prevention_measures: string
  review_date?: string | null
}

interface EpiExportItem {
  category: string
  designation: string
  reference?: string | null
  norm?: string | null
  supplier?: string | null
  storage_location?: string | null
  renewal_months?: number | null
}

interface HabExportItem {
  code: string
  label: string
  category: string
  validity_months?: number | null
  description?: string | null
}

export function exportDuerPDF(items: DuerExportItem[], orgName = 'Organisation') {
  const rows = items.map(i => {
    const score = i.probability * i.severity
    const level = score <= 4 ? 'Faible' : score <= 8 ? 'Modéré' : score <= 12 ? 'Modéré+' : score <= 16 ? 'Élevé' : 'Critique'
    return `<tr>
      <td>${i.work_unit}</td>
      <td>${i.hazard}</td>
      <td>${i.risk_description}</td>
      <td style="text-align:center">${i.probability}×${i.severity} = <strong>${score}</strong></td>
      <td>${level}</td>
      <td>${i.prevention_measures}</td>
      <td>${i.review_date ? new Date(i.review_date).toLocaleDateString('fr-FR') : '—'}</td>
    </tr>`
  }).join('')

  const html = `
    <h1>Document Unique d'Évaluation des Risques</h1>
    <p class="subtitle">${orgName} · ${items.length} unité${items.length > 1 ? 's' : ''} de travail</p>
    <table>
      <thead><tr><th>Unité de travail</th><th>Danger</th><th>Description du risque</th><th>Cotation</th><th>Niveau</th><th>Mesures de prévention</th><th>Révision</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`
  printWindow(`DUER — ${orgName}`, html)
}

export function exportEpiPDF(items: EpiExportItem[], orgName = 'Organisation') {
  const rows = items.map(i => `<tr>
    <td>${i.category}</td>
    <td>${i.designation}</td>
    <td>${i.reference ?? '—'}</td>
    <td>${i.norm ?? '—'}</td>
    <td>${i.supplier ?? '—'}</td>
    <td>${i.storage_location ?? '—'}</td>
    <td>${i.renewal_months != null ? `${i.renewal_months} mois` : '—'}</td>
  </tr>`).join('')

  const html = `
    <h1>Catalogue EPI</h1>
    <p class="subtitle">${orgName} · ${items.length} équipement${items.length > 1 ? 's' : ''}</p>
    <table>
      <thead><tr><th>Catégorie</th><th>Désignation</th><th>Référence</th><th>Norme</th><th>Fournisseur</th><th>Lieu stockage</th><th>Renouvellement</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`
  printWindow(`EPI — ${orgName}`, html)
}

export function exportHabilitationsPDF(items: HabExportItem[], orgName = 'Organisation') {
  const rows = items.map(i => `<tr>
    <td><strong>${i.code}</strong></td>
    <td>${i.label}</td>
    <td>${i.category}</td>
    <td>${i.validity_months != null ? `${i.validity_months} mois` : 'Illimitée'}</td>
    <td>${i.description ?? '—'}</td>
  </tr>`).join('')

  const html = `
    <h1>Catalogue des habilitations</h1>
    <p class="subtitle">${orgName} · ${items.length} habilitation${items.length > 1 ? 's' : ''}</p>
    <table>
      <thead><tr><th>Code</th><th>Libellé</th><th>Catégorie</th><th>Validité</th><th>Description</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`
  printWindow(`Habilitations — ${orgName}`, html)
}

interface NcExportItem {
  title: string
  severity: string
  status: string
  detected_at: string
  description?: string | null
  process?: string | null
}

interface KaizenExportItem {
  title: string
  status: string
  objective?: string | null
  start_date?: string | null
  end_date?: string | null
  estimated_savings_hours?: number | null
  process?: string | null
}

const NC_SEVERITY_FR: Record<string, string> = { minor: 'Mineure', major: 'Majeure', critical: 'Critique' }
const NC_STATUS_FR: Record<string, string>   = { open: 'Ouverte', in_treatment: 'En traitement', closed: 'Clôturée' }
const KAIZEN_STATUS_FR: Record<string, string> = { planned: 'Planifié', in_progress: 'En cours', completed: 'Terminé' }

export function exportNcsPDF(items: NcExportItem[], orgName = 'Organisation') {
  const rows = items.map(i => `<tr>
    <td>${i.title}</td>
    <td>${NC_SEVERITY_FR[i.severity] ?? i.severity}</td>
    <td>${NC_STATUS_FR[i.status] ?? i.status}</td>
    <td>${new Date(i.detected_at).toLocaleDateString('fr-FR')}</td>
    <td>${i.process ?? '—'}</td>
    <td>${i.description ? i.description.slice(0, 120) + (i.description.length > 120 ? '…' : '') : '—'}</td>
  </tr>`).join('')

  const html = `
    <h1>Non-conformités</h1>
    <p class="subtitle">${orgName} · ${items.length} NC</p>
    <table>
      <thead><tr><th>Titre</th><th>Gravité</th><th>Statut</th><th>Détectée le</th><th>Processus</th><th>Description</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`
  printWindow(`Non-conformités — ${orgName}`, html)
}

export function exportKaizenPDF(items: KaizenExportItem[], orgName = 'Organisation') {
  const rows = items.map(i => `<tr>
    <td>${i.title}</td>
    <td>${KAIZEN_STATUS_FR[i.status] ?? i.status}</td>
    <td>${i.process ?? '—'}</td>
    <td>${i.start_date ? new Date(i.start_date).toLocaleDateString('fr-FR') : '—'}</td>
    <td>${i.end_date ? new Date(i.end_date).toLocaleDateString('fr-FR') : '—'}</td>
    <td>${i.estimated_savings_hours != null ? `${i.estimated_savings_hours} h` : '—'}</td>
    <td>${i.objective ? i.objective.slice(0, 100) + (i.objective.length > 100 ? '…' : '') : '—'}</td>
  </tr>`).join('')

  const html = `
    <h1>Plans Kaizen</h1>
    <p class="subtitle">${orgName} · ${items.length} plan${items.length > 1 ? 's' : ''}</p>
    <table>
      <thead><tr><th>Titre</th><th>Statut</th><th>Processus</th><th>Début</th><th>Fin prévue</th><th>Économies</th><th>Objectif</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`
  printWindow(`Plans Kaizen — ${orgName}`, html)
}
