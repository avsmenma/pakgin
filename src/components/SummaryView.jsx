import { useState, useRef, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, RefreshCw, AlertCircle } from 'lucide-react'
import {
  parseRateBKM, parseDBBKM, parseDBLogbook,
  parseDBKarpim, parseDataAll, computeSummary, parseNum
} from '../services/computeSummary'
import { UPLOAD_SHEETS } from '../config'

function fmtNum(v) {
  if (v === '' || v === null || v === undefined) return ''
  const n = parseNum(String(v))
  if (n === 0 && String(v).trim() === '') return ''
  return n !== 0 ? n.toLocaleString('id-ID') : '-'
}

function isNumericCell(v, colIdx) {
  if (colIdx < 4) return false
  if (v === '' || v === null || v === undefined) return false
  const s = String(v).replace(/[, ]/g, '')
  return !isNaN(parseFloat(s)) && s !== ''
}

function rowClass(row, idx, maxCols) {
  if (idx < 5) return 'bg-green-900 text-white text-xs'
  if (idx >= 5 && idx <= 9) return 'bg-green-700 text-white text-xs font-semibold'
  const d = String(row[3] || '')
  const a = String(row[0] || '')
  if (d === d.toUpperCase() && d.length > 4 && !row[0] && !row[1] && !row[2])
    return 'bg-yellow-50 font-bold text-yellow-900 text-xs border-t border-yellow-200'
  if (a.toLowerCase().startsWith('jumlah') || a.toLowerCase() === 'total eap / logbook' || d.toLowerCase() === 'total eap / logbook')
    return 'bg-green-100 font-bold text-green-900 text-xs'
  if (a.toLowerCase() === 'bkm')
    return 'bg-blue-50 font-semibold text-blue-900 text-xs'
  if (a.toLowerCase().startsWith('biaya tanaman') || d.toLowerCase().startsWith('biaya tanaman'))
    return 'bg-green-50 font-semibold text-green-800 text-xs'
  return idx % 2 === 0 ? 'bg-white text-xs' : 'bg-gray-50 text-xs'
}

