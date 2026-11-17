import React from 'react';
import { Pressable, View } from 'react-native';
import { C, R, S } from '../theme';
import { Row, T } from './UI';
import { compact, fmtNum } from '../utils';

/**
 * Grafik batang bulanan (monokrom, tanpa library).
 * data: [{ label, value, active }]
 */
export function MonthBars({ data, height = 120, onPick, format = compact }) {
  const max = Math.max.apply(null, data.map((d) => d.value).concat([1]));
  return (
    <View>
      <Row align="flex-end" gap={0} style={{ height: height + 26 }}>
        {data.map((d, i) => {
          const h = Math.max(d.value > 0 ? 4 : 1, Math.round((d.value / max) * height));
          const dim = d.active === false;
          return (
            <Pressable
              key={d.label + i}
              onPress={onPick ? () => onPick(i) : undefined}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: height + 26 }}
            >
              <T size={9} color={d.highlight ? C.ink : C.faint} weight="500" tabular style={{ marginBottom: 5 }}>
                {d.value ? format(d.value) : ''}
              </T>
              <View
                style={{
                  width: '46%',
                  height: h,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                  backgroundColor: d.highlight ? C.ink : dim ? C.track : C.ink2,
                  opacity: dim ? 1 : 0.9,
                }}
              />
              <T
                size={9.5}
                weight={d.highlight ? '600' : '400'}
                color={d.highlight ? C.ink : C.faint}
                style={{ marginTop: 7 }}
                numberOfLines={1}
              >
                {d.label}
              </T>
            </Pressable>
          );
        })}
      </Row>
    </View>
  );
}

/**
 * Daftar kategori dengan porsi horizontal.
 * rows: [{ name, value, pct }]
 */
export function CategoryBars({ rows, total, max = 6 }) {
  const list = rows.slice(0, max);
  if (!list.length) {
    return (
      <T size={11.5} color={C.faint} center style={{ paddingVertical: S.lg }}>
        Belum ada pengeluaran bulan ini.
      </T>
    );
  }
  return (
    <View>
      {list.map((r, i) => (
        <View key={r.name + i} style={{ marginTop: i === 0 ? 0 : S.md }}>
          <Row justify="space-between" style={{ marginBottom: 6 }}>
            <Row gap={7} style={{ flex: 1, minWidth: 0 }}>
              <T size={12.5} weight="500" numberOfLines={1} style={{ flexShrink: 1 }}>{r.name}</T>
              <T size={10} color={C.faint} tabular>{r.pct}%</T>
            </Row>
            <T size={12} serif weight="600" tabular>{fmtNum(r.value)}</T>
          </Row>
          <View style={{ height: 3, backgroundColor: C.track, borderRadius: 99, overflow: 'hidden' }}>
            <View
              style={{
                height: 3,
                width: Math.max(2, Math.min(100, total ? (r.value / total) * 100 : 0)) + '%',
                backgroundColor: i === 0 ? C.ink : C.ink2,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Baris kecil "sparkline" untuk tren harian. */
export function DayStrip({ values, height = 34 }) {
  const max = Math.max.apply(null, values.concat([1]));
  return (
    <Row align="flex-end" gap={2} style={{ height }}>
      {values.map((v, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: Math.max(2, Math.round((v / max) * height)),
            backgroundColor: v > 0 ? C.ink : C.track,
            borderRadius: 1,
            opacity: v > 0 ? 0.85 : 1,
          }}
        />
      ))}
    </Row>
  );
}
