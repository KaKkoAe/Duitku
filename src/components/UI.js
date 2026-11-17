import React from 'react';
import {
  View, Text, Pressable, ScrollView, Modal, TextInput, Platform,
  KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { C, R, S, F, shadow, shadowSoft } from '../theme';
import { Icon } from './Icons';
import { CuteIcon, kindFromText } from './CuteIcons';

const WEIGHT_FONT = {
  400: F.sans, 500: F.sansMed, 600: F.sansSemi, 700: F.sansBold, 800: F.sansBlack, 900: F.sansBlack,
};
// "serif" dipertahankan sebagai nama prop lama, tetapi kini memakai huruf bulat tebal.
const WEIGHT_DISPLAY = {
  400: F.displayBold, 500: F.display, 600: F.display, 700: F.display, 800: F.display, 900: F.display,
};

/** Teks dasar. `serif` = judul/angka besar (huruf bulat tebal), default Plus Jakarta Sans. */
export function T({
  children, size = 14, weight = '400', color = C.ink, serif, italic,
  tracking, upper, center, tabular, style, ...rest
}) {
  const family = serif
    ? (italic ? F.serifItalic : WEIGHT_DISPLAY[Number(weight)] || F.display)
    : WEIGHT_FONT[Number(weight)] || F.sans;
  // tabular-nums otomatis untuk teks yang memuat angka (nominal uang)
  const raw = Array.isArray(children) ? children.join('') : children;
  const tnum = tabular || /\d/.test(typeof raw === 'number' ? String(raw) : (raw || ''));
  return (
    <Text
      {...rest}
      style={[
        { fontSize: size, fontFamily: family, color },
        center ? { textAlign: 'center' } : null,
        upper ? { textTransform: 'uppercase' } : null,
        italic ? { fontStyle: 'italic' } : null,
        tracking != null ? { letterSpacing: tracking } : null,
        tnum ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Row({ children, style, gap = S.sm, align = 'center', justify, wrap, ...rest }) {
  return (
    <View
      {...rest}
      style={[
        { flexDirection: 'row', alignItems: align, gap },
        justify ? { justifyContent: justify } : null,
        wrap ? { flexWrap: 'wrap' } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Col({ children, style, gap = 0, ...rest }) {
  return <View {...rest} style={[{ gap }, style]}>{children}</View>;
}

/** Garis rambut pemisah — ciri khas tampilan editorial. */
export function Divider({ style, color = C.line, vertical }) {
  return (
    <View
      style={[
        vertical ? { width: 1, alignSelf: 'stretch' } : { height: 1, alignSelf: 'stretch' },
        { backgroundColor: color },
        style,
      ]}
    />
  );
}

export function Eyebrow({ children, color = C.faint, style, ...rest }) {
  return (
    <T {...rest} size={10} weight="600" color={color} upper tracking={1.9} style={style}>
      {children}
    </T>
  );
}

export function SectionTitle({ children, right, onRightPress, style, sub }) {
  return (
    <View style={[{ marginBottom: S.md }, style]}>
      <Row justify="space-between" align="flex-end">
        <View style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow>{children}</Eyebrow>
          {sub ? <T size={12} color={C.sub} style={{ marginTop: 3 }}>{sub}</T> : null}
        </View>
        {right ? (
          <Pressable onPress={onRightPress} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
            <T size={12} weight="600" color={C.ink} tracking={0.3}>{right}</T>
          </Pressable>
        ) : null}
      </Row>
      <Divider style={{ marginTop: S.md }} />
    </View>
  );
}

export function Card({ children, style, dark, pad = S.lg, onPress, ...rest }) {
  const base = [
    {
      backgroundColor: dark ? C.inkPanel : C.card,
      borderRadius: R.lg,
      borderWidth: dark ? 0 : 1,
      borderColor: C.line,
      padding: pad,
      ...(dark ? null : shadowSoft),
    },
    style,
  ];
  if (!onPress) return <View {...rest} style={base}>{children}</View>;
  return (
    <Pressable {...rest} onPress={onPress} style={({ pressed }) => [...base, pressed && { opacity: 0.85 }]}>
      {children}
    </Pressable>
  );
}

/** Avatar ikon lucu — dulu monogram huruf, sekarang ikon vektor berwarna. */
export function Monogram({ label, kind, size = 42, dark, outline, style }) {
  const key = kind || kindFromText(label);
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <CuteIcon kind={key} size={size} />
    </View>
  );
}

/** alias lama */
export const IconBadge = Monogram;

export function Btn({
  label, onPress, variant = 'primary', full, small, disabled, icon, iconRight,
  style, textStyle, loading, tone,
}) {
  const dark = variant === 'primary' || variant === 'dark';
  const outline = variant === 'outline';
  const ghost = variant === 'ghost';
  const bg = disabled ? C.track : dark ? C.primary : outline ? 'transparent' : 'transparent';
  const fg = disabled ? C.faint : dark ? C.onInk : C.ink;
  const padV = small ? 9 : 15;
  const padH = small ? 14 : 20;
  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          backgroundColor: bg,
          borderRadius: R.pill,
          borderWidth: outline ? 1 : 0,
          borderColor: C.line,
          paddingVertical: padV, paddingHorizontal: padH,
          alignSelf: full ? 'stretch' : 'flex-start',
          opacity: pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : null}
      {icon && !loading ? <Icon name={icon} size={small ? 15 : 17} color={fg} stroke={1.6} /> : null}
      <T size={small ? 12 : 13} weight="600" color={fg} tracking={0.9} upper style={textStyle}>
        {label}
      </T>
      {iconRight ? <Icon name={iconRight} size={small ? 14 : 16} color={fg} stroke={1.6} /> : null}
    </Pressable>
  );
}

export function IconBtn({ name, onPress, size = 40, dark, color, style, disabled, badge }) {
  const fg = color || (dark ? C.onInk : C.ink);
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      hitSlop={6}
      style={({ pressed }) => [
        {
          width: size, height: size, borderRadius: size / 2,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: dark ? C.inkPanel : 'transparent',
          borderWidth: dark ? 0 : 1, borderColor: C.line,
          opacity: pressed ? 0.6 : 1,
        },
        style,
      ]}
    >
      <Icon name={name} size={size * 0.46} color={fg} stroke={1.5} />
      {badge ? (
        <View style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: C.ink }} />
      ) : null}
    </Pressable>
  );
}

export function Chip({ label, active, onPress, icon, style, dark }) {
  const on = active;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row', alignItems: 'center', gap: 6,
          paddingVertical: 9, paddingHorizontal: 14,
          borderRadius: R.pill,
          backgroundColor: on ? C.primary : C.lilacSoft,
          borderWidth: 1,
          borderColor: on ? C.primary : C.line,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={14} color={on ? C.onInk : C.sub} stroke={1.6} /> : null}
      <T size={12.5} weight={on ? '600' : '500'} color={on ? C.onInk : C.sub} tracking={0.2}>
        {label}
      </T>
    </Pressable>
  );
}

export function Field({ label, hint, children, style, right }) {
  return (
    <View style={[{ gap: 7 }, style]}>
      <Row justify="space-between" align="center">
        <Eyebrow color={C.sub}>{label}</Eyebrow>
        {right}
      </Row>
      {children}
      {hint ? <T size={11.5} color={C.faint} style={{ lineHeight: 16 }}>{hint}</T> : null}
    </View>
  );
}

export function Input({ style, inputStyle, prefix, ...rest }) {
  return (
    <View
      style={[
        {
          flexDirection: 'row', alignItems: 'center', gap: 6,
          backgroundColor: C.paper, borderWidth: 1, borderColor: C.line,
          borderRadius: R.md, paddingHorizontal: 14, minHeight: 48,
        },
        style,
      ]}
    >
      {prefix ? <T size={13} color={C.faint}>{prefix}</T> : null}
      <TextInput
        placeholderTextColor={C.faint}
        {...rest}
        style={[
          {
            flex: 1, minWidth: 0, paddingVertical: 13,
            fontFamily: F.sans, fontSize: 14, color: C.ink,
          },
          inputStyle,
        ]}
      />
    </View>
  );
}

export function Bar({ pct = 0, height = 6, color = C.ink, track = C.track, style, radius }) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <View style={[{ height, backgroundColor: track, borderRadius: radius != null ? radius : height / 2, overflow: 'hidden' }, style]}>
      <View style={{ width: w + '%', height: '100%', backgroundColor: color, borderRadius: radius != null ? radius : height / 2 }} />
    </View>
  );
}

