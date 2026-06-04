import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, CheckCircle, FileUp, ChevronDown, Eye, ArrowRight, Info, X } from 'lucide-react'
import { UPLOAD_SHEETS } from '../config'

const SHEET_INFO = {
  'DB KARYAWAN':   { desc: 'Data absensi harian karyawan', required: false },
  'AREAL':         { desc: 'Data blok/petak kebun', required: false },
  'PRODUKSI JADI': { desc: 'Realisasi produksi CPO dan PK', required: false },
  'BAHAN BAKU':    { desc: 'Pergerakan material TBS', required: false },
  'RATE BKM':      { desc: 'Total cost & rate per cost center → Gaji Kary. Pelaksana', required: true },
  'DB LOGBOOK':    { desc: 'Penggunaan alat (KM/HM per kendaraan) → EAP', required: true },
  'DB KARPIM':     { desc: 'Biaya Karyawan Pimpinan Tanaman → Gaji Karpim', required: true },
  'DB KARPIM BTL': { desc: 'Biaya Karyawan Pimpinan BTL → Gaji Karpim', required: true },
  'DB DEPRE':      { desc: 'Biaya penyusutan aset → Depresiasi', required: false },
  'DB ORDER':      { desc: 'Order pemeliharaan → SPK', required: false },
  'DB BKM':        { desc: 'HOK per karyawan per aktivitas → GC Pemel/Panen/Pupuk', required: true },
  'DATA ALL':      { desc: 'Seluruh transaksi GL → Bahan, Lain-Lain', required: true },
}

// Map from config names to possible Excel sheet names
const SHEET_ALIASES = {
  'DB KARYAWAN':   ['DB KARYAWAN', 'DB Karyawan'],
  'AREAL':         ['AREAL', 'Areal', 'Areal2'],
  'PRODUKSI JADI': ['PRODUKSI JADI', 'Produksi Jadi'],
  'BAHAN BAKU':    ['BAHAN BAKU', 'Bahan Baku'],
  'RATE BKM':      ['RATE BKM', 'Rate BKM'],
  'DB LOGBOOK':    ['DB LOGBOOK', 'DB Logbook'],
  'DB KARPIM':     ['DB KARPIM', 'DB karpim'],
  'DB KARPIM BTL': ['DB KARPIM BTL', 'DB karpim BTL'],
  'DB DEPRE':      ['DB DEPRE', 'DB Depre'],
  'DB ORDER':      ['DB ORDER', 'DB Order'],
  'DB BKM':        ['DB BKM'],
  'DATA ALL':      ['DATA ALL', 'Data All'],
}

