import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import {
  Upload, CheckCircle, XCircle, FileUp, ChevronDown,
  Eye, Send, Info, RefreshCw
} from 'lucide-react'
import { UPLOAD_SHEETS } from '../config'
import { clearAndWriteSheet } from '../services/sheetsService'

const SHEET_INFO = {
  'DB KARYAWAN':   { desc: 'Data absensi harian karyawan (NIK, Cost Center, tanggal hadir)', required: true },
  'AREAL':         { desc: 'Data blok/petak kebun (luas, tahun tanam, pokok)', required: false },
  'PRODUKSI JADI': { desc: 'Realisasi produksi CPO dan PK harian', required: false },
  'BAHAN BAKU':    { desc: 'Pergerakan material TBS dan bahan lainnya', required: false },
  'RATE BKM':      { desc: 'Total cost, activity qty, dan rate per cost center ← utama untuk Gaji', required: true },
  'DB LOGBOOK':    { desc: 'Penggunaan alat berat (KM/HM per jenis alat) ← utama untuk EAP', required: true },
  'DB KARPIM':     { desc: 'Biaya gaji & tunjangan Karyawan Pimpinan (Tanaman)', required: true },
  'DB KARPIM BTL': { desc: 'Biaya gaji & tunjangan Karyawan Pimpinan (BTL)', required: true },
  'DB DEPRE':      { desc: 'Biaya penyusutan aset kebun', required: true },
  'DB ORDER':      { desc: 'Order pemeliharaan (SPK)', required: false },
  'DB BKM':        { desc: 'Detail HOK per karyawan per aktivitas ← utama untuk GC', required: true },
  'DATA ALL':      { desc: 'Seluruh transaksi GL (Bahan, Lain-Lain, dll) ← utama untuk bahan/lain', required: true },
}

