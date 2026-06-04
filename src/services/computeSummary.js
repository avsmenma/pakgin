/**
 * Compute Summary data from uploaded DB sheets.
 *
 * Formula logic decoded from the original spreadsheet:
 *
 * GAJI KARYAWAN PELAKSANA:
 *   HOK      = SUMIF(Rate BKM!E, fullCC, Rate BKM!C) → Activity Qty
 *   Jumlah   = SUMIF(Rate BKM!E, fullCC, Rate BKM!B) → Total Cost
 *   Rate     = Jumlah / HOK
 *
 * EAP (LOGBOOK):
 *   KM_HM    = -SUMIF(DB Logbook!AK, kodeCC, DB Logbook!K) → Total quantity
 *   Jumlah   = SUMIF(DB Logbook!AK, kodeCC, DB Logbook!AL) → Rp value
 *   Rate     = Jumlah / KM_HM
 *
 * GC SECTION (DB BKM):
 *   HOK      = SUMIF(DB BKM!U, alokasiCode, DB BKM!L) → HK/Mandays
 *   Jumlah   = SUMIF(DB BKM!U, alokasiCode, DB BKM!W) → Rp/Rate per row
 *   Bahan    = SUMIFS(Data All!I, Data All!AK=code, Data All!AL="3. Bahan")
 *
 * BIAYA TANAMAN (KARPIM):
 *   Jumlah   = SUMIF(DB karpim!AJ, "1. Gaji", DB karpim!J) × (daysElapsed/daysInMonth)
 */

/**
 * Parse Rate BKM sheet
 * Returns: Map of CC → { cc, name, totalCost, activityQty, rate }
 */
export function parseRateBKM(rows) {
  const map = new Map()
  // rows[0] = header, rows[1..] = data
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const ccFull = r[4] // col E = CC (e.g. "5E01AP0101")
    if (!ccFull) continue
    const name = r[0]   // col A = "5E01AP0101 Mandor Afdeling 1"
    const totalCost = parseNum(r[1])  // col B
    const actQty = parseNum(r[2])     // col C
    const rate = parseNum(r[3])       // col D
    map.set(ccFull.trim(), { cc: ccFull.trim(), name, totalCost, activityQty: actQty, rate })
  }
  return map
}

/**
 * Parse DB BKM sheet
 * Returns: Map of Alokasi2 → { hok, totalCost, bahan }
 * Col L (idx 11) = HK/Mandays
 * Col U (idx 20) = Alokasi2
 * Col W (idx 22) = Rp/Rate
 */
export function parseDBBKM(rows) {
  const map = new Map()
  // rows[0] = empty count row, rows[1] = header, rows[2..] = data
  const startRow = rows[1] && rows[1][0] === 'NIK / Employee ID' ? 2 : 1
  for (let i = startRow; i < rows.length; i++) {
    const r = rows[i]
    const alokasi2 = (r[20] || '').trim()
    if (!alokasi2) continue
    const hk = parseNum(r[11])      // HK/Mandays
    const rpRate = parseNum(r[22])  // Rp/Rate
    const existing = map.get(alokasi2) || { hok: 0, totalCost: 0 }
    map.set(alokasi2, {
      hok: existing.hok + hk,
      totalCost: existing.totalCost + rpRate,
    })
  }
  // Total HOK (from L1 equivalent = total rows with HK)
  let totalHOK = 0
  for (let i = startRow; i < rows.length; i++) {
    const r = rows[i]
    if (r[11]) totalHOK += parseNum(r[11])
  }
  map.set('__TOTAL__', { hok: totalHOK, totalCost: 0 })
  return map
}

/**
 * Parse DB Logbook sheet
 * Returns: Map of Kode CC (col AK, idx 36) → { kmhm, totalValue, rate }
 * Col K (idx 10) = Total quantity
 * Col AL (idx 37) = Rp/Rate value
 */
export function parseDBLogbook(rows) {
  const map = new Map()
  const startRow = rows[0] && rows[0][0] === 'Cost Center' ? 1 : 0
  for (let i = startRow; i < rows.length; i++) {
    const r = rows[i]
    const kodeCC = (r[36] || '').trim()  // col AK
    if (!kodeCC) continue
    const qty = Math.abs(parseNum(r[10]))    // col K = Total quantity
    const val = Math.abs(parseNum(r[37]))    // col AL = Rp/Rate
    const existing = map.get(kodeCC) || { kmhm: 0, totalValue: 0 }
    map.set(kodeCC, {
      kmhm: existing.kmhm + qty,
      totalValue: existing.totalValue + val,
    })
  }
  return map
}

