import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  Image, Modal, ScrollView, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';

type ClothingItem = { id: string; uri: string; label: string; brand: string; category: string; colors: string[]; wornCount: number; };
type Outfit = { id: string; name: string; tag: string; itemIds: string[]; wornCount: number; };
type CalendarEntry = { date: string; groups: string[][]; };

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CATEGORY_ORDER = ['Outerwear', 'Tops', 'Bottoms', 'Shoes', 'Accessories'];

export default function CalendarScreen() {
  const [fontsLoaded] = useFonts({ PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold });
  const [clothes, setClothes] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [today] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [pickMode, setPickMode] = useState<'outfits' | 'clothes'>('outfits');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingDay, setEditingDay] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string[]>([]);
  const [expandedVisible, setExpandedVisible] = useState(false);
  const [expandedPhotoIndex, setExpandedPhotoIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      const c = await AsyncStorage.getItem('closet_items');
      const o = await AsyncStorage.getItem('outfits');
      const e = await AsyncStorage.getItem('calendar_entries');
      if (c) setClothes(JSON.parse(c));
      if (o) setOutfits(JSON.parse(o));
      if (e) {
        const parsed = JSON.parse(e);
        const migrated = parsed.map((entry: any) => ({
          date: entry.date,
          groups: entry.groups || (entry.itemIds ? [entry.itemIds] : []),
        }));
        setEntries(migrated);
      }
    };
    load();
  }, []);

  const saveEntries = async (updated: CalendarEntry[]) => {
    await AsyncStorage.setItem('calendar_entries', JSON.stringify(updated));
  };

  const getSortedClothes = (itemIds: string[]) => {
    return CATEGORY_ORDER
      .flatMap(cat => clothes.filter(c => itemIds.includes(c.id) && c.category === cat))
      .concat(clothes.filter(c => itemIds.includes(c.id) && !CATEGORY_ORDER.includes(c.category)));
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const dateKey = (year: number, month: number, day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const getEntry = (key: string) => entries.find(e => e.date === key);

  const openDay = (key: string) => {
    setSelectedDate(key);
    setSelectedIds([]);
    setPickMode('outfits');
    setEditingDay(false);
    setExpandedVisible(false);
    setExpandedGroup([]);
    setModalVisible(true);
  };

  const toggleId = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const addGroup = () => {
    if (selectedIds.length === 0) { Alert.alert('No items selected', 'Please select at least one item.'); return; }
    const entry = getEntry(selectedDate);
    const currentGroups = entry?.groups || [];
    const updated = entries.filter(e => e.date !== selectedDate);
    updated.push({ date: selectedDate, groups: [...currentGroups, selectedIds] });
    setEntries(updated);
    saveEntries(updated);
    setSelectedIds([]);
    setEditingDay(false);
  };

  const removeGroup = (groupIndex: number) => {
    Alert.alert('Remove outfit', 'Remove this outfit from this day?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        const entry = getEntry(selectedDate);
        if (!entry) return;
        const newGroups = entry.groups.filter((_, i) => i !== groupIndex);
        const updated = entries.filter(e => e.date !== selectedDate);
        if (newGroups.length > 0) updated.push({ date: selectedDate, groups: newGroups });
        setEntries(updated);
        saveEntries(updated);
      }}
    ]);
  };

  const clearDay = () => {
    Alert.alert('Clear day', 'Remove all outfits from this day?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => {
        const updated = entries.filter(e => e.date !== selectedDate);
        setEntries(updated);
        saveEntries(updated);
        setModalVisible(false);
      }}
    ]);
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentMonth);
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  const selectedEntry = getEntry(selectedDate);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
      </View>

      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Text style={styles.navBtnText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Text style={styles.navBtnText}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dayHeaders}>
        {DAYS.map(d => (
          <Text key={d} style={styles.dayHeader}>{d}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {Array.from({ length: firstDay }).map((_, i) => (
          <View key={`empty-${i}`} style={styles.dayCell} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const key = dateKey(currentMonth.getFullYear(), currentMonth.getMonth(), day);
          const entry = getEntry(key);
          const isToday = key === todayKey;
          const firstGroupFirstItem = entry?.groups?.[0]?.[0];
          const previewItem = firstGroupFirstItem ? clothes.find(c => c.id === firstGroupFirstItem) : null;
          const totalGroups = entry?.groups?.length || 0;

          return (
            <TouchableOpacity
              key={key}
              style={[styles.dayCell, isToday && styles.dayCellToday]}
              onPress={() => openDay(key)}>
              <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>{day}</Text>
              {previewItem?.uri ? (
                <Image source={{ uri: previewItem.uri }} style={styles.dayImage} />
              ) : (
                <View style={styles.dayEmpty} />
              )}
              {totalGroups > 1 && (
                <View style={styles.countDot}>
                  <Text style={styles.countDotText}>+{totalGroups - 1}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal visible={expandedVisible} animationType="fade" transparent>
        <View style={styles.expandedOverlay}>
          <View style={styles.expandedSheet}>
            {expandedGroup.length > 0 && (() => {
              const groupClothes = getSortedClothes(expandedGroup);
              const currentItem = groupClothes[expandedPhotoIndex % groupClothes.length];
              return (
                <>
                  <View style={styles.slideshowRow}>
                    <TouchableOpacity onPress={() => setExpandedPhotoIndex(i => Math.max(0, i - 1))}>
                      <Text style={styles.slideArrow}>‹</Text>
                    </TouchableOpacity>
                    {currentItem?.uri && (
                      <Image source={{ uri: currentItem.uri }} style={styles.slideshowImage} />
                    )}
                    <TouchableOpacity onPress={() => setExpandedPhotoIndex(i => Math.min(groupClothes.length - 1, i + 1))}>
                      <Text style={styles.slideArrow}>›</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.slideshowCount}>{expandedPhotoIndex + 1} of {groupClothes.length}</Text>
                  {currentItem?.label && (
                    <Text style={styles.slideshowLabel}>{currentItem.label}</Text>
                  )}
                </>
              );
            })()}
            <TouchableOpacity
              style={styles.closeExpandedBtn}
              onPress={() => { setExpandedVisible(false); setExpandedGroup([]); setTimeout(() => setModalVisible(true), 300); }}>
              <Text style={styles.closeExpandedText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <ScrollView style={styles.sheet} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.sheetTitle}>{selectedDate}</Text>

            {!editingDay && (
              <>
                {selectedEntry?.groups && selectedEntry.groups.length > 0 ? (
                  selectedEntry.groups.map((group, groupIndex) => {
                    const groupClothes = getSortedClothes(group);
                    return (
                      <View key={groupIndex} style={styles.groupCard}>
                        <View style={styles.groupHeader}>
                          <Text style={styles.groupTitle}>Outfit {groupIndex + 1}</Text>
                          <TouchableOpacity onPress={() => removeGroup(groupIndex)}>
                            <Text style={styles.groupRemove}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {groupClothes.map((c, idx) => (
                            <TouchableOpacity
                              key={c.id}
                              style={styles.groupItem}
                              onPress={() => {
                                setExpandedGroup(group);
                                setExpandedPhotoIndex(idx);
                                setModalVisible(false);
                                setTimeout(() => setExpandedVisible(true), 300);
                              }}>
                              <Image source={{ uri: c.uri }} style={styles.groupImage} />
                              <Text style={styles.groupLabel} numberOfLines={1}>{c.label}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyDay}>
                    <Text style={styles.emptyDayText}>No outfits logged for this day</Text>
                  </View>
                )}

                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.addOutfitBtn} onPress={() => setEditingDay(true)}>
                    <Text style={styles.addOutfitBtnText}>+ Add outfit</Text>
                  </TouchableOpacity>
                  {selectedEntry && (
                    <TouchableOpacity style={styles.clearBtn} onPress={clearDay}>
                      <Text style={styles.clearBtnText}>Clear day</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}

            {editingDay && (
              <>
                <Text style={styles.editTitle}>Pick items for this outfit</Text>
                <View style={styles.modeRow}>
                  <TouchableOpacity
                    style={[styles.modeBtn, pickMode === 'outfits' && styles.modeBtnActive]}
                    onPress={() => setPickMode('outfits')}>
                    <Text style={[styles.modeBtnText, pickMode === 'outfits' && styles.modeBtnTextActive]}>Saved outfits</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeBtn, pickMode === 'clothes' && styles.modeBtnActive]}
                    onPress={() => setPickMode('clothes')}>
                    <Text style={[styles.modeBtnText, pickMode === 'clothes' && styles.modeBtnTextActive]}>Individual pieces</Text>
                  </TouchableOpacity>
                </View>

                {pickMode === 'outfits' ? (
                  <View style={styles.pickList}>
                    {outfits.length === 0 && <Text style={styles.emptyPick}>No outfits saved yet</Text>}
                    {outfits.map(o => {
                      const outfitClothes = getSortedClothes(o.itemIds);
                      const isSelected = o.itemIds.every(id => selectedIds.includes(id));
                      return (
                        <TouchableOpacity
                          key={o.id}
                          style={[styles.outfitRow, isSelected && styles.outfitRowActive]}
                          onPress={() => {
                            if (isSelected) {
                              setSelectedIds(prev => prev.filter(id => !o.itemIds.includes(id)));
                            } else {
                              setSelectedIds(prev => [...new Set([...prev, ...o.itemIds])]);
                            }
                          }}>
                          <View style={styles.outfitThumbs}>
                            {outfitClothes.slice(0, 2).map(c => (
                              <Image key={c.id} source={{ uri: c.uri }} style={styles.outfitThumb} />
                            ))}
                          </View>
                          <Text style={styles.outfitName}>{o.name}</Text>
                          {isSelected && <Text style={styles.selectedCheck}>✓</Text>}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clothesPicker}>
                    {clothes.map(c => (
                      <TouchableOpacity key={c.id} style={styles.pickItem} onPress={() => toggleId(c.id)}>
                        <Image source={{ uri: c.uri }} style={styles.pickImage} />
                        {selectedIds.includes(c.id) && (
                          <View style={styles.checkOverlay}>
                            <Text style={styles.checkMark}>✓</Text>
                          </View>
                        )}
                        <Text style={styles.pickLabel} numberOfLines={1}>{c.label}</Text>
                      </TouchableOpacity>
                    ))}
                    {clothes.length === 0 && <Text style={styles.emptyPick}>No clothes added yet</Text>}
                  </ScrollView>
                )}

                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.saveBtn} onPress={addGroup}>
                    <Text style={styles.saveBtnText}>Add to day</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.clearBtn} onPress={() => { setEditingDay(false); setSelectedIds([]); }}>
                    <Text style={styles.clearBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalVisible(false); setEditingDay(false); setSelectedIds([]); }}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 36, fontFamily: 'PlayfairDisplay_600SemiBold', color: '#1a1a1a' },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 8 },
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navBtnText: { fontSize: 20, color: '#1a1a1a', fontWeight: '500' },
  monthTitle: { fontSize: 16, fontFamily: 'PlayfairDisplay_600SemiBold', color: '#1a1a1a' },
  dayHeaders: { flexDirection: 'row', paddingHorizontal: 8, marginBottom: 2 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 11, color: '#aaa', fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  dayCell: { width: '14.28%', aspectRatio: 0.85, borderWidth: 1, borderColor: '#1a1a1a', overflow: 'hidden', position: 'relative' },
  dayCellToday: { backgroundColor: '#EEEDFE' },
  dayNum: { position: 'absolute', top: 2, left: 3, fontSize: 8, color: '#1a1a1a', fontWeight: '500', zIndex: 1 },
  dayNumToday: { color: '#534AB7' },
  dayImage: { width: '100%', height: '100%' },
  dayEmpty: { width: '100%', height: '100%' },
  countDot: { position: 'absolute', bottom: 2, right: 2, backgroundColor: '#1a1a1a', borderRadius: 6, paddingHorizontal: 3 },
  countDotText: { fontSize: 7, color: '#fff' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  sheetTitle: { fontSize: 16, fontFamily: 'PlayfairDisplay_600SemiBold', marginBottom: 16, textAlign: 'center', color: '#fff' },
  groupCard: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 12, marginBottom: 12 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  groupTitle: { color: '#fff', fontSize: 14, fontFamily: 'PlayfairDisplay_600SemiBold' },
  groupRemove: { color: '#E24B4A', fontSize: 12 },
  groupItem: { alignItems: 'center', marginRight: 10, width: 64 },
  groupImage: { width: 56, height: 70, borderRadius: 8, backgroundColor: '#333' },
  groupLabel: { fontSize: 9, color: '#aaa', marginTop: 3, textAlign: 'center' },
  emptyDay: { height: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyDayText: { color: '#666', fontSize: 14 },
  btnRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  addOutfitBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 50, padding: 14, alignItems: 'center' },
  addOutfitBtnText: { color: '#1a1a1a', fontSize: 14, fontWeight: '500' },
  clearBtn: { backgroundColor: '#333', borderRadius: 50, padding: 14, alignItems: 'center', paddingHorizontal: 20 },
  clearBtnText: { color: '#aaa', fontSize: 14 },
  editTitle: { color: '#fff', fontSize: 14, fontFamily: 'PlayfairDisplay_600SemiBold', marginBottom: 12, textAlign: 'center' },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeBtn: { flex: 1, padding: 8, borderRadius: 50, borderWidth: 0.5, borderColor: '#444', alignItems: 'center', backgroundColor: '#333' },
  modeBtnActive: { backgroundColor: '#fff', borderColor: '#fff' },
  modeBtnText: { fontSize: 13, color: '#aaa' },
  modeBtnTextActive: { color: '#1a1a1a' },
  pickList: { maxHeight: 200, marginBottom: 12 },
  outfitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, borderWidth: 0.5, borderColor: '#444', marginBottom: 8 },
  outfitRowActive: { backgroundColor: '#333', borderColor: '#fff' },
  outfitThumbs: { flexDirection: 'row', gap: 3 },
  outfitThumb: { width: 36, height: 44, borderRadius: 6 },
  outfitName: { flex: 1, fontSize: 13, fontWeight: '500', color: '#fff' },
  selectedCheck: { color: '#fff', fontSize: 16, fontWeight: '500' },
  clothesPicker: { marginBottom: 12, maxHeight: 120 },
  pickItem: { width: 64, marginRight: 8, alignItems: 'center', position: 'relative' },
  pickImage: { width: 56, height: 70, borderRadius: 8, backgroundColor: '#333' },
  checkOverlay: { position: 'absolute', top: 0, left: 0, width: 56, height: 70, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#fff', fontSize: 20, fontWeight: '500' },
  pickLabel: { fontSize: 9, color: '#aaa', marginTop: 3, textAlign: 'center' },
  emptyPick: { color: '#666', fontSize: 13, textAlign: 'center', marginTop: 20 },
  saveBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 50, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#1a1a1a', fontSize: 15, fontWeight: '500' },
  cancelBtn: { alignItems: 'center', padding: 10 },
  cancelBtnText: { color: '#666', fontSize: 14 },
  expandedOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  expandedSheet: { width: '90%', backgroundColor: '#1a1a1a', borderRadius: 24, padding: 24, alignItems: 'center' },
  slideshowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 12 },
  slideArrow: { color: '#fff', fontSize: 36, paddingHorizontal: 8 },
  slideshowImage: { flex: 1, height: 320, borderRadius: 12 },
  slideshowCount: { color: '#aaa', fontSize: 12, marginBottom: 4 },
  slideshowLabel: { color: '#fff', fontSize: 15, fontFamily: 'PlayfairDisplay_600SemiBold', marginBottom: 16 },
  closeExpandedBtn: { backgroundColor: '#333', borderRadius: 50, paddingVertical: 12, paddingHorizontal: 32 },
  closeExpandedText: { color: '#fff', fontSize: 14, fontWeight: '500' },
});