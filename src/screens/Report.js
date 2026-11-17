import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { C, R, S } from '../theme';
import Header from '../components/Header';
import { CategoryBars, DayStrip, MonthBars } from '../components/Charts';
import { Card, Divider, Eyebrow, Icon, Row, SectionTitle, T } from '../components/UI';
import { catTotals, dailyExpense, monthStats, monthsSeries, useStore } from '../store';
import { compact, daysInMonth, fmt, fmtNum, monthLabel, monthShort, shiftMonth, thisMonth, todayISO } from '../utils';

export default function Report({ go }) {
  const s = useStore();
  const [mk, setMk] = useState(thisMonth());

  const stats = monthStats(s, mk);
  const prev = monthStats(s, shiftMonth(mk, -1));
  const cats = catTotals(s, mk);
  const daily = dailyExpense(s, mk);
  const series = monthsSeries(s, 6);

  const days = daysInMonth(mk);
  const elapsed = mk === thisMonth() ? Math.max(1, Number(todayISO().slice(8, 10))) : days;
  const avg = Math.round(stats.expense / elapsed);
  const peakDay = daily.reduce((best, v, i) => (v > daily[best] ? i : best), 0);
  const delta = prev.expense > 0 ? Math.round(((stats.expense - prev.expense) / prev.expense) * 100) : null;
  const topCat = cats[0];
  const hasTrend = series.some((m) => m.expense > 0);

  const bars = useMemo(
    () =>
      series.map((m) => ({
        label: monthShort(m.mk),
        value: m.expense,
        highlight: m.mk === mk,
      })),
    [series, mk]
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header
        eyebrow="Laporan"
        title={monthLabel(mk)}
        sub={stats.count + ' transaksi bulan ini'}
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
        <Card dark pad={20}>
          <T size={10} weight="600" upper tracking={2.4} color={C.onInkDim}>Pengeluaran</T>
          <T size={36} serif weight="600" color={C.onInk} tabular style={{ marginTop: 4, letterSpacing: -0.5 }}>
            {fmt(stats.expense)}
          </T>
          {delta !== null ? (
            <Row gap={6} style={{ marginTop: 6 }}>
              <Icon name={delta > 0 ? 'arrowUp' : 'arrowDown'} size={12} color={C.onInkDim} />
              <T size={11} color={C.onInkDim}>
                {Math.abs(delta)}% {delta > 0 ? 'lebih besar' : 'lebih kecil'} dari {monthShort(shiftMonth(mk, -1))}
              </T>
            </Row>
          ) : (
            <T size={11} color={C.onInkDim} style={{ marginTop: 6 }}>Belum ada pembanding bulan lalu</T>
          )}
          <View style={{ height: 1, backgroundColor: 'rgba(245,244,240,0.16)', marginVertical: S.lg }} />
          <Row justify="space-between">
            <View>
              <T size={9.5} weight="600" upper tracking={1.8} color={C.onInkDim}>Masuk</T>
              <T size={15} serif weight="600" color={C.onInk} tabular style={{ marginTop: 3 }}>{fmt(stats.income)}</T>
            </View>
            <View>
              <T size={9.5} weight="600" upper tracking={1.8} color={C.onInkDim}>Selisih</T>
              <T size={15} serif weight="600" color={C.onInk} tabular style={{ marginTop: 3 }}>
                {(stats.income - stats.expense < 0 ? '\u2212' : '') + fmt(Math.abs(stats.income - stats.expense))}
              </T>
            </View>
            <View>
              <T size={9.5} weight="600" upper tracking={1.8} color={C.onInkDim}>Rata-rata/hari</T>
              <T size={15} serif weight="600" color={C.onInk} tabular style={{ marginTop: 3 }}>{fmtNum(avg)}</T>
            </View>
          </Row>
        </Card>

        {stats.count === 0 ? (
          <View style={{ marginTop: S.xl }}>
            <Card pad={20}>
              <T size={13.5} weight="600">Belum ada catatan bulan ini</T>
              <T size={12} color={C.faint} style={{ marginTop: 6, lineHeight: 18 }}>
                Grafik dan rincian muncul otomatis begitu ada transaksi.
              </T>
            </Card>
          </View>
        ) : null}

        {cats.length ? (
          <View style={{ marginTop: S.xl }}>
            <SectionTitle sub={topCat ? 'Terbesar: ' + topCat.cat.name : undefined}>Ke mana uang pergi</SectionTitle>
            <Card pad={16}>
              <CategoryBars
                rows={cats.map((c) => ({ name: c.cat.name, value: c.total, pct: c.share }))}
                total={stats.expense}
              />
            </Card>
          </View>
        ) : null}

        {hasTrend ? (
          <View style={{ marginTop: S.xl }}>
            <SectionTitle sub="Enam bulan terakhir">Tren pengeluaran</SectionTitle>
            <Card pad={16}>
              <MonthBars data={bars} height={104} onPick={(i) => setMk(series[i].mk)} />
            </Card>
          </View>
        ) : null}

        {stats.expense > 0 ? (
        <View style={{ marginTop: S.xl }}>
          <SectionTitle sub={'Hari 1\u2013' + days}>Ritme harian</SectionTitle>
          <Card pad={16}>
            <DayStrip values={daily} height={46} />
            <Row justify="space-between" style={{ marginTop: 10 }}>
              <T size={10} color={C.faint}>1 {monthShort(mk)}</T>
              <T size={10} color={C.faint}>{days} {monthShort(mk)}</T>
            </Row>
            <Divider style={{ marginVertical: S.md }} />
            <Row justify="space-between" style={{ marginBottom: 8 }}>
              <T size={12} color={C.sub}>Hari terboros</T>
              <T size={12} weight="600">{peakDay + 1} {monthShort(mk)} {'\u00b7'} {fmtNum(daily[peakDay] || 0)}</T>
            </Row>
            <Row justify="space-between">
              <T size={12} color={C.sub}>Hari tanpa pengeluaran</T>
              <T size={12} weight="600">{daily.filter((v) => v === 0).length} hari</T>
            </Row>
          </Card>
        </View>
        ) : null}

        {cats.length ? (
        <View style={{ marginTop: S.xl }}>
          <SectionTitle>Kategori teratas</SectionTitle>
          <Card pad={0} style={{ paddingHorizontal: S.md, paddingVertical: 2 }}>
            {cats.slice(0, 5).map((c, i) => (
              <View key={c.cat.id}>
                <Row justify="space-between" style={{ paddingVertical: 11 }}>
                  <Row gap={10} style={{ flex: 1, minWidth: 0 }}>
                    <T size={10} weight="600" color={C.faint} tabular style={{ width: 16 }}>{i + 1}</T>
                    <T size={13} weight="500" numberOfLines={1}>{c.cat.name}</T>
                  </Row>
                  <Row gap={10}>
                    <T size={10.5} color={C.faint} tabular>{c.share}%</T>
                    <T size={12.5} serif weight="600" tabular>{fmtNum(c.total)}</T>
                  </Row>
                </Row>
                {i < Math.min(4, cats.length - 1) ? <Divider style={{ marginLeft: 26 }} /> : null}
              </View>
            ))}
            {cats.length === 0 ? (
              <T size={11.5} color={C.faint} center style={{ paddingVertical: S.xl }}>
                Belum ada pengeluaran pada bulan ini.
              </T>
            ) : null}
          </Card>
        </View>
        ) : null}

        <View style={{ marginTop: S.xl }}>
          <Eyebrow>Catatan</Eyebrow>
          <T size={11} color={C.faint} style={{ marginTop: 6, lineHeight: 17 }}>
            Angka dihitung dari transaksi bertipe keluar. Transfer antar dompet tidak dihitung
            sebagai pengeluaran.
          </T>
        </View>
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
