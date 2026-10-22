import { colors } from '@idea-district/design-tokens';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api } from '@/lib/api';

/* Placeholder until the mobile screens are built (after the web demo). */
export default function Welcome() {
  const [status, setStatus] = useState('checking API…');

  useEffect(() => {
    api
      .health()
      .then((h) => setStatus(`API ok · AI: ${h.ai_provider}`))
      .catch(() => setStatus('API not reachable'));
  }, []);

  return (
    <View style={styles.screen}>
      <View style={styles.mark}>
        <Text style={styles.markText}>ID</Text>
      </View>
      <Text style={styles.name}>IDEA DISTRICT</Text>
      <Text style={styles.line}>Understanding before recommendation.</Text>
      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  mark: {
    width: 56,
    height: 56,
    borderRadius: 17,
    backgroundColor: colors.ember,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  markText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  name: { color: colors.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.6 },
  line: { color: colors.ink3, fontSize: 13 },
  status: { color: colors.ink3, fontSize: 11, marginTop: 16 },
});
