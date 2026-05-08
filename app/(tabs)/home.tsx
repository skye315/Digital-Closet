import { PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold, useFonts } from '@expo-google-fonts/playfair-display';
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
  colors: string[];
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
  if (code === 0) return 'Sunny';
  if (code <= 2) return 'Partly Cloudy';
  if (code <= 3) return 'Overcast';
  if (code <= 51) return 'Drizzle';
  if (code <= 67) return 'Rainy';
  if (code <= 77) return 'Snowy';
  if (code <= 82) return 'Rain Showers';
  return 'Thunderstorm';
}

export default function HomeScreen() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
  });
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [todayItems, setTodayItems] = useState<string[]>([]);
  const [otdSelectedIds, setOtdSelectedIds] = useState<string[]>([]);
  const [otdModalVisible, setOtdModalVisible] = useState(false);
  const [weather, setWeather] = useState<{ temp: number; emoji: string; desc: string } | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

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
      setWeather({
        temp: Math.round(data.current_weather.temperature),
        emoji: getWeatherEmoji(data.current_weather.weathercode),
        desc: getWeatherDesc(data.current_weather.weathercode),
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
        otdSelectedIds.includes(i.id) ? { ...i, wornCount: i.wornCount + 1 } : i
      );
      await AsyncStorage.setItem('closet_items', JSON.stringify(updated));
      setItems(updated);
      setTodayItems(otdSelectedIds);
    
      const savedEntries = await AsyncStorage.getItem('calendar_entries');
      const entries = savedEntries ? JSON.parse(savedEntries) : [];
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const existingEntry = entries.find((e: any) => e.date === dateStr);
      const currentGroups = existingEntry?.groups || (existingEntry?.itemIds ? [existingEntry.itemIds] : []);
      const updatedEntries = entries.filter((e: any) => e.date !== dateStr);
      if (otdSelectedIds.length > 0) {
        updatedEntries.push({ date: dateStr, groups: [...currentGroups, otdSelectedIds] });
      }
      await AsyncStorage.setItem('calendar_entries', JSON.stringify(updatedEntries));
      setOtdModalVisible(false);
      setPhotoIndex(0);
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

  if(!fontsLoaded) return null;

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

        <Text style={styles.ootdTitle}>OOTD:</Text>

        <TouchableOpacity
          style={styles.ootdCard}
          onPress={() => { setOtdSelectedIds(todayItems); setOtdModalVisible(true); }}>
          {todayClothes.length > 0 ? (
            <View style={styles.ootdSlideshow}>
              <TouchableOpacity
                style={styles.slideArrow}
                onPress={() => setPhotoIndex(i => Math.max(0, i - 1))}>
                <Text style={styles.slideArrowText}>‹</Text>
              </TouchableOpacity>
              <Image
                source={{ uri: todayClothes[photoIndex % todayClothes.length].uri }}
                style={styles.ootdImage}
              />
              <TouchableOpacity
                style={styles.slideArrow}
                onPress={() => setPhotoIndex(i => Math.min(todayClothes.length - 1, i + 1))}>
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

      <Modal visible={otdModalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Today's outfit</Text>
            {weather && (
              <Text style={styles.weatherHint}>{weather.emoji} {weather.temp}° · {weather.desc}</Text>
            )}
            <Text style={styles.sheetLabel}>Pick what you're wearing</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.picker} keyboardShouldPersistTaps="handled">
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
  scroll: { padding: 20, gap: 16 },
  greetingPill: {
    backgroundColor: '#1a1a1a',
    borderRadius: 50,
    paddingVertical: 18,
    paddingHorizontal: 28,
    alignSelf: 'center',
  },
  greetingText: {
    color: '#fff',
    fontSize: 28,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    letterSpacing: -0.5,
  },
  weatherText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 4,
    fontFamily: 'PlayfairDisplay_400Regular',
  },
  ootdTitle: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontWeight: '500',
    color: '#1a1a1a',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  ootdCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 340,
    justifyContent: 'center',
  },
  ootdSlideshow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  slideArrow: { padding: 10 },
  slideArrowText: { color: '#fff', fontSize: 32 },
  ootdImage: {
    flex: 1,
    height: 280,
    borderRadius: 10,
    marginHorizontal: 8,
  },
  ootdEmpty: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ootdEmptyText: { color: '#888', fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 18, fontWeight: '500', marginBottom: 8, textAlign: 'center' },
  weatherHint: { textAlign: 'center', fontSize: 13, color: '#888', marginBottom: 12 },
  sheetLabel: { fontSize: 13, color: '#888', marginBottom: 8 },
  picker: { marginBottom: 20, maxHeight: 130 },
  pickItem: { width: 70, marginRight: 10, alignItems: 'center', position: 'relative' },
  pickImage: { width: 64, height: 80, borderRadius: 8, backgroundColor: '#f0f0f0' },
  checkOverlay: { position: 'absolute', top: 0, left: 0, width: 64, height: 80, borderRadius: 8, backgroundColor: 'rgba(83,74,183,0.5)', alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#fff', fontSize: 24, fontWeight: '500' },
  pickLabel: { fontSize: 10, color: '#666', marginTop: 4, textAlign: 'center' },
  saveBtn: { backgroundColor: '#1a1a1a', borderRadius: 50, padding: 16, alignItems: 'center', marginBottom: 10 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  cancelBtn: { alignItems: 'center', padding: 10 },
  cancelBtnText: { color: '#888', fontSize: 14 },
});