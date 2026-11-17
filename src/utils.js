// Helper format & tanggal (tanpa Intl, aman di Hermes)
export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const pad2 = (n) => String(n).padStart(2, '0');

const dot = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const fmt = (n) => {
  const v = Math.round(Number(n) || 0);
  return (v < 0 ? '-Rp ' : 'Rp ') + dot(String(Math.abs(v)));
};

export const fmtNum = (n) => dot(String(Math.round(Math.abs(Number(n) || 0))));

export const compact = (n) => {
  const a = Math.abs(Number(n) || 0);
  const s = n < 0 ? '-' : '';
  if (a >= 1e9) return s + trim(a / 1e9) + ' M';
  if (a >= 1e6) return s + trim(a / 1e6) + ' jt';
  if (a >= 1e3) return s + trim(a / 1e3) + ' rb';
  return s + Math.round(a);
};

const trim = (x) => {
  const v = x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(1);
  return String(v).replace('.0', '').replace('.', ',');
};

export const digitsOnly = (t) => String(t || '').replace(/[^\d]/g, '');

export const iso = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const todayISO = () => iso(new Date());

export const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
export const MONTHS_S = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export const DAYS_S = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const monthKey = (isoStr) => String(isoStr || todayISO()).slice(0, 7);
export const thisMonth = () => todayISO().slice(0, 7);

export const monthLabel = (mk) => {
  const [y, m] = mk.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
};
export const monthShort = (mk) => MONTHS_S[Number(mk.split('-')[1]) - 1];

export const shiftMonth = (mk, d) => {
  const [y, m] = mk.split('-').map(Number);
  const dt = new Date(y, m - 1 + d, 1);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}`;
};

export const daysInMonth = (mk) => {
  const [y, m] = mk.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};

export const addDays = (isoStr, d) => {
  const [y, m, dd] = isoStr.split('-').map(Number);
  return iso(new Date(y, m - 1, dd + d));
};

export const prettyDate = (isoStr) => {
  const t = todayISO();
  if (isoStr === t) return 'Hari ini';
  if (isoStr === addDays(t, -1)) return 'Kemarin';
  const [y, m, dd] = isoStr.split('-').map(Number);
  const sameYear = String(y) === t.slice(0, 4);
  return `${dd} ${MONTHS_S[m - 1]}${sameYear ? '' : ' ' + y}`;
};

export const fullDate = (isoStr) => {
  const [y, m, dd] = isoStr.split('-').map(Number);
  return `${DAYS_S[new Date(y, m - 1, dd).getDay()]}, ${dd} ${MONTHS[m - 1]} ${y}`;
};

export const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---- helper tampilan (monokrom) ----
const STOP = new Set(['dan', 'and', 'the', 'di', 'ke', 'dari', 'untuk', '&']);

/** Inisial 1-2 huruf untuk badge monogram, mis. "Makan & Minum" -> "MM". */
export const monogram = (name) => {
  const words = String(name || '?')
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w.toLowerCase()));
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

export const capitalize = (str) => {
  const s = String(str || '');
  return s ? s[0].toUpperCase() + s.slice(1) : s;
};

export const titleCase = (str) =>
  String(str || '')
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

/** "12.500" -> "12.500" (tanpa Rp) untuk input nominal */
export const rupiahInput = (digits) => dot(String(digits || '').replace(/\D/g, ''));
