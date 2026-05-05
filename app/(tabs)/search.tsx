import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
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

export default function SearchScreen() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem('closet_items');
      if (saved) setItems(JSON.parse(saved));
    };
    load();
  }, []);

  const saveItems = async (updated: ClothingItem[]) => {
    await AsyncStorage.setItem('closet_items', JSON.stringify(updated));
  };

  const results = query.trim().length === 0 ? [] : items.filter(i => {
    const q = query.toLowerCase();
    return (
      i.label.toLowerCase().includes(q) ||
      i.brand?.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q) ||
      i.color?.toLowerCase().includes(q)
    );
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search by name, brand, color, category..."
          placeholderTextColor="#bbb"
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={() => setQuery('')}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {query.trim().length > 0 && results.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No items match "{query}"</Text>
        </View>
      )}

      {query.trim().length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Start typing to search your closet</Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={i => i.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              Alert.alert(
                item.label,
                `${item.brand ? 'Brand: ' + item.brand + '\n' : ''}${item.color ? 'Color: ' + item.color + '\n' : ''}Category: ${item.category}\nWorn ${item.wornCount} times`,
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
            }}>
            <Image source={{ uri: item.uri }} style={styles.cardImage} />
            <View style={styles.cardLabel}>
              <Text style={styles.cardLabelText} numberOfLines={1}>{item.label}</Text>
              {item.brand ? <Text style={styles.cardBrandText} numberOfLines={1}>{item.brand}</Text> : null}
            </View>
            {item.wornCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.wornCount}×</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '500' },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12 },
  input: { flex: 1, borderWidth: 0.5, borderColor: '#ddd', borderRadius: 12, padding: 12, fontSize: 15, backgroundColor: '#f9f9f9', color: '#333' },
  clearBtn: { position: 'absolute', right: 12, padding: 4 },
  clearBtnText: { fontSize: 14, color: '#aaa' },
  grid: { paddingHorizontal: 12, gap: 8 },
  card: { flex: 1, margin: 4, aspectRatio: 3/4, borderRadius: 10, overflow: 'hidden', backgroundColor: '#f0f0f0', position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardLabel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.35)', padding: 4 },
  cardLabelText: { color: '#fff', fontSize: 10 },
  cardBrandText: { color: 'rgba(255,255,255,0.7)', fontSize: 9 },
  badge: { position: 'absolute', top: 5, right: 5, backgroundColor: '#EEEDFE', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  badgeText: { fontSize: 10, color: '#534AB7' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#aaa', fontSize: 15 },
});