import type { Block } from './BlockEditor'

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function nl2br(str: string): string {
  return esc(str).replace(/\n/g, '<br>')
}

export function blocksToHtml(blocks: Block[]): string {
  return blocks
    .map(block => {
      switch (block.type) {
        case 'paragraph': {
          const align = block.align && block.align !== 'left' ? ` style="text-align:${block.align}"` : ''
          return `<p${align}>${nl2br(block.content)}</p>`
        }

        case 'heading':
          return `<h${block.level} class="blog-heading">${esc(block.content)}</h${block.level}>`

        case 'image': {
          if (!block.url) return ''
          const width = block.width === 'wide' ? ' style="max-width:120%"' : block.width === 'full' ? ' style="width:100%"' : ''
          const caption = block.caption ? `\n  <figcaption>${esc(block.caption)}</figcaption>` : ''
          return `<figure${width}>\n  <img src="${esc(block.url)}" alt="${esc(block.alt)}">${caption}\n</figure>`
        }

        case 'quote': {
          const cite = block.author ? `\n  <cite>— ${esc(block.author)}</cite>` : ''
          return `<blockquote>\n  <p>${nl2br(block.content)}</p>${cite}\n</blockquote>`
        }

        case 'list': {
          const tag = block.ordered ? 'ol' : 'ul'
          const items = block.items.filter(i => i.trim()).map(i => `  <li>${nl2br(i)}</li>`).join('\n')
          return `<${tag}>\n${items}\n</${tag}>`
        }

        case 'code': {
          const lang = block.language ? ` class="language-${esc(block.language)}"` : ''
          return `<pre><code${lang}>${esc(block.content)}</code></pre>`
        }

        case 'divider':
          return `<hr>`

        case 'callout': {
          const icon = block.icon ? `<span class="callout-icon">${block.icon}</span>` : ''
          return `<div class="callout callout-${block.color ?? 'blue'}">${icon}<p>${nl2br(block.content)}</p></div>`
        }
      }
    })
    .filter(Boolean)
    .join('\n\n')
}