export default function UploadSection({ dbSheets, onSheetUploaded, onGoToSummary }) {
  const [selectedSheet, setSelectedSheet] = useState(UPLOAD_SHEETS[0])
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const uploadedKeys = Object.keys(dbSheets)
  const isUploaded = (sheetName) => uploadedKeys.some(
    k => k.toLowerCase().replace(/\s/g,'') === sheetName.toLowerCase().replace(/\s/g,'')
  )

  function findSheet(wb, sheetName) {
    const aliases = SHEET_ALIASES[sheetName] || [sheetName]
    for (const alias of aliases) {
      const found = wb.SheetNames.find(n => n.toLowerCase() === alias.toLowerCase())
      if (found) return found
    }
    // fallback: first sheet
    return wb.SheetNames[0]
  }

  function handleFile(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setError('')
    setPreview(null)
    setShowPreview(false)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' })
        const sheetName = findSheet(wb, selectedSheet)
        const ws = wb.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        setPreview({ rows: data, sheetUsed: sheetName })
      } catch (err) {
        setError('Gagal membaca file: ' + err.message)
      }
    }
    reader.readAsArrayBuffer(f)
  }

  function handleConfirm() {
    if (!preview) return
    onSheetUploaded(selectedSheet, preview.rows)
    setFile(null)
    setPreview(null)
    setShowPreview(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleRemove(sheetName) {
    onSheetUploaded(sheetName, null)
  }

  const requiredDone = UPLOAD_SHEETS.filter(s => SHEET_INFO[s]?.required && isUploaded(s))
  const requiredTotal = UPLOAD_SHEETS.filter(s => SHEET_INFO[s]?.required).length
  const allRequiredDone = requiredDone.length === requiredTotal

  const info = SHEET_INFO[selectedSheet]
  const maxCols = preview ? Math.max(...preview.rows.slice(0, 5).map(r => r.length), 0) : 0

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-5">
      {/* Main upload form */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        <div>
          <h2 className="text-base font-bold text-gray-800">Upload Data Sheet</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Upload file Excel untuk setiap sheet DB. Data diproses di browser, tidak dikirim ke mana pun.
          </p>
        </div>

        {/* Sheet selector */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pilih Sheet</label>
          <div className="relative">
            <select
              value={selectedSheet}
              onChange={e => { setSelectedSheet(e.target.value); setFile(null); setPreview(null); setError('') }}
              className="w-full appearance-none border border-gray-300 rounded-lg px-4 py-2.5 pr-10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {UPLOAD_SHEETS.map(s => (
                <option key={s} value={s}>
                  {isUploaded(s) ? '✓ ' : ''}{s}{SHEET_INFO[s]?.required ? ' *' : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          {info && (
            <p className="text-xs text-gray-500 mt-1.5 flex items-start gap-1">
              <Info size={12} className="mt-0.5 shrink-0 text-blue-400" />
              {info.desc}
              {info.required && <span className="ml-1 text-red-500 font-medium">(wajib untuk hitung Summary)</span>}
            </p>
          )}
        </div>

        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
            file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
          }`}
        >
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          {file ? (
            <div className="space-y-1.5">
              <FileUp size={28} className="mx-auto text-green-600" />
              <p className="font-semibold text-green-700 text-sm">{file.name}</p>
              {preview && (
                <p className="text-xs text-gray-500">
                  Sheet "{preview.sheetUsed}" — {preview.rows.length} baris × {maxCols} kolom
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Upload size={28} className="mx-auto text-gray-400" />
              <p className="text-sm font-medium text-gray-600">Klik untuk pilih file Excel</p>
              <p className="text-xs text-gray-400">.xlsx atau .xls</p>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        {/* Preview */}
        {preview && (
          <button onClick={() => setShowPreview(v => !v)} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
            <Eye size={14} />{showPreview ? 'Sembunyikan' : 'Lihat'} preview ({preview.rows.length} baris)
          </button>
        )}

        {showPreview && preview && (
          <div className="overflow-auto max-h-52 rounded-lg border border-gray-200 shadow-inner">
            <table className="text-xs border-collapse w-full">
              <tbody>
                {preview.rows.slice(0, 50).map((row, i) => (
                  <tr key={i} className={i <= 1 ? 'bg-green-700 text-white sticky top-0' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {row.map((cell, j) => (
                      <td key={j} className="border border-gray-200 px-2 py-1 whitespace-nowrap">{String(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.rows.length > 50 && <p className="text-xs text-center py-1.5 text-gray-400">+{preview.rows.length - 50} baris lagi</p>}
          </div>
        )}

        {/* Confirm button */}
        {preview && (
          <div className="flex gap-2">
            <button onClick={() => { setFile(null); setPreview(null); setShowPreview(false); if (fileRef.current) fileRef.current.value = '' }}
              className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
              Batal
            </button>
            <button onClick={handleConfirm}
              className="flex items-center gap-2 px-5 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 transition">
              <CheckCircle size={15} /> Simpan "{selectedSheet}"
            </button>
          </div>
        )}
      </div>

      {/* Right panel: status + navigate */}
      <div className="space-y-4">
        {/* Progress */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-700">Status Upload</h3>
            <span className="text-xs text-gray-400">{requiredDone.length}/{requiredTotal} wajib</span>
          </div>
          <div className="space-y-1.5">
            {UPLOAD_SHEETS.map(s => {
              const done = isUploaded(s)
              const req = SHEET_INFO[s]?.required
              return (
                <div key={s} className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs ${
                  done ? 'bg-green-50 text-green-700' : req ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-500'
                }`}>
                  <div className="flex items-center gap-1.5">
                    {done
                      ? <CheckCircle size={12} />
                      : <div className={`w-3 h-3 rounded-full border ${req ? 'border-amber-400' : 'border-gray-300'}`} />
                    }
                    <span className="font-medium">{s}</span>
                    {req && !done && <span className="text-amber-500 font-bold">*</span>}
                  </div>
                  {done && (
                    <button onClick={() => handleRemove(s)} className="text-gray-400 hover:text-red-500 ml-1">
                      <X size={11} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Go to summary */}
        {allRequiredDone && (
          <button
            onClick={onGoToSummary}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-700 text-white rounded-xl font-semibold text-sm hover:bg-green-800 transition shadow"
          >
            Lihat Summary <ArrowRight size={16} />
          </button>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700 space-y-1.5">
          <p className="font-semibold">Cara kerja:</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-600">
            <li>Upload sheet bertanda <span className="font-bold">*</span> (wajib)</li>
            <li>Klik "Lihat Summary" setelah semua selesai</li>
            <li>Summary dihitung otomatis di browser</li>
            <li>Data tidak dikirim ke server mana pun</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
