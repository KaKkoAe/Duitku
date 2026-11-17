import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uid, todayISO, thisMonth, shiftMonth, daysInMonth, pad2, addDays } from './utils';

const KEY = 'duitku/v1';

export const WALLET_TYPES = [
  { id: 'cash', label: 'Tunai', icon: '💵' },
  { id: 'bank', label: 'Bank', icon: '🏦' },
  { id: 'ewallet', label: 'E-Wallet', icon: '📱' },
  { id: 'card', label: 'Kartu', icon: '💳' },
];

export const walletIcon = (type) =>
  (WALLET_TYPES.find((t) => t.id === type) || WALLET_TYPES[0]).icon;

export const PALETTE = [
  '#4F46E5', '#8B5CF6', '#EC4899', '#F97316', '#F59E0B',
  '#10B981', '#06B6D4', '#3B82F6', '#EF4444', '#64748B',
];

function defaultCategories() {
  return [
    { id: 'c_makan', name: 'Makan & Minum', type: 'expense', icon: '🍜', color: '#F97316' },
    { id: 'c_transport', name: 'Transport', type: 'expense', icon: '🛵', color: '#3B82F6' },
    { id: 'c_belanja', name: 'Belanja', type: 'expense', icon: '🛍️', color: '#EC4899' },
    { id: 'c_tagihan', name: 'Tagihan', type: 'expense', icon: '💡', color: '#F59E0B' },
    { id: 'c_kesehatan', name: 'Kesehatan', type: 'expense', icon: '💊', color: '#10B981' },
    { id: 'c_hiburan', name: 'Hiburan', type: 'expense', icon: '🎬', color: '#8B5CF6' },
    { id: 'c_pendidikan', name: 'Pendidikan', type: 'expense', icon: '📚', color: '#06B6D4' },
    { id: 'c_lain', name: 'Lainnya', type: 'expense', icon: '📦', color: '#64748B' },
    { id: 'i_gaji', name: 'Gaji', type: 'income', icon: '💰', color: '#10B981' },
    { id: 'i_bonus', name: 'Bonus', type: 'income', icon: '🎁', color: '#F59E0B' },
    { id: 'i_usaha', name: 'Usaha', type: 'income', icon: '🏪', color: '#3B82F6' },
    { id: 'i_invest', name: 'Investasi', type: 'income', icon: '📈', color: '#8B5CF6' },
    { id: 'i_lain', name: 'Lainnya', type: 'income', icon: '➕', color: '#64748B' },
  ];
}

function defaultState() {
  return {
    wallets: [
      // Saldo awal 0 — angka di Beranda murni dari transaksi yang dicatat
      { id: 'w_cash', name: 'Tunai', type: 'cash', initial: 0, color: '#10B981' },
      { id: 'w_bca', name: 'BCA', type: 'bank', initial: 0, color: '#3B82F6' },
      { id: 'w_gopay', name: 'GoPay', type: 'ewallet', initial: 0, color: '#06B6D4' },
    ],
    categories: defaultCategories(),
    transactions: [],
    budgets: {},
    initialZeroed: true,
  };
}

/** Dompet bawaan yang saldo awalnya dipaksa 0. */
const ZERO_INITIAL_WALLETS = ['w_cash', 'w_bca', 'w_gopay'];

/**
 * Migrasi sekali jalan: pengguna lama yang masih punya saldo awal bawaan
 * (Tunai 300rb, BCA 4,25jt, GoPay 175rb) dibuat 0 tanpa menghapus transaksi.
 */
function zeroInitialWallets(list, alreadyDone) {
  if (alreadyDone) return list;
  return list.map((w) =>
    ZERO_INITIAL_WALLETS.includes(w.id) ? { ...w, initial: 0 } : w
  );
}

// ---------- store ----------
let state = defaultState();
let hydrated = false;
const listeners = new Set();

const emit = () => listeners.forEach((l) => l());
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

let saveTimer = null;
function persist() {
  if (!hydrated) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    AsyncStorage.setItem(KEY, JSON.stringify(state)).catch((e) =>
      console.warn('Gagal menyimpan:', e)
    );
  }, 120);
}

function set(patch) {
  state = typeof patch === 'function' ? patch(state) : { ...state, ...patch };
  emit();
  persist();
}

export function useStore() {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export async function initStore() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const base = defaultState();
      const loaded = Array.isArray(parsed.wallets) && parsed.wallets.length ? parsed.wallets : base.wallets;
      state = {
        wallets: zeroInitialWallets(loaded, parsed.initialZeroed === true),
        categories: Array.isArray(parsed.categories) && parsed.categories.length ? parsed.categories : base.categories,
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        budgets: parsed.budgets && typeof parsed.budgets === 'object' ? parsed.budgets : {},
        initialZeroed: true,
      };
    } else {
      state = defaultState();
    }
  } catch (e) {
    console.warn('Gagal memuat data:', e);
    state = defaultState();
  }
  hydrated = true;
  emit();
  persist();
  return state;
}