export default function UploadSection({ accessToken, isLoggedIn, onLogin }) {
  const [selectedSheet, setSelectedSheet] = useState(UPLOAD_SHEETS[0])
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [status, setStatus] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [uploadHistory, setUploadHistory] = useState({}) // sheetName → 'success'|'error'
  const fileRef = useRef()

  function handleFile(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setStatus(null)
    setPreview(null)
    setShowPreview(false)
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' })
        // Try to find matching sheet name
        const match = wb.SheetNames.find(
          n => n.toLowerCase().replace(/\s/g, '') === selectedSheet.toLowerCase().replace(/\s/g, '')
        ) || wb.SheetNames[0]
        const ws = wb.Sheets[match]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        setPreview(data)
      } catch (err) {
        setErrorMsg('Gagal membaca file: ' + err.message)
        setStatus('error')
      }
    }
    reader.readAsArrayBuffer(f)
  }

  async function handleUpload() {
    if (!preview || !accessToken) return
    setStatus('uploading')
    setErrorMsg('')
    try {
      await clearAndWriteSheet(accessToken, selectedSheet, preview)
      setStatus('success')
      setUploadHistory(h => ({ ...h, [selectedSheet]: 'success' }))
    } catch (e) {
      setStatus('error')
      setErrorMsg(e.message)
      setUploadHistory(h => ({ ...h, [selectedSheet]: 'error' }))
    }
  }

  function reset() {
    setFile(null)
    setPreview(null)
    setStatus(null)
    setErrorMsg('')
    setShowPreview(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const info = SHEET_INFO[selectedSheet]
  const maxPreviewCols = preview ? Math.max(...preview.slice(0, 5).map(r => r.length)) : 0

  return (
    <div className="space-y-5">
      {/* Sheet selector with status badges */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Pilih Sheet Tujuan
        </label>
        <div className="relative">
          <select
            value={selectedSheet}
            onChange={e => { setSelectedSheet(e.target.value); reset() }}
            className="w-full appearance-none border border-gray-300 rounded-lg px-4 py-2.5 pr-10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {UPLOAD_SHEETS.map(s => (
              <option key={s} value={s}>
                {uploadHistory[s] === 'success' ? '✓ ' : uploadHistory[s] === 'error' ? '✗ ' : ''}
                {s}{SHEET_INFO[s]?.required ? ' *' : ''}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        {info && (
          <p className="text-xs text-gray-500 mt-1.5 flex items-start gap-1">
            <Info size={12} className="mt-0.5 shrink-0 text-blue-400" />
            {info.desc}
            {info.required && <span className="text-red-500 ml-1">(wajib)</span>}
          </p>
        )}
      </div>

      {/* Progress checklist */}
      <div className="grid grid-cols-2 gap-1.5">
        {UPLOAD_SHEETS.filter(s => SHEET_INFO[s]?.required).map(s => (
          <div key={s} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${
            uploadHistory[s] === 'success' ? 'bg-green-50 text-green-700' :
            uploadHistory[s] === 'error' ? 'bg-red-50 text-red-700' :
            'bg-gray-50 text-gray-500'
          }`}>
            {uploadHistory[s] === 'success' ? <CheckCircle size={12} /> :
             uploadHistory[s] === 'error' ? <XCircle size={12} /> :
             <div className="w-3 h-3 rounded-full border border-gray-300" />}
            {s}
          </div>
        ))}
      </div>

      {/* File drop zone */}
      <div
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
          file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFile}
        />
        {file ? (
          <div className="space-y-1">
            <FileUp size={28} className="mx-auto text-green-600" />
            <p className="font-semibold text-green-700 text-sm">{file.name}</p>
            {preview && (
              <p className="text-xs text-gray-500">
                {preview.length} baris × {maxPreviewCols} kolom terbaca
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <Upload size={28} className="mx-auto text-gray-400" />
            <p className="text-gray-600 text-sm font-medium">Klik untuk pilih file Excel</p>
            <p className="text-xs text-gray-400">.xlsx atau .xls</p>
          </div>
        )}
      </div>

      {/* Preview toggle */}
      {preview && preview.length > 0 && (
        <button
          onClick={() => setShowPreview(v => !v)}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          <Eye size={14} />
          {showPreview ? 'Sembunyikan' : 'Lihat'} preview ({preview.length} baris)
        </button>
      )}

      {showPreview && preview && (
        <div className="overflow-auto max-h-56 rounded-lg border border-gray-200 shadow-inner">
          <table className="text-xs border-collapse w-full">
            <tbody>
              {preview.slice(0, 50).map((row, i) => (
                <tr key={i} className={i === 0 ? 'bg-green-700 text-white sticky top-0' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {row.map((cell, j) => (
                    <td key={j} className="border border-gray-200 px-2 py-1 whitespace-nowrap">{String(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {preview.length > 50 && (
            <p className="text-xs text-gray-400 text-center py-1.5">+{preview.length - 50} baris lagi</p>
          )}
        </div>
      )}

      {/* Auth warning */}
      {!isLoggedIn && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5">
          <span className="text-amber-500 text-base">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Login Google diperlukan</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Untuk menyimpan data ke Google Sheets, login dengan akun yang memiliki akses edit.
            </p>
            <button
              onClick={onLogin}
              className="mt-2 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition"
            >
              Login Sekarang
            </button>
          </div>
        </div>
      )}

      {/* Status */}
      {status === 'success' && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700">
          <CheckCircle size={16} />
          <span className="text-sm font-medium">
            Berhasil diupload ke sheet <strong>{selectedSheet}</strong>!
          </span>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700">
          <XCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Upload gagal</p>
            <p className="text-xs mt-0.5 opacity-80">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {file && (
          <button onClick={reset} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition">
            Reset
          </button>
        )}
        <button
          disabled={!file || !preview || !isLoggedIn || status === 'uploading'}
          onClick={handleUpload}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition ${
            !file || !preview || !isLoggedIn || status === 'uploading'
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-green-700 hover:bg-green-800'
          }`}
        >
          {status === 'uploading'
            ? <><RefreshCw size={14} className="animate-spin" /> Mengupload...</>
            : <><Send size={14} /> Upload ke "{selectedSheet}"</>
          }
        </button>
      </div>
    </div>
  )
}
