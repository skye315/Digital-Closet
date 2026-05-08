import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  FlatList, Modal, TextInput, Alert, ScrollView, Linking, Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useFonts, PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';

type WishItem = {
  id: string;
  label: string;
  brand: string;
  category: string;
  price: string;
  notes: string;
  color: string;
  link: string;
  dateAdded: string;
  uri: string;
};

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

export default function WishlistScreen() {
  const [fontsLoaded] = useFonts({ PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold });
  const [items, setItems] = useState<WishItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WishItem | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [label, setLabel] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [link, setLink] = useState('');
  const [uri, setUri] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tops');
  const [selectedColor, setSelectedColor] = useState('');

  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem('wishlist');
      if (saved) setItems(JSON.parse(saved));
    };
    load();
  }, []);

  const saveItems = async (updated: WishItem[]) => {
    await AsyncStorage.setItem('wishlist', JSON.stringify(updated));
  };

  const openAdd = () => {
    setEditMode(false);
    setLabel(''); setBrand(''); setPrice(''); setNotes('');
    setLink(''); setUri('');
    setSelectedCategory('Tops'); setSelectedColor('');
    setModalVisible(true);
  };

  const openEdit = (item: WishItem) => {
    setEditMode(true);
    setLabel(item.label); setBrand(item.brand); setPrice(item.price);
    setNotes(item.notes); setLink(item.link); setUri(item.uri || '');
    setSelectedCategory(item.category); setSelectedColor(item.color);
    setSelectedItem(item);
    setDetailModalVisible(false);
    setTimeout(() => setModalVisible(true), 300);
  };

  const pickImage = async () => {
    Alert.alert('Add photo', 'Choose a source', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Take photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission needed'); return; }
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [3, 4], quality: 0.8 });
          if (!result.canceled) setUri(result.assets[0].uri);
        }
      },
      {
        text: 'Choose from library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission needed'); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [3, 4], quality: 0.8 });
          if (!result.canceled) setUri(result.assets[0].uri);
        }
      }
    ]);
  };

  const saveItem = () => {
    if (!label.trim()) { Alert.alert('Name required', 'Please name this item.'); return; }
    const today = new Date();
    const dateStr = `${today.toLocaleString('default', { month: 'short' })} ${today.getDate()}`;

    if (editMode && selectedItem) {
      const updated = items.map(i =>
        i.id === selectedItem.id
          ? { ...i, label: label.trim(), brand: brand.trim(), price: price.trim(), notes: notes.trim(), link: link.trim(), category: selectedCategory, color: selectedColor, uri }
          : i
      );
      setItems(updated);
      saveItems(updated);
    } else {
      const newItem: WishItem = {
        id: Date.now().toString(),
        label: label.trim(),
        brand: brand.trim(),
        category: selectedCategory,
        price: price.trim(),
        notes: notes.trim(),
        color: selectedColor,
        link: link.trim(),
        dateAdded: dateStr,
        uri,
      };
      const updated = [newItem, ...items];
      setItems(updated);
      saveItems(updated);
    }
    setModalVisible(false);
  };

  const deleteItem = (id: string) => {
    Alert.alert('Remove item', 'Remove this from your wishlist?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        const updated = items.filter(i => i.id !== id);
        setItems(updated);
        saveItems(updated);
        setDetailModalVisible(false);
      }}
    ]);
  };

  const moveTocloset = async (item: WishItem) => {
    Alert.alert(
      'Move to closet',
      `Add "${item.label}" to your closet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add to closet',
          onPress: async () => {
            const saved = await AsyncStorage.getItem('closet_items');
            const closetItems: ClothingItem[] = saved ? JSON.parse(saved) : [];
            const newClothingItem: ClothingItem = {
              id: Date.now().toString(),
              uri: item.uri || '',
              label: item.label,
              brand: item.brand,
              category: item.category,
              colors: item.color ? [item.color] : [],
              wornCount: 0,
              closetId: 'default',
            };
            const updatedCloset = [newClothingItem, ...closetItems];
            await AsyncStorage.setItem('closet_items', JSON.stringify(updatedCloset));
            const updatedWishlist = items.filter(i => i.id !== item.id);
            setItems(updatedWishlist);
            saveItems(updatedWishlist);
            setDetailModalVisible(false);
            Alert.alert('Added!', `"${item.label}" has been added to your closet.`);
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
          <Text style={styles.headerPillText}>Search My Wishlist</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => {
          const colorHex = COLORS.find(c => c.name === item.color)?.hex;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => { setSelectedItem(item); setDetailModalVisible(true); }}>
              {colorHex && (
                <View style={[styles.colorDot, { backgroundColor: colorHex, borderWidth: item.color === 'White' ? 0.5 : 0, borderColor: '#ddd' }]} />
              )}
              {item.uri ? (
                <Image source={{ uri: item.uri }} style={styles.cardImage} />
              ) : (
                <View style={styles.cardImage} />
              )}
              <View style={styles.polaroidBottom} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Tap + to add items you want</Text>
          </View>
        }
      />

      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.detailOverlay}>
          <View style={styles.detailSheet}>
            <Text style={styles.detailName}>{selectedItem?.label}</Text>
            {selectedItem?.uri ? (
              <Image source={{ uri: selectedItem.uri }} style={styles.detailImage} />
            ) : (
              <View style={styles.detailImage} />
            )}
            <View style={styles.detailInfo}>
              {selectedItem?.brand ? <Text style={styles.detailInfoText}>Brand: {selectedItem.brand}</Text> : null}
              {selectedItem?.price ? <Text style={styles.detailInfoText}>Price: ${selectedItem.price}</Text> : null}
              {selectedItem?.dateAdded ? <Text style={styles.detailInfoText}>Date Added: {selectedItem.dateAdded}</Text> : null}
              {selectedItem?.notes ? <Text style={styles.detailInfoText}>{selectedItem.notes}</Text> : null}
            </View>
            <View style={styles.detailBtns}>
              {selectedItem?.link ? (
                <TouchableOpacity style={styles.detailBtn} onPress={() => selectedItem.link && Linking.openURL(selectedItem.link)}>
                  <Text style={styles.detailBtnText}>Link</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.detailBtn} onPress={() => selectedItem && moveTocloset(selectedItem)}>
                <Text style={styles.detailBtnText}>Purchased</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.detailBtn} onPress={() => selectedItem && openEdit(selectedItem)}>
                <Text style={styles.detailBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.detailBtn} onPress={() => selectedItem && deleteItem(selectedItem.id)}>
                <Text style={styles.detailBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setDetailModalVisible(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <ScrollView scrollEnabled={false} keyboardShouldPersistTaps="handled">
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>{editMode ? 'Edit item' : 'Add to wishlist'}</Text>
              <TouchableOpacity style={styles.photoUpload} onPress={pickImage}>
                {uri ? (
                  <Image source={{ uri }} style={styles.photoPreview} />
                ) : (
                  <Text style={styles.photoUploadText}>+ Add photo</Text>
                )}
              </TouchableOpacity>
              <TextInput style={styles.input} placeholder="Item name" placeholderTextColor="#bbb" value={label} onChangeText={setLabel} />
              <TextInput style={styles.input} placeholder="Brand — optional" placeholderTextColor="#bbb" value={brand} onChangeText={setBrand} />
              <TextInput style={styles.input} placeholder="Price — optional" placeholderTextColor="#bbb" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
              <TextInput style={styles.input} placeholder="Link — optional" placeholderTextColor="#bbb" value={link} onChangeText={setLink} />
              <TextInput style={[styles.input, styles.notesInput]} placeholder="Notes — optional" placeholderTextColor="#bbb" value={notes} onChangeText={setNotes} multiline />
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
                    style={[styles.colorOption, selectedColor === c.name && styles.colorOptionActive]}
                    onPress={() => setSelectedColor(prev => prev === c.name ? '' : c.name)}>
                    <View style={[styles.colorCircle, { backgroundColor: c.hex, borderWidth: c.name === 'White' ? 0.5 : 0, borderColor: '#ddd' }]} />
                    <Text style={styles.colorName}>{c.name}</Text>
                    {selectedColor === c.name && <Text style={styles.colorCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={saveItem}>
                <Text style={styles.saveBtnText}>{editMode ? 'Save changes' : 'Add to wishlist'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, gap: 10 },
  headerPill: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 50, paddingVertical: 14, paddingHorizontal: 20 },
  headerPillText: { color: '#fff', fontSize: 20, fontFamily: 'PlayfairDisplay_600SemiBold', textAlign: 'center' },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 24, lineHeight: 28 },
  grid: { paddingHorizontal: 12, gap: 8, paddingBottom: 20 },
  card: { flex: 1, margin: 4, aspectRatio: 3/4, borderRadius: 4, overflow: 'hidden', backgroundColor: '#1a1a1a', borderWidth: 3, borderColor: '#1a1a1a', position: 'relative' },
  colorDot: { position: 'absolute', top: 8, left: 8, width: 16, height: 16, borderRadius: 8, zIndex: 1 },
  cardImage: { flex: 1, backgroundColor: '#333' },
  polaroidBottom: { height: 16, backgroundColor: '#1a1a1a' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#aaa', fontSize: 15 },
  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  detailSheet: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  detailName: { color: '#fff', fontSize: 26, fontFamily: 'PlayfairDisplay_600SemiBold', textAlign: 'center', marginBottom: 16 },
  detailImage: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#333', marginBottom: 16 },
  detailInfo: { alignItems: 'center', gap: 4, marginBottom: 20 },
  detailInfoText: { color: '#fff', fontSize: 14, fontFamily: 'PlayfairDisplay_400Regular' },
  detailBtns: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  detailBtn: { flex: 1, backgroundColor: '#333', borderRadius: 50, paddingVertical: 12, alignItems: 'center' },
  detailBtnText: { color: '#fff', fontSize: 11, fontWeight: '500' },
  closeBtn: { alignItems: 'center', padding: 10 },
  closeBtnText: { color: '#888', fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 18, fontWeight: '500', marginBottom: 16, textAlign: 'center' },
  photoUpload: { width: '100%', height: 140, borderRadius: 12, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', marginBottom: 12, overflow: 'hidden' },
  photoPreview: { width: '100%', height: '100%' },
  photoUploadText: { color: '#aaa', fontSize: 15 },
  sheetLabel: { fontSize: 13, color: '#888', marginBottom: 8 },
  input: { borderWidth: 0.5, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 12, color: '#333' },
  notesInput: { height: 80, textAlignVertical: 'top' },
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
});