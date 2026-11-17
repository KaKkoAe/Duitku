/**
 * Parser bahasa alami (Indonesia) untuk Duitku.
 *
 * Dua fungsi utama:
 *  - parseText(text, ctx)     : "makan siang 35rb pakai tunai" -> transaksi
 *  - parseReceipt(text, ctx)  : teks hasil OCR struk belanja -> merchant/total/item
 *
 * Semua murni JS (tanpa Intl, tanpa dependensi) supaya aman di Hermes & web.
 */

// ---------------------------------------------------------------- utilitas

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function normalizeText(raw) {
  let t = String(raw || '');
  t = t
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00A0/g, ' ');
  // hasil dikte: "koma"/"titik" diucapkan
  t = t.replace(/\s+rupiah\b/gi, ' ');
  t = t.replace(/\s+koma\s+/gi, ',');
  t = t.replace(/\s+titik\s+(?=\d)/gi, '.');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

const lower = (s) => normalizeText(s).toLowerCase();

// --------------------------------------------------------- angka & nominal

const UNIT_MULT = {
  ribu: 1e3, ribuan: 1e3, rb: 1e3, rebu: 1e3, k: 1e3, eng: 1e3,
  juta: 1e6, jutaan: 1e6, jt: 1e6,
  miliar: 1e9, milyar: 1e9, m: 1e9,
};

// bahasa gaul nominal
const SLANG = {
  cepek: 100, gopek: 500, seceng: 1000, goceng: 5000,
  ceban: 10000, goban: 50000, noceng: 2000, gocap: 50000,
};

const W_UNIT = {
  nol: 0, kosong: 0, satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6,
  tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10, sebelas: 11,
  seratus: 100, seribu: 1000,
};

/** Ubah angka terformat ("1.500.000", "12,5", "35000") + satuan jadi nominal. */
export function parseNumericToken(numStr, unitStr) {
  let s = String(numStr || '').replace(/\s/g, '');
  if (!s) return null;
  let value = null;

  if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    value = Number(s.replace(/\./g, ''));
  } else if (/^\d{1,3}(,\d{3})+$/.test(s)) {
    value = Number(s.replace(/,/g, ''));
  } else if (/^\d+[.,]\d{1,2}$/.test(s)) {
    const dec = s.includes(',') ? ',' : '.';
    const [a, b] = s.split(dec);
    value = Number(a) + Number('0.' + b);
  } else {
    const clean = s.replace(/[.,]/g, '');
    if (!/^\d+$/.test(clean)) return null;
    value = Number(clean);
  }
  if (!Number.isFinite(value)) return null;

  const unit = String(unitStr || '').toLowerCase().replace(/[^a-z]/g, '');
  if (unit && UNIT_MULT[unit] && !(unit === 'm' && value < 10)) {
    value *= UNIT_MULT[unit];
  }
  return Math.round(value);
}

const NUM_UNIT_RE =
  /(\d[\d.,]*)\s*(ribu|ribuan|rebu|rb|juta|jutaan|jt|miliar|milyar)\b|(\d[\d.,]*)\s*(k)\b|(\d[\d.,]*)(?![.,]\d)/gi;

/** Semua kandidat nominal di dalam teks, beserta posisinya. */
export function findAmounts(text) {
  const out = [];
  const t = String(text || '');
  const re = new RegExp(NUM_UNIT_RE.source, 'gi');
  let m;
  while ((m = re.exec(t))) {
    const raw = m[0];
    const numStr = m[1] || m[3] || m[5] || '';
    // cegah kata seperti "12ribu" tertangkap dua kali
    if (!numStr) continue;
    const unit = (m[2] || m[4] || '').toLowerCase();
    const value = parseNumericToken(numStr, unit);
    if (value == null) continue;
    out.push({ value, raw, index: m.index, unit });
    re.lastIndex = m.index + raw.length;
  }

  // bahasa gaul
  Object.keys(SLANG).forEach((word) => {
    const re2 = new RegExp('\\b' + word + '\\b', 'gi');
    let mm;
    while ((mm = re2.exec(t))) {
      out.push({ value: SLANG[word], raw: mm[0], index: mm.index, unit: 'slang' });
    }
  });

  return out.sort((a, b) => a.index - b.index);
}

