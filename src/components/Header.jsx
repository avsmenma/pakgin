import { LogIn, LogOut, FileSpreadsheet } from 'lucide-react'

export default function Header({ isLoggedIn, onLogin, onLogout }) {
  return (
    <header className="bg-green-800 text-white shadow-lg">
      <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileSpreadsheet size={28} className="text-green-300" />
          <div>
            <h1 className="text-lg font-bold leading-tight">PT PERKEBUNAN NUSANTARA IV - RPC 5</h1>
            <p className="text-green-300 text-xs">Sistem Monitoring & Upload Data Kebun</p>
          </div>
        </div>
        <div>
          {isLoggedIn ? (
            <button
              onClick={onLogout}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              <LogOut size={16} /> Logout
            </button>
          ) : (
            <button
              onClick={onLogin}
              className="flex items-center gap-2 bg-white text-green-800 hover:bg-green-100 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              <LogIn size={16} /> Login Google (untuk Upload)
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
