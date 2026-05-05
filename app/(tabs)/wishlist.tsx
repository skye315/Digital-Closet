import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  FlatList, Modal, TextInput, Alert, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type WishItem = {
  id: string;
  label: string;
  brand: string;
  category: string;
  price: string;
  notes: string;
};

const CATEGORIES = ['Tops', 'Bottoms', 'Shoes', 'Outerwear', 'Accessories'];

export default function WishlistScreen() {
  const [items, setItems] = useState<WishItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [label, setLabel] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tops');

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

  const addItem = () => {
    if (!label.trim()) { Alert.alert('Name required', 'Please name this item.'); return; }
    const newItem: WishItem = {
      id: Date.now().toString(),
      label: label.trim(),
      brand: brand.trim(),
      category: selectedCategory,
      price: price.trim(),
      notes: notes.trim(),
    };
    const updated = [newItem, ...items];
    setItems(updated);
    saveItems(updated);
    setModalVisible(false);
    setLabel(''); setBrand(''); setPrice(''); setNotes('');
  };

  const deleteItem = (id: string) => {
    Alert.alert('Remove item', 'Remove this from your wishlist?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        const updated = items.filter(i => i.id !== id);
        setItems(updated);
        saveItems(updated);
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Wishlist</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onLongPress={() => deleteItem(item.id)}>
            <View style={styles.cardLeft}>
              <View style={styles.iconBox}>
                <Text style={styles.iconText}>🛍️</Text>
              </View>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.itemName}>{item.label}</Text>
              {item.brand ? <Text style={styles.itemSub}>{item.brand}</Text> : null}
              <View style={styles.tagRow}>
                <View style={styles.catTag}>
                  <Text style={styles.catTagText}>{item.category}</Text>
                </View>
                {item.price ? (
                  <View style={styles.priceTag}>
                    <Text style={styles.priceTagText}>${item.price}</Text>
                  </View>
                ) : null}
              </View>
              {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Tap + to add items you want</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <ScrollView>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Add to wishlist</Text>
              <TextInput
                style={styles.input}
                placeholder="Item name (e.g. White sneakers)"
                placeholderTextColor="#bbb"
                value={label}
                onChangeText={setLabel}
              />
              <TextInput
                style={styles.input}
                placeholder="Brand — optional"
                placeholderTextColor="#bbb"
                value={brand}
                onChangeText={setBrand}
              />
              <TextInput
                style={styles.input}
                placeholder="Price — optional"
                placeholderTextColor="#bbb"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Notes — optional (e.g. size M, black colorway)"
                placeholderTextColor="#bbb"
                value={notes}
                onChangeText={setNotes}
                multiline
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
              <TouchableOpacity style={styles.saveBtn} onPress={addItem}>
                <Text style={styles.saveBtnText}>Add to wishlist</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { fontSize: 22, fontWeight: '500' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#534AB7', alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 22, lineHeight: 26 },
  list: { padding: 16, gap: 10 },
  card: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 12, borderWidth: 0.5, borderColor: '#e0e0e0' },
  cardLeft: { justifyContent: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#EEEDFE', alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 20 },
  cardBody: { flex: 1, gap: 3 },
  itemName: { fontSize: 14, fontWeight: '500', color: '#333' },
  itemSub: { fontSize: 12, color: '#888' },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  catTag: { backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  catTagText: { fontSize: 11, color: '#666' },
  priceTag: { backgroundColor: '#EAF3DE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  priceTagText: { fontSize: 11, color: '#3B6D11' },
  notes: { fontSize: 11, color: '#aaa', marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#aaa', fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 18, fontWeight: '500', marginBottom: 16, textAlign: 'center' },
  input: { borderWidth: 0.5, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 12, color: '#333' },
  notesInput: { height: 80, textAlignVertical: 'top' },
  sheetLabel: { fontSize: 13, color: '#888', marginBottom: 8 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  catChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5, borderColor: '#ddd', backgroundColor: '#f5f5f5' },
  catChipActive: { backgroundColor: '#EEEDFE', borderColor: '#AFA9EC' },
  catChipText: { fontSize: 13, color: '#888' },
  catChipTextActive: { color: '#534AB7' },
  saveBtn: { backgroundColor: '#534AB7', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  cancelBtn: { alignItems: 'center', padding: 10 },
  cancelBtnText: { color: '#888', fontSize: 14 },
});
