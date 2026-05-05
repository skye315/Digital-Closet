import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  FlatList, Image, Modal, TextInput, Alert, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ClothingItem = { id: string; uri: string; label: string; category: string; wornCount: number; };
type Outfit = { id: string; name: string; tag: string; itemIds: string[]; wornCount: number; };

const TAGS = ['Casual', 'Work', 'Evening', 'Sport', 'Travel'];

export default function OutfitsScreen() {
  const [clothes, setClothes] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [outfitName, setOutfitName] = useState('');
  const [selectedTag, setSelectedTag] = useState('Casual');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const savedClothes = await AsyncStorage.getItem('closet_items');
      const savedOutfits = await AsyncStorage.getItem('outfits');
      if (savedClothes) setClothes(JSON.parse(savedClothes));
      if (savedOutfits) setOutfits(JSON.parse(savedOutfits));
    };
    load();
  }, []);

  const saveOutfits = async (updated: Outfit[]) => {
    await AsyncStorage.setItem('outfits', JSON.stringify(updated));
  };

  const saveClothes = async (updated: ClothingItem[]) => {
    await AsyncStorage.setItem('closet_items', JSON.stringify(updated));
  };

  const toggleItem = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const logWear = (outfit: Outfit) => {
    Alert.alert(
      outfit.name,
      `Worn ${outfit.wornCount} times. Log wear today?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log wear',
          onPress: () => {
            const updatedOutfits = outfits.map(o =>
              o.id === outfit.id ? { ...o, wornCount: o.wornCount + 1 } : o
            );
            setOutfits(updatedOutfits);
            saveOutfits(updatedOutfits);

            const updatedClothes = clothes.map(c =>
              outfit.itemIds.includes(c.id) ? { ...c, wornCount: c.wornCount + 1 } : c
            );
            setClothes(updatedClothes);
            saveClothes(updatedClothes);
          }
        },
        {
          text: 'Remove outfit', style: 'destructive',
          onPress: () => {
            const updated = outfits.filter(o => o.id !== outfit.id);
            setOutfits(updated);
            saveOutfits(updated);
          }
        },
      ]
    );
  };

  const saveOutfit = () => {
    if (!outfitName.trim()) { Alert.alert('Name required', 'Please name this outfit.'); return; }
    if (selectedIds.length === 0) { Alert.alert('No items', 'Please select at least one item.'); return; }
    const newOutfit: Outfit = {
      id: Date.now().toString(),
      name: outfitName.trim(),
      tag: selectedTag,
      itemIds: selectedIds,
      wornCount: 0,
    };
    const updated = [newOutfit, ...outfits];
    setOutfits(updated);
    saveOutfits(updated);
    setModalVisible(false);
    setOutfitName('');
    setSelectedIds([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Outfits</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={outfits}
        keyExtractor={o => o.id}
        contentContainerStyle={styles.list}
        renderItem={({ item: outfit }) => {
          const outfitClothes = clothes.filter(c => outfit.itemIds.includes(c.id));
          return (
            <TouchableOpacity style={styles.card} onPress={() => logWear(outfit)}>
              <View style={styles.thumbRow}>
                {outfitClothes.slice(0, 3).map(c => (
                  <Image key={c.id} source={{ uri: c.uri }} style={styles.thumb} />
                ))}
                {outfitClothes.length === 0 && <Text style={styles.noItems}>No items</Text>}
              </View>
              <View style={styles.meta}>
                <Text style={styles.outfitName}>{outfit.name}</Text>
                <Text style={styles.wornText}>Worn {outfit.wornCount} times</Text>
                <View style={[styles.tag, { backgroundColor: tagColor(outfit.tag) }]}>
                  <Text style={styles.tagText}>{outfit.tag}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Tap + to create your first outfit</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New outfit</Text>

            <TextInput
              style={styles.input}
              placeholder="Outfit name"
              placeholderTextColor="#bbb"
              value={outfitName}
              onChangeText={setOutfitName}
            />

            <Text style={styles.sheetLabel}>Tag</Text>
            <View style={styles.tagRow}>
              {TAGS.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tagChip, selectedTag === t && styles.tagChipActive]}
                  onPress={() => setSelectedTag(t)}>
                  <Text style={[styles.tagChipText, selectedTag === t && styles.tagChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sheetLabel}>Pick clothes</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.picker}>
              {clothes.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.pickItem, selectedIds.includes(c.id) && styles.pickItemActive]}
                  onPress={() => toggleItem(c.id)}>
                  <Image source={{ uri: c.uri }} style={styles.pickImage} />
                  {selectedIds.includes(c.id) && (
                    <View style={styles.checkOverlay}>
                      <Text style={styles.checkMark}>✓</Text>
                    </View>
                  )}
                  <Text style={styles.pickLabel} numberOfLines={1}>{c.label}</Text>
                </TouchableOpacity>
              ))}
              {clothes.length === 0 && (
                <Text style={styles.noClothes}>Add clothes to your closet first</Text>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.saveBtn} onPress={saveOutfit}>
              <Text style={styles.saveBtnText}>Save outfit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function tagColor(tag: string) {
  const colors: Record<string, string> = {
    Casual: '#EAF3DE', Work: '#E6F1FB', Evening: '#FAECE7', Sport: '#E1F5EE', Travel: '#EEEDFE'
  };
  return colors[tag] || '#f5f5f5';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { fontSize: 22, fontWeight: '500' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#534AB7', alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 22, lineHeight: 26 },
  list: { padding: 16, gap: 12 },
  card: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 12, borderWidth: 0.5, borderColor: '#e0e0e0' },
  thumbRow: { flexDirection: 'row', gap: 4 },
  thumb: { width: 52, height: 64, borderRadius: 8, backgroundColor: '#f0f0f0' },
  noItems: { color: '#ccc', fontSize: 12, alignSelf: 'center' },
  meta: { flex: 1, justifyContent: 'center', gap: 4 },
  outfitName: { fontSize: 14, fontWeight: '500' },
  wornText: { fontSize: 12, color: '#888' },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  tagText: { fontSize: 11, color: '#444' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#aaa', fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 18, fontWeight: '500', marginBottom: 16, textAlign: 'center' },
  input: { borderWidth: 0.5, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 16, color: '#333' },
  sheetLabel: { fontSize: 13, color: '#888', marginBottom: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tagChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5, borderColor: '#ddd', backgroundColor: '#f5f5f5' },
  tagChipActive: { backgroundColor: '#EEEDFE', borderColor: '#AFA9EC' },
  tagChipText: { fontSize: 13, color: '#888' },
  tagChipTextActive: { color: '#534AB7' },
  picker: { marginBottom: 20 },
  pickItem: { width: 70, marginRight: 10, alignItems: 'center', position: 'relative' },
  pickItemActive: { opacity: 0.9 },
  pickImage: { width: 64, height: 80, borderRadius: 8, backgroundColor: '#f0f0f0', borderWidth: 2, borderColor: 'transparent' },
  checkOverlay: { position: 'absolute', top: 0, left: 0, width: 64, height: 80, borderRadius: 8, backgroundColor: 'rgba(83,74,183,0.5)', alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#fff', fontSize: 24, fontWeight: '500' },
  pickLabel: { fontSize: 10, color: '#666', marginTop: 4, textAlign: 'center' },
  noClothes: { color: '#aaa', fontSize: 13, alignSelf: 'center', marginTop: 20 },
  saveBtn: { backgroundColor: '#534AB7', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  cancelBtn: { alignItems: 'center', padding: 10 },
  cancelBtnText: { color: '#888', fontSize: 14 },
});