export function Empty({ title, text, action, icon = 'dot', style }) {
  return (
    <View style={[{ alignItems: 'center', paddingVertical: 36, gap: 10 }, style]}>
      <View style={{ width: 54, height: 54, borderRadius: 27, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={22} color={C.faint} stroke={1.4} />
      </View>
      <T size={14} weight="600" center>{title}</T>
      {text ? <T size={12.5} color={C.sub} center style={{ lineHeight: 18, maxWidth: 260 }}>{text}</T> : null}
      {action}
    </View>
  );
}

export function Loading({ label = 'Menyiapkan…' }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, gap: 14 }}>
      <T size={22} serif weight="600" tracking={1}>Duitku</T>
      <ActivityIndicator color={C.ink} />
      <T size={11} color={C.faint} upper tracking={1.6}>{label}</T>
    </View>
  );
}

export function Sheet({ visible, onClose, title, eyebrow, children, footer, maxHeight = '90%', scroll = true }) {
  const Body = scroll ? ScrollView : View;
  // Jangan tinggalkan overlay tak terlihat yang menelan sentuhan (mis. di web).
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType={Platform.OS === 'web' ? 'none' : 'fade'} onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: C.scrim, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={{
              backgroundColor: C.paper,
              borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl,
              maxHeight, borderWidth: 1, borderColor: C.line,
              paddingTop: 10,
            }}
          >
            <View style={{ alignItems: 'center', paddingBottom: 8 }}>
              <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: C.line }} />
            </View>
            {title ? (
              <View style={{ paddingHorizontal: S.lg, paddingBottom: 12 }}>
                <Row justify="space-between" align="flex-start">
                  <View style={{ flex: 1, minWidth: 0 }}>
                    {eyebrow ? <Eyebrow style={{ marginBottom: 4 }}>{eyebrow}</Eyebrow> : null}
                    <T size={24} serif weight="600" style={{ letterSpacing: 0.2 }}>{title}</T>
                  </View>
                  <IconBtn name="close" onPress={onClose} size={34} />
                </Row>
              </View>
            ) : null}
            <View style={{ flexShrink: 1, minHeight: 0, overflow: 'hidden' }}>
              <Body
                {...(scroll ? { keyboardShouldPersistTaps: 'handled', showsVerticalScrollIndicator: false } : {})}
                style={scroll ? { paddingHorizontal: S.lg, flexGrow: 1, flexShrink: 1, minHeight: 0 } : { paddingHorizontal: S.lg }}
                contentContainerStyle={scroll ? { paddingBottom: footer ? 104 : 24 } : undefined}
              >
                {children}
              </Body>
            </View>
            {footer ? (
              <View style={{ paddingHorizontal: S.lg, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 26 : 18, borderTopWidth: 1, borderColor: C.line, backgroundColor: C.bg }}>
                {footer}
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export function Stat({ label, value, sub, dark, align = 'flex-start', serif = true, valueSize = 20 }) {
  return (
    <View style={{ alignItems: align, flex: 1, minWidth: 0 }}>
      <Eyebrow color={dark ? C.onInkDim : C.faint}>{label}</Eyebrow>
      <T
        size={valueSize} serif={serif} weight="600" tabular
        color={dark ? C.onInk : C.ink}
        style={{ marginTop: 5 }}
        numberOfLines={1}
      >
        {value}
      </T>
      {sub ? <T size={11.5} color={dark ? C.onInkDim : C.sub} style={{ marginTop: 3 }}>{sub}</T> : null}
    </View>
  );
}

export function Segmented({ options, value, onChange, style }) {
  return (
    <View style={[{ flexDirection: 'row', backgroundColor: C.track, borderRadius: R.pill, padding: 3 }, style]}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            style={({ pressed }) => [
              { flex: 1, paddingVertical: 9, borderRadius: R.pill, alignItems: 'center', backgroundColor: on ? C.primary : 'transparent' },
              pressed && { opacity: 0.8 },
            ]}
          >
            <T size={12} weight="600" color={on ? C.onInk : C.sub} tracking={0.6} upper>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

export { Icon };
export { CuteIcon, catIconKey, walletIconKey, kindFromText } from './CuteIcons';
