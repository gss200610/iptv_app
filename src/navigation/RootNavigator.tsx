import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { EditPlaylistScreen } from '../screens/EditPlaylistScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ItemsScreen } from '../screens/ItemsScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MovieDetailScreen } from '../screens/MovieDetailScreen';
import { PlayerScreen } from '../screens/PlayerScreen';
import { SeriesDetailScreen } from '../screens/SeriesDetailScreen';
import { useAuth } from '../store/auth';
import { colors } from '../theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const signedIn = useAuth((s) => s.status === 'signedIn');

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    >
      {signedIn ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Items" component={ItemsScreen} />
          <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />
          <Stack.Screen name="SeriesDetail" component={SeriesDetailScreen} />
          <Stack.Screen name="EditPlaylist" component={EditPlaylistScreen} />
          <Stack.Screen
            name="Player"
            component={PlayerScreen}
            options={{ contentStyle: { backgroundColor: '#000' }, statusBarHidden: true, navigationBarHidden: true }}
          />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
