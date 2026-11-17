import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { C, F, R, S } from '../theme';
import Header from '../components/Header';
import TxRow from '../components/TxRow';
import { Card, Divider, Empty, Icon, Row, T } from '../components/UI';
import { catById, sortedMonthTx, useStore } from '../store';
import { fmtNum, monthLabel, prettyDate, shiftMonth, thisMonth, todayISO } from '../utils';

const FILTERS = [
  { id: 'all', label: 'Semua' },
  { id: 'expense', label: 'Keluar' },
  { id: 'income', label: 'Masuk' },
  { id: 'transfer', label: 'Pindah' },
];

export default function History({ openTx }) {
  const s = useStore();
  const [mk, setMk] = useState(thisMonth());
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const rows = sortedMonthTx(s, mk).filter((t) => filter === 'all' || t.type === filter);
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((t) => {
      const cat = catById(s, t.category);
      return (
        String(t.note || '').toLowerCase().includes(needle) ||
        (cat && cat.name.toLowerCase().includes(needle)) ||
        String(t.amount).includes(needle)
      );
    });
  }, [s, mk, filter, q]);

  const groups = useMemo(() => {
    const map = {};
    list.forEach((t) => {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    });
    return Object.keys(map)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({ date, rows: map[date] }));
  }, [list]);

  const totalOut = list.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  const totalIn = list.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header
        eyebrow="Riwayat"
        title={monthLabel(mk)}
        sub={list.length + ' transaksi'}
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

      <View style={{ paddingHorizontal: S.lg }}>
        <Row
          gap={8}
          style={{
            borderWidth: 1,
            borderColor: C.line,
            backgroundColor: C.paper,
            borderRadius: R.pill,
            paddingHorizontal: 14,
            paddingVertical: 9,
          }}
        >
          <Icon name="search" size={14} color={C.faint} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Cari catatan, kategori, nominal"
            placeholderTextColor={C.faint}
            style={{ flex: 1, fontFamily: F.sans, fontSize: 13, color: C.ink, padding: 0 }}
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={8}>
              <Icon name="close" size={12} color={C.faint} />
            </Pressable>
          ) : null}
        </Row>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: 140 }}
      >
        <Row gap={7} wrap>
          {FILTERS.map((f) => (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={{
                paddingVertical: 7,
                paddingHorizontal: 13,
                borderRadius: R.pill,
                backgroundColor: filter === f.id ? C.inkPanel : 'transparent',
                borderWidth: 1,
                borderColor: filter === f.id ? C.inkPanel : C.line,
              }}
            >
              <T size={11} weight="500" color={filter === f.id ? C.onInk : C.sub}>{f.label}</T>
            </Pressable>
          ))}
        </Row>

        <Row justify="space-between" style={{ marginTop: S.lg, marginBottom: S.sm }}>
          <T size={10} weight="600" upper tracking={1.8} color={C.faint}>
            Keluar {fmtNum(totalOut)}
          </T>
          <T size={10} weight="600" upper tracking={1.8} color={C.faint}>
            Masuk {fmtNum(totalIn)}
          </T>
        </Row>
        <Divider />

        {groups.length === 0 ? (
          <Empty
            icon="list"
            title="Belum ada transaksi"
            text={q ? 'Tidak ada yang cocok dengan pencarian.' : 'Catat pengeluaran pertama lewat tombol + di bawah.'}
          />
        ) : (
          groups.map((g) => {
            const dayOut = g.rows.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
            const dayIn = g.rows.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0);
            return (
              <View key={g.date} style={{ marginTop: S.lg }}>
                <Row justify="space-between" style={{ marginBottom: 8 }}>
                  <Row gap={7}>
                    <T size={11} weight="600" tracking={0.2}>
                      {g.date === todayISO() ? 'Hari ini' : prettyDate(g.date)}
                    </T>
                    <T size={10} color={C.faint}>{g.rows.length + 'x'}</T>
                  </Row>
                  <T size={10.5} color={C.faint} tabular>
                    {dayIn ? '+' + fmtNum(dayIn) + '  ' : ''}{dayOut ? '\u2212' + fmtNum(dayOut) : ''}
                  </T>
                </Row>
                <Card pad={0} style={{ paddingHorizontal: S.md, paddingVertical: 2 }}>
                  {g.rows.map((tx, i) => (
                    <View key={tx.id}>
                      <TxRow s={s} tx={tx} onPress={() => openTx(tx)} />
                      {i < g.rows.length - 1 ? <Divider style={{ marginLeft: 46 }} /> : null}
                    </View>
                  ))}
                </Card>
              </View>
            );
          })
        )}
      </ScrollView>
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
