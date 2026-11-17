import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { C, R, S } from '../theme';
import { Divider, Icon, Monogram, Row, T } from './UI';
import { catById, walletById } from '../store';
import { fmt, fmtNum, prettyDate } from '../utils';
import { catIconKey } from './UI';

/**
 * Satu baris transaksi. `s` = state store (untuk lookup kategori & dompet).
 */
export default function TxRow({ s, tx, onPress, showDate, compact: dense }) {
  const cat = catById(s, tx.category);
  const wallet = walletById(s, tx.wallet);
  const to = tx.toWallet ? walletById(s, tx.toWallet) : null;
  const isIn = tx.type === 'income';
  const isTr = tx.type === 'transfer';
  const title = tx.note || (isTr ? 'Transfer' : cat ? cat.name : 'Tanpa kategori');
  const sub = isTr
    ? (wallet ? wallet.name : '—') + ' → ' + (to ? to.name : '—')
    : [cat ? cat.name : 'Tanpa kategori', wallet ? wallet.name : null].filter(Boolean).join(' \u00b7 ');
  const sign = isIn ? '+' : isTr ? '' : '\u2212';

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: dense ? 8 : 11,
        opacity: pressed ? 0.55 : 1,
      })}
    >
      {tx.receiptUri ? (
        <Image
          source={{ uri: tx.receiptUri }}
          style={{ width: 36, height: 36, borderRadius: R.sm, backgroundColor: C.track, marginRight: S.md }}
          resizeMode="cover"
        />
      ) : (
        <View style={{ marginRight: S.md }}>
          <Monogram kind={isTr ? 'transfer' : catIconKey(cat)} size={38} />
        </View>
      )}

      <View style={{ flex: 1, minWidth: 0 }}>
        <Row gap={5}>
          <T size={13} weight="500" numberOfLines={1} style={{ flexShrink: 1 }}>{title}</T>
          {tx.receiptUri ? <Icon name="scan" size={11} color={C.faint} /> : null}
        </Row>
        <T size={10.5} color={C.faint} numberOfLines={1} style={{ marginTop: 2 }}>
          {sub}
          {showDate ? ' \u00b7 ' + prettyDate(tx.date) : ''}
        </T>
      </View>

      <T
        size={13.5}
        serif
        weight="700"
        tabular
        numberOfLines={1}
        color={isIn ? C.income : isTr ? C.transfer : C.ink}
        style={{ marginLeft: S.sm }}
      >
        {sign}{fmtNum(tx.amount)}
      </T>
    </Pressable>
  );
}
