/* Uji parser Duitku (tanpa bundler): salin modul ESM ke .tmp lalu impor. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcPath = path.join(root, 'src', 'lib', 'parser.js');
const tmpDir = path.join(root, '.tmp');
const tmpPath = path.join(tmpDir, 'parser.mjs');

fs.mkdirSync(tmpDir, { recursive: true });
fs.writeFileSync(tmpPath, fs.readFileSync(srcPath, 'utf8'), 'utf8');

const CATS = [
  { id: 'c_makan', name: 'Makan & Minum', type: 'expense' },
  { id: 'c_transport', name: 'Transport', type: 'expense' },
  { id: 'c_belanja', name: 'Belanja', type: 'expense' },
  { id: 'c_tagihan', name: 'Tagihan', type: 'expense' },
  { id: 'c_kesehatan', name: 'Kesehatan', type: 'expense' },
  { id: 'c_hiburan', name: 'Hiburan', type: 'expense' },
  { id: 'c_pendidikan', name: 'Pendidikan', type: 'expense' },
  { id: 'c_lain', name: 'Lainnya', type: 'expense' },
  { id: 'i_gaji', name: 'Gaji', type: 'income' },
  { id: 'i_bonus', name: 'Bonus', type: 'income' },
  { id: 'i_usaha', name: 'Usaha', type: 'income' },
  { id: 'i_invest', name: 'Investasi', type: 'income' },
  { id: 'i_lain', name: 'Pemasukan lain', type: 'income' },
];
const WALLETS = [
  { id: 'w_cash', name: 'Tunai', type: 'cash' },
  { id: 'w_bca', name: 'BCA', type: 'bank' },
  { id: 'w_gopay', name: 'GoPay', type: 'ewallet' },
];

const ctx = { categories: CATS, wallets: WALLETS };
const today = new Date(2025, 10, 17); // 17 Nov 2025

(async () => {
  const { parseText, parseReceipt } = await import('file://' + tmpPath);
  let pass = 0;
  let fail = 0;

  const cases = [
    { in: 'makan siang 35rb pakai tunai', type: 'expense', amount: 35000, cat: 'c_makan', wallet: 'w_cash' },
    { in: 'gaji bulan ini 8,5 juta masuk BCA', type: 'income', amount: 8500000, cat: 'i_gaji', wallet: 'w_bca' },
    { in: 'beli kopi 25 ribu gopay', type: 'expense', amount: 25000, cat: 'c_makan', wallet: 'w_gopay' },
    // contoh dari spesifikasi Tahap 2 (dikte suara)
    { in: 'Beli kopi 25 ribu pakai gopay', type: 'expense', amount: 25000, cat: 'c_makan', wallet: 'w_gopay', note: 'Beli kopi' },
    { in: 'tolong catat beli kopi dua puluh lima ribu pakai gopay', type: 'expense', amount: 25000, cat: 'c_makan', wallet: 'w_gopay', note: 'Beli kopi' },
    { in: 'transfer 500rb dari BCA ke GoPay', type: 'transfer', amount: 500000, wallet: 'w_bca', to: 'w_gopay' },
    { in: 'kemarin belanja indomaret 127.500', type: 'expense', amount: 127500, cat: 'c_belanja', date: '2025-11-16' },
    { in: 'ojek ke kantor dua puluh lima ribu', type: 'expense', amount: 25000, cat: 'c_transport' },
    { in: 'bayar listrik 200rb', type: 'expense', amount: 200000, cat: 'c_tagihan' },
    { in: 'nonton bioskop 2 orang 100rb', type: 'expense', amount: 100000, cat: 'c_hiburan' },
    { in: '40k bensin', type: 'expense', amount: 40000, cat: 'c_transport' },
    { in: 'top up gopay 100 ribu dari bca', type: 'transfer', amount: 100000, to: 'w_gopay' },
    { in: 'jualan hari ini 1,2 juta', type: 'income', amount: 1200000, cat: 'i_usaha' },
    { in: 'obat apotek 87.500 tunai', type: 'expense', amount: 87500, cat: 'c_kesehatan' },
    { in: 'goceng parkir', type: 'expense', amount: 5000, cat: 'c_transport' },
    { in: 'nasi goreng 20k', type: 'expense', amount: 20000, cat: 'c_makan' },
  ];

  cases.forEach((c) => {
    const r = parseText(c.in, ctx, today);
    const checks = [];
    if (r.type !== c.type) checks.push(`type ${r.type} != ${c.type}`);
    if (r.amount !== c.amount) checks.push(`amount ${r.amount} != ${c.amount}`);
    if (c.cat && r.categoryId !== c.cat) checks.push(`cat ${r.categoryId} != ${c.cat}`);
    if (c.wallet && r.walletId !== c.wallet) checks.push(`wallet ${r.walletId} != ${c.wallet}`);
    if (c.to && r.toWalletId !== c.to) checks.push(`to ${r.toWalletId} != ${c.to}`);
    if (c.date && r.date !== c.date) checks.push(`date ${r.date} != ${c.date}`);
    if (c.note && r.note !== c.note) checks.push(`note "${r.note}" != "${c.note}"`);
    if (checks.length) {
      fail += 1;
      console.log(`FAIL  "${c.in}"\n      -> ${checks.join('; ')} | note="${r.note}"`);
    } else {
      pass += 1;
      console.log(`ok    "${c.in}" -> ${r.type} ${r.amount} ${r.categoryId} ${r.walletId} note="${r.note}"`);
    }
  });

  const receipt = `INDOMARET 1315
Jl. Merdeka No. 45, Bandung
Telp 022-1234567
17/11/2025 14:32
KASIR: RINA
MIE GORENG 2X    7.500   15.000
TEH BOTOL       5.500
ROTI TAWAR      18.000
SABUN MANDI     12.500
SNACK KERIPIK    9.000
SUBTOTAL        60.000
DISKON           5.000
PPN 11%          6.050
TOTAL           61.050
TUNAI          100.000
KEMBALI         38.950`;

  const r = parseReceipt(receipt, ctx);
  console.log('\n--- struk ---');
  console.log('merchant :', r.merchant);
  console.log('total    :', r.total);
  console.log('date     :', r.date);
  console.log('tax      :', r.tax);
  console.log('items    :', r.items.map((i) => `${i.name}=${i.price}`).join(' | '));

  const expect = [
    ['merchant memuat INDOMARET', /indomaret/i.test(r.merchant)],
    ['total 61050', r.total === 61050],
    ['tanggal 2025-11-17', r.date === '2025-11-17'],
    ['ada >= 4 item', r.items.length >= 4],
    ['kategori belanja', r.categorySuggestion && r.categorySuggestion.id === 'c_belanja'],
  ];
  expect.forEach(([label, ok]) => {
    if (ok) { pass += 1; console.log('ok    ' + label); }
    else { fail += 1; console.log('FAIL  ' + label); }
  });

  // struk tanpa kata TOTAL (foto buram)
  const r2 = parseReceipt('WARTEG BAHARI\n12.000\nES TEH 3.000\n35.000', ctx);
  if (r2.total === 35000) { pass += 1; console.log('ok    fallback total = 35000'); }
  else { fail += 1; console.log('FAIL  fallback total = ' + r2.total); }

  console.log(`\n${pass} lulus, ${fail} gagal`);
  process.exit(fail ? 1 : 0);
})();
