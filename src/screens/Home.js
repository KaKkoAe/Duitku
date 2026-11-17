import React from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, GRAD, R, S, TOP_PAD, shadowSoft } from '../theme';
import {
  Btn, Card, Divider, Eyebrow, Icon, IconBtn, Monogram, Row, SectionTitle, T, walletIconKey,
} from '../components/UI';
import TxRow from '../components/TxRow';
import { compact, fmt, monthLabel, pct, thisMonth } from '../utils';
import {
  budgetRows, budgetTotal, monthStats, recentTx, totalBalance, useStore, walletBalance,
} from '../store';
import { useThemeMode } from '../themeMode';

const LOGO = require('../../assets/brand/logo-horizontal.png');
const LOGO_WHITE = require('../../assets/brand/logo-horizontal-putih.png');

export default function Home({ go, openTx, openVoice, openReceipt }) {
  const s = useStore();
  const { isDark, toggle: toggleTheme } = useThemeMode();
  const mk = thisMonth();
  const stats = monthStats(s, mk);
  const total = totalBalance(s);
  const rows = budgetRows(s, mk);
  const over = rows.filter((r) => r.limit > 0 && r.spent > r.limit);
  const near = rows.filter((r) => r.limit > 0 && r.spent <= r.limit && r.pct >= 80);
  const recent = recentTx(s, 5);
  const limitTotal = budgetTotal(s, mk);
  const usedPct = pct(stats.expense, limitTotal);
  const net = stats.income - stats.expense;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={{ paddingTop: TOP_PAD, paddingHorizontal: S.lg }}>
          <Row justify="space-between" align="flex-start">
            <View style={{ flex: 1, minWidth: 0 }}>
              <Eyebrow>{monthLabel(mk)}</Eyebrow>
              <Image
                source={isDark ? LOGO_WHITE : LOGO}
                style={{ width: 118, height: 38, marginTop: 6, marginLeft: -2 }}
                resizeMode="contain"
              />
            </View>
            <Row gap={7}>
              <IconBtn name="tag" size={36} onPress={() => go('budgets')} />
              <IconBtn name="chart" size={36} onPress={() => go('report')} />
              <IconBtn name="wallet" size={36} onPress={() => go('wallets')} />
              <IconBtn
                name={isDark ? 'sun' : 'moon'}
                size={36}
                onPress={() => toggleTheme()}
              />
            </Row>
          </Row>
        </View>

        <View style={{ paddingHorizontal: S.lg, marginTop: S.lg }}>
          <LinearGradient
            colors={GRAD}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: R.xl, padding: 22, overflow: 'hidden' }}
          >
            {/* bulatan dekoratif biar ceria */}
            <View style={{ position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.14)', top: -80, right: -60 }} />
            <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.10)', bottom: -70, left: -30 }} />
            <Row justify="space-between" align="center">
              <T size={10} weight="700" upper tracking={2.2} color={C.onInkDim}>Total saldo</T>
              <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : '#FFFFFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill }}>
                <T size={9} weight="800" upper tracking={1.2} color={isDark ? C.onInk : C.primaryDark}>
                  {net >= 0 ? 'surplus' : 'defisit'}
                </T>
              </View>
            </Row>
            <T size={38} serif weight="800" color={C.onInk} tabular style={{ marginTop: 10, letterSpacing: -0.8 }}>
              {fmt(total)}
            </T>
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: S.lg }} />
            <Row justify="space-between">
              <View style={{ flex: 1 }}>
                <T size={9.5} weight="700" upper tracking={1.8} color={C.onInk}>Masuk</T>
                <Row gap={6} style={{ marginTop: 4 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.22)' : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="arrowDown" size={12} color={isDark ? C.onInk : C.primaryDark} stroke={2.2} />
                  </View>
                  <T size={15} serif weight="800" color={C.onInk} tabular numberOfLines={1}>{fmt(stats.income)}</T>
                </Row>
              </View>
              <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: S.lg }} />
              <View style={{ flex: 1 }}>
                <T size={9.5} weight="700" upper tracking={1.8} color={C.onInk}>Keluar</T>
                <Row gap={6} style={{ marginTop: 4 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.22)' : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="arrowUp" size={12} color={isDark ? C.onInk : C.primaryDark} stroke={2.2} />
                  </View>
                  <T size={15} serif weight="800" color={C.onInk} tabular numberOfLines={1}>{fmt(stats.expense)}</T>
                </Row>
              </View>
            </Row>
          </LinearGradient>
        </View>

        <View style={{ paddingHorizontal: S.lg, marginTop: S.md }}>
          <Row gap={10}>
            <QuickAction icon="mic" label="Bicara" onPress={openVoice} tone={C.lilacSoft} ink={C.inkLilac} />
            <QuickAction icon="camera" label="Foto struk" onPress={openReceipt} tone={C.peachSoft} ink={C.inkPeach} />
            <QuickAction icon="plus" label="Manual" onPress={() => openTx(null)} tone={C.mintSoft} ink={C.inkMint} />
          </Row>
        </View>

        <View style={{ marginTop: S.xl }}>
          <View style={{ paddingHorizontal: S.lg }}>
            <SectionTitle
              sub="Geser untuk lihat semua"
              onRightPress={() => go('wallets')}
              right={
                <View
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 3,
                    paddingHorizontal: 10, paddingVertical: 5,
                    borderRadius: R.pill, backgroundColor: C.lilacSoft,
                  }}
                >
                  <T size={9.5} weight="700" upper tracking={1} color={C.accent}>Atur</T>
                  <Icon name="chevronRight" size={11} color={C.accent} />
                </View>
              }
            >
              Dompet
            </SectionTitle>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingHorizontal: S.lg, paddingVertical: 2 }}
          >
            {s.wallets.map((wl) => (
              <Pressable
                key={wl.id}
                onPress={() => go('wallets')}
                style={({ pressed }) => ({
                  width: 172,
                  backgroundColor: C.paper,
                  borderRadius: R.md,
                  borderWidth: 1,
                  borderColor: C.line,
                  padding: S.md,
                  ...shadowSoft,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Row justify="space-between" align="center">
                  <Monogram kind={walletIconKey(wl)} size={34} />
                  <T size={8.5} weight="700" upper tracking={1.2} color={C.faint}>{wl.type}</T>
                </Row>
                <T size={11.5} color={C.sub} weight="600" numberOfLines={1} style={{ marginTop: S.md }}>
                  {wl.name}
                </T>
                <T
                  size={15}
                  serif
                  weight="700"
                  tabular
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  style={{ marginTop: 2 }}
                >
                  {fmt(walletBalance(s, wl))}
                </T>
              </Pressable>
            ))}
            <Pressable
              onPress={() => go('wallets')}
              style={{
                width: 92,
                borderRadius: R.md,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: C.line,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="plus" size={18} color={C.faint} />
              <T size={10} color={C.faint} weight="500" style={{ marginTop: 6 }}>Dompet</T>
            </Pressable>
          </ScrollView>
        </View>

        {limitTotal > 0 ? (
          <View style={{ paddingHorizontal: S.lg, marginTop: S.xl }}>
            <Pressable onPress={() => go('budgets')}>
              <Card pad={16}>
                <Row justify="space-between" style={{ marginBottom: 10 }}>
                  <T size={12.5} weight="500">Anggaran bulan ini</T>
                  <T size={11.5} color={C.sub} tabular>
                    {compact(stats.expense)} / {compact(limitTotal)}
                  </T>
                </Row>
                <View style={{ height: 4, backgroundColor: C.track, borderRadius: 99, overflow: 'hidden' }}>
                  <View
                    style={{
                      height: 4,
                      width: Math.min(100, usedPct) + '%',
                      backgroundColor: usedPct >= 100 ? C.ink : C.ink2,
                    }}
                  />
                </View>
                <Row justify="space-between" style={{ marginTop: 9 }}>
                  <T size={10.5} color={C.faint}>Terpakai {usedPct}%</T>
                  <T size={10.5} color={C.faint}>Sisa {compact(Math.max(0, limitTotal - stats.expense))}</T>
                </Row>
              </Card>
            </Pressable>
          </View>
        ) : null}

        {over.length > 0 || near.length > 0 ? (
          <View style={{ paddingHorizontal: S.lg, marginTop: S.md }}>
            <Pressable onPress={() => go('budgets')}>
              <Row
                gap={12}
                style={{
                  borderWidth: 1,
                  borderColor: C.ink,
                  borderRadius: R.md,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                }}
              >
                <Icon name="dot" size={16} color={C.ink} />
                <View style={{ flex: 1 }}>
                  <T size={12} weight="600">
                    {over.length ? over.length + ' anggaran terlampaui' : near.length + ' anggaran hampir habis'}
                  </T>
                  <T size={10.5} color={C.sub} style={{ marginTop: 2 }} numberOfLines={1}>
                    {[...over, ...near].slice(0, 2).map((r) => r.cat.name + ' ' + r.pct + '%').join(' \u00b7 ')}
                  </T>
                </View>
                <Icon name="chevronRight" size={14} color={C.faint} />
              </Row>
            </Pressable>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: S.lg, marginTop: S.lg }}>
          <SectionTitle
            right={
              <Pressable onPress={() => go('history')} hitSlop={8}>
                <T size={10.5} weight="600" upper tracking={1.2} color={C.sub}>Semua</T>
              </Pressable>
            }
          >
            Terbaru
          </SectionTitle>

          <Card pad={0} style={{ paddingHorizontal: S.md, paddingVertical: 0 }}>
            {recent.length === 0 ? (
              <View style={{ paddingVertical: S.md, alignItems: 'center' }}>
                <T size={14} serif weight="600">Belum ada catatan</T>
                <T size={11.5} color={C.sub} center style={{ marginTop: 6, lineHeight: 18 }}>
                  Mulai dari satu transaksi. Bisa diketik,{'\n'}diucapkan, atau difoto dari struk.
                </T>
                <Row gap={8} style={{ marginTop: S.md }}>
                  <Btn label="Bicara" icon="mic" small variant="outline" onPress={openVoice} />
                  <Btn label="Foto" icon="camera" small onPress={openReceipt} />
                </Row>
              </View>
            ) : (
              recent.map((tx, i) => (
                <View key={tx.id}>
                  <TxRow s={s} tx={tx} onPress={() => openTx(tx)} showDate />
                  {i < recent.length - 1 ? <Divider style={{ marginLeft: 46 }} /> : null}
                </View>
              ))
            )}
          </Card>

          <T size={10} color={C.faint} center style={{ marginTop: S.xl }}>
            Data tersimpan di perangkat {'·'} tanpa akun
          </T>
        </View>
      </ScrollView>
    </View>
  );
}

function QuickAction({ icon, label, onPress, tone = C.lilacSoft, ink = C.primary }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        borderWidth: 1,
        borderColor: C.line,
        backgroundColor: C.paper,
        borderRadius: R.lg,
        paddingVertical: 13,
        alignItems: 'center',
        gap: 8,
        ...shadowSoft,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View
        style={{
          width: 38, height: 38, borderRadius: 19,
          backgroundColor: tone,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={18} color={ink} stroke={1.8} />
      </View>
      <T size={10.5} weight="700" color={C.ink} tracking={0.2} numberOfLines={1}>{label}</T>
    </Pressable>
  );
}
