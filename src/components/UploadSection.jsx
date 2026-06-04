import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, CheckCircle, XCircle, FileUp, ChevronDown, Eye, Send } from 'lucide-react'
import { UPLOAD_SHEETS } from '../config'
import { clearAndWriteSheet } from '../services/sheetsService'

export default function UploadSection({ accessToken, isLoggedIn, onLogin }) {
  const [selectedSheet, setSelectedSheet] = useState(UPLOAD_SHEETS[0])
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [status, setStatus] = useState(null) // null | 'uploading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('')
  const [showPreview, setShowPreview] = useState(false)
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
      const wb = XLSX.read(evt.target.result, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      setPreview(data)
    }
    reader.readAsArrayBuffer(f)
  }

  async function handleUpload() {
    if (!preview || preview.length === 0) return
    setStatus('uploading')
    setErrorMsg('')
    try {
      await clearAndWriteSheet(accessToken, selectedSheet, preview)
      setStatus('success')
    } catch (e) {
      setStatus('error')
      setErrorMsg(e.message)
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

  return (
    <div className="space-y-5">
      {/* Sheet selector */}
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
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* File drop zone */}
      <div
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
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
            <FileUp size={32} className="mx-auto text-green-600" />
            <p className="font-semibold text-green-700">{file.name}</p>
            <p className="text-xs text-gray-500">
              {preview ? `${preview.length} baris × ${Math.max(...preview.map(r => r.length))} kolom` : 'Membaca file...'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload size={32} className="mx-auto text-gray-400" />
            <p className="text-gray-600 font-medium">Klik untuk pilih file Excel</p>
            <p className="text-xs text-gray-400">.xlsx, .xls, atau .csv</p>
          </div>
        )}
      </div>

      {/* Preview toggle */}
      {preview && (
        <button
          onClick={() => setShowPreview(v => !v)}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          <Eye size={15} />
          {showPreview ? 'Sembunyikan' : 'Lihat'} Preview Data ({preview.length} baris)
        </button>
      )}

      {showPreview && preview && (
        <div className="overflow-auto max-h-64 rounded-lg border border-gray-200 shadow-sm">
          <table className="text-xs border-collapse w-full">
            <tbody>
              {preview.slice(0, 50).map((row, i) => (
                <tr key={i} className={i === 0 ? 'bg-green-700 text-white font-semibold' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {row.map((cell, j) => (
                    <td key={j} className="border border-gray-200 px-2 py-1 whitespace-nowrap">{String(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {preview.length > 50 && (
            <p className="text-xs text-gray-400 text-center py-2">... dan {preview.length - 50} baris lagi</p>
          )}
        </div>
      )}

      {/* Auth warning */}
      {!isLoggedIn && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <span className="text-amber-500 mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Login diperlukan untuk upload</p>
            <p className="text-xs text-amber-600 mt-0.5">Anda perlu login dengan akun Google yang memiliki akses edit ke spreadsheet ini.</p>
            <button
              onClick={onLogin}
              className="mt-2 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition"
            >
              Login Sekarang
            </button>
          </div>
        </div>
      )}

      {/* Status messages */}
      {status === 'success' && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700">
          <CheckCircle size={18} />
          <span className="text-sm font-medium">Data berhasil diupload ke sheet <strong>{selectedSheet}</strong>!</span>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700">
          <XCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Upload gagal</p>
            <p className="text-xs mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {file && (
          <button
            onClick={reset}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition"
          >
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
          <Send size={15} />
          {status === 'uploading' ? 'Mengupload...' : `Upload ke "${selectedSheet}"`}
        </button>
      </div>
    </div>
  )
}
