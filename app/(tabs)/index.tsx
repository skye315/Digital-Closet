import { PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold, useFonts } from '@expo-google-fonts/playfair-display';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
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
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
  });
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
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);
  const [dirtyIds, setDirtyIds] = useState<string[]>([]);

  useEffect(() => { loadItems(); }, []);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [])
  );

  const loadItems = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      const savedClosets = await AsyncStorage.getItem('closets');
      const activeCloset = await AsyncStorage.getItem('active_closet');
      const dirtyRaw = await AsyncStorage.getItem('dirty_items');
      if (dirtyRaw) setDirtyIds(JSON.parse(dirtyRaw));
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

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerPill}>
          <Text style={styles.headerPillText}>Search My Closet</Text>
        </View>
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
              setSelectedItem(item);
              setDetailModalVisible(true);
            }}>
            <Image source={{ uri: item.uri }} style={styles.cardImage} />
            <View style={styles.polaroidBottom} />
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

        <Modal visible={detailModalVisible} animationType="slide" transparent>
          <View style={styles.detailOverlay}>
            <View style={styles.detailSheet}>
              <Text style={styles.detailName}>{selectedItem?.label}</Text>

              <Image source={{ uri: selectedItem?.uri }} style={styles.detailImage} />

              <View style={styles.detailInfo}>
                {selectedItem?.brand ? (
                  <Text style={styles.detailInfoText}>Brand: {selectedItem.brand}</Text>
                ) : null}
                <Text style={styles.detailInfoText}>
                  Status: {selectedItem && dirtyIds.includes(selectedItem.id) ? 'Dirty 🧺' : 'Clean ✓'}
                </Text>
                <Text style={styles.detailInfoText}>
                  Number of Wears: {selectedItem?.wornCount}
                </Text>
              </View>

              <View style={styles.detailBtns}>
                <TouchableOpacity
                  style={styles.detailBtn}
                  onPress={() => {
                    if (!selectedItem) return;
                    const updated = items.map(i =>
                      i.id === selectedItem.id ? { ...i, wornCount: i.wornCount + 1 } : i
                    );
                    setItems(updated);
                    saveItems(updated);
                    setDetailModalVisible(false);
                  }}>
                  <Text style={styles.detailBtnText}>Worn</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.detailBtn}
                  onPress={() => {
                    if (!selectedItem) return;
                    Alert.alert(
                      'Move to closet',
                      'Which closet?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        ...closets.map(c => ({
                          text: `${c.emoji} ${c.name}`,
                          onPress: () => {
                            const updated = items.map(i =>
                              i.id === selectedItem.id ? { ...i, closetId: c.id as string } : i
                            );
                            setItems(updated);
                            saveItems(updated);
                            setDetailModalVisible(false);
                          }
                        }))
                      ]
                    );
                  }}>
                <Text style={styles.detailBtnText}>Move</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.detailBtn}
                onPress={() => {
                  if (!selectedItem) return;
                  setDetailModalVisible(false);
                  openEdit(selectedItem);
                }}>
                <Text style={styles.detailBtnText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.detailBtn, styles.detailBtnDelete]}
                onPress={() => {
                  if (!selectedItem) return;
                  Alert.alert('Remove item', `Remove "${selectedItem.label}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Remove', style: 'destructive',
                      onPress: () => {
                        const updated = items.filter(i => i.id !== selectedItem.id);
                        setItems(updated);
                        saveItems(updated);
                        setDetailModalVisible(false);
                      }
                    }
                  ]);
                }}>
              <Text style={styles.detailBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.detailClose} onPress={() => setDetailModalVisible(false)}>
            <Text style={styles.detailCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

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
overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
sheetTitle: { fontSize: 18, fontWeight: '500', marginBottom: 16, textAlign: 'center' },
sheetLabel: { fontSize: 13, color: '#888', marginBottom: 8 },
preview: { width: 100, height: 133, borderRadius: 10, alignSelf: 'center', marginBottom: 16 },
input: { borderWidth: 0.5, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 12, color: '#333' },
catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
catChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5, borderColor: '#ddd', backgroundColor: '#f5f5f5' },
catChipActive: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
catChipText: { fontSize: 13, color: '#888' },
catChipTextActive: { color: '#fff' },
colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
colorOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5, borderColor: '#ddd', backgroundColor: '#f5f5f5' },
colorOptionActive: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
colorCircle: { width: 14, height: 14, borderRadius: 7 },
colorName: { fontSize: 12, color: '#666' },
colorCheck: { fontSize: 11, color: '#fff', fontWeight: '500' },
saveBtn: { backgroundColor: '#1a1a1a', borderRadius: 50, padding: 14, alignItems: 'center', marginBottom: 10 },
saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
cancelBtn: { alignItems: 'center', padding: 10 },
cancelBtnText: { color: '#888', fontSize: 14 },
container: {flex: 1, backgroundColor: '#fff'},
headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, gap: 10 },
headerPill: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 50, paddingVertical: 14, paddingHorizontal: 20 },
headerPillText: { color: '#fff', fontSize: 20, fontFamily: 'PlayfairDisplay_600SemiBold', textAlign: 'center' },
addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
addBtnText: { color: '#fff', fontSize: 24, lineHeight: 28 },
filterScroll: { maxHeight: 44 },
filterRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 10, flexDirection: 'row' },
chip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 50, backgroundColor: '#1a1a1a' },
chipActive: { backgroundColor: '#1a1a1a', borderWidth: 2, borderColor: '#fff' },
brandChipActive: { backgroundColor: '#1a1a1a', borderWidth: 2, borderColor: '#fff' },
chipText: { fontSize: 13, color: '#fff', fontWeight: '500' },
chipTextActive: { color: '#fff' },
brandChipTextActive: { color: '#fff' },
colorChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50, backgroundColor: '#1a1a1a' },
colorChipActive: { backgroundColor: '#1a1a1a', borderWidth: 2, borderColor: '#fff' },
colorDot: { width: 12, height: 12, borderRadius: 6 },
colorBadges: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', gap: 3 },
colorBadge: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
grid: { paddingHorizontal: 12, gap: 8 },
card: { flex: 1, margin: 6, borderRadius: 4, overflow: 'hidden', backgroundColor: '#fff', position: 'relative', borderWidth: 3, borderColor: '#1a1a1a', shadowColor: '#000', shadowOffset: {width: 2, height: 3}, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4, },
cardImage: { width: '100%', aspectRatio: 1, backgroundColor: '#f0f0f0'},
cardLabel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: 6 },
cardLabelText: { color: '#fff', fontSize: 10, fontWeight: '500' },
cardBrandText: { color: 'rgba(255,255,255,0.6)', fontSize: 9 },
badge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
badgeText: { fontSize: 10, color: '#fff' },
empty: { flex: 1, alignItems: 'center', marginTop: 80 },
emptyText: { color: '#aaa', fontSize: 15 },
detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
detailSheet: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
detailName: { color: '#fff', fontSize: 26, fontFamily: 'PlayfairDisplay_600SemiBold', textAlign: 'center', marginBottom: 16 },
detailImage: { width: '100%', height: 260, borderRadius: 12, marginBottom: 16 },
detailInfo: { alignItems: 'center', gap: 4, marginBottom: 20 },
detailInfoText: { color: '#fff', fontSize: 14, fontFamily: 'PlayfairDisplay_400Regular' },
detailBtns: { flexDirection: 'row', gap: 8, marginBottom: 12 },
detailBtn: { flex: 1, backgroundColor: '#333', borderRadius: 50, paddingVertical: 12, alignItems: 'center' },
detailBtnDelete: { backgroundColor: '#333' },
detailBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
detailClose: { alignItems: 'center', padding: 10 },
detailCloseText: { color: '#888', fontSize: 14 },
polaroidBottom: { height: 16, backgroundColor: '#1a1a1a' },
});
