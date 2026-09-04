import { PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold, useFonts } from '@expo-google-fonts/playfair-display';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList, Image, Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

type ClothingItem = { id: string; uri: string; label: string; brand: string; category: string; colors: string[]; wornCount: number; closetId: string; };
type Outfit = { id: string; name: string; tag: string; itemIds: string[]; wornCount: number; lastWorn?: string; };

const TAGS = ['Casual', 'Formal', 'PJs', 'Athletic', 'Other'];
const CATEGORY_ORDER = ['Outerwear', 'Tops', 'Bottoms', 'Shoes', 'Accessories'];

export default function OutfitsScreen() {
  const [fontsLoaded] = useFonts({ PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold });
  const [clothes, setClothes] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [activeClosetId, setActiveClosetId] = useState<string>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [outfitName, setOutfitName] = useState('');
  const [selectedTag, setSelectedTag] = useState('Casual');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState('All');
  const [isEditing, setIsEditing] = useState(false);

  const loadData = async () => {
    const savedClothes = await AsyncStorage.getItem('closet_items');
    const savedOutfits = await AsyncStorage.getItem('outfits');
    const activeCloset = await AsyncStorage.getItem('active_closet');
    if (savedClothes) setClothes(JSON.parse(savedClothes));
    if (savedOutfits) setOutfits(JSON.parse(savedOutfits));
    if (activeCloset) setActiveClosetId(activeCloset);
  };

  useEffect(() => { loadData(); }, []);

  useFocusEffect(
    useCallback(() => { loadData(); }, [])
  );

  const saveOutfits = async (updated: Outfit[]) => {
    await AsyncStorage.setItem('outfits', JSON.stringify(updated));
  };

  const toggleItem = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const saveOutfit = () => {
    if (!outfitName.trim()) { Alert.alert('Name required', 'Please name this outfit.'); return; }
    if (selectedIds.length === 0) { Alert.alert('No items', 'Please select at least one item.'); return; }

    if (isEditing && selectedOutfit) {
      const updated = outfits.map(o =>
        o.id === selectedOutfit.id
          ? { ...o, name: outfitName.trim(), tag: selectedTag, itemIds: selectedIds }
          : o
      );
      setOutfits(updated);
      saveOutfits(updated);
    } else {
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
    }
    setModalVisible(false);
    setOutfitName('');
    setSelectedIds([]);
    setIsEditing(false);
  };

  const deleteOutfit = (id: string) => {
    Alert.alert('Remove outfit', 'Remove this outfit?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        const updated = outfits.filter(o => o.id !== id);
        setOutfits(updated);
        saveOutfits(updated);
        setDetailModalVisible(false);
      }},
    ]);
  };

  const getSortedClothes = (itemIds: string[]) => {
    return CATEGORY_ORDER
      .flatMap(cat => clothes.filter(c => itemIds.includes(c.id) && c.category === cat))
      .concat(clothes.filter(c => itemIds.includes(c.id) && !CATEGORY_ORDER.includes(c.category)));
  };

  const activeClothes = activeClosetId === 'all'
    ? clothes
    : clothes.filter(c => (c.closetId || 'default') === activeClosetId);

  const filtered = (activeClosetId === 'all'
    ? outfits
    : outfits.filter(o => o.itemIds.every(id => activeClothes.some(c => c.id === id)))
  ).filter(o => activeTag === 'All' || o.tag === activeTag);

  const renderCollage = (outfit: Outfit) => {
    const outfitClothes = getSortedClothes(outfit.itemIds);
    const count = outfitClothes.length;
    if (count === 0) return <View style={styles.emptyCollage} />;
    if (count === 1) return (
      <Image source={{ uri: outfitClothes[0].uri }} style={styles.collageFull} />
    );
    return (
      <View style={styles.collageGrid}>
        <Image source={{ uri: outfitClothes[0].uri }} style={styles.collageTopLeft} />
        <Image source={{ uri: outfitClothes[1].uri }} style={styles.collageBottomRight} />
        {count > 2 && (
          <View style={styles.collageMore}>
            <Text style={styles.collageMoreText}>+{count - 2}</Text>
          </View>
        )}
      </View>
    );
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>My Outfits</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => {
          setIsEditing(false);
          setOutfitName('');
          setSelectedIds([]);
          setSelectedTag('Casual');
          setModalVisible(true);
        }}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {['All', ...TAGS].map(tag => (
          <TouchableOpacity
            key={tag}
            style={[styles.chip, activeTag === tag && styles.chipActive]}
            onPress={() => setActiveTag(tag)}>
            <Text style={styles.chipText}>{tag}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={o => o.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        renderItem={({ item: outfit }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => { setSelectedOutfit(outfit); setPhotoIndex(0); setDetailModalVisible(true); }}>
            {renderCollage(outfit)}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Tap + to create your first outfit</Text>
          </View>
        }
      />

      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.detailOverlay}>
          <View style={styles.detailSheet}>
            <Text style={styles.detailName}>{selectedOutfit?.name}</Text>

            {selectedOutfit && (() => {
              const outfitClothes = getSortedClothes(selectedOutfit.itemIds);
              return (
                <View style={styles.slideshowRow}>
                  <TouchableOpacity onPress={() => setPhotoIndex(i => Math.max(0, i - 1))}>
                    <Text style={styles.slideArrow}>‹</Text>
                  </TouchableOpacity>
                  {outfitClothes.length > 0 && (
                    <Image
                      source={{ uri: outfitClothes[photoIndex % outfitClothes.length].uri }}
                      style={styles.slideshowImage}
                    />
                  )}
                  <TouchableOpacity onPress={() => setPhotoIndex(i => Math.min(outfitClothes.length - 1, i + 1))}>
                    <Text style={styles.slideArrow}>›</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}

            <View style={styles.detailInfo}>
              <Text style={styles.detailInfoText}>Category: {selectedOutfit?.tag}</Text>
              <Text style={styles.detailInfoText}>Number of Wears: {selectedOutfit?.wornCount}</Text>
              {selectedOutfit?.lastWorn && (
                <Text style={styles.detailInfoText}>Last Worn: {selectedOutfit.lastWorn}</Text>
              )}
            </View>

            <View style={styles.detailBtns}>
              <TouchableOpacity style={styles.detailBtn} onPress={() => {
                if (!selectedOutfit) return;
                setIsEditing(true);
                setOutfitName(selectedOutfit.name);
                setSelectedTag(selectedOutfit.tag);
                setSelectedIds(selectedOutfit.itemIds);
                setDetailModalVisible(false);
                setTimeout(() => setModalVisible(true), 300);
              }}>
                <Text style={styles.detailBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.detailBtn} onPress={() => selectedOutfit && deleteOutfit(selectedOutfit.id)}>
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
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{isEditing ? 'Edit outfit' : 'New outfit'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Outfit name"
              placeholderTextColor="#bbb"
              value={outfitName}
              onChangeText={setOutfitName}
            />
            <Text style={styles.sheetLabel}>Category</Text>
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
              {activeClothes.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.pickItem}
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
              {activeClothes.length === 0 && <Text style={styles.noClothes}>Add clothes to your closet first</Text>}
            </ScrollView>
            <TouchableOpacity style={styles.saveBtn} onPress={saveOutfit}>
              <Text style={styles.saveBtnText}>{isEditing ? 'Save changes' : 'Save outfit'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalVisible(false); setIsEditing(false); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12 },
  title: { fontSize: 36, fontFamily: 'PlayfairDisplay_600SemiBold', color: '#1a1a1a' },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 24, lineHeight: 28 },
  filterScroll: { maxHeight: 44 },
  filterRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 10, flexDirection: 'row' },
  chip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 50, backgroundColor: '#1a1a1a' },
  chipActive: { borderWidth: 2, borderColor: '#fff' },
  chipText: { fontSize: 13, color: '#fff', fontWeight: '500' },
  grid: { paddingHorizontal: 12, gap: 8, paddingBottom: 20 },
  card: { flex: 1, margin: 4, aspectRatio: 3/4, borderRadius: 4, overflow: 'hidden', backgroundColor: '#1a1a1a', borderWidth: 3, borderColor: '#1a1a1a' },
  emptyCollage: { flex: 1, backgroundColor: '#333' },
  collageFull: { flex: 1, width: '100%' },
  collageGrid: { flex: 1, backgroundColor: '#1a1a1a' },
  collageTopLeft: { position: 'absolute', top: 4, left: 4, width: '62%', height: '62%', borderRadius: 4 },
  collageBottomRight: { position: 'absolute', bottom: 4, right: 4, width: '62%', height: '62%', borderRadius: 4 },
  collageMore: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 3 },
  collageMoreText: { color: '#fff', fontSize: 10, fontWeight: '500' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#aaa', fontSize: 15 },
  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  detailSheet: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  detailName: { color: '#fff', fontSize: 24, fontFamily: 'PlayfairDisplay_600SemiBold', textAlign: 'center', marginBottom: 16 },
  slideshowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  slideArrow: { color: '#fff', fontSize: 32, paddingHorizontal: 8 },
  slideshowImage: { flex: 1, height: 240, borderRadius: 10 },
  detailInfo: { alignItems: 'center', gap: 4, marginBottom: 20 },
  detailInfoText: { color: '#fff', fontSize: 14, fontFamily: 'PlayfairDisplay_400Regular' },
  detailBtns: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  detailBtn: { flex: 1, backgroundColor: '#333', borderRadius: 50, paddingVertical: 12, alignItems: 'center' },
  detailBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  closeBtn: { alignItems: 'center', padding: 10 },
  closeBtnText: { color: '#888', fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 18, fontWeight: '500', marginBottom: 16, textAlign: 'center' },
  sheetLabel: { fontSize: 13, color: '#888', marginBottom: 8 },
  input: { borderWidth: 0.5, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 16, color: '#333' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tagChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5, borderColor: '#ddd', backgroundColor: '#f5f5f5' },
  tagChipActive: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  tagChipText: { fontSize: 13, color: '#888' },
  tagChipTextActive: { color: '#fff' },
  picker: { marginBottom: 20, maxHeight: 130 },
  pickItem: { width: 70, marginRight: 10, alignItems: 'center', position: 'relative' },
  pickImage: { width: 64, height: 80, borderRadius: 8, backgroundColor: '#f0f0f0' },
  checkOverlay: { position: 'absolute', top: 0, left: 0, width: 64, height: 80, borderRadius: 8, backgroundColor: 'rgba(83,74,183,0.5)', alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#fff', fontSize: 24, fontWeight: '500' },
  pickLabel: { fontSize: 10, color: '#666', marginTop: 4, textAlign: 'center' },
  noClothes: { color: '#aaa', fontSize: 13, alignSelf: 'center', marginTop: 20 },
  saveBtn: { backgroundColor: '#1a1a1a', borderRadius: 50, padding: 14, alignItems: 'center', marginBottom: 10 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  cancelBtn: { alignItems: 'center', padding: 10 },
  cancelBtnText: { color: '#888', fontSize: 14 },
});