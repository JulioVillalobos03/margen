import { colors as c } from '../../src/theme';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { handleAuthCallback } from '../../src/services/auth';
import Pressable from '../../src/components/StablePressable';

export default function Callback() {
  const incoming = Linking.useURL();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void (async () => {
      const url = Platform.OS === 'web' ? window.location.href : incoming ?? await Linking.getInitialURL();
      if (!url) { if (active) setError('No llegó un enlace de acceso. Vuelve a Margen e inténtalo otra vez.'); return; }
      try {
        if (!await handleAuthCallback(url)) throw new Error('El enlace de acceso no es válido. Solicita uno nuevo.');
        if (active) router.replace('/');
      } catch {
        if (active) setError('El enlace no se pudo completar o ya venció. Vuelve al acceso para solicitar uno nuevo.');
      }
    })();
    return () => { active = false; };
  }, [incoming]);
  return <View style={{ flex: 1, justifyContent: 'center', padding: 28, gap: 20, backgroundColor: c.paper }}>
    {error ? <><Text accessibilityRole="alert" style={{ color: c.ink, fontSize: 17, lineHeight: 26 }}>{error}</Text><Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={{ padding: 18, backgroundColor: c.green, borderRadius: 12 }}><Text style={{ color: c.white, textAlign: 'center' }}>Volver a Margen</Text></Pressable></> : <><ActivityIndicator color={c.green} /><Text style={{ textAlign: 'center' }}>Completando tu acceso…</Text></>}
  </View>;
}
