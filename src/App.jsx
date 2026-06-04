import { useEffect, useState } from 'react'
import { TableProperties, Upload } from 'lucide-react'
import Header from './components/Header'
import SummaryTable from './components/SummaryTable'
import UploadSection from './components/UploadSection'
import { initGoogleAuth, requestAccessToken, revokeToken } from './services/authService'
import './index.css'

// OAuth Client ID — buat di Google Cloud Console → Credentials → OAuth 2.0 Client IDs
const OAUTH_CLIENT_ID = import.meta.env.VITE_OAUTH_CLIENT_ID || ''

const TABS = [
  { id: 'summary', label: 'Summary', icon: TableProperties },
  { id: 'upload', label: 'Upload Data', icon: Upload },
]

export default function App() {
  const [tab, setTab] = useState('summary')
  const [accessToken, setAccessToken] = useState(null)
  const [gisReady, setGisReady] = useState(false)

  useEffect(() => {
    if (window.google?.accounts?.oauth2) { setGisReady(true); return }
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.onload = () => setGisReady(true)
    document.head.appendChild(s)
  }, [])

  useEffect(() => {
    if (gisReady && OAUTH_CLIENT_ID) {
      initGoogleAuth(OAUTH_CLIENT_ID, (token) => setAccessToken(token))
    }
  }, [gisReady])

  function handleLogin() {
    if (!OAUTH_CLIENT_ID) {
      alert('OAuth Client ID belum dikonfigurasi.\n\nBuat file .env dan tambahkan:\nVITE_OAUTH_CLIENT_ID=your_client_id')
      return
    }
    requestAccessToken()
  }

  function handleLogout() {
    revokeToken()
    setAccessToken(null)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header isLoggedIn={!!accessToken} onLogin={handleLogin} onLogout={handleLogout} />

      {/* Tab navigation */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="flex gap-0">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === id
                    ? 'border-green-700 text-green-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 py-5">
        {tab === 'summary' && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="mb-4">
              <h2 className="text-base font-bold text-gray-800">Data Summary RPC 5</h2>
              <p className="text-xs text-gray-500 mt-0.5">Estimasi Biaya Bulan Ini — sumber: Google Sheets</p>
            </div>
            <SummaryTable />
          </div>
        )}

        {tab === 'upload' && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="mb-5">
                <h2 className="text-base font-bold text-gray-800">Upload Data ke Google Sheets</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Upload file Excel (.xlsx) untuk memperbarui data sheet input. Data Summary akan otomatis terupdate.
                </p>
              </div>
              <UploadSection
                accessToken={accessToken}
                isLoggedIn={!!accessToken}
                onLogin={handleLogin}
              />
            </div>

            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700 space-y-1">
              <p className="font-semibold">Cara kerja upload:</p>
              <ol className="list-decimal list-inside space-y-0.5 mt-1 text-blue-600">
                <li>Pilih sheet tujuan (misal: DB KARYAWAN)</li>
                <li>Login dengan akun Google yang punya akses edit spreadsheet</li>
                <li>Upload file Excel — data akan menggantikan isi sheet tersebut</li>
                <li>Buka tab Summary untuk melihat hasil kalkulasi terbaru</li>
              </ol>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-3 text-xs text-gray-400 border-t border-gray-200 bg-white">
        PT Perkebunan Nusantara IV — RPC 5 Web Dashboard
      </footer>
    </div>
  )
}
