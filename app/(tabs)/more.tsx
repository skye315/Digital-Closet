import { router } from 'expo-router';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const OPTIONS = [
  { label: '🧺 Laundry tracker', route: '/laundry', sub: 'Track clean and dirty items' },
  { label: '🧳 Trip packing', route: '/pack', sub: 'Pack from your closet' },
  { label: '👔 My closets', route: '/closets', sub: 'Manage multiple closets' },
  { label: '📈 Wear tracker', route: '/tracker', sub: 'See your most worn items' },
];

export default function MoreScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {OPTIONS.map(o => (
          <TouchableOpacity
            key={o.route}
            style={styles.card}
            onPress={() => router.push(o.route as any)}>
            <View style={styles.info}>
              <Text style={styles.label}>{o.label}</Text>
              <Text style={styles.sub}>{o.sub}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16 },
  title: { fontSize: 22, fontWeight: '500' },
  list: { padding: 16, gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 0.5, borderColor: '#e0e0e0' },
  info: { flex: 1 },
  label: { fontSize: 15, fontWeight: '500', color: '#333' },
  sub: { fontSize: 12, color: '#aaa', marginTop: 2 },
  arrow: { fontSize: 20, color: '#ccc' },
});