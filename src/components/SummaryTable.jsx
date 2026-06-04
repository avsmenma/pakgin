import { useEffect, useState } from 'react'
import { RefreshCw, AlertCircle, TableProperties } from 'lucide-react'
import { fetchSummaryData } from '../services/sheetsService'

function formatNumber(val) {
  if (val === undefined || val === null || val === '') return '-'
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''))
  if (isNaN(num)) return val
  return num.toLocaleString('id-ID')
}

function isNumericCell(val) {
  if (val === undefined || val === null || val === '') return false
  return !isNaN(parseFloat(String(val).replace(/[^0-9.-]/g, '')))
}

export default function SummaryTable() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSummaryData()
      setRows(data)
      setLastUpdate(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <RefreshCw size={40} className="animate-spin text-green-700" />
      <p className="text-gray-500">Mengambil data Summary dari Google Sheets...</p>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <AlertCircle size={40} className="text-red-500" />
      <p className="text-red-600 font-medium">Gagal memuat data</p>
      <p className="text-gray-500 text-sm max-w-md text-center">{error}</p>
      <p className="text-gray-400 text-xs text-center max-w-md">
        Pastikan spreadsheet sudah di-share publik: Bagikan → Siapa saja yang memiliki link → Viewer
      </p>
      <button onClick={load} className="mt-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm hover:bg-green-800 transition">
        Coba Lagi
      </button>
    </div>
  )

  if (rows.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <TableProperties size={40} className="text-gray-400" />
      <p className="text-gray-500">Tidak ada data di sheet Summary</p>
    </div>
  )

  // Find header rows (rows 1-9 are company info + column headers)
  const maxCols = Math.max(...rows.map(r => r.length))

  return (
    <div className="space-y-3">
      {/* Info bar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {lastUpdate && <>Terakhir diperbarui: {lastUpdate.toLocaleTimeString('id-ID')}</>}
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-sm text-green-700 hover:text-green-900 font-medium"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full border-collapse text-xs">
          <tbody>
            {rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className={
                  rIdx < 5
                    ? 'bg-green-900 text-white font-semibold'
                    : rIdx === 5 || rIdx === 6 || rIdx === 7 || rIdx === 8 || rIdx === 9
                    ? 'bg-green-700 text-white font-semibold text-center'
                    : row[3] && !row[0] && !row[1] && !row[2]
                    ? 'bg-yellow-50 font-semibold text-yellow-900'
                    : rIdx % 2 === 0
                    ? 'bg-white hover:bg-green-50'
                    : 'bg-gray-50 hover:bg-green-50'
                }
              >
                {Array.from({ length: maxCols }).map((_, cIdx) => {
                  const val = row[cIdx] ?? ''
                  const isNum = isNumericCell(val) && cIdx >= 4
                  return (
                    <td
                      key={cIdx}
                      className={`border border-gray-200 px-2 py-1.5 whitespace-nowrap ${
                        isNum ? 'text-right' : ''
                      } ${cIdx === 3 ? 'min-w-[200px]' : 'min-w-[80px]'}`}
                    >
                      {isNum ? formatNumber(val) : val}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
