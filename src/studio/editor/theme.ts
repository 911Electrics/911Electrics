import type { EditorThemeClasses } from 'lexical'

/** In-editor styling so content looks roughly like the published page. */
export const editorTheme: EditorThemeClasses = {
  paragraph: 'mb-3 leading-relaxed',
  heading: {
    h2: 'mt-4 mb-2 text-xl font-bold text-slate-900',
    h3: 'mt-3 mb-2 text-lg font-semibold text-slate-900',
  },
  list: {
    ul: 'mb-3 ml-6 list-disc',
    ol: 'mb-3 ml-6 list-decimal',
    listitem: 'mb-1',
  },
  quote: 'my-3 border-l-4 border-slate-300 pl-4 italic text-slate-600',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
  },
}