// ---------- helpers / selectors ----------
export const catById = (s, id) => s.categories.find((c) => c.id === id);
export const walletById = (s, id) => s.wallets.find((w) => w.id === id);

export const catName = (s, id) => (catById(s, id) || {}).name || 'Tanpa kategori';
export const catIcon = (s, id) => (catById(s, id) || {}).icon || '🧾';
export const catColor = (s, id) => (catById(s, id) || {}).color || '#64748B';

export function walletBalance(s, w) {
  let b = Number(w.initial) || 0;
  for (const t of s.transactions) {
    if (t.type === 'income' && t.wallet === w.id) b += t.amount;
    else if (t.type === 'expense' && t.wallet === w.id) b -= t.amount;
    else if (t.type === 'transfer') {
      if (t.wallet === w.id) b -= t.amount;
      if (t.toWallet === w.id) b += t.amount;
    }
  }
  return b;
}

export const totalBalance = (s) => s.wallets.reduce((a, w) => a + walletBalance(s, w), 0);

export const inMonth = (s, mk) => s.transactions.filter((t) => String(t.date).slice(0, 7) === mk);

export function monthStats(s, mk) {
  let income = 0;
  let expense = 0;
  for (const t of inMonth(s, mk)) {
    if (t.type === 'income') income += t.amount;
    else if (t.type === 'expense') expense += t.amount;
  }
  return { income, expense, net: income - expense, count: inMonth(s, mk).length };
}

