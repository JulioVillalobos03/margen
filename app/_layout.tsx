import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider } from '../src/components/SessionProvider';
export default function Layout() {
  return <SafeAreaProvider><SessionProvider><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false }} /></SessionProvider></SafeAreaProvider>;
}