/** Nominal dari angka yang ditulis dengan kata: "tiga puluh lima ribu". */
export function wordsToNumber(text) {
  const tokens = String(text || '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
  let total = 0;
  let current = 0;
  let touched = false;
  tokens.forEach((tok) => {
    if (tok in W_UNIT) {
      current += W_UNIT[tok];
      touched = true;
    } else if (tok === 'belas') {
      current += 10;
      touched = true;
    } else if (tok === 'puluh') {
      current = (current || 1) * 10;
      touched = true;
    } else if (tok === 'ratus') {
      current = (current || 1) * 100;
      touched = true;
    } else if (tok === 'ribu' || tok === 'rebu') {
      total += (current || 1) * 1000;
      current = 0;
      touched = true;
    } else if (tok === 'juta') {
      total += (current || 1) * 1e6;
      current = 0;
      touched = true;
    } else if (tok === 'miliar' || tok === 'milyar') {
      total += (current || 1) * 1e9;
      current = 0;
      touched = true;
    }
  });
  if (!touched) return null;
  const value = total + current;
  return value > 0 ? value : null;
}

// ------------------------------------------------------------ kata kunci

const EXPENSE_WORDS = {
  c_makan: ['makan', 'makam', 'nasi', 'kopi', 'cafe', 'kafe', 'coffee', 'resto', 'restoran', 'warung', 'warteg', 'bakso', 'mie', 'ayam', 'geprek', 'sate', 'soto', 'sarapan', 'jajan', 'snack', 'gorengan', 'martabak', 'pizza', 'burger', 'minum', 'teh', 'boba', 'kue', 'roti', 'padang', 'nasi padang', 'gofood', 'grabfood', 'shopeefood', 'kantin', 'catering', 'kebab', 'dimsum', 'seblak', 'batagor', 'siomay', 'es krim', 'eskrim', 'minuman', 'makan siang', 'makan malam', 'lunch', 'dinner', 'jumbo'],
  c_transport: ['ojek', 'ojol', 'gojek', 'grab', 'bensin', 'pertalite', 'pertamax', 'solar', 'parkir', 'tol', 'krl', 'mrt', 'lrt', 'transjakarta', 'angkot', 'bus', 'travel', 'taksi', 'taxi', 'servis motor', 'ganti oli', 'tambal ban', 'cuci mobil', 'cuci motor', 'tiket kereta', 'pesawat', 'bengkel', 'grabcar', 'goride'],
  c_belanja: ['belanja', 'beli', 'supermarket', 'indomaret', 'alfamart', 'indomaret', 'shopee', 'tokopedia', 'lazada', 'tiktok shop', 'baju', 'sepatu', 'celana', 'kaos', 'jaket', 'tas', 'elektronik', 'sayur', 'pasar', 'mall', 'miniso', 'grocery', 'groceries', 'sembako', 'deterjen', 'sabun', 'shampo', 'peralatan', 'furnitur', 'kosmetik', 'hypermart', 'lottemart', 'carefour', 'carrefour', 'ace hardware', 'uniqlo'],
  c_tagihan: ['listrik', 'token listrik', 'token pln', 'pln', 'air', 'pdam', 'internet', 'wifi', 'indihome', 'pulsa', 'kuota', 'paket data', 'telkomsel', 'xl', 'indosat', 'tri', 'smartfren', 'kos', 'sewa', 'kontrakan', 'cicilan', 'kredit', 'bpjs', 'asuransi', 'iuran', 'langganan', 'netflix', 'spotify', 'youtube premium', 'google one', 'icloud', 'hosting', 'domain', 'pajak', 'stnk', 'denda', 'tagihan'],
  c_kesehatan: ['obat', 'apotek', 'apotik', 'dokter', 'rumah sakit', 'klinik', 'puskesmas', 'vitamin', 'masker', 'gym', 'olahraga', 'periksa', 'dentist', 'gigi', 'fisioterapi', 'lab', 'vaksin', 'skincare', 'sunscreen'],
  c_hiburan: ['nonton', 'bioskop', 'cinema', 'xxi', 'cgv', 'game', 'steam', 'top up game', 'konser', 'liburan', 'hotel', 'wisata', 'hobi', 'karaoke', 'netflix', 'spotify', 'tiket bioskop', 'rekreasi', 'koleksi', 'komik'],
  c_pendidikan: ['buku', 'kursus', 'sekolah', 'kuliah', 'spp', 'uang kuliah', 'udemy', 'course', 'seminar', 'workshop', 'alat tulis', 'print', 'fotokopi', 'les', 'bimbel', 'sertifikasi', 'pelatihan'],
  c_lain: ['donasi', 'sumbangan', 'zakat', 'infaq', 'hadiah', 'kado', 'denda', 'tilang', 'pindah', 'lainnya', 'lain'],
};

const INCOME_WORDS = {
  i_gaji: ['gaji', 'upah', 'gajian', 'thr', 'tunjangan', 'honor', 'honorer', 'payroll'],
  i_bonus: ['bonus', 'insentif', 'komisi', 'cashback', 'hadiah', 'doorprize', 'undian', 'refund', 'reimburse'],
  i_usaha: ['usaha', 'dagang', 'jualan', 'jual', 'omzet', 'omset', 'untung', 'laba', 'penjualan', 'freelance', 'proyek', 'klien', 'orderan'],
  i_invest: ['investasi', 'dividen', 'bunga', 'saham', 'reksadana', 'crypto', 'crypto', 'deposito', 'profit', 'staking', 'bibit', 'ajaib'],
  i_lain: ['dapat', 'diterima', 'terima', 'masuk', 'pemasukan', 'pemasukkan', 'dikasih', 'diberi', 'temuan', 'judi', 'lainnya'],
};

const TRANSFER_WORDS = ['transfer', 'pindah', 'pindahin', 'geser', 'tarik tunai', 'tarik', 'top up', 'topup', 'isi saldo', 'setor', 'kirim uang', 'kirim ke', 'mutasi'];

const INCOME_HINT = ['gaji', 'gajian', 'bonus', 'thr', 'honor', 'dapat', 'diterima', 'terima', 'masuk', 'pemasukan', 'pemasukkan', 'jualan', 'jual', 'omzet', 'omset', 'cashback', 'refund', 'dividen', 'bunga', 'untung', 'laba', 'dikasih', 'diberi', 'komisi', 'insentif', 'freelance', 'dibayar', 'pendapatan'];

const WALLET_TYPE_WORDS = {
  cash: ['tunai', 'cash', 'uang cash', 'dompet', 'uang fisik'],
  bank: ['bank', 'rekening', 'atm', 'transfer bank'],
  ewallet: ['ewallet', 'e-wallet', 'dompet digital', 'saldo', 'gopay', 'ovo', 'dana', 'shopeepay', 'linkaja'],
  card: ['kartu', 'kartu kredit', 'kartu debit', 'cc', 'debit'],
};

const DATE_WORDS = [
  { re: /\b(kemarin lusa)\b/i, days: -2 },
  { re: /\bkemarin\b/i, days: -1 },
  { re: /\b(hari ini|tadi|barusan|baru saja|sekarang)\b/i, days: 0 },
  { re: /\b(besok)\b/i, days: 1 },
  { re: /\b(lusa)\b/i, days: 2 },
  { re: /\b(minggu lalu|pekan lalu|seminggu lalu)\b/i, days: -7 },
  { re: /\b(\d{1,2})\s+hari\s+lalu\b/i, daysFn: (m) => -Number(m[1]) },
];

// ------------------------------------------------------------- struktur

const FILLER = [
  'catat', 'catet', 'tambah', 'input', 'masukkan', 'buat', 'bikin', 'tolong', 'dong', 'ya',
  'nih', 'sih', 'deh', 'aja', 'saja', 'sebesar', 'senilai', 'sebanyak', 'seharga', 'harga',
  'total', 'jumlah', 'bayar', 'membayar', 'beli', 'belanja', 'untuk', 'buat', 'pake', 'pakai',
  'dengan', 'via', 'lewat', 'dari', 'ke', 'di', 'pada', 'tanggal', 'tgl', 'uang', 'duit',
  'adalah', 'itu', 'yang', 'aku', 'saya', 'gue', 'gw', 'ku', 'rpx', 'rp',
  'kemarin', 'kemarin lusa', 'tadi', 'hari ini', 'besok', 'lusa', 'minggu lalu',
];

function stripWords(text, words, keep = false) {
  let out = ' ' + text + ' ';
  words.forEach((w) => {
    out = out.replace(new RegExp('\\b' + escapeRe(w) + '\\b', 'gi'), keep ? w : ' ');
  });
  return out.replace(/\s+/g, ' ').trim();
}

// "dua puluh lima ribu", "seratus dua puluh ribu" — dibuang dari judul
// kalau nominalnya terbaca dari kata (bukan angka).
const WORD_NUM_TOKEN =
  'satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|seratus|seribu|setengah|belas|puluh|ratus|ribu|rebu|juta|jutaan|miliar|milyar';
const WORD_NUM_RUN = new RegExp(`\\b(?:(?:${WORD_NUM_TOKEN})(?:\\s+|\\b)){2,}`, 'gi');

export function stripWordNumbers(text) {
  return String(text || '').replace(WORD_NUM_RUN, ' ');
}

function scoreKeywords(text, terms) {
  const t = ' ' + text + ' ';
  let score = 0;
  const hits = [];
  terms.forEach((term) => {
    const re = new RegExp('(^|[^a-z])' + escapeRe(term) + '([^a-z]|$)', 'i');
    if (re.test(t)) {
      score += Math.max(1, term.split(' ').length * 1.6) + term.length * 0.04;
      hits.push(term);
    }
  });
  return { score, hits };
}

/** Tebak kategori dari teks bebas. */
export function guessCategory(text, categories = [], type = 'expense') {
  const t = lower(text);
  const dict = type === 'income' ? INCOME_WORDS : EXPENSE_WORDS;
  let best = null;
  const scored = [];

  (categories || [])
    .filter((c) => !type || c.type === type)
    .forEach((cat) => {
      const own = dict[cat.id] || [];
      const nameWords = String(cat.name || '')
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((w) => w.length > 2);
      let res = scoreKeywords(t, own);
      if (nameWords.length) {
        const r2 = scoreKeywords(t, nameWords);
        res = { score: res.score + r2.score * 0.7, hits: res.hits.concat(r2.hits) };
      }
      if (res.score > 0) scored.push({ cat, ...res });
    });

  scored.sort((a, b) => b.score - a.score);
  best = scored[0] || null;

  const fallbackId = type === 'income' ? 'i_lain' : 'c_lain';
  const fallback =
    categories.find((c) => c.id === fallbackId) ||
    categories.find((c) => c.type === type && /lain/i.test(c.name)) ||
    categories.find((c) => c.type === type) ||
    null;

  return {
    id: best ? best.cat.id : fallback ? fallback.id : null,
    name: best ? best.cat.name : fallback ? fallback.name : '',
    hits: best ? best.hits : [],
    confident: !!best,
  };
}

/** Cari dompet yang disebut di teks. */
export function findWallets(text, wallets = []) {
  const t = ' ' + lower(text) + ' ';
  const found = [];

  (wallets || []).forEach((w) => {
    const aliases = new Set();
    const name = lower(w.name);
    aliases.add(name);
    aliases.add(name.replace(/^(bank|dompet|e-?wallet)\s+/i, ''));
    name.split(/[^a-z0-9]+/).forEach((tok) => {
      if (tok.length >= 3) aliases.add(tok);
    });
    (WALLET_TYPE_WORDS[w.type] || []).forEach((a) => aliases.add(a));

    let bestIdx = -1;
    let bestAlias = '';
    aliases.forEach((alias) => {
      if (!alias || alias.length < 3) return;
      const re = new RegExp('(^|[^a-z0-9])' + escapeRe(alias) + '([^a-z0-9]|$)', 'i');
      const m = t.match(re);
      if (m) {
        const idx = t.indexOf(m[0].trim());
        if (bestIdx === -1 || idx < bestIdx) {
          bestIdx = idx;
          bestAlias = alias;
        }
      }
    });

    // jangan dua dompet bertipe sama menang bersamaan
    if (bestIdx >= 0) found.push({ wallet: w, index: bestIdx, alias: bestAlias });
  });

  found.sort((a, b) => a.index - b.index);
  // buang duplikat tipe kalau aliasnya kata tipe (mis. "tunai")
  const seen = new Set();
  return found.filter((f) => {
    if (seen.has(f.wallet.id)) return false;
    seen.add(f.wallet.id);
    return true;
  });
}

function detectDate(text, today = new Date()) {
  const t = lower(text);
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  for (const rule of DATE_WORDS) {
    const m = t.match(rule.re);
    if (m) {
      const days = rule.daysFn ? rule.daysFn(m) : rule.days;
      const d = new Date(base);
      d.setDate(d.getDate() + days);
      return { date: toISO(d), label: m[0] };
    }
  }

  // "tanggal 12" / "tgl 12"
  const dm = t.match(/\b(?:tanggal|tgl)\s+(\d{1,2})\b/);
  if (dm) {
    const day = Number(dm[1]);
    if (day >= 1 && day <= 31) {
      const d = new Date(base.getFullYear(), base.getMonth(), day);
      return { date: toISO(d), label: dm[0] };
    }
  }

  // 12/03 atau 12-03-2025
  const num = t.match(/\b(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?\b/);
  if (num) {
    const day = Number(num[1]);
    const mon = Number(num[2]);
    let year = num[3] ? Number(num[3]) : base.getFullYear();
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && mon >= 1 && mon <= 12) {
      return { date: toISO(new Date(year, mon - 1, day)), label: num[0] };
    }
  }

  return null;
}

const toISO = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
};

