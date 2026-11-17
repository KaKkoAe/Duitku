import React from 'react';
import { View } from 'react-native';
import { C } from '../theme';

/**
 * Ikon monokrom yang digambar dari <View> — tanpa font ikon / SVG,
 * supaya tetap tajam & serba hitam-putih di semua platform.
 */
export function Icon({ name, size = 20, color = C.ink, stroke = 1.5 }) {
  const s = size;
  const u = s / 24; // skala dari kanvas 24
  const v = (n) => n * u;
  const bar = (w, h, extra) => ({
    position: 'absolute',
    width: v(w),
    height: Math.max(v(h), stroke * 0.9),
    backgroundColor: color,
    borderRadius: 99,
    ...extra,
  });
  const box = { width: s, height: s, alignItems: 'center', justifyContent: 'center' };
  const frame = (w, h, radius, extra) => ({
    position: 'absolute',
    width: v(w),
    height: v(h),
    borderWidth: stroke,
    borderColor: color,
    borderRadius: v(radius),
    ...extra,
  });

  let content = null;
  switch (name) {
    case 'home':
      content = (
        <>
          <View style={frame(16, 15, 4.5, { top: v(5) })} />
          <View style={{ position: 'absolute', bottom: v(5), width: v(5), height: v(5), backgroundColor: color, borderRadius: v(1.2) }} />
        </>
      );
      break;
    case 'list':
      content = (
        <>
          <View style={bar(17, 1.6, { top: v(6) })} />
          <View style={bar(17, 1.6, { top: v(11.5) })} />
          <View style={bar(11, 1.6, { top: v(17) })} />
        </>
      );
      break;
    case 'chart':
      content = (
        <>
          <View style={bar(3.2, 8, { bottom: v(4.5), left: v(4.5), borderRadius: 1.4 })} />
          <View style={bar(3.2, 13, { bottom: v(4.5), left: v(10.4), borderRadius: 1.4 })} />
          <View style={bar(3.2, 18, { bottom: v(4.5), left: v(16.3), borderRadius: 1.4 })} />
        </>
      );
      break;
    case 'wallet':
      content = (
        <>
          <View style={frame(19, 14, 4, { top: v(5) })} />
          <View style={{ position: 'absolute', top: v(10.2), right: v(2.5), width: v(4), height: v(4), backgroundColor: color, borderRadius: 99 }} />
        </>
      );
      break;
    case 'plus':
      content = (
        <>
          <View style={bar(15, 1.7, { top: v(11.1) })} />
          <View style={bar(1.7, 15, { left: v(11.1) })} />
        </>
      );
      break;
    case 'mic':
      content = (
        <>
          <View style={frame(8, 13, 4, { top: v(2) })} />
          <View
            style={{
              position: 'absolute',
              bottom: v(6),
              width: v(14),
              height: v(7),
              borderWidth: stroke,
              borderTopWidth: 0,
              borderColor: color,
              borderBottomLeftRadius: v(7),
              borderBottomRightRadius: v(7),
            }}
          />
          <View style={bar(1.7, 5, { bottom: v(1.2) })} />
        </>
      );
      break;
    case 'camera':
      content = (
        <>
          <View style={frame(19, 14, 4, { top: v(6) })} />
          <View style={frame(7, 7, 99, { top: v(9.5) })} />
          <View style={bar(7, 2.2, { top: v(3.4), borderRadius: 1 })} />
        </>
      );
      break;
    case 'scan':
      content = (
        <>
          {[
            { top: 3, left: 3, borderTopWidth: stroke, borderLeftWidth: stroke },
            { top: 3, right: 3, borderTopWidth: stroke, borderRightWidth: stroke },
            { bottom: 3, left: 3, borderBottomWidth: stroke, borderLeftWidth: stroke },
            { bottom: 3, right: 3, borderBottomWidth: stroke, borderRightWidth: stroke },
          ].map((st, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                width: v(6),
                height: v(6),
                borderColor: color,
                ...st,
                top: st.top !== undefined ? v(st.top) : undefined,
                bottom: st.bottom !== undefined ? v(st.bottom) : undefined,
                left: st.left !== undefined ? v(st.left) : undefined,
                right: st.right !== undefined ? v(st.right) : undefined,
                borderTopLeftRadius: i === 0 ? v(2) : 0,
                borderTopRightRadius: i === 1 ? v(2) : 0,
                borderBottomLeftRadius: i === 2 ? v(2) : 0,
                borderBottomRightRadius: i === 3 ? v(2) : 0,
              }}
            />
          ))}
          <View style={bar(12, 1.6, { top: v(11.2) })} />
        </>
      );
      break;
    case 'close':
      content = (
        <>
          <View style={bar(15, 1.7, { transform: [{ rotate: '45deg' }] })} />
          <View style={bar(15, 1.7, { transform: [{ rotate: '-45deg' }] })} />
        </>
      );
      break;
    case 'check':
      content = (
        <View
          style={{
            position: 'absolute',
            width: v(11),
            height: v(6),
            borderLeftWidth: stroke + 0.3,
            borderBottomWidth: stroke + 0.3,
            borderColor: color,
            transform: [{ rotate: '-45deg' }],
            top: v(8),
          }}
        />
      );
      break;
    case 'chevronLeft':
      content = (
        <View
          style={{
            width: v(8),
            height: v(8),
            borderLeftWidth: stroke,
            borderBottomWidth: stroke,
            borderColor: color,
            transform: [{ rotate: '45deg' }],
            marginLeft: v(2),
          }}
        />
      );
      break;
    case 'chevronRight':
      content = (
        <View
          style={{
            width: v(8),
            height: v(8),
            borderRightWidth: stroke,
            borderTopWidth: stroke,
            borderColor: color,
            transform: [{ rotate: '45deg' }],
            marginRight: v(2),
          }}
        />
      );
      break;
    case 'chevronDown':
      content = (
        <View
          style={{
            width: v(8),
            height: v(8),
            borderRightWidth: stroke,
            borderBottomWidth: stroke,
            borderColor: color,
            transform: [{ rotate: '45deg' }],
            marginTop: v(-2),
          }}
        />
      );
      break;
    case 'trash':
      content = (
        <>
          <View style={frame(12, 12, 2.5, { top: v(8) })} />
          <View style={bar(17, 1.7, { top: v(5) })} />
          <View style={bar(6, 1.7, { top: v(2.6) })} />
        </>
      );
      break;
    case 'edit':
      content = (
        <>
          <View style={bar(14, 1.8, { transform: [{ rotate: '45deg' }] })} />
          <View style={{ position: 'absolute', bottom: v(4), left: v(3), width: v(4), height: v(4), borderLeftWidth: stroke, borderBottomWidth: stroke, borderColor: color }} />
        </>
      );
      break;
    case 'calendar':
      content = (
        <>
          <View style={frame(18, 16, 3.5, { top: v(5) })} />
          <View style={bar(18, 1.6, { top: v(10) })} />
          <View style={bar(1.6, 4, { top: v(2.5), left: v(7) })} />
          <View style={bar(1.6, 4, { top: v(2.5), right: v(7) })} />
        </>
      );
      break;
    case 'image':
      content = (
        <>
          <View style={frame(19, 15, 3.5, { top: v(4.5) })} />
          <View style={{ position: 'absolute', top: v(8), right: v(7.5), width: v(3.4), height: v(3.4), backgroundColor: color, borderRadius: 99 }} />
          <View style={bar(9, 1.6, { bottom: v(7.5), left: v(6), transform: [{ rotate: '-28deg' }] })} />
        </>
      );
      break;
    case 'search':
      content = (
        <>
          <View style={frame(12, 12, 99, { top: v(4), left: v(4) })} />
          <View style={bar(7, 1.7, { bottom: v(5), right: v(4), transform: [{ rotate: '45deg' }] })} />
        </>
      );
      break;
    case 'arrowUp':
      content = (
        <>
          <View style={bar(1.7, 13, { top: v(6) })} />
          <View style={{ position: 'absolute', top: v(5.4), width: v(7), height: v(7), borderTopWidth: stroke, borderLeftWidth: stroke, borderColor: color, transform: [{ rotate: '45deg' }] }} />
        </>
      );
      break;
    case 'arrowDown':
      content = (
        <>
          <View style={bar(1.7, 13, { top: v(5) })} />
          <View style={{ position: 'absolute', bottom: v(4.4), width: v(7), height: v(7), borderBottomWidth: stroke, borderRightWidth: stroke, borderColor: color, transform: [{ rotate: '45deg' }] }} />
        </>
      );
      break;
    case 'swap':
      content = (
        <>
          <View style={bar(13, 1.7, { top: v(8), left: v(4) })} />
          <View style={{ position: 'absolute', top: v(5.4), left: v(3.4), width: v(6), height: v(6), borderTopWidth: stroke, borderLeftWidth: stroke, borderColor: color, transform: [{ rotate: '-45deg' }] }} />
          <View style={bar(13, 1.7, { bottom: v(8), right: v(4) })} />
          <View style={{ position: 'absolute', bottom: v(5.4), right: v(3.4), width: v(6), height: v(6), borderBottomWidth: stroke, borderRightWidth: stroke, borderColor: color, transform: [{ rotate: '-45deg' }] }} />
        </>
      );
      break;
    case 'arrowRight':
      content = (
        <>
          <View style={bar(14, 1.7, { left: v(5) })} />
          <View style={{ position: 'absolute', right: v(5), width: v(7), height: v(7), borderRightWidth: stroke, borderTopWidth: stroke, borderColor: color, transform: [{ rotate: '45deg' }] }} />
        </>
      );
      break;
    case 'arrowLeft':
      content = (
        <>
          <View style={bar(14, 1.7, { right: v(5) })} />
          <View style={{ position: 'absolute', left: v(5), width: v(7), height: v(7), borderLeftWidth: stroke, borderBottomWidth: stroke, borderColor: color, transform: [{ rotate: '45deg' }] }} />
        </>
      );
      break;
    case 'tag':
      content = (
        <>
          <View style={frame(12, 12, 3, { transform: [{ rotate: '45deg' }] })} />
          <View style={{ position: 'absolute', top: v(9), left: v(9), width: v(2.6), height: v(2.6), borderRadius: 99, backgroundColor: color }} />
        </>
      );
      break;
    case 'settings':
      content = (
        <>
          <View style={bar(17, 1.6, { top: v(7) })} />
          <View style={bar(17, 1.6, { top: v(16) })} />
          <View style={{ position: 'absolute', top: v(4.6), left: v(8), width: v(5.4), height: v(5.4), borderRadius: 99, borderWidth: stroke, borderColor: color, backgroundColor: 'transparent' }} />
          <View style={{ position: 'absolute', top: v(13.6), left: v(14), width: v(5.4), height: v(5.4), borderRadius: 99, borderWidth: stroke, borderColor: color, backgroundColor: 'transparent' }} />
        </>
      );
      break;
    case 'filter':
      content = (
        <>
          <View style={bar(16, 1.7, { top: v(7) })} />
          <View style={bar(10, 1.7, { top: v(12) })} />
          <View style={bar(5, 1.7, { top: v(17) })} />
        </>
      );
      break;
    case 'download':
      content = (
        <>
          <View style={bar(1.7, 10, { top: v(4), left: v(11.1) })} />
          <View style={{ position: 'absolute', top: v(9), width: v(7), height: v(7), borderRightWidth: stroke, borderBottomWidth: stroke, borderColor: color, transform: [{ rotate: '45deg' }] }} />
          <View style={bar(15, 1.7, { bottom: v(5) })} />
        </>
      );
      break;
    case 'sparkle':
      content = (
        <>
          <View style={bar(15, 1.7, { transform: [{ rotate: '45deg' }] })} />
          <View style={bar(15, 1.7, { transform: [{ rotate: '-45deg' }] })} />
        </>
      );
      break;
    case 'user':
      content = (
        <>
          <View style={{ position: 'absolute', top: v(4), width: v(7.4), height: v(7.4), borderRadius: 99, borderWidth: stroke, borderColor: color }} />
          <View style={{ position: 'absolute', bottom: v(3.5), width: v(15), height: v(8), borderTopLeftRadius: v(8), borderTopRightRadius: v(8), borderWidth: stroke, borderBottomWidth: 0, borderColor: color }} />
        </>
      );
      break;
    case 'moon':
      content = (
        <View
          style={{
            width: v(16),
            height: v(16),
            borderRadius: 99,
            borderWidth: Math.max(stroke, 1.4),
            borderColor: color,
            borderTopColor: 'transparent',
            borderRightColor: 'transparent',
            transform: [{ rotate: '-40deg' }],
          }}
        />
      );
      break;
    case 'sun':
      content = (
        <>
          {[0, 45, 90, 135].map((a) => (
            <View key={a} style={[bar(15, 1.6), { transform: [{ rotate: `${a}deg` }] }]} />
          ))}
          <View style={{ position: 'absolute', width: v(7.4), height: v(7.4), borderRadius: 99, backgroundColor: color }} />
        </>
      );
      break;
    case 'dot':
      content = <View style={{ width: v(6), height: v(6), borderRadius: 99, backgroundColor: color }} />;
      break;
    default:
      content = <View style={{ width: v(8), height: v(8), borderRadius: 99, backgroundColor: color }} />;
  }

  return <View style={box}>{content}</View>;
}

export default Icon;
