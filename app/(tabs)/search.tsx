import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TextInput,
  FlatList, TouchableOpacity, Image, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';

type ClothingItem = {
  id: string;
  uri: string;
  label: string;
  brand: string;
  category: string;
  colors: string[];
  wornCount: number;
  closetId: string;
};

export default function SearchScreen() {
  const [fontsLoaded] = useFonts({ PlayfairDisplay_600SemiBold });
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [todayItemIds, setTodayItemIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [showingToday, setShowingToday] = useState(false);

  const todayKey = () => {
    const d = new Date();
    return `otd-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };

  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem('closet_items');
      if (saved) setItems(JSON.parse(saved));
      const otd = await AsyncStorage.getItem(todayKey());
      if (otd) setTodayItemIds(JSON.parse(otd));
    };
    load();
  }, []);

  const saveItems = async (updated: ClothingItem[]) => {
    await AsyncStorage.setItem('closet_items', JSON.stringify(updated));
  };

  const todayItems = items.filter(i => todayItemIds.includes(i.id));

  const searchResults = query.trim().length === 0 ? [] : items.filter(i => {
    const q = query.toLowerCase();
    return (
      i.label.toLowerCase().includes(q) ||
      i.brand?.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q) ||
      i.colors?.some(c => c.toLowerCase().includes(q))
    );
  });

  const displayItems = showingToday ? todayItems : searchResults;

  const handleItemPress = (item: ClothingItem) => {
    Alert.alert(
      item.label,
      `${item.brand ? 'Brand: ' + item.brand + '\n' : ''}${item.colors?.length > 0 ? 'Colors: ' + item.colors.join(', ') + '\n' : ''}Category: ${item.category}\nWorn ${item.wornCount} times`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log wear today',
          onPress: () => {
            const updated = items.map(i =>
              i.id === item.id ? { ...i, wornCount: i.wornCount + 1 } : i
            );
            setItems(updated);
            saveItems(updated);
          }
        },
        {
          text: 'Remove', style: 'destructive',
          onPress: () => {
            const updated = items.filter(i => i.id !== item.id);
            setItems(updated);
            saveItems(updated);
          }
        }
      ]
    );
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerPill}>
          <TextInput
            style={styles.input}
            placeholder="Search by name, brand, color, category..."
            placeholderTextColor="#aaa"
            value={query}
            onChangeText={t => { setQuery(t); setShowingToday(false); }}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {todayItems.length > 0 && (
        <TouchableOpacity
          style={[styles.todayChip, showingToday && styles.todayChipActive]}
          onPress={() => { setShowingToday(!showingToday); setQuery(''); }}>
          <Text style={[styles.todayChipText, showingToday && styles.todayChipTextActive]}>
            👗 Today's outfit ({todayItems.length} items)
          </Text>
        </TouchableOpacity>
      )}

      {!showingToday && query.trim().length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Start typing to search your closet</Text>
        </View>
      )}

      {!showingToday && query.trim().length > 0 && searchResults.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No items match "{query}"</Text>
        </View>
      )}

      <FlatList
        data={displayItems}
        keyExtractor={i => i.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => handleItemPress(item)}>
            <Image source={{ uri: item.uri }} style={styles.cardImage} />
            <View style={styles.polaroidBottom} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 },
  headerPill: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 50, paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, color: '#fff', fontSize: 14 },
  clearBtn: { color: '#aaa', fontSize: 14, paddingLeft: 8 },
  todayChip: { marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 50, borderWidth: 0.5, borderColor: '#1a1a1a', alignSelf: 'flex-start' },
  todayChipActive: { backgroundColor: '#1a1a1a' },
  todayChipText: { fontSize: 13, color: '#1a1a1a', fontWeight: '500' },
  todayChipTextActive: { color: '#fff' },
  grid: { paddingHorizontal: 12, gap: 8, paddingBottom: 20 },
  card: { flex: 1, margin: 4, aspectRatio: 3/4, borderRadius: 4, overflow: 'hidden', backgroundColor: '#fff', borderWidth: 3, borderColor: '#1a1a1a', borderBottomWidth: 1, position: 'relative' },
  cardImage: { flex: 1, backgroundColor: '#f0f0f0' },
  polaroidBottom: { height: 16, backgroundColor: '#1a1a1a' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#aaa', fontSize: 15 },
});