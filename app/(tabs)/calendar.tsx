import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  FlatList, Modal, Image, ScrollView, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ClothingItem = { id: string; uri: string; label: string; brand: string; category: string; color: string; wornCount: number; };
type Outfit = { id: string; name: string; tag: string; itemIds: string[]; wornCount: number; };
type CalendarEntry = { date: string; outfitId?: string; itemIds: string[]; };

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function CalendarScreen() {
  const [clothes, setClothes] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [today] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [pickMode, setPickMode] = useState<'outfits' | 'clothes'>('outfits');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const c = await AsyncStorage.getItem('closet_items');
      const o = await AsyncStorage.getItem('outfits');
      const e = await AsyncStorage.getItem('calendar_entries');
      if (c) setClothes(JSON.parse(c));
      if (o) setOutfits(JSON.parse(o));
      if (e) setEntries(JSON.parse(e));
    };
    load();
  }, []);

  const saveEntries = async (updated: CalendarEntry[]) => {
    await AsyncStorage.setItem('calendar_entries', JSON.stringify(updated));
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
    const entry = getEntry(key);
    setSelectedDate(key);
    setSelectedIds(entry?.itemIds || []);
    setPickMode('outfits');
    setModalVisible(true);
  };

  const toggleId = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const saveEntry = () => {
    const updated = entries.filter(e => e.date !== selectedDate);
    if (selectedIds.length > 0) {
      updated.push({ date: selectedDate, itemIds: selectedIds });
    }
    setEntries(updated);
    saveEntries(updated);
    setModalVisible(false);
  };

  const clearEntry = () => {
    Alert.alert('Clear day', 'Remove outfit from this day?', [
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
  const selectedClothes = clothes.filter(c => selectedEntry?.itemIds.includes(c.id));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Outfit calendar</Text>
      </View>

      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Text style={styles.navBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Text style={styles.navBtnText}>›</Text>
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
          const previewItem = entry ? clothes.find(c => entry.itemIds[0] === c.id) : null;

          return (
            <TouchableOpacity
              key={key}
              style={[styles.dayCell, isToday && styles.dayCellToday]}
              onPress={() => openDay(key)}>
              <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>{day}</Text>
              {previewItem ? (
                <Image source={{ uri: previewItem.uri }} style={styles.dayThumb} />
              ) : (
                <View style={styles.dayEmpty} />
              )}
              {entry && entry.itemIds.length > 1 && (
                <View style={styles.countDot}>
                  <Text style={styles.countDotText}>+{entry.itemIds.length - 1}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{selectedDate}</Text>

            {selectedEntry && selectedClothes.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currentRow}>
                {selectedClothes.map(c => (
                  <View key={c.id} style={styles.currentItem}>
                    <Image source={{ uri: c.uri }} style={styles.currentThumb} />
                    <Text style={styles.currentLabel} numberOfLines={1}>{c.label}</Text>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeBtn, pickMode === 'outfits' && styles.modeBtnActive]}
                onPress={() => setPickMode('outfits')}>
                <Text style={[styles.modeBtnText, pickMode === 'outfits' && styles.modeBtnTextActive]}>Outfits</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, pickMode === 'clothes' && styles.modeBtnActive]}
                onPress={() => setPickMode('clothes')}>
                <Text style={[styles.modeBtnText, pickMode === 'clothes' && styles.modeBtnTextActive]}>Individual pieces</Text>
              </TouchableOpacity>
            </View>

            {pickMode === 'outfits' ? (
              <ScrollView style={styles.pickList}>
                {outfits.length === 0 && <Text style={styles.emptyPick}>No outfits saved yet</Text>}
                {outfits.map(o => {
                  const outfitClothes = clothes.filter(c => o.itemIds.includes(c.id));
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
              </ScrollView>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clothesPicker}>
                {clothes.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.pickItem}
                    onPress={() => toggleId(c.id)}>
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
              {selectedEntry && (
                <TouchableOpacity style={styles.clearBtn} onPress={clearEntry}>
                  <Text style={styles.clearBtnText}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.saveBtn} onPress={saveEntry}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
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
  header: { padding: 16 },
  title: { fontSize: 22, fontWeight: '500' },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 },
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navBtnText: { fontSize: 24, color: '#534AB7' },
  monthTitle: { fontSize: 16, fontWeight: '500' },
  dayHeaders: { flexDirection: 'row', paddingHorizontal: 8, marginBottom: 4 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 11, color: '#aaa', fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  dayCell: { width: '14.28%', aspectRatio: 0.8, padding: 2, alignItems: 'center' },
  dayCellToday: { backgroundColor: '#EEEDFE', borderRadius: 8 },
  dayNum: { fontSize: 11, color: '#666', marginBottom: 2 },
  dayNumToday: { color: '#534AB7', fontWeight: '500' },
  dayThumb: { width: '85%', aspectRatio: 3/4, borderRadius: 4 },
  dayEmpty: { width: '85%', aspectRatio: 3/4, borderRadius: 4, backgroundColor: '#f5f5f5' },
  countDot: { position: 'absolute', bottom: 4, right: 4, backgroundColor: '#534AB7', borderRadius: 6, paddingHorizontal: 3 },
  countDotText: { fontSize: 8, color: '#fff' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, maxHeight: '80%' },
  sheetTitle: { fontSize: 16, fontWeight: '500', marginBottom: 12, textAlign: 'center' },
  currentRow: { marginBottom: 12 },
  currentItem: { alignItems: 'center', marginRight: 10, width: 56 },
  currentThumb: { width: 52, height: 64, borderRadius: 8 },
  currentLabel: { fontSize: 9, color: '#888', marginTop: 3, textAlign: 'center' },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeBtn: { flex: 1, padding: 8, borderRadius: 10, borderWidth: 0.5, borderColor: '#ddd', alignItems: 'center', backgroundColor: '#f5f5f5' },
  modeBtnActive: { backgroundColor: '#EEEDFE', borderColor: '#AFA9EC' },
  modeBtnText: { fontSize: 13, color: '#888' },
  modeBtnTextActive: { color: '#534AB7' },
  pickList: { maxHeight: 160, marginBottom: 12 },
  outfitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, borderWidth: 0.5, borderColor: '#e0e0e0', marginBottom: 8 },
  outfitRowActive: { backgroundColor: '#EEEDFE', borderColor: '#AFA9EC' },
  outfitThumbs: { flexDirection: 'row', gap: 3 },
  outfitThumb: { width: 36, height: 44, borderRadius: 6 },
  outfitName: { flex: 1, fontSize: 13, fontWeight: '500' },
  selectedCheck: { color: '#534AB7', fontSize: 16, fontWeight: '500' },
  clothesPicker: { marginBottom: 12, maxHeight: 120 },
  pickItem: { width: 64, marginRight: 8, alignItems: 'center', position: 'relative' },
  pickImage: { width: 56, height: 70, borderRadius: 8, backgroundColor: '#f0f0f0' },
  checkOverlay: { position: 'absolute', top: 0, left: 0, width: 56, height: 70, borderRadius: 8, backgroundColor: 'rgba(83,74,183,0.5)', alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#fff', fontSize: 20, fontWeight: '500' },
  pickLabel: { fontSize: 9, color: '#666', marginTop: 3, textAlign: 'center' },
  emptyPick: { color: '#aaa', fontSize: 13, textAlign: 'center', marginTop: 20 },
  btnRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  saveBtn: { flex: 1, backgroundColor: '#534AB7', borderRadius: 12, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  clearBtn: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14, alignItems: 'center', paddingHorizontal: 20 },
  clearBtnText: { color: '#888', fontSize: 15 },
  cancelBtn: { alignItems: 'center', padding: 10 },
  cancelBtnText: { color: '#888', fontSize: 14 },
});
