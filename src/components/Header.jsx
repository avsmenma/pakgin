import { FileSpreadsheet } from 'lucide-react'

export default function Header() {
  return (
    <header className="bg-green-800 text-white shadow-lg">
      <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center gap-3">
        <FileSpreadsheet size={28} className="text-green-300" />
        <div>
          <h1 className="text-lg font-bold leading-tight">PT PERKEBUNAN NUSANTARA IV — RPC 5</h1>
          <p className="text-green-300 text-xs">Sistem Monitoring Biaya Kebun Gunung Meliau</p>
        </div>
      </div>
    </header>
  )
}
