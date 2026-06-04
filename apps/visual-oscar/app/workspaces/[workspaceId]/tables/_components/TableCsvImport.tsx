'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { previewCsv, buildTableFromCsv, type CsvPreview } from '@/lib/tables/csv-import'
import { tableRepository } from '@/lib/tables/table-repository'

export default function TableCsvImport({ workspaceId }: { workspaceId: string }) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [preview, setPreview] = useState<CsvPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onText = (t: string) => {
    setText(t)
    setError(null)
    if (t.trim()) {
      try { setPreview(previewCsv(t)) } catch { setPreview(null) }
    } else {
      setPreview(null)
    }
  }

  const onFile = (f: File | null) => {
    if (!f) return
    if (!name) setName(f.name.replace(/\.(csv|tsv|txt)$/i, ''))
    const reader = new FileReader()
    reader.onload = () => onText(String(reader.result ?? ''))
    reader.onerror = () => setError('No se pudo leer el archivo')
    reader.readAsText(f)
  }

  const onImport = () => {
    setError(null)
    if (!text.trim()) { setError('Pega un CSV o selecciona un archivo primero'); return }
    setBusy(true)
    try {
      const table = buildTableFromCsv(workspaceId, name, text)
      if (!table.rows.length) { setError('El CSV no tiene filas de datos'); setBusy(false); return }
      tableRepository.createTable(table)
      router.push(`/workspaces/${workspaceId}/tables/${table.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo importar el CSV')
      setBusy(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-[#e8e8ed] px-3 py-2 text-sm text-[#1d1d1f] outline-none focus:border-[#1F4E8C]'

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[#6e6e73] mb-1">Nombre de la tabla</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="p. ej. Resultados municipales 2023" className={inputCls} />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[#6e6e73] mb-1">Archivo CSV / TSV</label>
        <input
          type="file"
          accept=".csv,.tsv,.txt,text/csv"
          onChange={e => onFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-[#3a3a3d] file:mr-3 file:rounded-lg file:border-0 file:bg-[#1F4E8C] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#0F2A4F]"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[#6e6e73] mb-1">…o pega el contenido</label>
        <textarea
          value={text}
          onChange={e => onText(e.target.value)}
          rows={6}
          placeholder={'nombre,partido,escaños\nJuan,PP,12\nAna,PSOE,10'}
          className={`${inputCls} font-mono text-xs`}
        />
      </div>

      {preview && preview.headers.length > 0 && (
        <div className="rounded-lg border border-[#e8e8ed] overflow-hidden">
          <div className="bg-[#F5F5F7] px-3 py-1.5 text-xs text-[#6e6e73]">
            Vista previa · {preview.totalRows} filas × {preview.headers.length} columnas
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#FAFAFB]">
                  {preview.headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left font-semibold text-[#1d1d1f] whitespace-nowrap border-b border-[#e8e8ed]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r, ri) => (
                  <tr key={ri} className="border-b border-[#f0f0f2] last:border-0">
                    {preview.headers.map((_, ci) => (
                      <td key={ci} className="px-3 py-1.5 text-[#3a3a3d] whitespace-nowrap">{r[ci] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-[#c42c2c] bg-[#fdecec] border border-[#f7c9c9] rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={onImport}
          disabled={busy || !text.trim()}
          className="rounded-lg bg-[#1F4E8C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0F2A4F] disabled:opacity-50 transition-colors"
        >
          {busy ? 'Importando…' : 'Importar como tabla'}
        </button>
        <a href={`/workspaces/${workspaceId}/tables`} className="text-sm text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Cancelar</a>
      </div>
    </div>
  )
}
