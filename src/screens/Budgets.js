import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { C, R, S } from '../theme';
import Header from '../components/Header';
import { Btn, Card, Chip, Divider, Eyebrow, Field, Icon, Input, Monogram, Row, SectionTitle, Sheet, T } from '../components/UI';
import { act, budgetRows, budgetTotal, monthStats, useStore } from '../store';
import { digitsOnly, fmt, fmtNum, monthLabel, pct, shiftMonth, thisMonth } from '../utils';
import { tap, success } from '../lib/haptic';

export default function Budgets({ go }) {
  const s = useStore();
  const [mk, setMk] = useState(thisMonth());
  const [edit, setEdit] = useState(null); // { cat, amount }

  const rows = budgetRows(s, mk);
  const total = budgetTotal(s, mk);
  const spent = monthStats(s, mk).expense;
  const used = pct(spent, total);

  const freeCats = useMemo(
    () =>
      s.categories
        .filter((c) => c.type === 'expense')
        .filter((c) => !rows.some((r) => r.cat.id === c.id)),
    [s.categories, rows]
  );

  const save = () => {
    const amount = Number(edit.amount) || 0;
    if (!edit.cat || amount <= 0) return;
    act.setBudget(mk, edit.cat, amount);
    success();
    setEdit(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header
        eyebrow="Anggaran"
        title={monthLabel(mk)}
        sub={rows.length ? rows.length + ' kategori dibatasi' : 'Belum ada anggaran'}
        onBack={() => go('home')}
        right={
          <Row gap={6}>
            <Pressable onPress={() => setMk(shiftMonth(mk, -1))} hitSlop={8} style={navBtn}>
              <Icon name="chevronLeft" size={16} color={C.ink} />
            </Pressable>
            <Pressable
              onPress={() => setMk(shiftMonth(mk, 1))}
              hitSlop={8}
              style={[navBtn, { opacity: mk < thisMonth() ? 1 : 0.3 }]}
              disabled={mk >= thisMonth()}
            >
              <Icon name="chevronRight" size={16} color={C.ink} />
            </Pressable>
          </Row>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: S.lg, paddingBottom: 140 }}
      >
        <Card dark pad={18}>
          <Row justify="space-between">
            <T size={10} weight="600" upper tracking={2.4} color={C.onInkDim}>Total anggaran</T>
            <T size={10} weight="600" upper tracking={1.6} color={C.onInkDim}>{used}% terpakai</T>
          </Row>
          <T size={30} serif weight="600" color={C.onInk} tabular style={{ marginTop: 4, letterSpacing: -0.4 }}>
            {fmt(total)}
          </T>
          <View style={{ height: 3, backgroundColor: 'rgba(245,244,240,0.18)', borderRadius: 99, marginTop: S.md, overflow: 'hidden' }}>
            <View style={{ height: 3, width: Math.min(100, used) + '%', backgroundColor: C.onInk }} />
          </View>
          <Row justify="space-between" style={{ marginTop: 10 }}>
            <T size={10.5} color={C.onInkDim} tabular>Terpakai {fmtNum(spent)}</T>
            <T size={10.5} color={C.onInkDim} tabular>Sisa {fmtNum(Math.max(0, total - spent))}</T>
          </Row>
        </Card>

        <View style={{ marginTop: S.xl }}>
          <SectionTitle
            sub="Ketuk untuk mengubah nominal"
            right={
              <T
                size={10.5}
                weight="600"
                upper
                tracking={1.2}
                color={C.sub}
                onPress={() => {
                  if (!freeCats.length) return;
                  tap();
                  setEdit({ cat: freeCats[0].id, amount: '' });
                }}
              >
                + Atur
              </T>
            }
          >
            Per kategori
          </SectionTitle>

          {rows.length === 0 ? (
            <Card pad={18}>
              <T size={13} serif weight="600">Belum ada batas bulan ini</T>
              <T size={11.5} color={C.sub} style={{ marginTop: 6, lineHeight: 18 }}>
                Tetapkan batas per kategori supaya pengeluaran terkendali. Anggaran mengikuti bulan,
                jadi bulan depan bisa berbeda.
              </T>
              <Btn
                label="Buat anggaran pertama"
                icon="plus"
                small
                style={{ marginTop: S.lg, alignSelf: 'flex-start' }}
                onPress={() => freeCats.length && setEdit({ cat: freeCats[0].id, amount: '' })}
              />
            </Card>
          ) : (
            rows.map((r) => {
              const over = r.spent > r.limit;
              return (
                <Pressable
                  key={r.cat.id}
                  onPress={() => { tap(); setEdit({ cat: r.cat.id, amount: String(r.limit) }); }}
                  style={({ pressed }) => ({
                    backgroundColor: C.paper,
                    borderRadius: R.md,
                    borderWidth: 1,
                    borderColor: over ? C.ink : C.line,
                    padding: 14,
                    marginBottom: 10,
                    opacity: pressed ? 0.75 : 1,
                  })}
                >
                  <Row justify="space-between" style={{ marginBottom: 9 }}>
                    <Row gap={10} style={{ flex: 1, minWidth: 0 }}>
                      <Monogram label={r.cat.name} size={30} outline />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <T size={13} weight="600" numberOfLines={1}>{r.cat.name}</T>
                        <T size={10.5} color={C.faint} style={{ marginTop: 1 }} tabular>
                          {fmtNum(r.spent)} dari {fmtNum(r.limit)}
                        </T>
                      </View>
                    </Row>
                    <View style={{ alignItems: 'flex-end' }}>
                      <T size={12.5} serif weight="600" tabular>{r.pct}%</T>
                      <T size={10} color={C.faint} tabular>
                        {over ? 'lewat ' + fmtNum(r.spent - r.limit) : 'sisa ' + fmtNum(r.sisa)}
                      </T>
                    </View>
                  </Row>
                  <View style={{ height: 3, backgroundColor: C.track, borderRadius: 99, overflow: 'hidden' }}>
                    <View
                      style={{
                        height: 3,
                        width: Math.min(100, r.pct) + '%',
                        backgroundColor: over ? C.ink : C.ink2,
                      }}
                    />
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        <T size={10} color={C.faint} style={{ marginTop: S.lg, lineHeight: 16 }}>
          Anggaran hanya menghitung transaksi bertipe keluar.
        </T>
      </ScrollView>

      <Sheet
        visible={!!edit}
        onClose={() => setEdit(null)}
        eyebrow="ANGGARAN"
        title={monthLabel(mk)}
        footer={
          <Row gap={10}>
            {edit && rows.some((r) => r.cat.id === edit.cat) ? (
              <Btn
                variant="outline"
                label="Hapus"
                icon="trash"
                style={{ flex: 1 }}
                onPress={() => {
                  act.deleteBudget(mk, edit.cat);
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
            <Field label="Kategori">
              <Row wrap gap={8}>
                {s.categories
                  .filter((c) => c.type === 'expense')
                  .map((c) => (
                    <Chip
                      key={c.id}
                      label={c.name}
                      active={edit.cat === c.id}
                      onPress={() => setEdit({ ...edit, cat: c.id })}
                    />
                  ))}
              </Row>
            </Field>
            <Field label="Batas per bulan" hint="Nominal maksimal yang ingin dijaga.">
              <Input
                value={edit.amount ? fmtNum(edit.amount) : ''}
                onChangeText={(t) => setEdit({ ...edit, amount: digitsOnly(t) })}
                placeholder="0"
                keyboardType="number-pad"
                prefix="Rp"
              />
            </Field>
            <Divider style={{ marginTop: S.md }} />
            <T size={11} color={C.faint} style={{ marginTop: S.md, lineHeight: 17 }}>
              Tips: tetapkan sekitar 80% dari rata-rata pengeluaran kategori ini agar masih ada ruang.
            </T>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

const navBtn = {
  width: 34,
  height: 34,
  borderRadius: 17,
  borderWidth: 1,
  borderColor: C.line,
  alignItems: 'center',
  justifyContent: 'center',
};
