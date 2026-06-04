import { useState } from 'react'
import { TableProperties, Upload } from 'lucide-react'
import Header from './components/Header'
import SummaryView from './components/SummaryView'
import UploadSection from './components/UploadSection'
import './index.css'

const TABS = [
  { id: 'summary', label: 'Summary', icon: TableProperties },
  { id: 'upload', label: 'Upload Data', icon: Upload },
]

export default function App() {
  const [tab, setTab] = useState('summary')
  const [dbSheets, setDbSheets] = useState({}) // sheetName → parsed rows

  function handleSheetUploaded(sheetName, rows) {
    setDbSheets(prev => ({ ...prev, [sheetName]: rows }))
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />

      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="flex">
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

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 py-5">
        {tab === 'summary' && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="mb-4">
              <h2 className="text-base font-bold text-gray-800">Data Summary RPC 5</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Upload file Excel di tab "Upload Data", lalu kembali ke sini untuk melihat Summary.
              </p>
            </div>
            <SummaryView dbSheets={dbSheets} />
          </div>
        )}

        {tab === 'upload' && (
          <UploadSection
            dbSheets={dbSheets}
            onSheetUploaded={handleSheetUploaded}
            onGoToSummary={() => setTab('summary')}
          />
        )}
      </main>

      <footer className="text-center py-3 text-xs text-gray-400 border-t border-gray-200 bg-white">
        PT Perkebunan Nusantara IV — RPC 5 Web Dashboard
      </footer>
    </div>
  )
}
