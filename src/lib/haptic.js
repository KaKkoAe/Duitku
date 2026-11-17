import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const safe = (fn) => {
  if (Platform.OS === 'web') return;
  try {
    fn();
  } catch (e) {
    /* diabaikan */
  }
};

export const tap = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const thud = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
export const success = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
