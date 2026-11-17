import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { WebView } from 'react-native-webview';
import { C, F, R, S } from '../theme';
import { Btn, Divider, Eyebrow, Icon, Row, Sheet, T } from './UI';
import { parseReceipt } from '../lib/parser';
import {
  engineLabel,
  ocrEngine,
  ocrStatusLabel,
  prepareImage,
  recognizeOnWeb,
  recognizeWithMlKit,
} from '../lib/ocr';
import { TESSERACT_HTML } from '../lib/tesseractHtml';
import { saveReceiptPhoto } from '../lib/photos';
import { tap } from '../lib/haptic';

const todayISO = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
};

const fmtNum = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return d.getDate() + ' ' + bulan[d.getMonth()] + ' ' + d.getFullYear();
};

export default function ReceiptSheet({ visible, onClose, onApply, ctx }) {
  const [stage, setStage] = useState('pick'); // pick | working | review
  const [image, setImage] = useState(null);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [showText, setShowText] = useState(false);
  const [job, setJob] = useState(null);
  const [busyApply, setBusyApply] = useState(false);
  const webRef = useRef(null);
  const scannedRef = useRef(false);
  const timerRef = useRef(null);

  const engine = ocrEngine();
  const parsed = useMemo(() => parseReceipt(text, ctx), [text, ctx]);
  const hasTotal = parsed.total > 0;

  const reset = () => {
    setStage('pick');
    setImage(null);
    setText('');
    setStatus('');
    setProgress(0);
    setError('');
    setShowText(false);
    setJob(null);
    setBusyApply(false);
    scannedRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  useEffect(() => {
    if (!visible) reset();
  }, [visible]);

  const guard = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setError('OCR terlalu lama. Coba foto yang lebih terang, atau tempel teks struknya.');
      setStage('review');
      setJob(null);
    }, 90000);
  };

  const pick = async (from) => {
    tap();
    setError('');
    try {
      let res;
      if (from === 'camera' && Platform.OS !== 'web') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setError('Izin kamera ditolak. Aktifkan di pengaturan atau pilih dari galeri.');
          return;
        }
        res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9, base64: true });
      } else {
        if (Platform.OS === 'ios') {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            setError('Izin galeri ditolak.');
            return;
          }
        }
        res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, base64: true });
      }
      if (!res || res.canceled || !res.assets || !res.assets.length) return;

      const asset = res.assets[0];
      setStage('working');
      setStatus('Menyiapkan foto…');
      setProgress(0.08);
      setImage({ uri: asset.uri, base64: asset.base64 || '' });

      const prepared = await prepareImage(asset.uri);
      setImage({ uri: prepared.uri || asset.uri, base64: prepared.base64 || asset.base64 || '' });
      setProgress(0.16);
      setStatus('Membaca struk…');
      guard();

      if (engine === 'mlkit') {
        const out = await recognizeWithMlKit(prepared.uri || asset.uri);
        if (timerRef.current) clearTimeout(timerRef.current);
        setText(out || '');
        setStage('review');
      } else if (engine === 'web') {
        const out = await recognizeOnWeb(
          { uri: prepared.uri || asset.uri, base64: prepared.base64 || asset.base64 },
          (s, p) => {
            setStatus(ocrStatusLabel(s));
            setProgress(Math.max(0.16, p || 0));
          }
        );
        if (timerRef.current) clearTimeout(timerRef.current);
        setText(out || '');
        setStage('review');
      } else {
        // Expo Go di HP: OCR lewat WebView
        if (!prepared.base64 && !asset.base64) {
          setError('Foto tidak bisa dibaca mesin OCR. Tempel teks struk secara manual.');
          setStage('review');
          setShowText(true);
          return;
        }
        scannedRef.current = false;
        setJob('data:image/jpeg;base64,' + (prepared.base64 || asset.base64));
      }
    } catch (e) {
      setError(e && e.message ? e.message : 'Gagal membuka foto.');
      setStage('review');
    }
  };

  const onWebViewMessage = (event) => {
    let msg = null;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch (e) {
      return;
    }
    if (!msg) return;
    if (msg.type === 'ready') {
      if (job && webRef.current && !scannedRef.current) {
        scannedRef.current = true;
        webRef.current.injectJavaScript('window.__scan(' + JSON.stringify(job) + ');true;');
      }
      return;
    }
    if (msg.type === 'progress') {
      setStatus(ocrStatusLabel(msg.status));
      setProgress(Math.max(0.16, msg.progress || 0));
      return;
    }
    if (msg.type === 'result') {
      if (timerRef.current) clearTimeout(timerRef.current);
      setText(msg.text || '');
      setStage('review');
      setJob(null);
      return;
    }
    if (msg.type === 'error') {
      if (timerRef.current) clearTimeout(timerRef.current);
      setError(msg.message || 'OCR gagal.');
      setStage('review');
      setShowText(true);
      setJob(null);
    }
  };

  const apply = async () => {
    if (!hasTotal) return;
    tap();
    setBusyApply(true);
    let receiptUri = null;
    try {
      if (image && image.uri) receiptUri = await saveReceiptPhoto(image.uri, image.base64);
    } catch (e) {
      receiptUri = null;
    }
    const noteParts = [];
    if (parsed.merchant) noteParts.push(parsed.merchant);
    if (parsed.items.length) noteParts.push(parsed.items.length + ' item');
    onApply({
      type: 'expense',
      amount: parsed.total,
      note: noteParts.join(' · '),
      date: parsed.date || todayISO(),
      categoryId: parsed.categorySuggestion ? parsed.categorySuggestion.id : null,
      receiptUri,
      merchant: parsed.merchant,
      items: parsed.items,
    });
    setBusyApply(false);
    onClose();
  };

  const footer =
    stage === 'review' ? (
      <Row gap={10}>
        <Btn
          variant="outline"
          label="Ulangi"
          onPress={() => {
            reset();
          }}
          style={{ flex: 1 }}
        />
        <Btn
          label={hasTotal ? 'Lanjut' : 'Isi manual'}
          icon="arrowRight"
          disabled={busyApply}
          onPress={() => {
            if (hasTotal) {
              apply();
            } else {
              onApply({
                type: 'expense',
                amount: 0,
                note: parsed.merchant || '',
                date: parsed.date || todayISO(),
                categoryId: null,
                receiptUri: image ? image.uri : null,
                items: parsed.items,
              });
              onClose();
            }
          }}
          style={{ flex: 1.4 }}
        />
      </Row>
    ) : null;

  return (
    <Sheet
      visible={visible}
      onClose={() => {
        reset();
        onClose();
      }}
      eyebrow="FOTO STRUK"
      title="Pindai struk"
      footer={footer}
    >
      {job ? (
        <View style={{ position: 'absolute', width: 1, height: 1, opacity: 0, left: -10, top: -10 }}>
          <WebView
            ref={webRef}
            originWhitelist={['*']}
            source={{ html: TESSERACT_HTML }}
            onMessage={onWebViewMessage}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            allowFileAccess
          />
        </View>
      ) : null}

      {stage === 'pick' ? (
        <View>
          <T size={12.5} color={C.sub} style={{ lineHeight: 19, marginBottom: S.lg }}>
            Foto struk belanja, nominal dan tanggalnya dibaca otomatis. Foto tidak dikirim ke mana pun —
            pembacaan terjadi di perangkat.
          </T>

          <Row gap={12}>
            <Tile
              icon="camera"
              label="Kamera"
              hint="Foto struk"
              onPress={() => pick('camera')}
              primary
            />
            <Tile icon="image" label="Galeri" hint="Pilih foto" onPress={() => pick('library')} />
          </Row>

          <Pressable
            onPress={() => {
              tap();
              setStage('review');
              setShowText(true);
            }}
            style={({ pressed }) => ({ marginTop: S.xl, opacity: pressed ? 0.6 : 1 })}
          >
            <Row justify="space-between" align="center">
              <T size={12.5} color={C.ink} weight="500">Tidak bisa foto? Tempel teks struk</T>
              <Icon name="chevronRight" size={16} color={C.faint} />
            </Row>
          </Pressable>

          <Divider style={{ marginTop: S.lg }} />
          <T size={10.5} color={C.faint} style={{ marginTop: S.md }}>
            Mesin OCR: {engineLabel()}
          </T>
        </View>
      ) : null}

      {stage === 'working' ? (
        <View>
          <Row gap={14} align="flex-start">
            {image ? (
              <Image
                source={{ uri: image.uri }}
                style={{ width: 96, height: 124, borderRadius: R.md, backgroundColor: C.track }}
                resizeMode="cover"
              />
            ) : null}
            <View style={{ flex: 1 }}>
              <T size={10} weight="600" upper tracking={2} color={C.faint}>Memindai</T>
              <T size={16} serif weight="600" style={{ marginTop: 6 }}>Sedang membaca…</T>
              <T size={12} color={C.sub} style={{ marginTop: 6, lineHeight: 18 }}>{status}</T>
              <View
                style={{
                  height: 3,
                  backgroundColor: C.track,
                  borderRadius: 99,
                  marginTop: S.md,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: 3,
                    width: Math.round(Math.min(1, Math.max(0.05, progress)) * 100) + '%',
                    backgroundColor: C.ink,
                  }}
                />
              </View>
            </View>
          </Row>
          <Row justify="center" style={{ marginTop: S.xl }}>
            <ActivityIndicator color={C.ink} />
          </Row>
          <T size={10.5} color={C.faint} center style={{ marginTop: S.md }}>
            Proses pertama butuh waktu lebih lama karena mesin OCR diunduh.
          </T>
        </View>
      ) : null}

      {stage === 'review' ? (
        <View>
          {image ? (
            <Row gap={14} align="flex-start" style={{ marginBottom: S.lg }}>
              <Image
                source={{ uri: image.uri }}
                style={{ width: 64, height: 82, borderRadius: R.sm, backgroundColor: C.track }}
                resizeMode="cover"
              />
              <View style={{ flex: 1 }}>
                <T size={16} serif weight="600" numberOfLines={1}>
                  {parsed.merchant || 'Struk tanpa nama toko'}
                </T>
                <T size={11.5} color={C.sub} style={{ marginTop: 3 }}>
                  {parsed.date ? fmtDate(parsed.date) : 'Tanggal tidak terbaca'}
                  {parsed.items.length ? ' · ' + parsed.items.length + ' item' : ''}
                </T>
              </View>
            </Row>
          ) : null}

          <View
            style={{
              borderWidth: 1,
              borderColor: C.line,
              borderRadius: R.md,
              padding: S.lg,
              backgroundColor: C.paper,
            }}
          >
            <Row justify="space-between" align="flex-end">
              <View>
                <T size={10} weight="600" upper tracking={2} color={C.faint}>Total</T>
                <T size={34} serif weight="600" tabular style={{ marginTop: 2 }}>
                  {hasTotal ? 'Rp ' + fmtNum(parsed.total) : 'Rp —'}
                </T>
              </View>
              {parsed.categorySuggestion ? (
                <View style={{ paddingVertical: 6, paddingHorizontal: 11, borderRadius: R.pill, backgroundColor: C.inkPanel }}>
                  <T size={11} color={C.onInk} weight="500">{parsed.categorySuggestion.name}</T>
                </View>
              ) : null}
            </Row>

            {parsed.items.length ? (
              <View style={{ marginTop: S.lg }}>
                <Divider />
                {parsed.items.slice(0, 6).map((it, i) => (
                  <Row key={it.name + i} justify="space-between" style={{ paddingVertical: 7 }}>
                    <T size={12} color={C.ink} numberOfLines={1} style={{ flex: 1, marginRight: 10 }}>
                      {it.name}
                    </T>
                    <T size={12} color={C.sub} tabular>{fmtNum(it.price)}</T>
                  </Row>
                ))}
                {parsed.items.length > 6 ? (
                  <T size={10.5} color={C.faint} style={{ paddingTop: 4 }}>
                    +{parsed.items.length - 6} item lainnya
                  </T>
                ) : null}
              </View>
            ) : null}
          </View>

          {error ? (
            <T size={11.5} color={C.sub} style={{ marginTop: S.md, lineHeight: 17 }}>{error}</T>
          ) : null}

          <Pressable
            onPress={() => {
              tap();
              setShowText((v) => !v);
            }}
            style={({ pressed }) => ({ marginTop: S.lg, opacity: pressed ? 0.6 : 1 })}
          >
            <Row justify="space-between" align="center">
              <T size={12} color={C.ink} weight="500">
                {showText ? 'Sembunyikan teks struk' : 'Ada yang salah baca? Perbaiki teks'}
              </T>
              <Icon name={showText ? 'chevronDown' : 'chevronRight'} size={16} color={C.faint} />
            </Row>
          </Pressable>

          {showText ? (
            <View
              style={{
                marginTop: 10,
                borderWidth: 1,
                borderColor: C.line,
                borderRadius: R.md,
                padding: 12,
                backgroundColor: C.bg,
              }}
            >
              <TextInput
                value={text}
                onChangeText={setText}
                multiline
                placeholder={'Tempel teks struk di sini…\ncontoh:\nINDOMARET\nTOTAL 61.050'}
                placeholderTextColor={C.faint}
                style={{
                  fontFamily: F.sans,
                  fontSize: 12.5,
                  lineHeight: 19,
                  color: C.ink,
                  minHeight: 110,
                  padding: 0,
                }}
              />
            </View>
          ) : null}

          {!hasTotal && !showText ? (
            <T size={11.5} color={C.sub} style={{ marginTop: S.md, lineHeight: 17 }}>
              Total belum terbaca. Perbaiki teks struk, atau isi nominalnya manual di langkah berikutnya.
            </T>
          ) : null}
        </View>
      ) : null}
    </Sheet>
  );
}

function Tile({ icon, label, hint, onPress, primary }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        borderWidth: 1,
        borderColor: primary ? C.ink : C.line,
        backgroundColor: primary ? C.inkPanel : C.paper,
        borderRadius: R.lg,
        paddingVertical: S.xl,
        paddingHorizontal: S.lg,
        alignItems: 'flex-start',
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Icon name={icon} size={24} color={primary ? C.onInk : C.ink} stroke={1.4} />
      <T
        size={14}
        weight="600"
        color={primary ? C.onInk : C.ink}
        style={{ marginTop: S.lg }}
      >
        {label}
      </T>
      <T size={11} color={primary ? C.onInkDim : C.faint} style={{ marginTop: 2 }}>
        {hint}
      </T>
    </Pressable>
  );
}
