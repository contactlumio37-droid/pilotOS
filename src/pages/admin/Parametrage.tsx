import PageHeader from '@/components/layout/PageHeader'
import CategoryManager from '@/components/admin/CategoryManager'

export default function Parametrage() {
  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Paramétrage"
        subtitle="Configuration de votre espace"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <CategoryManager type="action" title="Catégories d'actions" />
        </div>
        <div className="card">
          <CategoryManager type="process" title="Catégories de processus" />
        </div>
      </div>
    </div>
  )
}
