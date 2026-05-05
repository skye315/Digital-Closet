import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ClothingItem = {
  id: string;
  uri: string;
  label: string;
  category: string;
  wornCount: number;
};

export default function TrackerScreen() {
  const [items, setItems] = useState<ClothingItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem('closet_items');
      if (saved) setItems(JSON.parse(saved));
    };
    load();
  }, []);

  const sorted = [...items].sort((a, b) => b.wornCount - a.wornCount);
  const max = sorted[0]?.wornCount || 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Wear tracker</Text>
      </View>
      <FlatList
        data={sorted}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Image source={{ uri: item.uri }} style={styles.thumb} />
            <View style={styles.info}>
              <Text style={styles.name}>{item.label}</Text>
              <Text style={styles.category}>{item.category}</Text>
              <View style={styles.barBg}>
                <View style={[styles.bar, { width: `${(item.wornCount / max) * 100}%` }]} />
              </View>
            </View>
            <View style={styles.countWrap}>
              <Text style={[styles.count, item.wornCount === 0 && styles.countZero]}>
                {item.wornCount}×
              </Text>
              {item.wornCount === 0 && <Text style={styles.never}>never</Text>}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Add clothes to start tracking wear</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16 },
  title: { fontSize: 22, fontWeight: '500' },
  list: { padding: 16, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  thumb: { width: 44, height: 56, borderRadius: 8, backgroundColor: '#f0f0f0' },
  info: { flex: 1 },
  name: { fontSize: 13, fontWeight: '500', color: '#333' },
  category: { fontSize: 11, color: '#aaa', marginTop: 1, marginBottom: 5 },
  barBg: { height: 4, backgroundColor: '#f0f0f0', borderRadius: 2 },
  bar: { height: 4, backgroundColor: '#534AB7', borderRadius: 2 },
  countWrap: { alignItems: 'flex-end', width: 44 },
  count: { fontSize: 13, color: '#534AB7', fontWeight: '500' },
  countZero: { color: '#ccc' },
  never: { fontSize: 10, color: '#E24B4A', marginTop: 2 },
});
