import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, TextInput, View } from 'react-native';
import { C, F, R, S } from '../theme';
import { Btn, Divider, Eyebrow, Icon, Row, Sheet, T } from './UI';
import { describeParse, parseText } from '../lib/parser';
import {
  SPEECH_LANG, openAppSettings, requestMicPermission, speechHint, speechSupport, startListening,
} from '../lib/speech';
import { tap } from '../lib/haptic';

const EXAMPLES = [
  'beli kopi 25 ribu pakai gopay',
  'makan siang 35rb pakai tunai',
  'gaji 8,5 juta masuk BCA',
  'transfer 100rb dari BCA ke GoPay',
];

const BAR_COUNT = 26;
const pad2 = (n) => (n < 10 ? `0${n}` : String(n));
const clock = (secs) => `${pad2(Math.floor(secs / 60))}:${pad2(secs % 60)}`;

const ERR_TEXT = {
  'not-allowed': 'Izin mikrofon ditolak. Aktifkan izin mikrofon untuk Duitku, lalu coba lagi.',
  'service-not-allowed':
    'Layanan pengenalan suara Google tidak aktif. Pasang/aktifkan aplikasi Google di HP ini, atau tulis manual di bawah.',
  network: 'Pengenalan suara butuh koneksi internet (mesin Google). Periksa jaringanmu.',
  busy: 'Mesin suara sedang dipakai aplikasi lain. Tunggu sebentar.',
  'language-not-supported': 'Bahasa Indonesia belum tersedia di mesin suara perangkat ini.',
  'audio-capture': 'Mikrofon tidak terbaca. Cek apakah ada aplikasi lain yang memakainya.',
  unavailable: 'Mesin dikte native tidak tersedia di build ini.',
  'start-failed': 'Rekaman gagal dimulai. Coba lagi.',
};

