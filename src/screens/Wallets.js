import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, GRAD, R, S, shadowSoft } from '../theme';
import Header from '../components/Header';
import { Btn, Card, Chip, CuteIcon, Divider, Eyebrow, Field, Icon, Input, Monogram, Row, SectionTitle, Sheet, T, walletIconKey } from '../components/UI';
import { ICON_KINDS } from '../components/CuteIcons';
import { WALLET_TYPES, act, totalBalance, useStore, walletBalance } from '../store';
import { digitsOnly, fmt, fmtNum } from '../utils';
import { tap, success } from '../lib/haptic';

const TYPE_LABEL = { cash: 'Tunai', bank: 'Bank', ewallet: 'E-wallet', card: 'Kartu' };

export default function Wallets({ go }) {
  const s = useStore();
  const [edit, setEdit] = useState(null); // { id?, name, type, initial }
  const [confirmReset, setConfirmReset] = useState(false);

  const open = (w) =>
    setEdit(
      w
        ? {
            id: w.id,
            name: w.name,
            type: TYPE_LABEL[w.type] ? w.type : 'custom',
            customType: TYPE_LABEL[w.type] ? '' : w.type || '',
            icon: w.icon || null,
            initial: String(w.initial || 0),
          }
        : { id: null, name: '', type: 'cash', customType: '', icon: null, initial: '' }
    );

  const save = () => {
    const name = (edit.name || '').trim();
    if (!name) return;
    const type = edit.type === 'custom' ? (edit.customType || '').trim() || 'lainnya' : edit.type;
    const payload = { name, type, initial: Number(edit.initial) || 0, icon: edit.icon || null };
    if (edit.id) act.updateWallet(edit.id, payload);
    else act.addWallet(payload);
    success();
    setEdit(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header
        eyebrow="Dompet"
        title="Saldo & akun"
        sub={s.wallets.length + ' dompet terhubung'}
        onBack={() => go('home')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: S.lg, paddingBottom: 140 }}
      >
        <LinearGradient
          colors={GRAD}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: R.xl, padding: 20, overflow: 'hidden' }}
        >
          <View style={{ position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.14)', top: -80, right: -50 }} />
          <T size={10} weight="700" upper tracking={2.2} color={C.onInkDim}>Total semua dompet</T>
          <T size={32} serif weight="800" color={C.onInk} tabular style={{ marginTop: 6, letterSpacing: -0.6 }}>
            {fmt(totalBalance(s))}
          </T>
        </LinearGradient>

        <View style={{ marginTop: S.xl }}>
          <SectionTitle
            onRightPress={() => open(null)}
            right={
              <View
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 3,
                  paddingHorizontal: 10, paddingVertical: 5,
                  borderRadius: R.pill, backgroundColor: C.mintSoft,
                }}
              >
                <Icon name="plus" size={11} color={C.inkMint} />
                <T size={9.5} weight="700" upper tracking={1} color={C.inkMint}>Tambah</T>
              </View>
            }
          >
            Daftar dompet
          </SectionTitle>

          {s.wallets.map((w) => (
            <Pressable
              key={w.id}
              onPress={() => { tap(); open(w); }}
              style={({ pressed }) => ({
                backgroundColor: C.paper,
                borderRadius: R.md,
                borderWidth: 1,
                borderColor: C.line,
                padding: 14,
                marginBottom: 10,
                ...shadowSoft,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Row justify="space-between" align="center">
                <Row gap={12} style={{ flex: 1, minWidth: 0 }}>
                  <Monogram kind={walletIconKey(w)} size={40} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T size={13.5} weight="700" numberOfLines={1}>{w.name}</T>
                    <T size={10.5} color={C.faint} numberOfLines={1} style={{ marginTop: 2 }}>
                      {TYPE_LABEL[w.type] || w.type}
                      {w.initial ? ' \u00b7 saldo awal ' + fmtNum(w.initial) : ''}
                    </T>
                  </View>
                </Row>
                <View style={{ alignItems: 'flex-end', marginLeft: 10, maxWidth: 132 }}>
                  <T
                    size={14}
                    serif
                    weight="700"
                    tabular
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {fmt(walletBalance(s, w))}
                  </T>
                  <Icon name="chevronRight" size={12} color={C.faint} style={{ marginTop: 4 }} />
                </View>
              </Row>
            </Pressable>
          ))}

          <Pressable
            onPress={() => { tap(); open(null); }}
            style={{
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: C.lilac,
              backgroundColor: C.lilacSoft,
              borderRadius: R.md,
              paddingVertical: 14,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Icon name="plus" size={15} color={C.accent} />
            <T size={12} weight="700" color={C.accent}>Tambah dompet baru</T>
          </Pressable>
        </View>

        <View style={{ marginTop: S.xxl }}>
          <Eyebrow>Data</Eyebrow>
          <Divider style={{ marginTop: 10 }} />
          <Row justify="space-between" style={{ paddingVertical: 13 }}>
            <View style={{ flex: 1 }}>
              <T size={12.5} weight="500">Muat data contoh</T>
              <T size={10.5} color={C.faint} style={{ marginTop: 2 }}>Menambah transaksi dummy untuk mencoba fitur.</T>
            </View>
            <Btn label="Muat" small variant="outline" onPress={() => act.seedSample()} />
          </Row>
          <Divider />
          <Row justify="space-between" style={{ paddingVertical: 13 }}>
            <View style={{ flex: 1 }}>
              <T size={12.5} weight="500">Hapus semua data</T>
              <T size={10.5} color={C.faint} style={{ marginTop: 2 }}>Transaksi, dompet, dan anggaran dikosongkan.</T>
            </View>
            <Btn label="Hapus" small variant="outline" onPress={() => setConfirmReset(true)} />
          </Row>
        </View>
      </ScrollView>

      <Sheet
        visible={!!edit}
        onClose={() => setEdit(null)}
        eyebrow={edit && edit.id ? 'UBAH DOMPET' : 'DOMPET BARU'}
        title={edit && edit.id ? edit.name || 'Dompet' : 'Tambah dompet'}
        footer={
          <Row gap={10}>
            {edit && edit.id ? (
              <Btn
                variant="outline"
                label="Hapus"
                icon="trash"
                style={{ flex: 1 }}
                onPress={() => {
                  act.deleteWallet(edit.id);
                  setEdit(null);
                }}
              />
            ) : null}
            <Btn label="Simpan" icon="check" style={{ flex: 1.3 }} onPress={save} />
          </Row>
        }
      >
        {edit ? (
          <View>
            <Field label="Nama dompet">
              <Input
                value={edit.name}
                onChangeText={(t) => setEdit({ ...edit, name: t })}
                placeholder="mis. BCA, GoPay, Dompet fisik"
                autoFocus
              />
            </Field>
            <Field label="Jenis">
              <Row wrap gap={8}>
                {WALLET_TYPES.map((t) => (
                  <Chip
                    key={t.id}
                    label={TYPE_LABEL[t.id] || t.label}
                    active={edit.type === t.id}
                    onPress={() => setEdit({ ...edit, type: t.id })}
                  />
                ))}
                <Chip
                  label="Lainnya"
                  active={edit.type === 'custom'}
                  onPress={() => setEdit({ ...edit, type: 'custom' })}
                />
              </Row>
              {edit.type === 'custom' ? (
                <Input
                  value={edit.customType}
                  onChangeText={(v) => setEdit({ ...edit, customType: v })}
                  placeholder="mis. Investasi, Paylater, Kas RT"
                  style={{ marginTop: 10 }}
                />
              ) : null}
            </Field>

            <Field label="Ikon" hint="Pilih ikon yang cocok, atau biarkan otomatis dari nama.">
              <Row wrap gap={8}>
                <Pressable
                  onPress={() => { tap(); setEdit({ ...edit, icon: null }); }}
                  style={{
                    width: 46, height: 46, borderRadius: R.md,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: edit.icon ? C.line : C.accent,
                    backgroundColor: edit.icon ? 'transparent' : C.lilacSoft,
                  }}
                >
                  <T size={8.5} weight="800" upper tracking={0.6} color={edit.icon ? C.faint : C.accent}>
                    Auto
                  </T>
                </Pressable>
                {ICON_KINDS.map((k) => {
                  const on = edit.icon === k;
                  return (
                    <Pressable
                      key={k}
                      onPress={() => { tap(); setEdit({ ...edit, icon: k }); }}
                      style={{
                        width: 46, height: 46, borderRadius: R.md,
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: 2,
                        borderColor: on ? C.accent : C.line,
                        backgroundColor: on ? C.lilacSoft : 'transparent',
                      }}
                    >
                      <CuteIcon kind={k} size={28} />
                    </Pressable>
                  );
                })}
              </Row>
            </Field>
            <Field label="Saldo awal" hint="Saldo saat ini di dompet ini. Boleh 0.">
              <Input
                value={edit.initial ? fmtNum(edit.initial) : ''}
                onChangeText={(t) => setEdit({ ...edit, initial: digitsOnly(t) })}
                placeholder="0"
                keyboardType="number-pad"
                prefix="Rp"
              />
            </Field>
          </View>
        ) : null}
      </Sheet>

      <Sheet
        visible={confirmReset}
        onClose={() => setConfirmReset(false)}
        eyebrow="KONFIRMASI"
        title="Hapus semua data?"
        footer={
          <Row gap={10}>
            <Btn variant="outline" label="Batal" style={{ flex: 1 }} onPress={() => setConfirmReset(false)} />
            <Btn
              variant="dark"
              label="Ya, hapus"
              icon="trash"
              style={{ flex: 1.3 }}
              onPress={() => {
                act.resetAll();
                setConfirmReset(false);
              }}
            />
          </Row>
        }
      >
        <T size={12.5} color={C.sub} style={{ lineHeight: 20 }}>
          Semua transaksi, dompet, kategori buatan sendiri, dan anggaran akan dihapus dari perangkat ini.
          Tindakan ini tidak bisa dibatalkan.
        </T>
      </Sheet>
    </View>
  );
}