/**
 * Parse DB karpim / DB karpim BTL sheet
 * Returns: Map of Klasifikasi → total value
 * Col J (idx 9) = Value in Obj. Crcy
 * Col AJ (idx 35) = Klasifikasi
 * Col R (idx 17) = Dr/Cr indicator
 */
export function parseDBKarpim(rows) {
  const map = new Map()
  const startRow = rows[0] && rows[0][0] === 'Cost Center' ? 1 : 0
  for (let i = startRow; i < rows.length; i++) {
    const r = rows[i]
    const klasifikasi = (r[35] || '').trim()
    if (!klasifikasi) continue
    const drCr = (r[17] || '').trim()
    if (drCr !== 'D') continue  // only debit entries
    const value = parseNum(r[9])
    const existing = map.get(klasifikasi) || 0
    map.set(klasifikasi, existing + value)
  }
  return map
}

/**
 * Parse Data All sheet
 * Returns: Map of "KodeCC|Klasifikasi" → total amount
 * Col I (idx 8) = Amount in Local Currency
 * Col AK (idx 36) = Kode CC
 * Col AL (idx 37) = Klasifikasi
 */
export function parseDataAll(rows) {
  const map = new Map()
  const startRow = rows[0] && rows[0][0] === 'G/L Account' ? 1 : 0
  for (let i = startRow; i < rows.length; i++) {
    const r = rows[i]
    const kodeCC = (r[36] || '').trim()
    const klasifikasi = (r[37] || '').trim()
    if (!kodeCC || !klasifikasi) continue
    const amount = parseNum(r[8])
    const key = `${kodeCC}|${klasifikasi}`
    const existing = map.get(key) || 0
    map.set(key, existing + amount)
  }
  return map
}

/**
 * Compute full Summary from all parsed DB sheets
 * Returns array of section objects matching the Summary structure
 */
