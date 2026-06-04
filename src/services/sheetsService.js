import { SPREADSHEET_ID, API_KEY, SUMMARY_SHEET } from '../config'

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets'

export async function fetchSummaryData() {
  const range = encodeURIComponent(`${SUMMARY_SHEET}!A1:V200`)
  const url = `${BASE_URL}/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Gagal mengambil data dari Google Sheets')
  }
  const data = await res.json()
  return data.values || []
}

// Write rows to a sheet using OAuth access token
export async function writeSheetData(accessToken, sheetName, values) {
  const range = encodeURIComponent(`${sheetName}!A1`)
  const url = `${BASE_URL}/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ range: `${sheetName}!A1`, majorDimension: 'ROWS', values }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Gagal menulis data ke Google Sheets')
  }
  return res.json()
}

// Clear a sheet then write new data
export async function clearAndWriteSheet(accessToken, sheetName, values) {
  const range = encodeURIComponent(`${sheetName}`)
  const clearUrl = `${BASE_URL}/${SPREADSHEET_ID}/values/${range}:clear`
  await fetch(clearUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return writeSheetData(accessToken, sheetName, values)
}
