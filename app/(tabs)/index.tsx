import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
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
  colors: string[];
  wornCount: number;
  closetId: string;
};

const CATEGORIES = ['Tops', 'Bottoms', 'Shoes', 'Outerwear', 'Accessories'];
const FILTERS = ['All', ...CATEGORIES];
const COLORS = [
  { name: 'Black', hex: '#222' },
  { name: 'White', hex: '#f5f5f5' },
  { name: 'Grey', hex: '#999' },
  { name: 'Navy', hex: '#1a2a5e' },
  { name: 'Blue', hex: '#378ADD' },
  { name: 'Red', hex: '#E24B4A' },
  { name: 'Pink', hex: '#D4537E' },
  { name: 'Green', hex: '#3B6D11' },
  { name: 'Yellow', hex: '#EF9F27' },
  { name: 'Brown', hex: '#7B4F2E' },
  { name: 'Purple', hex: '#534AB7' },
  { name: 'Orange', hex: '#D85A30' },
];
const STORAGE_KEY = 'closet_items';

export default function ClosetScreen() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeBrand, setActiveBrand] = useState('All');
  const [activeColor, setActiveColor] = useState('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [pendingUri, setPendingUri] = useState('');
  const [label, setLabel] = useState('');
  const [brand, setBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tops');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [closets, setClosets] = useState<{id: string; name: String; emoji: string}[]>([]);
  const [activeClosetId, setActiveClosetId] = useState<string>('all');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ClothingItem | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editCategory, setEditCategory] = useState('Tops');
  const [editColors, setEditColors] = useState<string[]>([]);

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      const savedClosets = await AsyncStorage.getItem('closets');
      const activeCloset = await AsyncStorage.getItem('active_closet');
      if (saved) {
        const parsed = JSON.parse(saved);
        const migrated = parsed.map((item: any) => ({
          ...item,
          colors: item.colors ? item.colors : item.color ? [item.color] : [],
        }));
        setItems(migrated);
      }
      if (savedClosets) setClosets(JSON.parse(savedClosets));
      if (activeCloset) setActiveClosetId(activeCloset);
    } catch (e) { console.error('Failed to load items', e); }
  };

  const saveItems = async (newItems: ClothingItem[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    } catch (e) { console.error('Failed to save items', e); }
  };

  const pickImage = async () => {
    Alert.alert(
      'Add clothing item',
      'Choose a photo source',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Take photo',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Please allow camera access.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [3, 4],
              quality: 0.8,
            });
            if (!result.canceled) {
              setPendingUri(result.assets[0].uri);
              setLabel('');
              setBrand('');
              setSelectedColors([]);
              setSelectedCategory('Tops');
              setModalVisible(true);
            }
          }
        },
        {
          text: 'Choose from library',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Please allow photo library access.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [3, 4],
              quality: 0.8,
            });
            if (!result.canceled) {
              setPendingUri(result.assets[0].uri);
              setLabel('');
              setBrand('');
              setSelectedColors([]);
              setSelectedCategory('Tops');
              setModalVisible(true);
            }
          }
        }
      ]
    );
  };

  const saveItem = () => {
    if (!label.trim()) {
      Alert.alert('Name required', 'Please give this item a name.');
      return;
    }
    const newItem: ClothingItem = {
      id: Date.now().toString(),
      uri: pendingUri,
      label: label.trim(),
      brand: brand.trim(),
      category: selectedCategory,
      colors: selectedColors,
      wornCount: 0,
      closetId: activeClosetId === 'all' ? 'default' : activeClosetId,
    };
    const updated = [newItem, ...items];
    setItems(updated);
    saveItems(updated);
    setModalVisible(false);
  };

  const openEdit = (item: ClothingItem) => {
    setEditingItem(item);
    setEditLabel(item.label);
    setEditBrand(item.brand || '');
    setEditCategory(item.category);
    setEditColors(item.colors || []);
    setEditModalVisible(true);
  };
  
  const saveEdit = () => {
    if (!editLabel.trim()) { Alert.alert('Name required', 'Please give this item a name.'); return; }
    const updated = items.map(i =>
      i.id === editingItem?.id
        ? { ...i, label: editLabel.trim(), brand: editBrand.trim(), category: editCategory, colors: editColors }
        : i
    );
    setItems(updated);
    saveItems(updated);
    setEditModalVisible(false);
  };

  const brands = ['All', ...Array.from(new Set(items.map(i => i.brand).filter(b => b)))];
  const usedColors = COLORS.filter(c => items.some(i => i.colors?.includes(c.name)));

  const filtered = items
  .filter(i => activeClosetId === 'all' || (i.closetId || 'default') === activeClosetId)
  .filter(i => activeCategory === 'All' || i.category === activeCategory)
  .filter(i => activeBrand === 'All' || i.brand === activeBrand)
  .filter(i => activeColor === 'All' || i.colors?.includes(activeColor));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My closet</Text>
        <TouchableOpacity style={styles.addBtn} onPress={pickImage}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {FILTERS.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, activeCategory === cat && styles.chipActive]}
            onPress={() => setActiveCategory(cat)}>
            <Text style={[styles.chipText, activeCategory === cat && styles.chipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {brands.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
          {brands.map(b => (
            <TouchableOpacity
              key={b}
              style={[styles.chip, activeBrand === b && styles.brandChipActive]}
              onPress={() => setActiveBrand(b)}>
              <Text style={[styles.chipText, activeBrand === b && styles.brandChipTextActive]}>{b}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {usedColors.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity
            style={[styles.colorChip, activeColor === 'All' && styles.colorChipActive]}
            onPress={() => setActiveColor('All')}>
            <Text style={[styles.chipText, activeColor === 'All' && styles.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {usedColors.map(c => (
            <TouchableOpacity
              key={c.name}
              style={[styles.colorChip, activeColor === c.name && styles.colorChipActive]}
              onPress={() => setActiveColor(c.name)}>
              <View style={[styles.colorDot, { backgroundColor: c.hex, borderWidth: c.name === 'White' ? 0.5 : 0, borderColor: '#ddd' }]} />
              <Text style={[styles.chipText, activeColor === c.name && styles.chipTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <FlatList
        data={filtered}
        numColumns={3}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              Alert.alert(
                item.label,
                `${item.brand ? 'Brand: ' + item.brand + '\n' : ''}${item.colors?.length > 0 ? 'Colors: ' + item.colors.join(', ')  + '\n' : ''}Category: ${item.category}\nWorn ${item.wornCount} times`,
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
                    text: 'Move to closet',
                    onPress: () => {
                      Alert.alert(
                        'Move to closet',
                        'Which closet?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          ...closets.map(c => ({
                            text: `${c.emoji} ${c.name}`,
                            onPress: () => {
                              const updated = items.map(i =>
                                i.id === item.id ? { ...i, closetId: c.id } : i
                              );
                              setItems(updated);
                              saveItems(updated);
                            }
                          }))
                        ]
                      );
                    }
                  },
                  {
                    text: 'Edit',
                    onPress: () => openEdit(item)
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
            {item.colors?.length > 0 && (
              <View style={styles.colorBadges}>
                {item.colors.slice(0,2).map(color => (
                  <View key={color} style={[styles.colorBadge, {backgroundColor: COLORS.find(c => c.name === color)?.hex || '#999' }]} />
                ))}
                </View>
            )}
            {item.wornCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.wornCount}×</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Tap + to add your first item</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <ScrollView scrollEnabled={false} keyboardShouldPersistTaps="handled">
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Name this item</Text>
              <Image source={{ uri: pendingUri }} style={styles.preview} />
              <TextInput
                style={styles.input}
                placeholder="e.g. White linen shirt"
                placeholderTextColor="#bbb"
                value={label}
                onChangeText={setLabel}
              />
              <TextInput
                style={styles.input}
                placeholder="Brand (e.g. Zara, Nike) — optional"
                placeholderTextColor="#bbb"
                value={brand}
                onChangeText={setBrand}
              />
              <Text style={styles.sheetLabel}>Category</Text>
              <View style={styles.catRow}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
                    onPress={() => setSelectedCategory(cat)}>
                    <Text style={[styles.catChipText, selectedCategory === cat && styles.catChipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.sheetLabel}>Color</Text>
              <View style={styles.colorGrid}>
                {COLORS.map(c => (
                  <TouchableOpacity
                    key={c.name}
                    style={[styles.colorOption, selectedColors.includes(c.name) && styles.colorOptionActive]}
                    onPress={() => setSelectedColors(prev =>
                      prev.includes(c.name) ? prev.filter(n => n !== c.name) : [...prev, c.name]
                    )}>
                    <View style={[styles.colorCircle, { backgroundColor: c.hex, borderWidth: c.name === 'White' ? 0.5 : 0, borderColor: '#ddd' }]} />
                    <Text style={styles.colorName}>{c.name}</Text>
                    {selectedColors.includes(c.name) && <Text style={styles.colorCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={saveItem}>
                <Text style={styles.saveBtnText}>Save to closet</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <ScrollView scrollEnabled={false} keyboardShouldPersistTaps="handled">
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Edit item</Text>
              <Image source={{ uri: editingItem?.uri }} style={styles.preview} />
              <TextInput
                style={styles.input}
                placeholder="Item name"
                placeholderTextColor="#bbb"
                value={editLabel}
                onChangeText={setEditLabel}
              />
              <TextInput
                style={styles.input}
                placeholder="Brand — optional"
                placeholderTextColor="#bbb"
                value={editBrand}
                onChangeText={setEditBrand}
              />
              <Text style={styles.sheetLabel}>Category</Text>
              <View style={styles.catRow}>
                {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, editCategory === cat && styles.catChipActive]}
                  onPress={() => setEditCategory(cat)}>
                <Text style={[styles.catChipText, editCategory === cat && styles.catChipTextActive]}>{cat}</Text>
              </TouchableOpacity>
                  ))}
                </View>
              <Text style={styles.sheetLabel}>Colors</Text>
              <View style={styles.colorGrid}>
                {COLORS.map(c => (
                <TouchableOpacity
                  key={c.name}
                  style={[styles.colorOption, editColors.includes(c.name) && styles.colorOptionActive]}
                  onPress={() => setEditColors(prev =>
                    prev.includes(c.name) ? prev.filter(n => n !== c.name) : [...prev, c.name]
                  )}>
                  <View style={[styles.colorCircle, { backgroundColor: c.hex, borderWidth: c.name === 'White' ? 0.5 : 0, borderColor: '#ddd' }]} />
                  <Text style={styles.colorName}>{c.name}</Text>
                  {editColors.includes(c.name) && <Text style={styles.colorCheck}>✓</Text>}
                  </TouchableOpacity>
                  ))}
                </View>
                  <TouchableOpacity style={styles.saveBtn} onPress={saveEdit}>
                <Text style={styles.saveBtnText}>Save changes</Text>
                  </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { fontSize: 22, fontWeight: '500' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#534AB7', alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 22, lineHeight: 26 },
  filterScroll: { maxHeight: 44 },
  filterRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 10, flexDirection: 'row' },
  chip: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 0.5, borderColor: '#ddd', backgroundColor: '#f5f5f5' },
  chipActive: { backgroundColor: '#EEEDFE', borderColor: '#AFA9EC' },
  brandChipActive: { backgroundColor: '#E1F5EE', borderColor: '#9FE1CB' },
  chipText: { fontSize: 13, color: '#888' },
  chipTextActive: { color: '#534AB7' },
  brandChipTextActive: { color: '#0F6E56' },
  colorChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 0.5, borderColor: '#ddd', backgroundColor: '#f5f5f5' },
  colorChipActive: { backgroundColor: '#EEEDFE', borderColor: '#AFA9EC' },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  colorBadges: { position: 'absolute', bottom: 30, right: 5, flexDirection: 'row', gap: 3},
  colorBadge: {width: 10, height: 10, borderRadius: 5, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.5)'},
  grid: { paddingHorizontal: 12, gap: 8 },
  card: { flex: 1, margin: 4, aspectRatio: 3/4, borderRadius: 10, overflow: 'hidden', backgroundColor: '#f0f0f0', position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardLabel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.35)', padding: 4 },
  cardLabelText: { color: '#fff', fontSize: 10 },
  cardBrandText: { color: 'rgba(255,255,255,0.7)', fontSize: 9 },
  badge: { position: 'absolute', top: 5, right: 5, backgroundColor: '#EEEDFE', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  badgeText: { fontSize: 10, color: '#534AB7' },
  empty: { flex: 1, alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#aaa', fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 18, fontWeight: '500', marginBottom: 16, textAlign: 'center' },
  preview: { width: 100, height: 133, borderRadius: 10, alignSelf: 'center', marginBottom: 16 },
  input: { borderWidth: 0.5, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 12, color: '#333' },
  sheetLabel: { fontSize: 13, color: '#888', marginBottom: 8 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5, borderColor: '#ddd', backgroundColor: '#f5f5f5' },
  catChipActive: { backgroundColor: '#EEEDFE', borderColor: '#AFA9EC' },
  catChipText: { fontSize: 13, color: '#888' },
  catChipTextActive: { color: '#534AB7' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  colorOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5, borderColor: '#ddd', backgroundColor: '#f5f5f5' },
  colorOptionActive: { backgroundColor: '#EEEDFE', borderColor: '#AFA9EC' },
  colorCircle: { width: 14, height: 14, borderRadius: 7 },
  colorName: { fontSize: 12, color: '#666' },
  colorCheck: { fontSize: 11, color: '#534AB7', fontWeight: '500' },
  saveBtn: { backgroundColor: '#534AB7', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  cancelBtn: { alignItems: 'center', padding: 10 },
  cancelBtnText: { color: '#888', fontSize: 14 },
});