export function computeSummary(
  plantCode,
  rateBKM,
  dbBKM,
  dbLogbook,
  dbKarpim,
  dbKarpimBTL,
  dataAll,
  daysInMonth = 31,
  daysElapsed = 8,
) {
  const sections = []

  // ─── Section I: GAJI KARYAWAN PELAKSANA ───
  const gajiRows = []
  for (const [fullCC, bkm] of rateBKM.entries()) {
    const shortCode = fullCC.replace(plantCode, '')  // e.g. "AP0101"
    const hok = bkm.activityQty
    const jumlah = bkm.totalCost
    const rate = hok > 0 ? jumlah / hok : 0
    const spk = dataAll.get(`${shortCode}|2. SPK`) || 0
    const bahan = dataAll.get(`${shortCode}|3. Bahan`) || 0
    const lainLain = dataAll.get(`${shortCode}|6.Lain-Lain`) || 0
    const total = jumlah + spk + bahan + lainLain
    gajiRows.push({
      wbs: fullCC,
      kode: shortCode,
      uraian: bkm.name.replace(fullCC, '').trim(),
      hok, rate, jumlahGaji: jumlah,
      spk, bahan,
      eapKMHM: 0, eapRate: 0, eapJumlah: 0,
      depre: 0, lainLain,
      total, bulanLalu: 0, rkap: 0,
    })
  }
  sections.push({ type: 'section', label: 'GAJI KARYAWAN PELAKSANA', rows: gajiRows })

  // ─── BKM row ───
  const bkmTotal = dbBKM.get('__TOTAL__')
  if (bkmTotal) {
    const avgRate = gajiRows.length > 0
      ? gajiRows.reduce((s, r) => s + r.jumlahGaji, 0) / gajiRows.reduce((s, r) => s + r.hok, 0)
      : 0
    sections.push({
      type: 'bkm',
      hok: bkmTotal.hok,
      rate: avgRate,
      jumlah: bkmTotal.hok * avgRate,
    })
  }

  // ─── Section A: EAP ───
  const eapTypes = [
    { code: 'MOT0', name: 'Sepeda Motor' },
    { code: 'CAR0', name: 'Pool' },
    { code: 'BUS0', name: 'Bus' },
    { code: 'DTR0', name: 'Dump Truck' },
    { code: 'TRU0', name: 'Truck' },
    { code: 'QUT0', name: 'Quick Tractor' },
    { code: 'TAN0', name: 'Tangki Trailer' },
    { code: 'TRA0', name: 'Tractor' },
    { code: 'BAC0', name: 'Backhoe Loader' },
    { code: 'BUL0', name: 'Bulldozer' },
    { code: 'COM0', name: 'Compactor BAJ' },
    { code: 'CRA0', name: 'Crane' },
    { code: 'EXC0', name: 'Excavator' },
    { code: 'FOR0', name: 'Forklift' },
    { code: 'GRA0', name: 'Road Grader' },
    { code: 'WLO0', name: 'Wheel Loader' },
    { code: 'BKL0', name: 'Bengkel' },
  ]
  const eapRows = eapTypes.map(({ code, name }) => {
    const log = dbLogbook.get(code) || { kmhm: 0, totalValue: 0 }
    const bkm_eap = dbBKM.get(code) || { hok: 0, totalCost: 0 }
    const bahan = dataAll.get(`${code}|3. Bahan`) || 0
    const kmhm = log.kmhm
    const eapJumlah = log.totalValue
    const eapRate = kmhm > 0 ? eapJumlah / kmhm : 0
    const hok = bkm_eap.hok
    const jumlahGaji = bkm_eap.totalCost
    const rate = hok > 0 ? jumlahGaji / hok : 0
    const total = jumlahGaji + bahan + eapJumlah
    return { code, name, hok, rate, jumlahGaji, bahan, kmhm, eapRate, eapJumlah, total }
  })
  sections.push({ type: 'eap', label: 'A. EKSPLOITASI ALAT PENGANGKUTAN (EAP)', rows: eapRows })

  // ─── Section B: GC (Gaji Petugas) ───
  const gcGroups = [
    { label: 'GC PEMEL', suffix: '04', title: 'Pemeliharaan' },
    { label: 'GC PUPUK', suffix: '05', title: 'Pupuk' },
    { label: 'GC PANEN', suffix: '06', title: 'Panen' },
    { label: 'GC ANGKUT', suffix: '10', title: 'Angkut' },
  ]
  for (const grp of gcGroups) {
    const gcRows = []
    const afds = [...Array(15)].map((_, i) => {
      const num = String(i + 1).padStart(2, '0')
      return [`AP${num}${grp.suffix}`, `AR${num}${grp.suffix}`]
    }).flat()

    for (const code of afds) {
      const bkm_gc = dbBKM.get(code) || { hok: 0, totalCost: 0 }
      if (bkm_gc.hok === 0 && bkm_gc.totalCost === 0) continue
      const bahan = dataAll.get(`${code}|3. Bahan`) || 0
      const spk = dataAll.get(`${code}|2. SPK`) || 0
      const lainLain = dataAll.get(`${code}|6.Lain-Lain`) || 0
      const rate = bkm_gc.hok > 0 ? bkm_gc.totalCost / bkm_gc.hok : 0
      const total = bkm_gc.totalCost + spk + bahan + lainLain
      gcRows.push({
        code, hok: bkm_gc.hok, rate,
        jumlahGaji: bkm_gc.totalCost, spk, bahan, lainLain, total,
      })
    }
    sections.push({ type: 'gc', label: `B. GAJI PETUGAS ${grp.label}`, rows: gcRows })
  }

  // ─── Section BIAYA TANAMAN (Karpim) ───
  const karpimGaji = ((dbKarpim.get('1. Gaji') || 0) + (dbKarpimBTL.get('1. Gaji') || 0))
  const karpimGajiPropo = karpimGaji * (daysElapsed / daysInMonth)
  sections.push({
    type: 'biayaTanaman',
    label: 'BIAYA TANAMAN',
    karpimGaji: karpimGajiPropo,
    daysInMonth,
    daysElapsed,
  })

  return sections
}

export function parseNum(v) {
  if (v === null || v === undefined || v === '') return 0
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? 0 : n
}
