'use client'

import type { PipelineNode, NodeType } from '@/types/domo'
import { NODE_TYPE_LABELS, NODE_TYPE_COLORS } from '@/lib/estudio/constants'
import styles from './PipelineEditor.module.css'

interface Props {
  node:     PipelineNode
  onUpdate: (config: Record<string, unknown>) => void
  onDelete: () => void
  onClose:  () => void
}

export default function NodeConfigPanel({ node, onUpdate, onDelete, onClose }: Props) {
  const color = NODE_TYPE_COLORS[node.type]

  function set(key: string, value: unknown) {
    onUpdate({ ...node.config, [key]: value })
  }

  return (
 <div className={styles.rightPanel}>
 <div className={styles.rightPanelHeader} style={{ borderLeftColor: color }}>
 <div>
 <span className={styles.rightPanelType} style={{ color }}>{NODE_TYPE_LABELS[node.type]}</span>
 <h3 className={styles.rightPanelTitle}>{node.label}</h3>
 </div>
 <div style={{ display: 'flex', gap: 6 }}>
 <button onClick={onDelete} className={styles.btnDeleteNode} title="Eliminar nodo">×</button>
 <button onClick={onClose} className={styles.btnClosePanel}></button>
 </div>
 </div>

 <div className={styles.rightPanelBody}>
 <div className={styles.cfgGroup}>
 <label className={styles.cfgLabel}>Etiqueta</label>
 <input
            type="text"
            value={node.label}
            onChange={e => onUpdate({ ...node.config, _label: e.target.value })}
            className={styles.cfgInput}
            placeholder="Nombre descriptivo del nodo"
          />
 </div>

 <NodeTypeFields type={node.type} config={node.config} onChange={set} />

 <details style={{ marginTop: '1rem' }}>
 <summary style={{ fontSize: '0.75rem', cursor: 'pointer', color: 'var(--color-muted,#6b7280)' }}>
            Config JSON avanzado
 </summary>
 <textarea
            value={JSON.stringify(node.config, null, 2)}
            onChange={e => {
              try { onUpdate(JSON.parse(e.target.value)) } catch {/* ignore parse errors during edit */}
            }}
            className={styles.cfgTextarea}
            rows={8}
            spellCheck={false}
          />
 </details>
 </div>
 </div>
  )
}

function NodeTypeFields({
  type,
  config,
  onChange,
}: {
  type:     NodeType
  config:   Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}) {
  function field(key: string, label: string, placeholder: string, inputType = 'text') {
    return (
 <div className={styles.cfgGroup} key={key}>
 <label className={styles.cfgLabel}>{label}</label>
 <input
          type={inputType}
          value={String(config[key] ?? '')}
          onChange={e => onChange(key, e.target.value)}
          placeholder={placeholder}
          className={styles.cfgInput}
        />
 </div>
    )
  }

  function select(key: string, label: string, options: string[]) {
    return (
 <div className={styles.cfgGroup} key={key}>
 <label className={styles.cfgLabel}>{label}</label>
 <select
          value={String(config[key] ?? options[0])}
          onChange={e => onChange(key, e.target.value)}
          className={styles.cfgInput}
        >
          {options.map(o => <option key={o} value={o}>{o}</option>)}
 </select>
 </div>
    )
  }

  switch (type) {
    case 'source':
      return (
 <>
          {field('sourceId', 'ID de la fuente', 'ID de DataSource (ver Fuentes)')}
          {field('query', 'Query SQL (opcional)', 'SELECT * FROM tabla WHERE …')}
          {field('limit', 'Límite de registros', '10000', 'number')}
 </>
      )
    case 'filter':
      return (
 <>
          {field('condition', 'Condición', 'columna > 100 AND otra = "valor"')}
          {select('mode', 'Modo', ['include', 'exclude'])}
 </>
      )
    case 'select':
      return (
 <>
          {field('columns', 'Columnas (separadas por coma)', 'id, nombre, fecha, valor')}
          {field('rename', 'Renombrar (JSON)', '{"old_name":"new_name"}')}
 </>
      )
    case 'join':
      return (
 <>
          {select('joinType', 'Tipo de JOIN', ['inner', 'left', 'right', 'full'])}
          {field('leftKey', 'Clave izquierda', 'id')}
          {field('rightKey', 'Clave derecha', 'foreign_id')}
 </>
      )
    case 'aggregate':
      return (
 <>
          {field('groupBy', 'Agrupar por (columnas)', 'categoria, fecha')}
          {field('aggregations', 'Agregaciones (JSON)', '[{"col":"valor","fn":"sum","as":"total"}]')}
 </>
      )
    case 'transform':
      return (
 <>
          {field('expression', 'Expresión / fórmula', 'nueva_col = col_a * col_b')}
          {field('language', 'Lenguaje', 'sql | python | jinja2')}
 </>
      )
    case 'deduplicate':
      return (
 <>
          {field('keys', 'Claves de deduplicación', 'id, fecha')}
          {select('keepStrategy', 'Mantener', ['first', 'last', 'max', 'min'])}
 </>
      )
    case 'sort':
      return <>{field('orderBy', 'Ordenar por', 'fecha DESC, valor ASC')}</>
    case 'limit':
      return (
 <>
          {field('limit', 'Número de registros', '1000', 'number')}
          {field('offset', 'Offset', '0', 'number')}
 </>
      )
    case 'destination':
      return (
 <>
          {field('datasetId', 'ID del dataset destino', 'ID del Dataset')}
          {select('writeMode', 'Modo de escritura', ['append', 'overwrite', 'upsert'])}
          {field('upsertKeys', 'Claves de upsert', 'id')}
 </>
      )
    default:
      return null
  }
}
