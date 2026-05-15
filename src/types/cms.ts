// Re-export block types from BlockEditor for unified access
export type {
  Block,
  BlockType,
  ParagraphBlock,
  HeadingBlock,
  ImageBlock,
  QuoteBlock,
  ListBlock,
  CodeBlock,
  DividerBlock,
  CalloutBlock,
} from '@/components/editor/BlockEditor'

// Re-export CmsBlock from PageEditor
export type {
  CmsBlock,
  CmsBlockType,
} from '@/components/cms/PageEditor'
