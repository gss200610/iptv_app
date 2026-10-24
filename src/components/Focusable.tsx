import { forwardRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type View, type ViewStyle } from 'react-native';

import { colors, isTV, radius } from '../theme';

export interface FocusableProps extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle>;
  focusedStyle?: StyleProp<ViewStyle>;
  children: ReactNode | ((state: { focused: boolean; pressed: boolean }) => ReactNode);
  /** Aumenta levemente o item focado (cartões e capas). */
  zoomOnFocus?: boolean;
}

/**
 * Base de todos os itens clicáveis: no celular funciona como Pressable comum e na TV
 * desenha a borda de foco controlada pelo D-pad.
 */
export const Focusable = forwardRef<View, FocusableProps>(function Focusable(
  { style, focusedStyle, children, zoomOnFocus, ...rest },
  ref,
) {
  return (
    <Pressable
      ref={ref}
      focusable
      {...rest}
      style={({ focused, pressed }) => [
        styles.base,
        style,
        isTV && focused && styles.focused,
        isTV && focused && zoomOnFocus && styles.zoom,
        isTV && focused && focusedStyle,
        pressed && styles.pressed,
      ]}
    >
      {(state) => (typeof children === 'function' ? children(state) : children)}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: radius.md,
  },
  focused: {
    borderColor: colors.focus,
  },
  zoom: {
    transform: [{ scale: 1.06 }],
  },
  pressed: {
    opacity: 0.75,
  },
});