const todayISO = () => toISO(new Date());

// ---------------------------------------------------------- parse kalimat

/**
 * Ubah kalimat bebas menjadi objek transaksi.
 * @returns {{ok:boolean,type:string,amount:number,categoryId:string,walletId:string,
 *            toWalletId:string,date:string,note:string,confidence:number,debug:object}}
 */
export function parseText(raw, ctx = {}, today = new Date()) {
  const original = String(raw || '');
  const text = normalizeText(original).toLowerCase();
  const categories = ctx.categories || [];
  const wallets = ctx.wallets || [];

  const result = {
    ok: false,
    type: 'expense',
    amount: 0,
    categoryId: null,
    walletId: null,
    toWalletId: null,
    date: todayISO(),
    note: '',
    confidence: 0,
    debug: {},
  };
  if (!text) return result;

  // 1. tipe transaksi
  const isTransfer = TRANSFER_WORDS.some((w) =>
    new RegExp('(^|[^a-z])' + escapeRe(w) + '([^a-z]|$)', 'i').test(text)
  );
  const incomeHit = INCOME_HINT.some((w) =>
    new RegExp('(^|[^a-z])' + escapeRe(w) + '([^a-z]|$)', 'i').test(text)
  );

  let type = 'expense';
  if (isTransfer) type = 'transfer';
  else if (incomeHit) type = 'income';

  // "transfer masuk" -> tetap transfer, "pindah dana" -> transfer
  if (/^(top ?up|isi saldo)\b/.test(text)) type = 'transfer';

  result.type = type;
  result.debug.isTransfer = isTransfer;
  result.debug.incomeHit = incomeHit;

  // 2. nominal
  const amounts = findAmounts(text);
  const primary = pickMainAmount(amounts);
  let amount = primary ? primary.value : 0;
  if (!amount) {
    const w = wordsToNumber(text);
    if (w) amount = w;
  }
  result.amount = amount || 0;
  result.debug.amounts = amounts;

  // 3. kategori
  if (type === 'transfer') {
    const tr =
      categories.find((c) => /transfer/i.test(c.name) || c.id === 'c_transfer') || null;
    result.categoryId = tr ? tr.id : null;
  } else {
    const g = guessCategory(text, categories, type);
    result.categoryId = g.id;
    result.debug.categoryHits = g.hits;
  }

  // 4. dompet
  const foundWallets = findWallets(text, wallets);
  result.debug.wallets = foundWallets.map((f) => f.wallet.name);

  if (type === 'transfer') {
    const fromM = text.match(/\bdari\s+([a-z0-9 ]{3,24}?)(?:\s+(?:ke|menuju|masuk|untuk)\b|$)/i);
    const toM = text.match(/\b(?:ke|menuju|masuk ke)\s+([a-z0-9 ]{3,24}?)(?:\s+(?:dari|pakai|pake)\b|$)/i);
    let fromId = null;
    let toId = null;
    if (fromM) {
      const f = findWallets(fromM[1], wallets);
      if (f.length) fromId = f[0].wallet.id;
    }
    if (toM) {
      const f = findWallets(toM[1], wallets);
      if (f.length) toId = f[0].wallet.id;
    }
    const cands = foundWallets.map((f) => f.wallet.id).filter((id) => id !== fromId || id !== toId);
    // "top up gopay 100rb dari bca": verb + dompet = tujuan
    if (!toId) {
      const verb = text.match(/\b(?:top ?up|isi saldo|tarik|setor|transfer(?:an)?|pindah(?:in)?|geser)\s+(?:ke\s+)?([a-z0-9 ]{3,24}?)(?:\s|$)/i);
      if (verb) {
        const f = findWallets(verb[1], wallets);
        if (f.length) toId = f[0].wallet.id;
      }
    }
    if (fromId && !toId) toId = cands.find((id) => id !== fromId) || null;
    if (!fromId && toId) fromId = cands.find((id) => id !== toId) || null;
    if (!fromId && !toId && cands.length) {
      fromId = cands[0];
      toId = cands[1] || null;
    }
    result.walletId = fromId;
    result.toWalletId = toId && toId !== fromId ? toId : null;
  } else if (foundWallets.length) {
    result.walletId = foundWallets[0].wallet.id;
  }

  // 5. tanggal
  const d = detectDate(text, today);
  if (d) result.date = d.date;

  // 6. catatan
  let note = text;
  // Kata kerja pembuka ("beli", "bayar", …) tetap dipertahankan supaya judulnya
  // utuh: "beli kopi 25 ribu pakai gopay" -> "Beli kopi".
  const leadVerb = (String(text).match(/^\s*(?:(?:tolong|catat|catet|tambah|input|masukkan|bikin|buat)\s+)*(beli|beliin|belanja|bayar|membayar|jajan|sewa|isi)\b/i) || [])[1];
  if (primary) note = note.replace(primary.raw.toLowerCase(), ' ');
  else if (result.amount > 0) note = stripWordNumbers(note);
  note = note.replace(/\b(rp|idr)\b\.?/gi, ' ');
  (foundWallets || []).forEach((f) => {
    note = note.replace(new RegExp('\\b' + escapeRe(f.alias) + '\\b', 'gi'), ' ');
  });
  note = stripWords(note, FILLER);
  note = stripWords(note, TRANSFER_WORDS);
  note = note.replace(/\b(masuk|keluar|pengeluaran|pemasukan|pemasukkan|transaksi)\b/gi, ' ');
  note = note.replace(/\s*[-–—]\s*/g, ' ');
  note = note.replace(/[^\p{L}\p{N}\s&+./-]/gu, ' ');
  note = note.replace(/\s+/g, ' ').trim();
  if (leadVerb && result.type !== 'transfer') {
    const verb = leadVerb.toLowerCase();
    if (!note) note = verb;
    else if (!new RegExp('^' + escapeRe(verb), 'i').test(note)) note = `${verb} ${note}`;
  }
  if (note.length > 70) note = note.slice(0, 70).trim();
  result.note = note ? note.charAt(0).toUpperCase() + note.slice(1) : '';

  // 7. keyakinan
  let conf = 0;
  if (result.amount > 0) conf += 0.55;
  if (result.categoryId) conf += 0.22;
  if (result.walletId) conf += 0.13;
  if (result.note) conf += 0.1;
  result.confidence = Math.min(1, Math.round(conf * 100) / 100);
  result.ok = result.amount > 0;
  result.raw = original;
  return result;
}