export default function VoiceSheet({ visible, onClose, onApply, ctx }) {
  const [text, setText] = useState('');
  const [interim, setInterim] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | asking | listening | blocked | unsupported
  const [notice, setNotice] = useState('');
  const [canRetry, setCanRetry] = useState(true);
  const [secs, setSecs] = useState(0);
  const [bars, setBars] = useState(() => new Array(BAR_COUNT).fill(0.16));

  const inputRef = useRef(null);
  const recRef = useRef(null);
  const barsRef = useRef(bars);
  const lastVol = useRef(0);
  const aliveRef = useRef(true);

  const pulse = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const loopRef = useRef(null);

  const parsed = useMemo(() => parseText(text, ctx), [text, ctx]);
  const chips = useMemo(() => describeParse(parsed, ctx), [parsed, ctx]);
  const ready = parsed.amount > 0;

  const listening = phase === 'listening';
  const asking = phase === 'asking';

  // ------------------------------------------------------------ animasi mic
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!listening) {
      if (loopRef.current) loopRef.current.forEach((l) => l.stop());
      loopRef.current = null;
      pulse.setValue(0);
      pulse2.setValue(0);
      return undefined;
    }
    pulse.setValue(0);
    pulse2.setValue(0);
    const native = Platform.OS !== 'web';
    // Dua cincin dengan fase berbeda supaya denyutnya terlihat hidup.
    const mk = (val, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 1700,
            easing: Easing.out(Easing.quad),
            useNativeDriver: native,
          }),
          Animated.timing(val, { toValue: 0, duration: 0, useNativeDriver: native }),
        ]),
      );
    const a = mk(pulse, 0);
    const b = mk(pulse2, 850);
    loopRef.current = [a, b];
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
      pulse.setValue(0);
      pulse2.setValue(0);
    };
  }, [listening, pulse, pulse2]);

  // ------------------------------------------------------------ timer rekam
  useEffect(() => {
    if (!listening) return undefined;
    setSecs(0);
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [listening]);

  // Gelombang suara cadangan: kalau mesin tidak mengirim event volume
  // (mis. Web Speech API), bar tetap bergerak pelan supaya tidak terlihat mati.
  useEffect(() => {
    if (!listening) return undefined;
    const id = setInterval(() => {
      const now = Date.now();
      if (now - lastVol.current < 500) return; // masih ada data volume asli
      const next = barsRef.current.map((_, i) => {
        const v = 0.16 + 0.34 * (0.5 + 0.5 * Math.sin(now / 230 + i * 0.55));
        return Math.max(0.14, Math.min(1, v));
      });
      barsRef.current = next;
      if (aliveRef.current) setBars(next);
    }, 120);
    return () => clearInterval(id);
  }, [listening]);

  // ------------------------------------------------------------ rekaman
  const resetBars = () => {
    barsRef.current = new Array(BAR_COUNT).fill(0.16);
    setBars(barsRef.current);
  };

  const stopRec = useCallback((abort) => {
    const h = recRef.current;
    recRef.current = null;
    if (!h) return;
    if (abort) h.abort();
    else h.stop();
  }, []);

  const startRec = useCallback(async () => {
    if (recRef.current) return;
    const support = speechSupport();
    if (!support.ok) {
      setPhase('unsupported');
      return;
    }
    setNotice('');
    setPhase('asking');
    const perm = await requestMicPermission();
    if (!aliveRef.current) return;
    if (!perm.granted) {
      setCanRetry(perm.canAskAgain !== false);
      setPhase('blocked');
      if (perm.reason === 'error') setNotice('Gagal meminta izin mikrofon.');
      return;
    }
    const handle = startListening({
      onStart: () => {
        if (aliveRef.current) {
          setNotice('');
          setPhase('listening');
        }
      },
      onPartial: (t) => {
        if (aliveRef.current) setInterim(t);
      },
      onFinal: (t) => {
        const clean = String(t || '').trim();
        if (!aliveRef.current || !clean) return;
        setInterim('');
        setText((prev) => (prev ? `${prev} ${clean}` : clean));
      },
      onVolume: (level) => {
        const now = Date.now();
        if (now - lastVol.current < 80) return;
        lastVol.current = now;
        const next = barsRef.current.map((_, i) => {
          const wobble = 0.5 + 0.5 * Math.sin(now / 170 + i * 0.62);
          const v = 0.12 + level * (0.3 + 0.7 * wobble);
          return Math.max(0.12, Math.min(1, v));
        });
        barsRef.current = next;
        if (aliveRef.current) setBars(next);
      },
      onError: (e) => {
        if (!aliveRef.current) return;
        if (e.code === 'no-speech') return; // wajar — biarkan mesin lanjut mendengar
        const base = ERR_TEXT[e.code] || 'Terjadi masalah saat merekam.';
        const detail = e.message ? String(e.message) : '';
        const technical = detail && detail !== base;
        setNotice(technical ? `${base}\n${detail}` : base);
        if (e.code === 'not-allowed' || e.code === 'service-not-allowed') {
          setCanRetry(true);
          setPhase('blocked');
        }
        // Mesin suara bermasalah → kembali ke tombol besar + pilihan tulis manual
        if (e.code === 'unavailable' || e.code === 'start-failed' || e.code === 'language-not-supported') {
          setCanRetry(true);
          setPhase('idle');
        }
      },
      onEnd: () => {
        recRef.current = null;
        if (!aliveRef.current) return;
        setInterim('');
        resetBars();
        setPhase((p) => (p === 'listening' || p === 'asking' ? 'idle' : p));
      },
    });
    if (!handle) {
      setPhase('unsupported');
      return;
    }
    recRef.current = handle;
  }, []);

  const toggle = () => {
    tap();
    if (listening || asking) {
      stopRec(false);
      return;
    }
    setNotice('');
    startRec();
  };

  // ------------------------------------------------------------ buka / tutup
  useEffect(() => {
    if (!visible) {
      stopRec(true);
      return undefined;
    }
    setText('');
    setInterim('');
    setNotice('');
    setCanRetry(true);
    setSecs(0);
    resetBars();
    setPhase('idle');
    // beri napas untuk animasi sheet, lalu LANGSUNG dengarkan
    // (tanpa memanggil mikrofon keyboard bawaan HP)
    const id = setTimeout(() => {
      if (aliveRef.current) startRec();
    }, 380);
    return () => {
      clearTimeout(id);
      stopRec(true);
    };
  }, [visible]);

  const apply = () => {
    if (!ready) return;
    tap();
    stopRec(true);
    onApply(parsed);
    onClose();
  };

  const close = () => {
    stopRec(true);
    onClose();
  };

  const shown = text ? (interim ? `${text} ${interim}` : text) : interim;

  const ringStyle = (val, scaleTo, opacity) => ({
    transform: [{ scale: val.interpolate({ inputRange: [0, 1], outputRange: [1, scaleTo] }) }],
    opacity: val.interpolate({ inputRange: [0, 1], outputRange: [opacity, 0] }),
  });

  const statusLabel = listening
    ? 'Mendengarkan…'
    : asking
      ? 'Menyiapkan mikrofon…'
      : phase === 'blocked'
        ? 'Izin mikrofon dibutuhkan'
        : phase === 'unsupported'
          ? 'Dikte belum tersedia'
          : text
            ? 'Selesai — periksa hasilnya'
            : 'Ketuk mikrofon untuk bicara';

  return (
    <Sheet
      visible={visible}
      onClose={close}
      eyebrow="INPUT SUARA"
      title="Bicara saja"
      footer={
        listening || asking ? (
          <Row gap={10}>
            <Btn variant="outline" label="Batal" onPress={close} style={{ flex: 1 }} />
            <Btn
              label="Selesai"
              icon="check"
              disabled={asking}
              onPress={() => {
                tap();
                stopRec(false);
              }}
              style={{ flex: 1 }}
            />
          </Row>
        ) : (
          <Row gap={10}>
            <Btn
              variant="outline"
              label="Bersihkan"
              onPress={() => {
                tap();
                setText('');
                setInterim('');
                setNotice('');
              }}
              style={{ flex: 1 }}
            />
            <Btn
              label={ready ? 'Gunakan' : 'Belum ada nominal'}
              icon={ready ? 'check' : undefined}
              disabled={!ready}
              onPress={apply}
              style={{ flex: 1.4 }}
            />
          </Row>
        )
      }
    >
      <T size={12.5} color={C.sub} style={{ lineHeight: 19, marginBottom: S.md }}>
        {speechHint()}
      </T>

      {/* ── panel rekam: mic berdenyut + gelombang suara + timer ── */}
      <View style={{ alignItems: 'center', paddingTop: 2 }}>
        <View style={{ width: 172, height: 172, alignItems: 'center', justifyContent: 'center' }}>
          {listening ? (
            <>
              <Animated.View
                pointerEvents="none"
                style={[
                  { position: 'absolute', width: 92, height: 92, borderRadius: 46, backgroundColor: C.lilac },
                  ringStyle(pulse, 2.15, 0.34),
                ]}
              />
              <Animated.View
                pointerEvents="none"
                style={[
                  { position: 'absolute', width: 92, height: 92, borderRadius: 46, backgroundColor: C.lilac },
                  ringStyle(pulse2, 1.75, 0.24),
                ]}
              />
            </>
          ) : null}
          <Pressable
            onPress={toggle}
            style={({ pressed }) => ({
              width: 92,
              height: 92,
              borderRadius: 46,
              backgroundColor: listening ? C.inkPanel : C.paper,
              borderWidth: listening ? 0 : 1,
              borderColor: C.line,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.82 : 1,
              shadowColor: C.ink,
              shadowOpacity: listening ? 0.2 : 0.07,
              shadowRadius: listening ? 16 : 9,
              shadowOffset: { width: 0, height: 6 },
              elevation: listening ? 8 : 3,
            })}
          >
            {listening ? (
              <View style={{ width: 20, height: 20, borderRadius: 5, backgroundColor: C.onInk }} />
            ) : (
              <Icon name="mic" size={34} color={C.ink} stroke={1.4} />
            )}
          </Pressable>
        </View>

        <Row gap={3} align="center" justify="center" style={{ height: 24, marginTop: 2 }}>
          {bars.map((h, i) => (
            <View
              key={i}
              style={{
                width: 3,
                height: Math.max(4, Math.round(h * 26)),
                borderRadius: 2,
                backgroundColor: listening ? C.lilac : C.line,
                opacity: listening ? 0.45 + h * 0.55 : 1,
              }}
            />
          ))}
        </Row>

        <Row gap={8} align="center" style={{ marginTop: 10 }}>
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: listening ? C.expense : phase === 'blocked' ? C.amber : C.faint,
            }}
          />
          <T size={10} weight="600" upper tracking={1.8} color={listening ? C.ink : C.faint}>
            {statusLabel}
          </T>
          {listening ? (
            <T size={10} weight="600" upper tracking={1.8} color={C.faint} tabular>{clock(secs)}</T>
          ) : null}
        </Row>
      </View>

      {/* ── teks hasil transkripsi real-time ── */}
      <View
        style={{
          marginTop: S.md,
          borderRadius: R.md,
          borderWidth: 1,
          borderColor: listening ? C.lilac : C.line,
          backgroundColor: C.bgAlt,
          paddingHorizontal: 14,
          paddingVertical: 12,
          minHeight: 76,
        }}
      >
        <Row justify="space-between" align="center">
          <Eyebrow color={C.sub}>Hasil dikte</Eyebrow>
          <Row gap={8} align="center">
            <View
              style={{
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: 6,
                backgroundColor: listening ? C.lilacSoft : C.track,
              }}
            >
              <T size={9.5} weight="700" color={listening ? C.inkLilac : C.sub} tracking={0.6}>{SPEECH_LANG}</T>
            </View>
            {listening ? <T size={9} weight="700" color={C.expense} tracking={1.4}>LIVE</T> : null}
          </Row>
        </Row>
        <T
          size={15}
          weight={shown ? '500' : '400'}
          color={shown ? C.ink : C.faint}
          style={{ marginTop: 8, lineHeight: 23, minHeight: 46 }}
        >
          {shown || (asking ? 'Menyiapkan mikrofon…' : 'Ucapkan transaksimu — misalnya “beli kopi 25 ribu pakai gopay”.')}
        </T>
      </View>

      {notice ? (
        <T size={11.5} color={C.sub} style={{ marginTop: S.md, lineHeight: 17 }}>{notice}</T>
      ) : null}

      {phase === 'blocked' ? (
        <Row gap={8} style={{ marginTop: S.md }}>
          {canRetry ? (
            <Btn
              small
              variant="outline"
              label="Coba lagi"
              icon="mic"
              onPress={() => {
                tap();
                startRec();
              }}
              style={{ flex: 1 }}
            />
          ) : null}
          <Btn
            small
            variant="outline"
            label="Buka pengaturan"
            icon="settings"
            onPress={() => openAppSettings()}
            style={{ flex: 1 }}
          />
        </Row>
      ) : null}

      {phase === 'unsupported' ? (
        <T size={11.5} color={C.sub} style={{ marginTop: S.md, lineHeight: 17 }}>
          Dikte belum bisa dipakai di perangkat ini. Sementara itu tulis transaksimu di kolom bawah —
          hasil bacanya tetap otomatis.
        </T>
      ) : null}

      <View style={{ marginTop: S.lg }}>
        <Eyebrow color={C.sub}>{text ? 'Yang terdengar' : 'Atau tulis langsung'}</Eyebrow>
        <View
          style={{
            marginTop: 8,
            backgroundColor: C.paper,
            borderWidth: 1,
            borderColor: C.line,
            borderRadius: R.md,
            paddingHorizontal: 14,
            paddingVertical: 12,
            minHeight: 74,
          }}
        >
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            editable={!listening}
            multiline
            placeholder="Contoh: makan siang 35 ribu pakai tunai"
            placeholderTextColor={C.faint}
            style={{
              fontFamily: F.sans,
              fontSize: 16,
              lineHeight: 24,
              color: C.ink,
              minHeight: 48,
              padding: 0,
            }}
          />
        </View>
      </View>

      {!text && !interim ? (
        <View style={{ marginTop: S.lg }}>
          <Eyebrow color={C.sub}>Contoh kalimat</Eyebrow>
          <Row wrap gap={8} style={{ marginTop: 10 }}>
            {EXAMPLES.map((ex) => (
              <Pressable
                key={ex}
                onPress={() => {
                  tap();
                  setText(ex);
                }}
                style={({ pressed }) => ({
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: R.pill,
                  borderWidth: 1,
                  borderColor: C.line,
                  backgroundColor: C.paper,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <T size={11.5} color={C.sub}>{ex}</T>
              </Pressable>
            ))}
          </Row>
        </View>
      ) : null}

      {text ? (
        <View style={{ marginTop: S.xl }}>
          <Eyebrow color={C.sub}>Hasil baca</Eyebrow>
          <Divider style={{ marginTop: 10, marginBottom: 14 }} />
          <Row justify="space-between" align="flex-end">
            <View style={{ flex: 1, minWidth: 0 }}>
              <T size={30} serif weight="600" color={ready ? C.ink : C.faint} numberOfLines={1}>
                {ready ? 'Rp ' + fmtNum(parsed.amount) : 'Rp —'}
              </T>
              <T size={12.5} color={C.sub} numberOfLines={2} style={{ marginTop: 4 }}>
                {parsed.note || (parsed.type === 'transfer' ? 'Transfer antar dompet' : 'Tanpa catatan')}
              </T>
            </View>
            <View style={{ alignItems: 'flex-end', marginLeft: 16 }}>
              <T size={10} weight="600" upper tracking={1.8} color={C.sub}>Keyakinan</T>
              <T size={18} serif weight="600" tabular>{Math.round(parsed.confidence * 100)}%</T>
            </View>
          </Row>
          <Row wrap gap={6} style={{ marginTop: S.md }}>
            {chips.filter((c) => c.ok).map((c) => (
              <View
                key={c.key}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 11,
                  borderRadius: R.pill,
                  backgroundColor: C.inkPanel,
                }}
              >
                <T size={11} weight="500" color={C.onInk} tracking={0.2}>{c.label}</T>
              </View>
            ))}
          </Row>
          {!ready ? (
            <T size={11.5} color={C.sub} style={{ marginTop: S.md }}>
              Sebutkan nominalnya, misal “tiga puluh lima ribu”, lalu hasilnya muncul di sini.
            </T>
          ) : null}
        </View>
      ) : null}
    </Sheet>
  );
}

const fmtNum = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
