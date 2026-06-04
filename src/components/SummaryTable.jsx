import { useEffect, useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { RefreshCw, AlertCircle, TableProperties, Upload, FileSpreadsheet } from 'lucide-react'
import { fetchSummaryData } from '../services/sheetsService'

function fmtNum(v) {
  if (v === undefined || v === null || v === '') return '-'
  const s = String(v).replace(/[^0-9.-]/g, '')
  const n = parseFloat(s)
  if (isNaN(n)) return v
  return n.toLocaleString('id-ID')
}

function isNum(v) {
  if (!v && v !== 0) return false
  const s = String(v).replace(/[^0-9.-]/g, '')
  return s !== '' && !isNaN(parseFloat(s))
}

const ROW_COLORS = {
  header: 'bg-green-900 text-white font-semibold',
  subheader: 'bg-green-700 text-white font-semibold text-center',
  section: 'bg-yellow-50 font-bold text-yellow-900 border-t-2 border-yellow-300',
  total: 'bg-green-100 font-bold text-green-900',
  bkm: 'bg-blue-50 font-semibold text-blue-900',
  even: 'bg-white hover:bg-green-50',
  odd: 'bg-gray-50 hover:bg-green-50',
}

function classifyRow(row, idx) {
  if (idx < 5) return ROW_COLORS.header
  if (idx >= 5 && idx <= 9) return ROW_COLORS.subheader
  const d = row[3] || ''
  if (typeof d === 'string' && d === d.toUpperCase() && d.length > 5 && !row[0] && !row[1]) return ROW_COLORS.section
  if (typeof row[0] === 'string' && (row[0].toLowerCase().startsWith('jumlah') || row[0].toLowerCase().startsWith('total'))) return ROW_COLORS.total
  if (typeof row[0] === 'string' && row[0].toLowerCase() === 'bkm') return ROW_COLORS.bkm
  return idx % 2 === 0 ? ROW_COLORS.even : ROW_COLORS.odd
}

export default function SummaryTable() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [source, setSource] = useState(null) // 'sheets' | 'excel'
  const [fileName, setFileName] = useState('')
  const [lastUpdate, setLastUpdate] = useState(null)
  const fileRef = useRef()

  async function loadFromSheets() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSummaryData()
      setRows(data)
      setSource('sheets')
      setLastUpdate(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function loadFromExcel(file) {
    setLoading(true)
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellFormula: false, cellNF: false })
        const sheetName = wb.SheetNames.find(n => n.toLowerCase() === 'summary') || wb.SheetNames[0]
        const ws = wb.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false })
        // Filter completely empty rows at the end
        const trimmed = data.filter((r, i) => i < 10 || r.some(c => c !== ''))
        setRows(trimmed)
        setSource('excel')
        setFileName(file.name)
        setLastUpdate(new Date())
      } catch (err) {
        setError('Gagal membaca file Excel: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  useEffect(() => { loadFromSheets() }, [])

  const maxCols = rows.length > 0 ? Math.max(...rows.map(r => r.length)) : 0

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <RefreshCw size={36} className="animate-spin text-green-700" />
      <p className="text-gray-500 text-sm">Memuat data Summary...</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {source === 'excel' ? (
            <span className="flex items-center gap-1.5 text-sm text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
              <FileSpreadsheet size={14} />
              {fileName}
            </span>
          ) : source === 'sheets' && !error ? (
            <span className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
              <TableProperties size={14} />
              Google Sheets
            </span>
          ) : null}
          {lastUpdate && (
            <span className="text-xs text-gray-400">
              {lastUpdate.toLocaleTimeString('id-ID')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => e.target.files[0] && loadFromExcel(e.target.files[0])} />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition"
          >
            <Upload size={13} /> Upload Excel
          </button>
          <button
            onClick={loadFromSheets}
            className="flex items-center gap-1.5 text-sm text-green-700 border border-green-300 px-3 py-1.5 rounded-lg hover:bg-green-50 transition"
          >
            <RefreshCw size={13} /> Dari Sheets
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <AlertCircle size={18} className="text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              {source === 'sheets' ? 'Google Sheets belum dapat diakses' : 'Error membaca file'}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">{error}</p>
            {source !== 'excel' && (
              <p className="text-xs text-amber-600 mt-2">
                Alternatif: upload file Excel langsung menggunakan tombol "Upload Excel" di atas.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!error && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border-2 border-dashed border-gray-200 rounded-xl">
          <TableProperties size={36} className="text-gray-300" />
          <p className="text-gray-500 text-sm">Tidak ada data</p>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Upload size={14} /> Upload file Excel
          </button>
        </div>
      )}

      {/* Summary Table */}
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="border-collapse text-xs whitespace-nowrap">
            <tbody>
              {rows.map((row, rIdx) => {
                const colorClass = classifyRow(row, rIdx)
                return (
                  <tr key={rIdx} className={colorClass}>
                    {Array.from({ length: maxCols }).map((_, cIdx) => {
                      const val = row[cIdx] ?? ''
                      const numeric = isNum(val) && cIdx >= 4
                      return (
                        <td
                          key={cIdx}
                          className={`border border-gray-200 px-2 py-1.5 ${
                            numeric ? 'text-right' : ''
                          } ${cIdx === 3 ? 'min-w-[220px]' : cIdx === 0 ? 'min-w-[110px]' : 'min-w-[80px]'}`}
                        >
                          {numeric ? fmtNum(val) : val}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
