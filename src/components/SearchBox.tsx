import { StyleSheet, View } from 'react-native';

import { spacing } from '../theme';
import { TextField } from './TextField';

interface SearchBoxProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}

export function SearchBox({ value, onChangeText, placeholder = 'Buscar' }: SearchBoxProps) {
  return (
    <View style={styles.wrapper}>
      <TextField
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        returnKeyType="search"
        clearButtonMode="while-editing"
        accessibilityLabel={placeholder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
});
