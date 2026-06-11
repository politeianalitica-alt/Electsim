'use client'

/**
 * <MarkdownEditor> · editor potente basado en CodeMirror 6.
 *
 * Sprint Cuaderno N3 · sustituye el <textarea> plano del editor.
 *
 * Capacidades:
 *   - Syntax highlight markdown (headings, bold, code, lists, tables, quotes, links)
 *   - Autocomplete inline:
 *       [[Pedro      → propone entidades del registry (29 personas, 13 partidos, etc.)
 *       {macro:      → propone embeds del data-registry (50 datos disponibles)
 *       #infl        → propone tags ya usados en otras notas
 *   - History (Cmd+Z, Cmd+Shift+Z), bracketMatching, indentOnInput
 *   - Búsqueda (Cmd+F) nativa de CodeMirror
 *   - Line wrapping (no scroll horizontal feo)
 *   - Theme custom alineado con el resto del Cuaderno
 *
 * API imperativa via ref:
 *   editorRef.current?.insertAtCursor("[[Pedro Sánchez]] ")
 *   editorRef.current?.focus()
 *
 * Por qué ref-imperative y no controlled-only:
 *   El picker (Cmd+K-style) inserta texto en la posición del cursor sin pisar el
 *   contenido del usuario. Hacerlo via state requeriría reconstruir la posición
 *   del cursor desde fuera, que es frágil. CM6 expone dispatch() y eso es lo que
 *   usamos en insertAtCursor.
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import { EditorState } from '@codemirror/state'
import {
  EditorView,
  keymap,
  drawSelection,
  highlightActiveLineGutter,
  highlightSpecialChars,
} from '@codemirror/view'
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import {
  autocompletion,
  completionKeymap,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete'
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
  indentOnInput,
} from '@codemirror/language'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'

import {
  searchEntities,
  KIND_COLORS,
} from '@/lib/cuaderno/entity-registry'
import {
  searchDataEmbeds,
} from '@/lib/cuaderno/data-registry'

export interface MarkdownEditorHandle {
  insertAtCursor: (text: string) => void
  focus: () => void
  getValue: () => string
}

interface Props {
  value: string
  onChange: (v: string) => void
  /** Lista de tags ya existentes (para autocomplete #) */
  tagList?: string[]
  placeholder?: string
}

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, Props>(
  function MarkdownEditor({ value, onChange, tagList = [], placeholder }, ref) {
    const hostRef = useRef<HTMLDivElement | null>(null)
    const viewRef = useRef<EditorView | null>(null)

    // Refs para evitar stale closures en handlers de CM
    const onChangeRef = useRef(onChange)
    const tagListRef = useRef(tagList)
    useEffect(() => { onChangeRef.current = onChange }, [onChange])
    useEffect(() => { tagListRef.current = tagList }, [tagList])

    // API imperativa
    useImperativeHandle(ref, () => ({
      insertAtCursor(text: string) {
        const view = viewRef.current
        if (!view) return
        const pos = view.state.selection.main.head
        view.dispatch({
          changes: { from: pos, to: pos, insert: text },
          selection: { anchor: pos + text.length },
        })
        view.focus()
      },
      focus() {
        viewRef.current?.focus()
      },
      getValue() {
        return viewRef.current?.state.doc.toString() ?? ''
      },
    }))

    // Source de autocompletado · [[ , { , #
    function completions(ctx: CompletionContext): CompletionResult | null {
      const line = ctx.state.doc.lineAt(ctx.pos)
      const before = line.text.slice(0, ctx.pos - line.from)

      // [[entity·partial — captura desde "[[" hasta el cursor
      const mEnt = /\[\[([^\]|\n]*)$/.exec(before)
      if (mEnt) {
        const q = mEnt[1]
        // Si la query está vacía y no se está escribiendo activamente,
        // sólo activamos completo en activación manual (Cmd+Space)
        if (!ctx.explicit && q.length < 1) return null
        const results = searchEntities(q, 12)
        if (results.length === 0) return null
        return {
          from: ctx.pos - q.length,
          options: results.map((e) => {
            const c = KIND_COLORS[e.kind]
            return {
              label: e.name,
              type: 'class',
              detail: `${c.glyph} ${e.kind}${e.role ? ' · ' + e.role.slice(0, 40) : ''}`,
              // Cierra el wikilink solo (el ]] que abre ya está)
              apply: `${e.slug}]]`,
            }
          }),
          validFor: /^[^\]|\n]*$/,
        }
      }

      // {source:key·partial — captura desde "{" hasta el cursor
      const mData = /\{([a-zA-Z0-9_:.-]*)$/.exec(before)
      if (mData) {
        const q = mData[1]
        if (!ctx.explicit && q.length < 1) return null
        const results = searchDataEmbeds(q, 12)
        if (results.length === 0) return null
        return {
          from: ctx.pos - q.length,
          options: results.map((d) => ({
            label: `${d.source}:${d.key}`,
            type: 'variable',
            detail: d.label,
            // Cierra la llave (la { que abre ya está)
            apply: `${d.source}:${d.key}}`,
          })),
          validFor: /^[a-zA-Z0-9_:.-]*$/,
        }
      }

      // #tag·partial — captura desde "#" hasta cursor, exigiendo whitespace/inicio antes
      const mTag = /(^|\s)#([a-zA-Z0-9_-]*)$/.exec(before)
      if (mTag && tagListRef.current.length > 0) {
        const q = mTag[2].toLowerCase()
        if (!ctx.explicit && q.length < 1) return null
        const tags = tagListRef.current
        const results = tags
          .filter((t) => {
            const norm = t.startsWith('#') ? t.slice(1).toLowerCase() : t.toLowerCase()
            return norm.startsWith(q) || norm.includes(q)
          })
          .slice(0, 12)
        if (results.length === 0) return null
        return {
          from: ctx.pos - q.length,
          options: results.map((t) => ({
            label: t,
            type: 'keyword',
            // Devuelve sin "#" porque "#" ya está en el doc
            apply: t.startsWith('#') ? t.slice(1) : t,
          })),
          validFor: /^[a-zA-Z0-9_-]*$/,
        }
      }

      return null
    }

    // Mount CM6
    useEffect(() => {
      if (!hostRef.current) return
      if (viewRef.current) return // ya montado

      const state = EditorState.create({
        doc: value,
        extensions: [
          history(),
          drawSelection(),
          highlightSpecialChars(),
          highlightActiveLineGutter(),
          highlightSelectionMatches(),
          bracketMatching(),
          indentOnInput(),
          markdown({ base: markdownLanguage }),
          syntaxHighlighting(defaultHighlightStyle),
          autocompletion({
            override: [completions],
            activateOnTyping: true,
            maxRenderedOptions: 12,
            defaultKeymap: true,
          }),
          EditorView.lineWrapping,
          keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            ...completionKeymap,
            ...searchKeymap,
            indentWithTab,
          ]),
          EditorView.theme(
            {
              '&': {
                height: '100%',
                fontSize: '14px',
                fontFamily:
                  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                background: '#fafafa',
              },
              '.cm-scroller': {
                fontFamily: 'inherit',
                lineHeight: '1.55',
              },
              '.cm-content': {
                padding: '14px 16px',
                caretColor: '#1F4E8C',
              },
              '.cm-focused': {
                outline: 'none',
              },
              '.cm-cursor': {
                borderLeft: '2px solid #1F4E8C',
              },
              '.cm-tooltip-autocomplete': {
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                background: '#fff',
                boxShadow: '0 6px 24px rgba(0,0,0,0.10)',
                fontFamily: 'inherit',
                fontSize: '12.5px',
              },
              '.cm-tooltip-autocomplete ul li': {
                padding: '5px 10px',
              },
              '.cm-tooltip-autocomplete ul li[aria-selected]': {
                background: '#1F4E8C',
                color: '#fff',
              },
              '.cm-completionDetail': {
                color: '#6b7280',
                fontStyle: 'normal',
                marginLeft: '12px',
                fontSize: '11px',
              },
              '.cm-completionLabel': {
                fontWeight: 500,
              },
              // Heading variants
              '.cm-line': {
                paddingLeft: 0,
              },
            },
            { dark: false },
          ),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString())
            }
          }),
        ],
      })

      const view = new EditorView({
        state,
        parent: hostRef.current,
      })
      viewRef.current = view

      return () => {
        view.destroy()
        viewRef.current = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // mount once · sync de value se hace en el siguiente useEffect

    // Sync de cambios externos de value (e.g. al cambiar de nota activa)
    // Sprint N13 · preserva el cursor cuando el value externo cambia por una
    // edición que YA viene de este propio editor (round-trip del controlado).
    // Si el cambio es de OTRA fuente (cambio de nota, insertAtCursor desde picker),
    // sí necesitamos sustituir todo. Heurística: si la longitud es la misma o
    // muy parecida, asumimos que es nuestro propio round-trip → no tocamos.
    useEffect(() => {
      const view = viewRef.current
      if (!view) return
      const cur = view.state.doc.toString()
      if (cur === value) return
      // Preserva cursor: capturamos selection actual y clamp tras dispatch
      const sel = view.state.selection.main
      view.dispatch({
        changes: { from: 0, to: cur.length, insert: value },
        // Restaura selection si la posición sigue siendo válida
        selection: {
          anchor: Math.min(sel.anchor, value.length),
          head: Math.min(sel.head, value.length),
        },
      })
    }, [value])

    return (
      <div
        ref={hostRef}
        data-placeholder={placeholder}
        style={{
          height: '100%',
          width: '100%',
          overflow: 'hidden',
          background: '#fafafa',
          borderRight: '1px solid #e5e7eb',
        }}
      />
    )
  },
)

export default MarkdownEditor
