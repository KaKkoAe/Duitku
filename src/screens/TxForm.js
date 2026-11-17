import React, { useEffect, useMemo, useState } from 'react';
import {
  Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View,
} from 'react-native';
import { C, F, R, S, TOP_PAD } from '../theme';
import { Btn, Chip, Divider, Eyebrow, Icon, Row, Segmented, T } from '../components/UI';
import { addDays, digitsOnly, fmtNum, fullDate, prettyDate, todayISO } from '../utils';
import { act, useStore } from '../store';
import { tap, success } from '../lib/haptic';

const TYPES = [
  { id: 'expense', label: 'Keluar' },
  { id: 'income', label: 'Masuk' },
  { id: 'transfer', label: 'Pindah' },
];

export default function TxForm({ visible, initial, prefill, onClose, defaultType = 'expense' }) {
  const s = useStore();
  const editing = !!(initial && initial.id);

  const [type, setType] = useState(defaultType);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [toWallet, setToWallet] = useState(null);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [items, setItems] = useState([]);
  const [newCat, setNewCat] = useState(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!visible) return;
    setErr('');
    setConfirmDel(false);
    setNewCat(null);
    const src = editing ? initial : prefill || null;
    if (src) {
      setType(src.type || defaultType);
      setAmount(src.amount ? String(src.amount) : '');
      setCategory(src.category || src.categoryId || null);
      setWallet(src.wallet || src.walletId || (s.wallets[0] ? s.wallets[0].id : null));
      setToWallet(src.toWallet || src.toWalletId || null);
      setDate(src.date || todayISO());
      setNote(src.note || '');
      setReceipt(src.receiptUri || src.receipt || null);
      setItems(Array.isArray(src.items) ? src.items : []);
    } else {
      setType(defaultType);
      setAmount('');
      setCategory(null);
      setWallet(s.wallets[0] ? s.wallets[0].id : null);
      setToWallet(null);
      setDate(todayISO());
      setNote('');
      setReceipt(null);
      setItems([]);
    }
  }, [visible, initial, prefill]);

  const cats = useMemo(
    () => s.categories.filter((c) => c.type === (type === 'income' ? 'income' : 'expense')),
    [s.categories, type]
  );

  useEffect(() => {
    if (category && !cats.some((c) => c.id === category)) setCategory(null);
  }, [type]);

  const save = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return setErr('Nominal belum diisi.');
    if (!wallet) return setErr('Pilih dompet dulu.');
    if (type !== 'transfer' && !category) return setErr('Pilih kategori dulu.');
    if (type === 'transfer' && (!toWallet || toWallet === wallet)) return setErr('Dompet tujuan harus berbeda.');

    const payload = {
      type,
      amount: amt,
      category: type === 'transfer' ? null : category,
      wallet,
      toWallet: type === 'transfer' ? toWallet : null,
      date,
      note: note.trim(),
      receiptUri: receipt || null,
      items: items.length ? items : undefined,
    };
    if (editing) act.updateTx(initial.id, payload);
    else act.addTx(payload);
    success();
    onClose();
  };

  const addCategory = () => {
    const name = (newCat || '').trim();
    if (!name) return;
    const row = act.addCategory({ name, type: type === 'income' ? 'income' : 'expense' });
    setCategory(row.id);
    setNewCat(null);
  };

  const walletName = (id) => (s.wallets.find((w) => w.id === id) || {}).name || '—';

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === 'web' ? 'none' : 'slide'}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ paddingTop: TOP_PAD, paddingHorizontal: S.lg, paddingBottom: S.md }}>
          <Row justify="space-between">
            <Pressable onPress={onClose} hitSlop={12} style={{ paddingVertical: 4 }}>
              <T size={12} weight="600" color={C.sub} upper tracking={1.2}>Batal</T>
            </Pressable>
            <T size={13} weight="600" upper tracking={1.6} color={C.ink}>
              {editing ? 'Ubah' : 'Catat'}
            </T>
            <Pressable
              onPress={() => setConfirmDel(true)}
              hitSlop={12}
              style={{ paddingVertical: 4, opacity: editing ? 1 : 0 }}
              disabled={!editing}
            >
              <Icon name="trash" size={17} color={C.sub} stroke={1.5} />
            </Pressable>
          </Row>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={{ flex: 1, minHeight: 0 }}
            contentContainerStyle={{ paddingHorizontal: S.lg, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Segmented options={TYPES} value={type} onChange={setType} style={{ marginTop: S.sm }} />

            <View style={{ paddingTop: S.xxl, paddingBottom: S.lg }}>
              <Eyebrow>Nominal</Eyebrow>
              <Row align="flex-end" gap={8} style={{ marginTop: 6 }}>
                <T size={22} serif color={C.faint} style={{ paddingBottom: 6 }}>Rp</T>
                <TextInput
                  value={amount ? fmtNum(amount) : ''}
                  onChangeText={(t) => setAmount(digitsOnly(t))}
                  placeholder="0"
                  placeholderTextColor={C.faint}
                  keyboardType="number-pad"
                  autoFocus={!editing && !prefill}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontFamily: F.serifSemi,
                    fontSize: 44,
                    color: C.ink,
                    paddingVertical: 0,
                    paddingHorizontal: 0,
                  }}
                />
              </Row>
              <View style={{ height: 2, backgroundColor: C.lilac, marginTop: 4, borderRadius: 1 }} />
            </View>

            {err ? (
              <T size={12} color={C.ink} weight="500" style={{ marginBottom: S.md }}>{err}</T>
            ) : null}

            {type !== 'transfer' ? (
              <View style={{ marginTop: S.sm }}>
                <Row justify="space-between" style={{ marginBottom: 10 }}>
                  <Eyebrow>Kategori</Eyebrow>
                  <Pressable onPress={() => { tap(); setNewCat(newCat === null ? '' : null); }} hitSlop={8}>
                    <T size={10.5} weight="600" upper tracking={1.2} color={C.sub}>
                      {newCat === null ? '+ Baru' : 'Tutup'}
                    </T>
                  </Pressable>
                </Row>
                <Row wrap gap={8}>
                  {cats.map((c) => (
                    <Chip key={c.id} label={c.name} active={category === c.id} onPress={() => setCategory(c.id)} />
                  ))}
                </Row>
                {newCat !== null ? (
                  <Row gap={8} style={{ marginTop: 10 }}>
                    <View style={{ flex: 1, borderBottomWidth: 1, borderColor: C.ink, paddingVertical: 6 }}>
                      <TextInput
                        value={newCat}
                        onChangeText={setNewCat}
                        placeholder="Nama kategori baru"
                        placeholderTextColor={C.faint}
                        autoFocus
                        onSubmitEditing={addCategory}
                        style={{ fontFamily: F.sans, fontSize: 14, color: C.ink, padding: 0 }}
                      />
                    </View>
                    <Btn label="Tambah" small variant="outline" onPress={addCategory} />
                  </Row>
                ) : null}
              </View>
            ) : null}

            <View style={{ marginTop: S.xl }}>
              <Eyebrow>{type === 'transfer' ? 'Dari dompet' : 'Dompet'}</Eyebrow>
              <Row wrap gap={8} style={{ marginTop: 10 }}>
                {s.wallets.map((w) => (
                  <Chip key={w.id} label={w.name} active={wallet === w.id} onPress={() => setWallet(w.id)} />
                ))}
              </Row>
            </View>

            {type === 'transfer' ? (
              <View style={{ marginTop: S.xl }}>
                <Eyebrow>Ke dompet</Eyebrow>
                <Row wrap gap={8} style={{ marginTop: 10 }}>
                  {s.wallets
                    .filter((w) => w.id !== wallet)
                    .map((w) => (
                      <Chip key={w.id} label={w.name} active={toWallet === w.id} onPress={() => setToWallet(w.id)} />
                    ))}
                </Row>
                {wallet && toWallet ? (
                  <Row gap={8} style={{ marginTop: 12 }}>
                    <T size={12} color={C.sub}>{walletName(wallet)}</T>
                    <Icon name="arrowRight" size={14} color={C.faint} />
                    <T size={12} color={C.sub}>{walletName(toWallet)}</T>
                  </Row>
                ) : null}
              </View>
            ) : null}

            <View style={{ marginTop: S.xl }}>
              <Eyebrow>Tanggal</Eyebrow>
              <Row justify="space-between" style={{ marginTop: 8 }}>
                <Pressable onPress={() => setDate(addDays(date, -1))} hitSlop={10} style={{ padding: 8 }}>
                  <Icon name="chevronLeft" size={18} color={C.ink} />
                </Pressable>
                <View style={{ alignItems: 'center' }}>
                  <T size={16} serif weight="600">{prettyDate(date)}</T>
                  <T size={10.5} color={C.faint} style={{ marginTop: 2 }}>{fullDate(date)}</T>
                </View>
                <Pressable
                  onPress={() => date < todayISO() && setDate(addDays(date, 1))}
                  hitSlop={10}
                  style={{ padding: 8, opacity: date < todayISO() ? 1 : 0.25 }}
                >
                  <Icon name="chevronRight" size={18} color={C.ink} />
                </Pressable>
              </Row>
              <Row gap={8} justify="center" style={{ marginTop: 2 }}>
                <MiniDate label="Hari ini" on={date === todayISO()} onPress={() => setDate(todayISO())} />
                <MiniDate label="Kemarin" on={date === addDays(todayISO(), -1)} onPress={() => setDate(addDays(todayISO(), -1))} />
              </Row>
            </View>

            <View style={{ marginTop: S.xl }}>
              <Eyebrow>Catatan</Eyebrow>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="mis. makan siang di kantin"
                placeholderTextColor={C.faint}
                maxLength={80}
                style={{
                  fontFamily: F.sans,
                  fontSize: 15,
                  color: C.ink,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderColor: C.line,
                }}
              />
            </View>

            {receipt ? (
              <View style={{ marginTop: S.xl }}>
                <Eyebrow>Struk</Eyebrow>
                <Row gap={12} style={{ marginTop: 10 }} align="flex-start">
                  <Image
                    source={{ uri: receipt }}
                    style={{ width: 54, height: 70, borderRadius: R.xs, backgroundColor: C.track }}
                    resizeMode="cover"
                  />
                  <View style={{ flex: 1 }}>
                    <T size={12.5} weight="500">Foto struk terlampir</T>
                    <T size={11} color={C.sub} style={{ marginTop: 2 }}>
                      {items.length ? items.length + ' item terbaca' : 'Tanpa rincian item'}
                    </T>
                    {items.length ? (
                      <View style={{ marginTop: 8 }}>
                        {items.slice(0, 3).map((it, i) => (
                          <Row key={it.name + i} justify="space-between" style={{ paddingVertical: 2 }}>
                            <T size={11} color={C.sub} numberOfLines={1} style={{ flex: 1, marginRight: 8 }}>{it.name}</T>
                            <T size={11} color={C.faint} tabular>{fmtNum(it.price)}</T>
                          </Row>
                        ))}
                        {items.length > 3 ? (
                          <T size={10.5} color={C.faint}>+{items.length - 3} item lain</T>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                  <Pressable onPress={() => { tap(); setReceipt(null); setItems([]); }} hitSlop={10}>
                    <Icon name="close" size={14} color={C.faint} />
                  </Pressable>
                </Row>
              </View>
            ) : null}

            <Divider style={{ marginTop: S.xl }} />
          </ScrollView>

          <View
            style={{
              paddingHorizontal: S.lg,
              paddingTop: S.md,
              paddingBottom: Platform.OS === 'ios' ? 30 : S.lg,
              borderTopWidth: 1,
              borderTopColor: C.lineSoft,
              backgroundColor: C.bg,
            }}
          >
            {confirmDel ? (
              <View>
                <T size={12.5} weight="500" center style={{ marginBottom: 10 }}>Hapus transaksi ini?</T>
                <Row gap={10}>
                  <Btn variant="outline" label="Batal" style={{ flex: 1 }} onPress={() => setConfirmDel(false)} />
                  <Btn
                    variant="dark"
                    label="Hapus"
                    icon="trash"
                    style={{ flex: 1 }}
                    onPress={() => {
                      act.deleteTx(initial.id);
                      onClose();
                    }}
                  />
                </Row>
              </View>
            ) : (
              <Btn label={editing ? 'Simpan perubahan' : 'Simpan transaksi'} icon="check" onPress={save} />
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function MiniDate({ label, on, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: R.pill,
        borderWidth: 1,
        borderColor: on ? C.primary : 'transparent',
        backgroundColor: on ? C.lilacSoft : 'transparent',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <T size={11} color={on ? C.accent : C.faint} weight={on ? '700' : '500'}>{label}</T>
    </Pressable>
  );
}
