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
