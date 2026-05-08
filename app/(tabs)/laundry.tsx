import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  FlatList, Image, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';

type ClothingItem = {
  id: string;
  uri: string;
  label: string;
  brand: string;
  category: string;
  colors: string[];
  wornCount: number;
  wornSinceWash: number;
};

export default function LaundryScreen() {
  const [fontsLoaded] = useFonts({ PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold });
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [dirtyIds, setDirtyIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'dirty' | 'clean'>('all');

  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem('closet_items');
      const dirty = await AsyncStorage.getItem('dirty_items');
      if (saved) {
        const parsed = JSON.parse(saved);
        const migrated = parsed.map((item: any) => ({
          ...item,
          wornSinceWash: item.wornSinceWash || 0,
        }));
        setItems(migrated);
      }
      if (dirty) setDirtyIds(JSON.parse(dirty));
    };
    load();
  }, []);

  const saveDirty = async (updated: string[]) => {
    await AsyncStorage.setItem('dirty_items', JSON.stringify(updated));
  };

  const toggleDirty = async (id: string) => {
    const item = items.find(i => i.id === id);
    const isDirty = dirtyIds.includes(id);
    Alert.alert(
      isDirty ? 'Mark as clean?' : 'Mark as dirty?',
      isDirty
        ? `Mark "${item?.label}" as clean and ready to wear?`
        : `Mark "${item?.label}" as dirty?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isDirty ? 'Mark clean' : 'Mark dirty',
          onPress: async () => {
            const updated = isDirty
              ? dirtyIds.filter(i => i !== id)
              : [...dirtyIds, id];
            setDirtyIds(updated);
            saveDirty(updated);

            if (isDirty) {
              const savedItems = await AsyncStorage.getItem('closet_items');
              if (savedItems) {
                const parsed = JSON.parse(savedItems);
                const updatedItems = parsed.map((i: any) =>
                  i.id === id ? { ...i, wornSinceWash: 0 } : i
                );
                await AsyncStorage.setItem('closet_items', JSON.stringify(updatedItems));
                setItems(updatedItems);
              }
            }
          }
        }
      ]
    );
  };

  const washAll = () => {
    Alert.alert('Wash all', 'Mark all dirty items as clean?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Wash all', onPress: async () => {
          setDirtyIds([]);
          saveDirty([]);
          const savedItems = await AsyncStorage.getItem('closet_items');
          if (savedItems) {
            const parsed = JSON.parse(savedItems);
            const updatedItems = parsed.map((i: any) =>
              dirtyIds.includes(i.id) ? { ...i, wornSinceWash: 0 } : i
            );
            await AsyncStorage.setItem('closet_items', JSON.stringify(updatedItems));
            setItems(updatedItems);
          }
        }
      }
    ]);
  };

  const filtered = items.filter(i => {
    if (activeFilter === 'dirty') return dirtyIds.includes(i.id);
    if (activeFilter === 'clean') return !dirtyIds.includes(i.id);
    return true;
  });

  const dirtyCount = dirtyIds.filter(id => items.some(i => i.id === id)).length;

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Laundry</Text>
        {dirtyCount > 0 && (
          <TouchableOpacity style={styles.washAllBtn} onPress={washAll}>
            <Text style={styles.washAllBtnText}>Wash all</Text>
          </TouchableOpacity>
        )}
      </View>

      {dirtyCount > 0 && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>🧺 {dirtyCount} item{dirtyCount > 1 ? 's' : ''} need washing</Text>
        </View>
      )}

      <View style={styles.filterRow}>
        {(['all', 'dirty', 'clean'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, activeFilter === f && styles.chipActive]}
            onPress={() => setActiveFilter(f)}>
            <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>
              {f === 'all' ? 'All' : f === 'dirty' ? `Dirty (${dirtyCount})` : 'Clean'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isDirty = dirtyIds.includes(item.id);
          return (
            <TouchableOpacity style={styles.row} onPress={() => toggleDirty(item.id)}>
              <Image source={{ uri: item.uri }} style={[styles.thumb, isDirty && styles.thumbDirty]} />
              <View style={styles.info}>
                <Text style={styles.label}>{item.label}</Text>
                {item.brand ? <Text style={styles.brand}>{item.brand}</Text> : null}
                <Text style={styles.category}>{item.category}</Text>
                {item.wornSinceWash > 0 && !isDirty && (
                  <Text style={styles.wornSince}>Worn {item.wornSinceWash}× since last wash</Text>
                )}
              </View>
              <View style={[styles.statusBadge, isDirty ? styles.statusDirty : styles.statusClean]}>
                <Text style={[styles.statusText, isDirty ? styles.statusTextDirty : styles.statusTextClean]}>
                  {isDirty ? '🧺 Dirty' : '✓ Clean'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Add clothes to your closet first</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
  title: { fontSize: 36, fontFamily: 'PlayfairDisplay_600SemiBold', color: '#1a1a1a' },
  washAllBtn: { backgroundColor: '#1a1a1a', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 50 },
  washAllBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  banner: { marginHorizontal: 20, marginBottom: 12, padding: 14, borderRadius: 12, backgroundColor: '#1a1a1a' },
  bannerText: { fontSize: 13, color: '#fff', fontWeight: '500', textAlign: 'center' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 50, backgroundColor: '#f5f5f5', borderWidth: 0.5, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  chipText: { fontSize: 13, color: '#888' },
  chipTextActive: { color: '#fff', fontWeight: '500' },
  list: { padding: 20, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 0.5, borderColor: '#e0e0e0', backgroundColor: '#fff' },
  thumb: { width: 52, height: 64, borderRadius: 8 },
  thumbDirty: { opacity: 0.5 },
  info: { flex: 1, gap: 2 },
  label: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  brand: { fontSize: 11, color: '#aaa' },
  category: { fontSize: 11, color: '#aaa' },
  wornSince: { fontSize: 11, color: '#E24B4A', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusDirty: { backgroundColor: '#FFF3E0' },
  statusClean: { backgroundColor: '#EAF3DE' },
  statusText: { fontSize: 12, fontWeight: '500' },
  statusTextDirty: { color: '#E65100' },
  statusTextClean: { color: '#3B6D11' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#aaa', fontSize: 15 },
});