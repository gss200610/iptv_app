import { Platform } from 'react-native';

export const isTV = Platform.isTV;

/** Fator aplicado a fontes e espaçamentos na TV, vista a cerca de 3 metros. */
const tvScale = isTV ? 1.2 : 1;

export const scale = (value: number) => Math.round(value * tvScale);

export const colors = {
  background: '#0B0F17',
  surface: '#151B26',
  surfaceAlt: '#1E2633',
  border: '#2A3444',
  text: '#F3F5F9',
  textMuted: '#9AA6B8',
  primary: '#3B82F6',
  primaryDark: '#1E40AF',
  focus: '#FFFFFF',
  danger: '#EF4444',
  star: '#FACC15',
  overlay: 'rgba(0, 0, 0, 0.65)',
};

export const spacing = {
  xs: scale(4),
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  xl: scale(24),
  xxl: scale(32),
};

export const font = {
  small: scale(12),
  body: scale(14),
  medium: scale(16),
  large: scale(20),
  title: scale(26),
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
};
