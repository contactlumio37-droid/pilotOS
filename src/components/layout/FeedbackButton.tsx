import { useState } from 'react'
import { MessageSquarePlus } from 'lucide-react'
import FeedbackDrawer from '@/components/modules/FeedbackDrawer'

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Signaler un bug ou une idée"
        className="fixed bottom-20 right-4 z-40 w-10 h-10 bg-brand-600 hover:bg-brand-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors md:bottom-6"
      >
        <MessageSquarePlus className="w-5 h-5" />
      </button>
      <FeedbackDrawer open={open} onClose={() => setOpen(false)} />
    </>
  )
}
