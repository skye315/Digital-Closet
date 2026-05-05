import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
    Alert,
    FlatList, Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

type ClothingItem = {
  id: string;
  uri: string;
  label: string;
  brand: string;
  category: string;
  color: string;
  wornCount: number;
};

export default function LaundryScreen() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [dirtyIds, setDirtyIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'dirty' | 'clean'>('all');

  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem('closet_items');
      const dirty = await AsyncStorage.getItem('dirty_items');
      if (saved) setItems(JSON.parse(saved));
      if (dirty) setDirtyIds(JSON.parse(dirty));
    };
    load();
  }, []);

  const saveDirty = async (updated: string[]) => {
    await AsyncStorage.setItem('dirty_items', JSON.stringify(updated));
  };

  const toggleDirty = (id: string) => {
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
          onPress: () => {
            const updated = isDirty
              ? dirtyIds.filter(i => i !== id)
              : [...dirtyIds, id];
            setDirtyIds(updated);
            saveDirty(updated);
          }
        }
      ]
    );
  };

  const washAll = () => {
    Alert.alert('Wash all', 'Mark all dirty items as clean?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Wash all', onPress: () => {
          setDirtyIds([]);
          saveDirty([]);
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Laundry</Text>
        {dirtyCount > 0 && (
          <TouchableOpacity style={styles.washBtn} onPress={washAll}>
            <Text style={styles.washBtnText}>Wash all</Text>
          </TouchableOpacity>
        )}
      </View>

      {dirtyCount > 0 && (
        <View style={styles.banner}>
          <Text style={styles.bannerEmoji}>🧺</Text>
          <Text style={styles.bannerText}>{dirtyCount} item{dirtyCount > 1 ? 's' : ''} need washing</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { fontSize: 22, fontWeight: '500' },
  washBtn: { backgroundColor: '#EEEDFE', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  washBtnText: { color: '#534AB7', fontSize: 13, fontWeight: '500' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: '#FFF3E0' },
  bannerEmoji: { fontSize: 20 },
  bannerText: { fontSize: 13, color: '#E65100', fontWeight: '500' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 0.5, borderColor: '#ddd', backgroundColor: '#f5f5f5' },
  chipActive: { backgroundColor: '#EEEDFE', borderColor: '#AFA9EC' },
  chipText: { fontSize: 13, color: '#888' },
  chipTextActive: { color: '#534AB7' },
  list: { padding: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, borderWidth: 0.5, borderColor: '#e0e0e0' },
  thumb: { width: 52, height: 64, borderRadius: 8 },
  thumbDirty: { opacity: 0.5 },
  info: { flex: 1 },
  label: { fontSize: 13, fontWeight: '500', color: '#333' },
  brand: { fontSize: 11, color: '#aaa', marginTop: 2 },
  category: { fontSize: 11, color: '#aaa', marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusDirty: { backgroundColor: '#FFF3E0' },
  statusClean: { backgroundColor: '#EAF3DE' },
  statusText: { fontSize: 12, fontWeight: '500' },
  statusTextDirty: { color: '#E65100' },
  statusTextClean: { color: '#3B6D11' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#aaa', fontSize: 15 },
});