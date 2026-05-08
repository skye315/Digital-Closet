import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useFonts, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';

const FEATURES = [
  { label: 'Calendar', route: '/calendar' },
  { label: 'Wishlist', route: '/wishlist' },
  { label: 'Trip Packing', route: '/pack' },
  { label: 'Wear Tracker', route: '/tracker' },
  { label: 'Monthly Recap', route: '/recap' },
  { label: 'Laundry Status', route: '/laundry' },
  { label: 'My Closets', route: '/closets' },
];

export default function MoreScreen() {
  const [fontsLoaded] = useFonts({ PlayfairDisplay_600SemiBold });
  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Additional Features</Text>
      </View>
      <View style={styles.grid}>
        {FEATURES.map(f => (
          <TouchableOpacity
            key={f.route}
            style={styles.card}
            onPress={() => router.push(f.route as any)}>
            <Text style={styles.cardLabel}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 32, fontFamily: 'PlayfairDisplay_600SemiBold', color: '#1a1a1a' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 16, justifyContent: 'center', alignItems: 'center' },
  card: {
    width: '28%',
    aspectRatio: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  cardLabel: { color: '#fff', fontSize: 13, textAlign: 'center', fontWeight: '500' },
});