import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  Image, Modal, ScrollView, Alert
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

type ClothingItem = {
  id: string;
  uri: string;
  label: string;
  brand: string;
  category: string;
  colors: string[];
  wornCount: number;
  wornSinceWash: number;
  closetId: string;
};

type Outfit = {
  id: string;
  name: string;
  tag: string;
  itemIds: string[];
  wornCount: number;
  lastWorn?: string;
};

type Closet = {
  id: string;
  name: string;
  emoji: string;
};

const CATEGORY_ORDER = ['Outerwear', 'Tops', 'Bottoms', 'Shoes', 'Accessories'];

function getWeatherEmoji(code: number) {
  if (code === 0) return '☀️';
  if (code <= 2) return '⛅️';
  if (code <= 3) return '☁️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  return '⛈️';
}

function getWeatherDesc(code: number) {
  if (code === 0) return 'Sunny';
  if (code <= 2) return 'Partly Cloudy';
  if (code <= 3) return 'Overcast';
  if (code <= 51) return 'Drizzle';
  if (code <= 67) return 'Rainy';
  if (code <= 77) return 'Snowy';
  if (code <= 82) return 'Rain Showers';
  return 'Thunderstorm';
}

function getWeatherSuggestion(temp: number): string {
  if (temp < 40) return 'It\'s freezing! Layer up with your heaviest outerwear.';
  if (temp < 55) return 'It\'s chilly — a jacket or coat would be perfect.';
  if (temp < 65) return 'Cool weather, great for a light jacket or hoodie.';
  if (temp < 75) return 'Nice and comfortable — a classic outfit day!';
  return 'It\'s warm out — keep it light!';
}

