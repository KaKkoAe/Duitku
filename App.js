import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, useColorScheme, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { FONT_MAP } from './src/fonts';

import { BOTTOM_PAD, C, S } from './src/theme';
import { Icon, Row, Sheet, T } from './src/components/UI';
import VoiceSheet from './src/components/VoiceSheet';
import ReceiptSheet from './src/components/ReceiptSheet';
import { initStore, useStore } from './src/store';
import Home from './src/screens/Home';
import History from './src/screens/History';
import Report from './src/screens/Report';
import Wallets from './src/screens/Wallets';
import Budgets from './src/screens/Budgets';
import TxForm from './src/screens/TxForm';
import { tap } from './src/lib/haptic';
import { initTheme, useThemeMode } from './src/themeMode';

const LOGO_FULL = require('./assets/brand/logo-full.png');
const LOGO_FULL_WHITE = require('./assets/brand/logo-putih.png');

const TABS = [
  { id: 'home', label: 'Beranda', icon: 'home' },
  { id: 'history', label: 'Riwayat', icon: 'list' },
  { id: 'report', label: 'Laporan', icon: 'chart' },
  { id: 'wallets', label: 'Dompet', icon: 'wallet' },
];

export default function App() {
  const s = useStore();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('home');
  const [form, setForm] = useState(null); // { tx, prefill, type }
  const [voice, setVoice] = useState(false);
  const [receipt, setReceipt] = useState(false);
  const [action, setAction] = useState(false);

  // mode tampilan: subscribe di sini → seluruh pohon ikut re-render saat berganti
  const scheme = useColorScheme();
  const { isDark: dark } = useThemeMode();

  const [fontsLoaded] = useFonts(FONT_MAP);

  // splash minimal tampil sebentar supaya animasi logo tidak "kedip"
  const [minSplash, setMinSplash] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinSplash(true), 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    Promise.all([
      initStore().catch((e) => console.warn('initStore', e)),
      initTheme(scheme).catch((e) => console.warn('initTheme', e)),
    ]).finally(() => setReady(true));
    // sengaja hanya sekali: preferensi tema dibaca saat start
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready || !fontsLoaded || !minSplash) return <Splash />;

  const go = (next) => setTab(next);
  const openTx = (tx) =>
    setForm({ tx: tx || null, prefill: null, type: tx ? tx.type : 'expense' });
  const openVoice = () => setVoice(true);
  const openReceipt = () => setReceipt(true);

  const ctx = { categories: s.categories, wallets: s.wallets };
  const fromVoice = (parsed) =>
    setForm({ tx: null, prefill: parsed, type: parsed.type || 'expense' });
  const fromReceipt = (payload) =>
    setForm({ tx: null, prefill: payload, type: payload.type || 'expense' });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style={dark ? 'light' : 'dark'} />

      {tab === 'home' ? (
        <Home go={go} openTx={openTx} openVoice={openVoice} openReceipt={openReceipt} />
      ) : null}
      {tab === 'history' ? <History openTx={openTx} go={go} /> : null}
      {tab === 'report' ? <Report go={go} /> : null}
      {tab === 'wallets' ? <Wallets go={go} /> : null}
      {tab === 'budgets' ? <Budgets go={go} /> : null}

      <TabBar tab={tab} go={go} onAdd={() => { tap(); setAction(true); }} />

      <Sheet
        visible={action}
        onClose={() => setAction(false)}
        eyebrow="CATAT CEPAT"
        title="Mau lewat mana?"
      >
        <ActionRow
          icon="mic"
          title="Bicara"
          sub={'Ucapkan, mis. "makan siang 35 ribu pakai tunai"'}
          onPress={() => {
            setAction(false);
            setTimeout(() => setVoice(true), 240);
          }}
        />
        <ActionRow
          icon="camera"
          title="Foto struk belanja"
          sub="Kamera atau galeri, nominal dibaca otomatis"
          onPress={() => {
            setAction(false);
            setTimeout(() => setReceipt(true), 240);
          }}
        />
        <ActionRow
          icon="edit"
          title="Ketik manual"
          sub="Isi nominal, kategori, dan dompet sendiri"
          last
          onPress={() => {
            setAction(false);
            setTimeout(() => openTx(null), 240);
          }}
        />
      </Sheet>

      <VoiceSheet
        visible={voice}
        ctx={ctx}
        onClose={() => setVoice(false)}
        onApply={fromVoice}
      />
      <ReceiptSheet
        visible={receipt}
        ctx={ctx}
        onClose={() => setReceipt(false)}
        onApply={fromReceipt}
      />
      <TxForm
        visible={!!form}
        initial={form ? form.tx : null}
        prefill={form ? form.prefill : null}
        defaultType={form ? form.type : 'expense'}
        onClose={() => setForm(null)}
      />
    </View>
  );
}