// Display Summary table from raw rows (from Excel)
function SummaryRawTable({ rows }) {
  const maxCols = Math.max(...rows.map(r => r.length))
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="border-collapse whitespace-nowrap">
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className={rowClass(row, rIdx, maxCols)}>
              {Array.from({ length: maxCols }).map((_, cIdx) => {
                const val = row[cIdx] ?? ''
                const numeric = isNumericCell(val, cIdx)
                return (
                  <td
                    key={cIdx}
                    className={`border border-gray-200 px-2 py-1.5 ${numeric ? 'text-right' : ''} ${
                      cIdx === 3 ? 'min-w-[220px]' : cIdx === 0 ? 'min-w-[110px]' : 'min-w-[80px]'
                    }`}
                  >
                    {numeric ? fmtNum(val) : String(val)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function SummaryView({ dbSheets }) {
  const [summaryRows, setSummaryRows] = useState(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [computing, setComputing] = useState(false)
  const fileRef = useRef()

  // Check which required DB sheets are uploaded
  const requiredSheets = ['Rate BKM', 'DB BKM', 'DB Logbook', 'DB karpim', 'DB karpim BTL', 'Data All']
  const uploadedRequired = requiredSheets.filter(s =>
    Object.keys(dbSheets).some(k => k.toLowerCase().replace(/\s/g,'') === s.toLowerCase().replace(/\s/g,''))
  )
  const canCompute = uploadedRequired.length === requiredSheets.length

  function loadExcel(file) {
    setError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellFormula: false })
        const sheetName = wb.SheetNames.find(n => n.toLowerCase() === 'summary') || null
        if (!sheetName) {
          setError('Sheet "Summary" tidak ditemukan di file ini. Pastikan file adalah export lengkap dari spreadsheet.')
          return
        }
        const ws = wb.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false })
        const trimmed = data.filter((r, i) => i < 10 || r.some(c => c !== ''))
        setSummaryRows(trimmed)
        setFileName(file.name)
      } catch (err) {
        setError('Gagal membaca file: ' + err.message)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function handleCompute() {
    setComputing(true)
    setError('')
    setTimeout(() => {
      try {
        const getSheet = (name) => {
          const key = Object.keys(dbSheets).find(
            k => k.toLowerCase().replace(/\s/g,'') === name.toLowerCase().replace(/\s/g,'')
          )
          return key ? dbSheets[key] : []
        }

        const rateBKM = parseRateBKM(getSheet('Rate BKM'))
        const dbBKM = parseDBBKM(getSheet('DB BKM'))
        const dbLogbook = parseDBLogbook(getSheet('DB Logbook'))
        const dbKarpim = parseDBKarpim(getSheet('DB karpim'))
        const dbKarpimBTL = parseDBKarpim(getSheet('DB karpim BTL'))
        const dataAll = parseDataAll(getSheet('Data All'))

        const sections = computeSummary('5E01', rateBKM, dbBKM, dbLogbook, dbKarpim, dbKarpimBTL, dataAll)

        // Convert sections to flat rows for display
        const rows = buildDisplayRows(sections)
        setSummaryRows(rows)
        setFileName('(dihitung dari DB sheets)')
      } catch (err) {
        setError('Gagal menghitung Summary: ' + err.message)
      } finally {
        setComputing(false)
      }
    }, 100)
  }

  // If no summary yet, show upload/compute options
  if (!summaryRows) {
    return (
      <div className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Option 1: Upload full Excel */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50 rounded-xl p-6 text-center cursor-pointer transition"
          >
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => e.target.files[0] && loadExcel(e.target.files[0])} />
            <FileSpreadsheet size={32} className="mx-auto text-green-600 mb-2" />
            <p className="font-semibold text-gray-700 text-sm">Upload File Excel Lengkap</p>
            <p className="text-xs text-gray-400 mt-1">
              Upload file export Google Sheets (.xlsx) yang berisi sheet Summary
            </p>
          </div>

          {/* Option 2: Compute from DB sheets */}
          <div className={`border-2 rounded-xl p-6 text-center transition ${
            canCompute
              ? 'border-blue-300 hover:bg-blue-50 cursor-pointer'
              : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
          }`} onClick={canCompute ? handleCompute : undefined}>
            {computing
              ? <RefreshCw size={32} className="mx-auto text-blue-500 animate-spin mb-2" />
              : <Upload size={32} className={`mx-auto mb-2 ${canCompute ? 'text-blue-500' : 'text-gray-400'}`} />
            }
            <p className="font-semibold text-gray-700 text-sm">Hitung dari DB Sheets</p>
            <p className="text-xs text-gray-400 mt-1">
              {canCompute
                ? 'Semua DB sheet sudah diupload. Klik untuk hitung Summary.'
                : `Perlu upload: ${requiredSheets.filter(s => !uploadedRequired.includes(s)).join(', ')}`
              }
            </p>
            <div className="mt-3 flex justify-center gap-1 flex-wrap">
              {requiredSheets.map(s => (
                <span key={s} className={`text-xs px-2 py-0.5 rounded-full ${
                  uploadedRequired.includes(s) ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                }`}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs text-gray-500 flex items-center gap-1.5">
          <FileSpreadsheet size={13} className="text-green-600" />
          {fileName}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => { setSummaryRows(null); setFileName('') }}
            className="text-xs text-gray-500 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50"
          >
            Ganti File
          </button>
          {canCompute && (
            <button
              onClick={handleCompute}
              className="text-xs text-blue-600 border border-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-50"
            >
              Hitung Ulang
            </button>
          )}
        </div>
      </div>
      <SummaryRawTable rows={summaryRows} />
    </div>
  )
}

// Build flat rows for display from computed sections
function buildDisplayRows(sections) {
  const COL_HEADERS = [
    ['PT PERKEBUNAN NUSANTARA IV - RPC 5','','','','','','','','','','','','','','','','Jlh. Hari Sebulan','Hari di jalani','Sisa Hari'],
    ['TAHUN 2026','','','','','','','','','','','','','','','','31','8','23'],
    ['Kebun','','','Kebun Gunung Meliau','5E01'],
    ['Kode Komodity','','','KS'],
    [],
    ['I. DETAIL'],
    ['WBS','GL/kode Cost Center','Kode Komodity','Uraian','Estimasi Bulan Ini','','','','','','','','','','','Bulan Lalu','RKAP','Capaian Terhadap RKAP'],
    ['','','','','1. Gaji','','','2. SPK','3. Bahan','4. EAP','','','5. Depresiasi','6. Lain-Lain','TOTAL'],
    ['','','','','HOK','Rp/Rate','Jumlah','','','KM/HM','Rp/Rate','Jumlah','','',''],
    [],
  ]
  const rows = [...COL_HEADERS]

  for (const sec of sections) {
    if (sec.type === 'section') {
      rows.push(['','','',sec.label])
      for (const r of sec.rows) {
        rows.push([
          r.wbs, r.kode, '', r.uraian,
          r.hok || '', r.rate ? Math.round(r.rate) : '', r.jumlahGaji || '',
          r.spk || '', r.bahan || '',
          '', '', '', '', r.lainLain || '',
          r.total || '', '', '',
        ])
      }
      const totHok = sec.rows.reduce((s, r) => s + (r.hok || 0), 0)
      const totJumlah = sec.rows.reduce((s, r) => s + (r.jumlahGaji || 0), 0)
      const totTotal = sec.rows.reduce((s, r) => s + (r.total || 0), 0)
      rows.push(['Jumlah','','','', totHok,'',totJumlah,'','','','','','','',totTotal])
    } else if (sec.type === 'bkm') {
      rows.push(['BKM','','','', sec.hok, Math.round(sec.rate), Math.round(sec.jumlah)])
    } else if (sec.type === 'eap') {
      rows.push(['','','',sec.label])
      for (const r of sec.rows) {
        if (!r.hok && !r.kmhm && !r.jumlahGaji && !r.bahan && !r.eapJumlah) continue
        rows.push([
          '', r.code, 'EAP/Netral', r.name,
          r.hok || '', r.rate ? Math.round(r.rate) : '', r.jumlahGaji || '',
          '', r.bahan || '',
          r.kmhm || '', r.eapRate ? Math.round(r.eapRate) : '', r.eapJumlah || '',
          '', '', r.total || '',
        ])
      }
      const totTotal = sec.rows.reduce((s, r) => s + (r.total || 0), 0)
      rows.push(['','','','TOTAL EAP / LOGBOOK','','','','','','','','','','',totTotal])
    } else if (sec.type === 'gc') {
      rows.push(['','','',sec.label])
      for (const r of sec.rows) {
        rows.push([
          '', r.code, 'Biaya Langsung Afd', r.code,
          r.hok || '', r.rate ? Math.round(r.rate) : '', r.jumlahGaji || '',
          r.spk || '', r.bahan || '', '', '', '', '', r.lainLain || '', r.total || '',
        ])
      }
      const totTotal = sec.rows.reduce((s, r) => s + (r.total || 0), 0)
      rows.push(['','','',sec.label.replace('B. GAJI PETUGAS ',''), totTotal])
    } else if (sec.type === 'biayaTanaman') {
      rows.push(['','','',sec.label])
      rows.push(['99-01','','KS/KR','Gaji/Upah dan Biaya Kary. Staf dari WBS','','',Math.round(sec.karpimGaji)])
    }
  }
  return rows
}