function pickMainAmount(amounts) {
  if (!amounts || !amounts.length) return null;
  const withUnit = amounts.filter((a) => a.unit && a.unit !== 'slang');
  const pool = withUnit.length ? withUnit : amounts;
  // abaikan angka mirip tahun (2020-2099) bila ada kandidat lain
  const filtered = pool.filter((a) => !(a.value >= 2010 && a.value <= 2099 && !a.unit));
  const list = filtered.length ? filtered : pool;
  return list.reduce((best, a) => (a.value > best.value ? a : best), list[0]);
}

/** Ringkasan hasil parse untuk ditampilkan sebagai chip di UI. */
export function describeParse(parsed, ctx = {}) {
  const chips = [];
  const typeLabel = parsed.type === 'income' ? 'Pemasukan' : parsed.type === 'transfer' ? 'Transfer' : 'Pengeluaran';
  chips.push({ key: 'type', label: typeLabel, ok: true });
  chips.push({ key: 'amount', label: parsed.amount ? 'Rp ' + fmtNum(parsed.amount) : 'nominal belum jelas', ok: !!parsed.amount });
  const cat = (ctx.categories || []).find((c) => c.id === parsed.categoryId);
  if (cat) chips.push({ key: 'cat', label: cat.name, ok: true });
  const w = (ctx.wallets || []).find((x) => x.id === parsed.walletId);
  if (w) chips.push({ key: 'wallet', label: w.name, ok: true });
  if (parsed.toWalletId) {
    const t = (ctx.wallets || []).find((x) => x.id === parsed.toWalletId);
    if (t) chips.push({ key: 'to', label: '→ ' + t.name, ok: true });
  }
  return chips;
}

