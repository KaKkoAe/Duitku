import React from 'react';
import { Pressable, View } from 'react-native';
import { C, R, S, TOP_PAD } from '../theme';
import { Icon, Row, T } from './UI';

/**
 * Kepala layar: eyebrow kecil + judul serif besar, opsional tombol kembali
 * dan elemen di kanan.
 */
export default function Header({ eyebrow, title, sub, onBack, right, style }) {
  return (
    <View style={{ paddingTop: TOP_PAD, paddingHorizontal: S.lg, paddingBottom: S.md, ...style }}>
      <Row justify="space-between" align="flex-start">
        <Row gap={10} align="center" style={{ flex: 1, minWidth: 0 }}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              hitSlop={12}
              style={({ pressed }) => ({
                width: 34,
                height: 34,
                borderRadius: 17,
                borderWidth: 1,
                borderColor: C.line,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Icon name="chevronLeft" size={16} color={C.ink} />
            </Pressable>
          ) : null}
          <View style={{ flex: 1, minWidth: 0 }}>
            {eyebrow ? <T size={9.5} weight="600" upper tracking={2.2} color={C.faint}>{eyebrow}</T> : null}
            <T size={26} serif weight="600" numberOfLines={1} style={{ marginTop: eyebrow ? 3 : 0, letterSpacing: -0.3 }}>
              {title}
            </T>
            {sub ? <T size={11.5} color={C.sub} style={{ marginTop: 3 }} numberOfLines={1}>{sub}</T> : null}
          </View>
        </Row>
        {right ? <View style={{ marginLeft: S.md }}>{right}</View> : null}
      </Row>
    </View>
  );
}
