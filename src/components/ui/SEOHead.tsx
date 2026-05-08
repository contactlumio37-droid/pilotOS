import { useEffect } from 'react'

interface SEOHeadProps {
  title?: string
  description?: string
  ogImage?: string
  ogType?: 'website' | 'article'
  canonical?: string
}

const DEFAULT_TITLE = 'PilotOS — Pilotage opérationnel pour PME, SDIS et collectivités'
const DEFAULT_DESC = 'PilotOS relie vos décisions CODIR à vos actions terrain. ISO 9001, GED, KPIs, processus — tout en un. Hébergé en France.'
const DEFAULT_IMAGE = 'https://pilotos.app/og-default.png'

export default function SEOHead({
  title,
  description = DEFAULT_DESC,
  ogImage = DEFAULT_IMAGE,
  ogType = 'website',
  canonical,
}: SEOHeadProps) {
  const fullTitle = title ? `${title} — PilotOS` : DEFAULT_TITLE

  useEffect(() => {
    document.title = fullTitle

    function setMeta(name: string, content: string, attr = 'name') {
      let el = document.querySelector(`meta[${attr}="${name}"]`)
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el) }
      el.setAttribute('content', content)
    }

    const url = canonical ?? window.location.href

    setMeta('description', description)
    setMeta('og:title', fullTitle, 'property')
    setMeta('og:description', description, 'property')
    setMeta('og:image', ogImage, 'property')
    setMeta('og:type', ogType, 'property')
    setMeta('og:url', url, 'property')
    setMeta('og:site_name', 'PilotOS', 'property')
    setMeta('og:locale', 'fr_FR', 'property')
    setMeta('twitter:card', 'summary_large_image')
    setMeta('twitter:title', fullTitle)
    setMeta('twitter:description', description)
    setMeta('twitter:image', ogImage)
  }, [fullTitle, description, ogImage, ogType, canonical])

  return null
}