const fmtNum = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// ----------------------------------------------------------- parse struk

const RECEIPT_MONTHS = {
  jan: 1, januari: 1, feb: 2, februari: 2, pebruari: 2, mar: 3, maret: 3,
  apr: 4, april: 4, mei: 5, may: 5, jun: 6, juni: 6, jul: 7, juli: 7,
  agu: 8, agt: 8, agustus: 8, aug: 8, sep: 9, sept: 9, september: 9,
  okt: 10, oktober: 10, oct: 10, nov: 11, november: 11, des: 12, desember: 12, dec: 12,
};

const TOTAL_KW = /(grand\s*total|total\s*bayar|total\s*belanja|total\s*harga|total\s*akhir|jumlah\s*bayar|jumlah\s*total|harus\s*dibayar|nominal|^total\b)/i;
const TOTAL_SKIP = /(subtotal|sub\s*total|total\s*item|total\s*qty|total\s*hemat|diskon|discount|potongan|hemat|hemat\s*total)/i;
const NOISE_KW = /(total|subtotal|tunai|cash|kembali|change|pajak|ppn|tax|diskon|discount|hemat|service|servis|biaya|admin|qris|debit|kredit|kartu|card|bca|bni|bri|mandiri|kasir|cashier|npwp|telp|telpon|wa\b|instagram|www|http|terima\s*kasih|thank)/i;