function ActionRow({ icon, title, sub, onPress, last }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 15,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.lineSoft,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: C.line,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={18} color={C.ink} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T size={14} weight="600">{title}</T>
        <T size={11} color={C.sub} style={{ marginTop: 3 }} numberOfLines={2}>{sub}</T>
      </View>
      <Icon name="chevronRight" size={14} color={C.faint} />
    </Pressable>
  );
}

function TabBar({ tab, go, onAdd }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 10,
        backgroundColor: C.paper,
        borderRadius: 26,
        borderWidth: 1,
        borderColor: C.line,
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingTop: 10,
        paddingBottom: Math.max(10, BOTTOM_PAD - 8),
        shadowColor: '#6F5BD6',
        shadowOpacity: 0.14,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      }}
    >
      {TABS.slice(0, 2).map((t) => (
        <TabItem key={t.id} t={t} on={tab === t.id} go={go} />
      ))}

      <View style={{ flex: 1, alignItems: 'center' }}>
        <Pressable
          onPress={onAdd}
          accessibilityLabel="Catat transaksi"
          style={({ pressed }) => ({
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: C.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: -30,
            borderWidth: 4,
            borderColor: C.paper,
            shadowColor: C.primary,
            shadowOpacity: 0.4,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 10,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Icon name="plus" size={24} color={C.onInk} stroke={2.1} />
        </Pressable>
      </View>

      {TABS.slice(2).map((t) => (
        <TabItem key={t.id} t={t} on={tab === t.id} go={go} />
      ))}
    </View>
  );
}

function TabItem({ t, on, go }) {
  return (
    <Pressable
      onPress={() => { if (!on) tap(); go(t.id); }}
      style={{ flex: 1, alignItems: 'center', paddingVertical: 3 }}
    >
      <View
        style={{
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderRadius: 16,
          backgroundColor: on ? C.lilacSoft : 'transparent',
        }}
      >
        <Icon name={t.icon} size={19} color={on ? C.accent : C.faint} stroke={on ? 1.9 : 1.4} />
        <T
          size={9}
          weight={on ? '700' : '500'}
          color={on ? C.accent : C.faint}
          tracking={0.2}
          style={{ marginTop: 4 }}
        >
          {t.label}
        </T>
      </View>
    </Pressable>
  );
}

function Splash() {
  const { isDark: dark } = useThemeMode();
  const logo = useRef(new Animated.Value(0)).current;
  const tag = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const native = Platform.OS !== 'web';
    Animated.sequence([
      Animated.timing(logo, {
        toValue: 1,
        duration: 640,
        easing: Easing.out(Easing.back(1.3)),
        useNativeDriver: native,
      }),
      Animated.timing(tag, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: native,
      }),
    ]).start();

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: native }),
        Animated.timing(float, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: native }),
      ])
    );
    floatLoop.start();

    const dotLoop = (v, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 320, useNativeDriver: native }),
          Animated.timing(v, { toValue: 0.3, duration: 320, useNativeDriver: native }),
          Animated.delay(640 - delay),
        ])
      );
    const dots = [dotLoop(dot1, 0), dotLoop(dot2, 160), dotLoop(dot3, 320)];
    dots.forEach((d) => d.start());

    return () => {
      floatLoop.stop();
      dots.forEach((d) => d.stop());
    };
  }, [logo, tag, float, dot1, dot2, dot3]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
      <StatusBar style={dark ? 'light' : 'dark'} />

      {/* balon pastel di latar */}
      <View pointerEvents="none" style={{ position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: C.lilacSoft, opacity: 0.75, top: -70, left: -90 }} />
      <View pointerEvents="none" style={{ position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: C.peachSoft, opacity: 0.55, bottom: 30, right: -70 }} />
      <View pointerEvents="none" style={{ position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: C.mintSoft, opacity: 0.5, bottom: 120, left: -40 }} />

      <Animated.View
        style={{
          opacity: logo,
          transform: [
            { scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) },
            { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) },
          ],
        }}
      >
        <Image source={dark ? LOGO_FULL_WHITE : LOGO_FULL} style={{ width: 220, height: 220 }} resizeMode="contain" />
      </Animated.View>

      <Animated.View style={{ opacity: tag, alignItems: 'center' }}>
        <T size={12} weight="600" color={C.sub} tracking={0.3} style={{ marginTop: S.sm }}>
          Catat duit, rapi tiap hari
        </T>
        <Row gap={6} style={{ marginTop: S.lg }}>
          {[dot1, dot2, dot3].map((d, i) => (
            <Animated.View
              key={i}
              style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.primary, opacity: d }}
            />
          ))}
        </Row>
      </Animated.View>
    </View>
  );
}