export default function HomeScreen() {
  const [fontsLoaded] = useFonts({ PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold });
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [closets, setClosets] = useState<Closet[]>([]);
  const [activeClosetId, setActiveClosetId] = useState<string>('all');
  const [todayItems, setTodayItems] = useState<string[]>([]);
  const [otdSelectedIds, setOtdSelectedIds] = useState<string[]>([]);
  const [otdModalVisible, setOtdModalVisible] = useState(false);
  const [laundryModalVisible, setLaundryModalVisible] = useState(false);
  const [laundryItems, setLaundryItems] = useState<ClothingItem[]>([]);
  const [dirtySelected, setDirtySelected] = useState<string[]>([]);
  const [pickMode, setPickMode] = useState<'outfits' | 'custom'>('outfits');
  const [customCategory, setCustomCategory] = useState('Tops');
  const [weather, setWeather] = useState<{ temp: number; emoji: string; desc: string } | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [dirtyIds, setDirtyIds] = useState<string[]>([]);

  const todayKey = () => {
    const d = new Date();
    return `otd-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning!';
    if (h < 17) return 'Good Afternoon!';
    return 'Good Evening!';
  };

  const getSortedClothes = (itemIds: string[]) => {
    return CATEGORY_ORDER
      .flatMap(cat => items.filter(c => itemIds.includes(c.id) && c.category === cat))
      .concat(items.filter(c => itemIds.includes(c.id) && !CATEGORY_ORDER.includes(c.category)));
  };

  const loadData = async () => {
    const saved = await AsyncStorage.getItem('closet_items');
    const savedOutfits = await AsyncStorage.getItem('outfits');
    const dirty = await AsyncStorage.getItem('dirty_items');
    const savedClosets = await AsyncStorage.getItem('closets');
    const activeCloset = await AsyncStorage.getItem('active_closet');
    if (saved) {
      const parsed = JSON.parse(saved);
      const migrated = parsed.map((item: any) => ({
        ...item,
        wornSinceWash: item.wornSinceWash || 0,
      }));
      setItems(migrated);
    }
    if (savedOutfits) setOutfits(JSON.parse(savedOutfits));
    if (dirty) setDirtyIds(JSON.parse(dirty));
    if (savedClosets) setClosets(JSON.parse(savedClosets));
    if (activeCloset) setActiveClosetId(activeCloset);
    const otd = await AsyncStorage.getItem(todayKey());
    if (otd) setTodayItems(JSON.parse(otd));
  };

  useEffect(() => {
    loadData();
    fetchWeather();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const fetchWeather = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=fahrenheit`
      );
      const data = await res.json();
      setWeather({
        temp: Math.round(data.current_weather.temperature),
        emoji: getWeatherEmoji(data.current_weather.weathercode),
        desc: getWeatherDesc(data.current_weather.weathercode),
      });
    } catch (e) { console.log('Weather fetch failed', e); }
  };

  const activeItems = activeClosetId === 'all'
    ? items
    : items.filter(i => (i.closetId || 'default') === activeClosetId);

  const activeOutfits = activeClosetId === 'all'
    ? outfits
    : outfits.filter(o => o.itemIds.every(id => activeItems.some(i => i.id === id)));

  const doSave = async (selectedIds: string[]) => {
    await AsyncStorage.setItem(todayKey(), JSON.stringify(selectedIds));

    const updatedItems = items.map(i =>
      selectedIds.includes(i.id)
        ? { ...i, wornCount: i.wornCount + 1, wornSinceWash: (i.wornSinceWash || 0) + 1 }
        : i
    );
    await AsyncStorage.setItem('closet_items', JSON.stringify(updatedItems));
    setItems(updatedItems);
    setTodayItems(selectedIds);

    const today = new Date();
    const dateStr = `${today.toLocaleString('default', { month: 'short' })} ${today.getDate()}`;
    const matchedOutfit = outfits.find(o =>
      o.itemIds.length === selectedIds.length &&
      o.itemIds.every(id => selectedIds.includes(id))
    );
    if (matchedOutfit) {
      const updatedOutfits = outfits.map(o =>
        o.id === matchedOutfit.id ? { ...o, wornCount: o.wornCount + 1, lastWorn: dateStr } : o
      );
      await AsyncStorage.setItem('outfits', JSON.stringify(updatedOutfits));
      setOutfits(updatedOutfits);
    }

    const calDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const savedEntries = await AsyncStorage.getItem('calendar_entries');
    const entries = savedEntries ? JSON.parse(savedEntries) : [];
    const existingEntry = entries.find((e: any) => e.date === calDateStr);
    const currentGroups = existingEntry?.groups || (existingEntry?.itemIds ? [existingEntry.itemIds] : []);
    const updatedEntries = entries.filter((e: any) => e.date !== calDateStr);
    if (selectedIds.length > 0) {
      updatedEntries.push({ date: calDateStr, groups: [...currentGroups, selectedIds] });
    }
    await AsyncStorage.setItem('calendar_entries', JSON.stringify(updatedEntries));

    setOtdModalVisible(false);
    setPhotoIndex(0);

    const wornItems = updatedItems.filter(i => selectedIds.includes(i.id));
    setLaundryItems(wornItems);
    setDirtySelected([]);
    setTimeout(() => setLaundryModalVisible(true), 400);
  };

  const saveLaundry = async () => {
    const newDirtyIds = [...new Set([...dirtyIds, ...dirtySelected])];
    setDirtyIds(newDirtyIds);
    await AsyncStorage.setItem('dirty_items', JSON.stringify(newDirtyIds));
    setLaundryModalVisible(false);
  };

  const saveOtd = async () => {
    if (otdSelectedIds.length === 0) {
      Alert.alert('No items selected', 'Please select an outfit or some items.');
      return;
    }
    const dirtyWorn = items.filter(i => otdSelectedIds.includes(i.id) && dirtyIds.includes(i.id));
    if (dirtyWorn.length > 0) {
      Alert.alert(
        '🧺 Dirty items',
        `These items are marked dirty:\n${dirtyWorn.map(i => `• ${i.label}`).join('\n')}\n\nAdd them anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add anyway', onPress: () => doSave(otdSelectedIds) }
        ]
      );
      return;
    }
    await doSave(otdSelectedIds);
  };

  const todayClothes = getSortedClothes(todayItems);
  const activeCloset = closets.find(c => c.id === activeClosetId);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.greetingPill}>
          <Text style={styles.greetingText}>{greeting()}</Text>
        </View>

        {weather && (
          <Text style={styles.weatherText}>
            Today's Weather: {weather.temp}° and {weather.desc} {weather.emoji}
          </Text>
        )}

        {closets.length > 0 && (
          <TouchableOpacity
            style={styles.closetSwitcher}
            onPress={() => router.push('/closets')}>
            <Text style={styles.closetSwitcherText}>
              {activeClosetId === 'all'
                ? '🗂️ All closets'
                : `${activeCloset?.emoji} ${activeCloset?.name}`}
            </Text>
            <Text style={styles.closetSwitcherArrow}>›</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.ootdTitle}>OOTD:</Text>

        <TouchableOpacity
          style={styles.ootdCard}
          onPress={() => { setOtdSelectedIds(todayItems); setOtdModalVisible(true); setPickMode('outfits'); }}>
          {todayClothes.length > 0 ? (
            <View style={styles.ootdSlideshow}>
              <TouchableOpacity
                style={styles.slideArrowBtn}
                onPress={e => { e.stopPropagation(); setPhotoIndex(i => Math.max(0, i - 1)); }}>
                <Text style={styles.slideArrowText}>‹</Text>
              </TouchableOpacity>
              <Image
                source={{ uri: todayClothes[photoIndex % todayClothes.length].uri }}
                style={styles.ootdImage}
              />
              <TouchableOpacity
                style={styles.slideArrowBtn}
                onPress={e => { e.stopPropagation(); setPhotoIndex(i => Math.min(todayClothes.length - 1, i + 1)); }}>
                <Text style={styles.slideArrowText}>›</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.ootdEmpty}>
              <Text style={styles.ootdEmptyText}>Tap to log today's outfit</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={otdModalVisible} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.sheetTitle}>Today's outfit</Text>
          </View>

          {weather && (
            <View style={styles.suggestionBanner}>
              <Text style={styles.suggestionText}>{weather.emoji} {getWeatherSuggestion(weather.temp)}</Text>
            </View>
          )}

          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, pickMode === 'outfits' && styles.modeBtnActive]}
              onPress={() => setPickMode('outfits')}>
              <Text style={[styles.modeBtnText, pickMode === 'outfits' && styles.modeBtnTextActive]}>Saved outfits</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, pickMode === 'custom' && styles.modeBtnActive]}
              onPress={() => setPickMode('custom')}>
              <Text style={[styles.modeBtnText, pickMode === 'custom' && styles.modeBtnTextActive]}>Custom</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickerContainer}>
            {pickMode === 'outfits' ? (
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 16 }}>
                {activeOutfits.length === 0 && (
                  <Text style={styles.emptyPick}>No saved outfits yet — go to the Outfits tab to create one!</Text>
                )}
                {activeOutfits.map(o => {
                  const outfitClothes = getSortedClothes(o.itemIds);
                  const isSelected = o.itemIds.length === otdSelectedIds.length &&
                    o.itemIds.every(id => otdSelectedIds.includes(id));
                  return (
                    <TouchableOpacity
                      key={o.id}
                      style={[styles.outfitRow, isSelected && styles.outfitRowActive]}
                      onPress={() => setOtdSelectedIds(isSelected ? [] : o.itemIds)}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.outfitThumbScroll}>
                        {outfitClothes.map(c => (
                          <Image key={c.id} source={{ uri: c.uri }} style={styles.outfitThumb} />
                        ))}
                      </ScrollView>
                      <View style={styles.outfitInfo}>
                        <Text style={styles.outfitName}>{o.name}</Text>
                        <Text style={styles.outfitTag}>{o.tag} · worn {o.wornCount}×</Text>
                        {o.lastWorn && <Text style={styles.outfitLastWorn}>Last worn: {o.lastWorn}</Text>}
                      </View>
                      {isSelected && <Text style={styles.selectedCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.customPicker}>
                {otdSelectedIds.length > 0 && (
                  <View style={styles.selectedRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {getSortedClothes(otdSelectedIds).map(c => (
                        <TouchableOpacity
                          key={c.id}
                          style={styles.selectedThumbWrap}
                          onPress={() => setOtdSelectedIds(prev => prev.filter(i => i !== c.id))}>
                          <Image source={{ uri: c.uri }} style={styles.selectedThumb} />
                          <View style={styles.selectedRemove}>
                            <Text style={styles.selectedRemoveText}>✕</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catTabScroll}>
                  {CATEGORY_ORDER.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.catTab, customCategory === cat && styles.catTabActive]}
                      onPress={() => setCustomCategory(cat)}>
                      <Text style={[styles.catTabText, customCategory === cat && styles.catTabTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.customGridInner}>
                  {activeItems
                    .filter(i => i.category === customCategory)
                    .map(c => (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.customCard, otdSelectedIds.includes(c.id) && styles.customCardActive]}
                        onPress={() => setOtdSelectedIds(prev =>
                          prev.includes(c.id) ? prev.filter(i => i !== c.id) : [...prev, c.id]
                        )}>
                        <Image source={{ uri: c.uri }} style={styles.customCardImage} />
                        {otdSelectedIds.includes(c.id) && (
                          <View style={styles.customCheckOverlay}>
                            <Text style={styles.customCheckMark}>✓</Text>
                          </View>
                        )}
                        <Text style={styles.customCardLabel} numberOfLines={1}>{c.label}</Text>
                        {c.brand ? <Text style={styles.customCardBrand} numberOfLines={1}>{c.brand}</Text> : null}
                      </TouchableOpacity>
                    ))}
                  {activeItems.filter(i => i.category === customCategory).length === 0 && (
                    <Text style={styles.emptyPick}>No {customCategory.toLowerCase()} in this closet</Text>
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.bottomBtns}>
            <TouchableOpacity style={styles.saveBtn} onPress={saveOtd}>
              <Text style={styles.saveBtnText}>Save today's outfit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setOtdModalVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={laundryModalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.laundrySheet}>
            <Text style={styles.laundryTitle}>🧺 Laundry check</Text>
            <Text style={styles.laundrySubtitle}>Does anything need washing?</Text>
            <ScrollView style={styles.laundryList}>
              {laundryItems.map(item => {
                const isSelected = dirtySelected.includes(item.id);
                const alreadyDirty = dirtyIds.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.laundryItem, isSelected && styles.laundryItemSelected]}
                    onPress={() => setDirtySelected(prev =>
                      prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]
                    )}>
                    <Image source={{ uri: item.uri }} style={styles.laundryThumb} />
                    <View style={styles.laundryInfo}>
                      <Text style={styles.laundryItemName}>{item.label}</Text>
                      <Text style={styles.laundryWornCount}>
                        {alreadyDirty ? '🧺 Already marked dirty' : `Worn ${item.wornSinceWash || 1} time${(item.wornSinceWash || 1) > 1 ? 's' : ''} since last wash`}
                      </Text>
                    </View>
                    <View style={[styles.laundryCheck, isSelected && styles.laundryCheckActive]}>
                      {isSelected && <Text style={styles.laundryCheckMark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.saveBtn} onPress={saveLaundry}>
              <Text style={styles.saveBtnText}>
                {dirtySelected.length > 0 ? `Mark ${dirtySelected.length} item${dirtySelected.length > 1 ? 's' : ''} dirty` : 'Nothing needs washing'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setLaundryModalVisible(false)}>
              <Text style={styles.cancelBtnText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 20, gap: 16 },
  greetingPill: { backgroundColor: '#1a1a1a', borderRadius: 50, paddingVertical: 18, paddingHorizontal: 28, alignSelf: 'center' },
  greetingText: { color: '#fff', fontSize: 28, fontFamily: 'PlayfairDisplay_600SemiBold', letterSpacing: -0.5 },
  weatherText: { fontSize: 16, color: '#333', textAlign: 'center', marginTop: 4 },
  closetSwitcher: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#f5f5f5', borderRadius: 50, paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'center' },
  closetSwitcherText: { fontSize: 13, color: '#1a1a1a', fontWeight: '500' },
  closetSwitcherArrow: { fontSize: 16, color: '#aaa' },
  ootdTitle: { fontSize: 32, fontFamily: 'PlayfairDisplay_600SemiBold', color: '#1a1a1a', textAlign: 'center' },
  ootdCard: { backgroundColor: '#1a1a1a', borderRadius: 16, overflow: 'hidden', minHeight: 340, justifyContent: 'center' },
  ootdSlideshow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  slideArrowBtn: { padding: 10 },
  slideArrowText: { color: '#fff', fontSize: 32 },
  ootdImage: { flex: 1, height: 280, borderRadius: 10, marginHorizontal: 8 },
  ootdEmpty: { height: 300, alignItems: 'center', justifyContent: 'center' },
  ootdEmptyText: { color: '#888', fontSize: 15 },
  modalContainer: { flex: 1, backgroundColor: '#1a1a1a' },
  modalHeader: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  sheetTitle: { fontSize: 22, fontFamily: 'PlayfairDisplay_600SemiBold', textAlign: 'center', color: '#fff' },
  suggestionBanner: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 12, marginHorizontal: 24, marginBottom: 12 },
  suggestionText: { color: '#aaa', fontSize: 13, textAlign: 'center' },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12, paddingHorizontal: 24 },
  modeBtn: { flex: 1, padding: 10, borderRadius: 50, borderWidth: 0.5, borderColor: '#444', alignItems: 'center', backgroundColor: '#333' },
  modeBtnActive: { backgroundColor: '#fff', borderColor: '#fff' },
  modeBtnText: { fontSize: 13, color: '#aaa' },
  modeBtnTextActive: { color: '#1a1a1a' },
  pickerContainer: { flex: 1, paddingHorizontal: 24 },
  outfitRow: { borderRadius: 12, borderWidth: 0.5, borderColor: '#444', marginBottom: 10, overflow: 'hidden' },
  outfitRowActive: { borderColor: '#fff', backgroundColor: '#2a2a2a' },
  outfitThumbScroll: { maxHeight: 90 },
  outfitThumb: { width: 72, height: 90, marginRight: 2 },
  outfitInfo: { padding: 10 },
  outfitName: { fontSize: 14, fontWeight: '500', color: '#fff' },
  outfitTag: { fontSize: 11, color: '#aaa', marginTop: 2 },
  outfitLastWorn: { fontSize: 11, color: '#666', marginTop: 1 },
  selectedCheck: { color: '#fff', fontSize: 18, fontWeight: '500', position: 'absolute', top: 8, right: 8 },
  customPicker: { flex: 1 },
  selectedRow: { marginBottom: 10 },
  selectedThumbWrap: { position: 'relative', marginRight: 8 },
  selectedThumb: { width: 52, height: 64, borderRadius: 8, borderWidth: 2, borderColor: '#fff' },
  selectedRemove: { position: 'absolute', top: -4, right: -4, backgroundColor: '#E24B4A', borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  selectedRemoveText: { color: '#fff', fontSize: 9, fontWeight: '500' },
  catTabScroll: { marginBottom: 10, maxHeight: 36 },
  catTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 50, backgroundColor: '#333', marginRight: 8, borderWidth: 0.5, borderColor: '#444' },
  catTabActive: { backgroundColor: '#fff', borderColor: '#fff' },
  catTabText: { fontSize: 12, color: '#aaa' },
  catTabTextActive: { color: '#1a1a1a', fontWeight: '500' },
  customGridInner: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 16 },
  customCard: { width: '47%', borderRadius: 10, overflow: 'hidden', backgroundColor: '#2a2a2a', borderWidth: 1, borderColor: '#333' },
  customCardActive: { borderColor: '#fff', borderWidth: 2 },
  customCardImage: { width: '100%', aspectRatio: 3/4 },
  customCheckOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  customCheckMark: { color: '#fff', fontSize: 28, fontWeight: '500' },
  customCardLabel: { color: '#fff', fontSize: 11, padding: 6, paddingBottom: 2, fontWeight: '500' },
  customCardBrand: { color: '#aaa', fontSize: 10, paddingHorizontal: 6, paddingBottom: 6 },
  emptyPick: { color: '#666', fontSize: 13, textAlign: 'center', marginTop: 20 },
  bottomBtns: { padding: 24, paddingBottom: 8, gap: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  laundrySheet: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '80%' },
  laundryTitle: { fontSize: 20, fontFamily: 'PlayfairDisplay_600SemiBold', color: '#fff', textAlign: 'center', marginBottom: 4 },
  laundrySubtitle: { fontSize: 13, color: '#aaa', textAlign: 'center', marginBottom: 16 },
  laundryList: { maxHeight: 300, marginBottom: 16 },
  laundryItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, borderWidth: 0.5, borderColor: '#444', marginBottom: 8 },
  laundryItemSelected: { backgroundColor: '#2a2a2a', borderColor: '#fff' },
  laundryThumb: { width: 44, height: 56, borderRadius: 8 },
  laundryInfo: { flex: 1 },
  laundryItemName: { color: '#fff', fontSize: 13, fontWeight: '500' },
  laundryWornCount: { color: '#aaa', fontSize: 11, marginTop: 2 },
  laundryCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#555', alignItems: 'center', justifyContent: 'center' },
  laundryCheckActive: { backgroundColor: '#fff', borderColor: '#fff' },
  laundryCheckMark: { color: '#1a1a1a', fontSize: 13, fontWeight: '500' },
  saveBtn: { backgroundColor: '#fff', borderRadius: 50, padding: 16, alignItems: 'center', marginBottom: 10 },
  saveBtnText: { color: '#1a1a1a', fontSize: 15, fontWeight: '500' },
  cancelBtn: { alignItems: 'center', padding: 10 },
  cancelBtnText: { color: '#666', fontSize: 14 },
});