const parseLineAmounts = (line) => findAmounts(line.replace(/[^\d.,\s]/g, ' '));

/**
 * Baca teks hasil OCR sebuah struk.
 * @returns {{merchant, total, date, items, tax, categorySuggestion, text}}
 */
export function parseReceipt(rawText, ctx = {}, today = new Date()) {
  const clean = String(rawText || '')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.replace(/[|]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0);

  const out = {
    merchant: '',
    total: 0,
    date: '',
    items: [],
    tax: 0,
    text: clean.join('\n'),
    categorySuggestion: null,
  };
  if (!clean.length) return out;

  // ---- total
  let total = 0;
  let totalScore = -1;
  clean.forEach((line) => {
    if (TOTAL_SKIP.test(line)) return;
    if (!TOTAL_KW.test(line)) return;
    const amounts = parseLineAmounts(line);
    if (!amounts.length) return;
    const val = amounts.reduce((a, b) => (b.value > a.value ? b : a)).value;
    let score = 1;
    if (/grand\s*total|total\s*bayar|harus\s*dibayar|jumlah\s*bayar/i.test(line)) score = 3;
    else if (/^total\b|total\s*belanja|total\s*harga/i.test(line)) score = 2;
    if (val >= 100 && (score > totalScore || (score === totalScore && val > total))) {
      totalScore = score;
      total = val;
    }
  });

  if (!total) {
    // cadangan: nominal terbesar di struk (khas struk belanja)
    const all = [];
    clean.forEach((line) => {
      if (/kembali|change|hemat|diskon|discount/i.test(line)) return;
      parseLineAmounts(line).forEach((a) => {
        if (a.value >= 100) all.push(a.value);
      });
    });
    if (all.length) total = Math.max.apply(null, all);
  }
  out.total = total;

  // ---- tanggal
  const joined = clean.slice(0, 12).join(' ');
  let dateISO = '';
  const dm = joined.match(/\b(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{2,4})\b/);
  if (dm) {
    const day = Number(dm[1]);
    const mon = Number(dm[2]);
    let year = Number(dm[3]);
    if (year < 100) year += 2000;
    if (day <= 31 && mon <= 12) dateISO = toISO(new Date(year, mon - 1, day));
  }
  if (!dateISO) {
    const mm = joined.match(/\b(\d{1,2})\s+([a-z]{3,9})\s+(\d{2,4})\b/i);
    if (mm && RECEIPT_MONTHS[mm[2].toLowerCase()]) {
      let year = Number(mm[3]);
      if (year < 100) year += 2000;
      dateISO = toISO(new Date(year, RECEIPT_MONTHS[mm[2].toLowerCase()] - 1, Number(mm[1])));
    }
  }
  out.date = dateISO;

  // ---- pajak
  clean.forEach((line) => {
    if (/(ppn|pajak|tax|pb1)/i.test(line)) {
      const a = parseLineAmounts(line);
      if (a.length) out.tax = Math.max(out.tax, a.reduce((x, y) => (y.value > x.value ? y : x)).value);
    }
  });

  // ---- merchant: baris pertama yang "berhuruf"
  for (let i = 0; i < Math.min(clean.length, 6); i += 1) {
    const line = clean[i];
    const letters = (line.match(/[a-z]/gi) || []).length;
    const digits = (line.match(/\d/g) || []).length;
    if (line.length < 3 || line.length > 42) continue;
    if (letters < 3 || digits > letters) continue;
    if (/struk|invoice|nota|kwitansi|faktur|receipt|jl\.|jalan|telp|npwp|www|http|instagram|kasir|tanggal|date/i.test(line)) continue;
    if (/^[\d\W]+$/.test(line)) continue;
    out.merchant = line.replace(/[^a-zA-Z0-9&.\s'-]/g, '').replace(/\s+/g, ' ').trim();
    break;
  }

  // ---- item: "nama .... 12.500"
  const itemRe = /^(.*?[a-zA-Z].*?)\s+(\d{1,3}(?:[.,]\d{3})*|\d+)(?:\s*[xX*]\s*\d+)?\s*(?:rp)?\s*$/;
  clean.forEach((line, idx) => {
    if (idx === 0 && out.merchant && line === out.merchant) return;
    if (NOISE_KW.test(line)) return;
    const m = line.match(itemRe);
    if (!m) return;
    const name = m[1].replace(/[^a-zA-Z0-9&.\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
    const price = parseNumericToken(m[2], '');
    if (!name || name.length < 2 || !price || price < 50) return;
    if (/(total|subtotal|tunai|kembali|pajak|ppn|diskon|hemat|npwp|telp|kasir|cashier|date|tanggal|jam)/i.test(name)) return;
    out.items.push({ name, price });
  });

  // ---- saran kategori (nama toko lebih menentukan daripada nama item)
  if (ctx.categories && ctx.categories.length) {
    const byMerchant = guessCategory(out.merchant, ctx.categories, 'expense');
    const byItems = guessCategory(out.items.map((i) => i.name).join(' '), ctx.categories, 'expense');
    out.categorySuggestion = byMerchant.confident ? byMerchant : byItems;
  }

  return out;
}

export default { parseText, parseReceipt, guessCategory, findAmounts, wordsToNumber, normalizeText };