export function catTotals(s, mk, type = 'expense') {
  const map = {};
  let total = 0;
  for (const t of inMonth(s, mk)) {
    if (t.type !== type) continue;
    map[t.category] = (map[t.category] || 0) + t.amount;
    total += t.amount;
  }
  return Object.keys(map)
    .map((id) => ({
      cat: catById(s, id) || { id, name: 'Tanpa kategori', icon: '🧾', color: '#64748B' },
      total: map[id],
      share: total ? Math.round((map[id] / total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function dailyExpense(s, mk) {
  const days = daysInMonth(mk);
  const arr = Array.from({ length: days }, () => 0);
  for (const t of inMonth(s, mk)) {
    if (t.type !== 'expense') continue;
    const d = Number(String(t.date).slice(8, 10));
    if (d >= 1 && d <= days) arr[d - 1] += t.amount;
  }
  return arr;
}

export function monthsSeries(s, n = 6) {
  const out = [];
  let mk = thisMonth();
  for (let i = n - 1; i >= 0; i--) {
    const key = shiftMonth(mk, -i);
    const st = monthStats(s, key);
    out.push({ mk: key, income: st.income, expense: st.expense });
  }
  return out;
}

export function budgetRows(s, mk) {
  const b = s.budgets[mk] || {};
  return Object.keys(b)
    .map((cid) => {
      const cat = catById(s, cid);
      if (!cat) return null;
      const spent = inMonth(s, mk)
        .filter((t) => t.type === 'expense' && t.category === cid)
        .reduce((a, t) => a + t.amount, 0);
      const limit = Number(b[cid]) || 0;
      return {
        cat,
        limit,
        spent,
        sisa: limit - spent,
        pct: limit > 0 ? Math.round((spent / limit) * 100) : 0,
      };
    })
    .filter(Boolean)
    .sort((a, b2) => b2.pct - a.pct);
}

export const budgetTotal = (s, mk) => {
  const b = s.budgets[mk] || {};
  return Object.values(b).reduce((a, v) => a + (Number(v) || 0), 0);
};

export const recentTx = (s, n = 6) =>
  [...s.transactions]
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, n);

export const sortedMonthTx = (s, mk) =>
  inMonth(s, mk).sort(
    (a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0)
  );

// ---------- actions ----------
export const act = {
  addTx(tx) {
    const row = {
      id: uid(),
      type: 'expense',
      amount: 0,
      category: null,
      wallet: null,
      toWallet: null,
      date: todayISO(),
      note: '',
      createdAt: Date.now(),
      ...tx,
    };
    set((s) => ({ ...s, transactions: [row, ...s.transactions] }));
    return row;
  },
  updateTx(id, patch) {
    set((s) => ({
      ...s,
      transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  },
  deleteTx(id) {
    set((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) }));
  },
  addWallet(w) {
    const row = {
      id: uid(),
      name: 'Dompet baru',
      type: 'cash',
      initial: 0,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      ...w,
    };
    set((s) => ({ ...s, wallets: [...s.wallets, row] }));
    return row;
  },
  updateWallet(id, patch) {
    set((s) => ({
      ...s,
      wallets: s.wallets.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    }));
  },
  deleteWallet(id) {
    set((s) => ({
      ...s,
      wallets: s.wallets.filter((w) => w.id !== id),
      transactions: s.transactions.filter((t) => t.wallet !== id && t.toWallet !== id),
    }));
  },
  addCategory(c) {
    const row = {
      id: uid(),
      name: 'Kategori baru',
      type: 'expense',
      icon: '🏷️',
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      ...c,
    };
    set((s) => ({ ...s, categories: [...s.categories, row] }));
    return row;
  },
  setBudget(mk, catId, amount) {
    set((s) => ({
      ...s,
      budgets: { ...s.budgets, [mk]: { ...(s.budgets[mk] || {}), [catId]: Number(amount) || 0 } },
    }));
  },
  deleteBudget(mk, catId) {
    set((s) => {
      const copy = { ...(s.budgets[mk] || {}) };
      delete copy[catId];
      return { ...s, budgets: { ...s.budgets, [mk]: copy } };
    });
  },
  resetAll() {
    set(() => defaultState());
  },
  seedSample() {
    const mk0 = thisMonth();
    const prev = shiftMonth(mk0, -1);
    const prev2 = shiftMonth(mk0, -2);
    const day = (mk, d) => `${mk}-${pad2(Math.min(d, daysInMonth(mk)))}`;
    const T = [];
    const push = (type, amount, category, wallet, date, note, toWallet) =>
      T.push({ id: uid(), type, amount, category, wallet, toWallet, date, note, createdAt: Date.now() - T.length });

    push('income', 8500000, 'i_gaji', 'w_bca', day(mk0, 1), 'Gaji bulanan');
    push('income', 1200000, 'i_usaha', 'w_bca', day(mk0, 8), 'Jual barang preloved');
    push('expense', 150000, 'c_makan', 'w_gopay', day(mk0, 2), 'Makan siang');
    push('expense', 320000, 'c_belanja', 'w_bca', day(mk0, 3), 'Belanja bulanan');
    push('expense', 60000, 'c_transport', 'w_gopay', day(mk0, 3), 'Ojek online');
    push('expense', 250000, 'c_tagihan', 'w_bca', day(mk0, 5), 'Listrik & air');
    push('expense', 85000, 'c_hiburan', 'w_cash', day(mk0, 6), 'Nonton bioskop');
    push('expense', 75000, 'c_makan', 'w_cash', day(mk0, 7), 'Kopi & camilan');
    push('expense', 450000, 'c_makan', 'w_bca', day(mk0, 9), 'Makan keluarga');
    push('expense', 120000, 'c_kesehatan', 'w_cash', day(mk0, 10), 'Vitamin');
    push('transfer', 500000, null, 'w_bca', day(mk0, 4), 'Top up GoPay', 'w_gopay');
    push('income', 8500000, 'i_gaji', 'w_bca', day(prev, 1), 'Gaji bulanan');
    push('expense', 2400000, 'c_tagihan', 'w_bca', day(prev, 6), 'Sewa kos');
    push('expense', 850000, 'c_makan', 'w_cash', day(prev, 12), 'Makan sebulan');
    push('expense', 300000, 'c_belanja', 'w_gopay', day(prev, 15), 'Belanja online');
    push('expense', 200000, 'c_transport', 'w_gopay', day(prev, 20), 'Bensin');
    push('income', 7800000, 'i_gaji', 'w_bca', day(prev2, 1), 'Gaji bulanan');
    push('expense', 2400000, 'c_tagihan', 'w_bca', day(prev2, 6), 'Sewa kos');
    push('expense', 950000, 'c_makan', 'w_cash', day(prev2, 14), 'Makan sebulan');
    push('expense', 400000, 'c_hiburan', 'w_bca', day(prev2, 22), 'Liburan');

    set((s) => ({
      ...s,
      wallets: s.wallets.map((w) =>
        w.id === 'w_cash'
          ? { ...w, initial: 2600000 }
          : w.id === 'w_bca'
          ? { ...w, initial: 4250000 }
          : w.id === 'w_gopay'
          ? { ...w, initial: 400000 }
          : w
      ),
      transactions: T,
      budgets: {
        ...s.budgets,
        [mk0]: { c_makan: 1200000, c_belanja: 800000, c_transport: 400000, c_tagihan: 500000, c_hiburan: 300000 },
      },
    }));
  },
};
