import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image, Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
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
  if (code === 0) return 'Clear sky';
  if (code <= 2) return 'Partly cloudy';
  if (code <= 3) return 'Overcast';
  if (code <= 51) return 'Drizzle';
  if (code <= 67) return 'Rainy';
  if (code <= 77) return 'Snowy';
  if (code <= 82) return 'Rain showers';
  return 'Thunderstorm';
}

export default function HomeScreen() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [todayItems, setTodayItems] = useState<string[]>([]);
  const [otdSelectedIds, setOtdSelectedIds] = useState<string[]>([]);
  const [otdModalVisible, setOtdModalVisible] = useState(false);
  const [weather, setWeather] = useState<{ temp: number; emoji: string; desc: string; city: string } | null>(null);

  const todayKey = () => {
    const d = new Date();
    return `otd-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem('closet_items');
      if (saved) setItems(JSON.parse(saved));
      const otd = await AsyncStorage.getItem(todayKey());
      if (otd) setTodayItems(JSON.parse(otd));
    };
    load();
    fetchWeather();
  }, []);

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
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
      );
      const geoData = await geo.json();
      const city = geoData.address?.city || geoData.address?.town || geoData.address?.village || 'Your area';
      setWeather({
        temp: Math.round(data.current_weather.temperature),
        emoji: getWeatherEmoji(data.current_weather.weathercode),
        desc: getWeatherDesc(data.current_weather.weathercode),
        city,
      });
    } catch (e) { console.log('Weather fetch failed', e); }
  };

  const saveOtd = async () => {
    const dirtyRaw = await AsyncStorage.getItem('dirty_items');
    const dirtyIds: string[] = dirtyRaw ? JSON.parse(dirtyRaw) : [];
    const dirtySelected = items.filter(i => otdSelectedIds.includes(i.id) && dirtyIds.includes(i.id));

    const doSave = async () => {
      await AsyncStorage.setItem(todayKey(), JSON.stringify(otdSelectedIds));
      const updated = items.map(i =>
        otdSelectedIds.includes(i.id) ? {...i, wornCount: i.wornCount + 1 } : i
      );
      await AsyncStorage.setItem('closet_items', JSON.stringify(updated));
      setItems(updated);
      setTodayItems(otdSelectedIds);

      const savedEntries = await AsyncStorage.getItem('calendar_entries');
      const entries = savedEntries ? JSON.parse(savedEntries) : [];
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const updatedEntries = entries.filter((e: any) => e.date !== dateStr);
      if (otdSelectedIds.length > 0) {
      await AsyncStorage.setItem('calendar_entries', JSON.stringify(updatedEntries));
      setOtdModalVisible(false);
      }
  };

    if (dirtySelected.length > 0) {
      Alert.alert(
        '🧺 Dirty items',
        `These items are marked dirty:\n${dirtySelected.map(i => `• ${i.label}`).join('\n')}\n\nAdd them anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add anyway', onPress: doSave }
        ]
      );
      return;
    }
    await doSave();
  };

  const todayClothes = items.filter(i => todayItems.includes(i.id));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()}</Text>
            {weather && <Text style={styles.location}>{weather.city}</Text>}
          </View>
          {weather && (
            <View style={styles.weatherBox}>
              <Text style={styles.weatherEmoji}>{weather.emoji}</Text>
              <Text style={styles.weatherTemp}>{weather.temp}°F</Text>
              <Text style={styles.weatherDesc}>{weather.desc}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.otdCard}
          onPress={() => { setOtdSelectedIds(todayItems); setOtdModalVisible(true); }}>
          <View style={styles.otdCardHeader}>
            <Text style={styles.otdCardTitle}>Today's outfit</Text>
            <Text style={styles.otdCardEdit}>{todayClothes.length > 0 ? 'Edit ›' : 'Add ›'}</Text>
          </View>
          {todayClothes.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.otdScroll}>
              {todayClothes.map(c => (
                <View key={c.id} style={styles.otdItem}>
                  <Image source={{ uri: c.uri }} style={styles.otdImage} />
                  <Text style={styles.otdItemLabel} numberOfLines={1}>{c.label}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.otdEmpty}>
              <Text style={styles.otdEmptyEmoji}>👗</Text>
              <Text style={styles.otdEmptyText}>Tap to log what you're wearing today</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{items.length}</Text>
            <Text style={styles.statLabel}>Total items</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{items.filter(i => i.wornCount === 0).length}</Text>
            <Text style={styles.statLabel}>Never worn</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{items.reduce((a, b) => a + b.wornCount, 0)}</Text>
            <Text style={styles.statLabel}>Total wears</Text>
          </View>
        </View>

        {items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Most worn</Text>
            {[...items].sort((a, b) => b.wornCount - a.wornCount).slice(0, 3).map(item => (
              <View key={item.id} style={styles.topItem}>
                <Image source={{ uri: item.uri }} style={styles.topThumb} />
                <View style={styles.topInfo}>
                  <Text style={styles.topLabel}>{item.label}</Text>
                  {item.brand ? <Text style={styles.topBrand}>{item.brand}</Text> : null}
                </View>
                <Text style={styles.topCount}>{item.wornCount}×</Text>
              </View>
            ))}
          </View>
        )}

        {items.filter(i => i.wornCount === 0).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Never worn</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {items.filter(i => i.wornCount === 0).map(item => (
                <View key={item.id} style={styles.neverItem}>
                  <Image source={{ uri: item.uri }} style={styles.neverThumb} />
                  <Text style={styles.neverLabel} numberOfLines={1}>{item.label}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      <Modal visible={otdModalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Today's outfit</Text>
            {weather && (
              <Text style={styles.weatherHint}>{weather.emoji} {weather.temp}°F · {weather.desc}</Text>
            )}
            <Text style={styles.sheetLabel}>Pick what you're wearing</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.otdPicker}>
              {items.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.pickItem}
                  onPress={() => setOtdSelectedIds(prev =>
                    prev.includes(c.id) ? prev.filter(i => i !== c.id) : [...prev, c.id]
                  )}>
                  <Image source={{ uri: c.uri }} style={styles.pickImage} />
                  {otdSelectedIds.includes(c.id) && (
                    <View style={styles.checkOverlay}>
                      <Text style={styles.checkMark}>✓</Text>
                    </View>
                  )}
                  <Text style={styles.pickLabel} numberOfLines={1}>{c.label}</Text>
                </TouchableOpacity>
              ))}
              {items.length === 0 && <Text style={{ color: '#aaa', fontSize: 13 }}>Add clothes in the Closet tab first</Text>}
            </ScrollView>
            <TouchableOpacity style={styles.saveBtn} onPress={saveOtd}>
              <Text style={styles.saveBtnText}>Save today's outfit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setOtdModalVisible(false)}>
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
  scroll: { padding: 16, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 24, fontWeight: '500', color: '#333' },
  location: { fontSize: 13, color: '#aaa', marginTop: 2 },
  weatherBox: { alignItems: 'center' },
  weatherEmoji: { fontSize: 32 },
  weatherTemp: { fontSize: 18, fontWeight: '500', color: '#333' },
  weatherDesc: { fontSize: 11, color: '#aaa' },
  otdCard: { borderWidth: 0.5, borderColor: '#e0e0e0', borderRadius: 16, padding: 16, backgroundColor: '#FAFAFA' },
  otdCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  otdCardTitle: { fontSize: 15, fontWeight: '500', color: '#333' },
  otdCardEdit: { fontSize: 13, color: '#534AB7' },
  otdScroll: { maxHeight: 110 },
  otdItem: { alignItems: 'center', marginRight: 12, width: 70 },
  otdImage: { width: 64, height: 80, borderRadius: 10 },
  otdItemLabel: { fontSize: 10, color: '#666', marginTop: 4, textAlign: 'center' },
  otdEmpty: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  otdEmptyEmoji: { fontSize: 28 },
  otdEmptyText: { fontSize: 13, color: '#aaa', textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: '#f8f8f8', borderRadius: 12, padding: 14, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '500', color: '#534AB7' },
  statLabel: { fontSize: 11, color: '#aaa', marginTop: 2 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '500', color: '#333' },
  topItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, borderWidth: 0.5, borderColor: '#f0f0f0' },
  topThumb: { width: 44, height: 56, borderRadius: 8 },
  topInfo: { flex: 1 },
  topLabel: { fontSize: 13, fontWeight: '500' },
  topBrand: { fontSize: 11, color: '#aaa', marginTop: 2 },
  topCount: { fontSize: 14, color: '#534AB7', fontWeight: '500' },
  neverItem: { alignItems: 'center', marginRight: 10, width: 70 },
  neverThumb: { width: 64, height: 80, borderRadius: 10, borderWidth: 1, borderColor: '#E24B4A' },
  neverLabel: { fontSize: 10, color: '#aaa', marginTop: 4, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 18, fontWeight: '500', marginBottom: 8, textAlign: 'center' },
  weatherHint: { textAlign: 'center', fontSize: 13, color: '#888', marginBottom: 12 },
  sheetLabel: { fontSize: 13, color: '#888', marginBottom: 8 },
  otdPicker: { marginBottom: 20, maxHeight: 130 },
  pickItem: { width: 70, marginRight: 10, alignItems: 'center', position: 'relative' },
  pickImage: { width: 64, height: 80, borderRadius: 8, backgroundColor: '#f0f0f0' },
  checkOverlay: { position: 'absolute', top: 0, left: 0, width: 64, height: 80, borderRadius: 8, backgroundColor: 'rgba(83,74,183,0.5)', alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#fff', fontSize: 24, fontWeight: '500' },
  pickLabel: { fontSize: 10, color: '#666', marginTop: 4, textAlign: 'center' },
  saveBtn: { backgroundColor: '#534AB7', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  cancelBtn: { alignItems: 'center', padding: 10 },
  cancelBtnText: { color: '#888', fontSize: 14 },
});
