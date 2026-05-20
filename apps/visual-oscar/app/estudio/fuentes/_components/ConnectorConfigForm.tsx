'use client'

import type { ConnectorType } from '@/types/domo'
import styles from './NuevaFuenteDrawer.module.css'

interface Props {
  type:     ConnectorType
  config:   Record<string, string>
  onChange: (config: Record<string, string>) => void
}

export default function ConnectorConfigForm({ type, config, onChange }: Props) {
  function set(key: string, value: string) {
    onChange({ ...config, [key]: value })
  }

  function field(
    key:         string,
    label:       string,
    placeholder: string,
    inputType    = 'text',
    required     = false,
  ) {
    return (
 <div className={styles.formGroup} key={key}>
 <label className={styles.label}>
          {label} {required && '*'}
 </label>
 <input
          type={inputType}
          value={config[key] ?? ''}
          onChange={e => set(key, e.target.value)}
          placeholder={placeholder}
          className={styles.input}
          autoComplete={inputType === 'password' ? 'new-password' : undefined}
        />
 </div>
    )
  }

  switch (type) {
    case 'postgresql':
    case 'mysql':
      return (
 <>
          {field('host', 'Host', 'localhost', 'text', true)}
          {field('port', 'Puerto', type === 'postgresql' ? '5432' : '3306', 'number')}
          {field('database', 'Base de datos', 'mi_db', 'text', true)}
          {field('user', 'Usuario', 'admin', 'text', true)}
          {field('password', 'Contraseña', '••••••••', 'password', true)}
          {field('ssl', 'SSL Mode', 'disable | require | verify-full')}
 </>
      )

    case 'sqlite':
      return <>{field('path', 'Ruta del archivo', '/data/base.db', 'text', true)}</>

    case 'rest_api':
      return (
 <>
          {field('url', 'URL del endpoint', 'https://api.ejemplo.com/v1/datos', 'url', true)}
          {field('method', 'Método HTTP', 'GET | POST')}
          {field('auth_type', 'Autenticación', 'none | bearer | api_key | basic')}
          {field('auth_token', 'Token / API Key', '••••••••', 'password')}
          {field('headers', 'Headers adicionales (JSON)', '{"X-Custom":"valor"}')}
          {field('json_path', 'JSON Path resultado', '$.data | $.results | $[*]')}
          {field('pagination_type', 'Paginación', 'none | page | cursor | offset')}
 </>
      )

    case 'csv':
    case 'json':
    case 'excel':
      return (
 <>
          {field('url', 'URL del archivo o ruta', 'https://… o /datos/archivo.' + type, 'url', true)}
          {type === 'csv' && field('delimiter', 'Delimitador', ', | ; | \\t')}
          {type === 'csv' && field('encoding', 'Codificación', 'utf-8')}
          {field('has_header', 'Primera fila es cabecera', 'true | false')}
 </>
      )

    case 'websocket':
      return (
 <>
          {field('url', 'URL WebSocket', 'wss://stream.ejemplo.com/feed', 'url', true)}
          {field('auth_token', 'Token de autenticación', '••••••••', 'password')}
          {field('json_path', 'JSON Path del mensaje', '$.data')}
          {field('reconnect_delay_ms', 'Delay reconexión (ms)', '5000', 'number')}
 </>
      )

    case 'rss':
      return (
 <>
          {field('url', 'URL del feed RSS / Atom', 'https://feeds.ejemplo.com/feed.xml', 'url', true)}
          {field('max_items', 'Máximo de items', '100', 'number')}
          {field('filter_keywords', 'Filtrar por palabras clave (coma)', 'política, economía')}
 </>
      )

    case 'google_sheets':
      return (
 <>
          {field('spreadsheet_id', 'ID de la hoja de cálculo', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms', 'text', true)}
          {field('sheet_name', 'Nombre de la pestaña', 'Hoja 1')}
          {field('range', 'Rango (opcional)', 'A1:Z1000')}
          {field('api_key', 'API Key de Google', '••••••••', 'password', true)}
 </>
      )

    default:
      return (
 <p style={{ color: 'var(--color-muted,#6b7280)', fontSize: '0.875rem' }}>
          Este tipo de conector no requiere configuración adicional.
 </p>
      )
  }
}
