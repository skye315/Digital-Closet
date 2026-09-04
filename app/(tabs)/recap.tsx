import { PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold, useFonts } from '@expo-google-fonts/playfair-display';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  SafeAreaView, ScrollView,
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

type WearLog = {
  itemId: string;
  date: string; // format: 'YYYY-MM'
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CATEGORIES = ['Tops', 'Bottoms', 'Shoes', 'Outerwear', 'Accessories'];

export default function RecapScreen() {
  const [fontsLoaded] = useFonts({ PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold });
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [wearLogs, setWearLogs] = useState<WearLog[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const loadData = async () => {
    const saved = await AsyncStorage.getItem('closet_items');
    const logs = await AsyncStorage.getItem('wear_logs');
    if (saved) setItems(JSON.parse(saved));
    if (logs) setWearLogs(JSON.parse(logs));
  };

  useEffect(() => { loadData(); }, []);
  useFocusEffect(useCallback(() => { loadData(); }, []));

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
  const monthLogs = wearLogs.filter(l => l.date === monthKey);

  // Count wears per item for this month
  const monthWearCounts: Record<string, number> = {};
  monthLogs.forEach(l => {
    monthWearCounts[l.itemId] = (monthWearCounts[l.itemId] || 0) + 1;
  });

  const totalWears = monthLogs.length;
  const wornItemIds = new Set(monthLogs.map(l => l.itemId));
  const neverWorn = items.filter(i => !wornItemIds.has(i.id));

  const topItems = items
    .filter(i => monthWearCounts[i.id] > 0)
    .sort((a, b) => (monthWearCounts[b.id] || 0) - (monthWearCounts[a.id] || 0))
    .slice(0, 3);

  const maxWears = topItems[0] ? (monthWearCounts[topItems[0].id] || 0) : 1;

  const topBrands = Object.entries(
    items.reduce((acc, i) => {
      if (i.brand && monthWearCounts[i.id]) {
        acc[i.brand] = (acc[i.brand] || 0) + (monthWearCounts[i.id] || 0);
      }
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const topColors = Object.entries(
    items.reduce((acc, i) => {
      if (i.colors?.length > 0 && monthWearCounts[i.id]) {
        i.colors.forEach(c => {
          acc[c] = (acc[c] || 0) + (monthWearCounts[i.id] || 0);
        });
      }
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const categoryBreakdown = CATEGORIES.map(cat => {
    const catItems = items.filter(i => i.category === cat);
    const wears = catItems.reduce((a, i) => a + (monthWearCounts[i.id] || 0), 0);
    return { cat, count: catItems.length, wears };
  }).filter(c => c.count > 0);

  const maxCatWears = Math.max(...categoryBreakdown.map(c => c.wears), 1);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <Text style={styles.title}>Monthly Recap</Text>

        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <Text style={styles.navBtnText}>{'<'}</Text>
          </TouchableOpacity>
          <View style={styles.monthPill}>
            <Text style={styles.monthText}>{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}</Text>
          </View>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <Text style={styles.navBtnText}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Items</Text>
            <Text style={styles.statNum}>{items.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Wears</Text>
            <Text style={styles.statNum}>{totalWears}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Never Worn</Text>
            <Text style={styles.statNum}>{neverWorn.length}</Text>
          </View>
        </View>

        {topItems.length > 0 ? (
          <View style={styles.darkPanelFull}>
            <Text style={styles.panelTitle}>Most Worn This Month</Text>
            {topItems.map((item, index) => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.rank}>#{index + 1}</Text>
                <Image source={{ uri: item.uri }} style={styles.thumb} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  {item.brand ? <Text style={styles.itemBrand}>{item.brand}</Text> : null}
                  <View style={styles.barBg}>
                    <View style={[styles.bar, { width: `${((monthWearCounts[item.id] || 0) / maxWears) * 100}%` }]} />
                  </View>
                </View>
                <Text style={styles.wearCount}>{monthWearCounts[item.id] || 0}×</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.darkPanelFull}>
            <Text style={styles.panelTitle}>Most Worn This Month</Text>
            <Text style={styles.panelEmpty}>No outfits logged this month yet</Text>
          </View>
        )}

        <View style={styles.twoCol}>
          <View style={styles.darkPanel}>
            <Text style={styles.panelTitle}>Top Brands</Text>
            {topBrands.length === 0 && <Text style={styles.panelEmpty}>No data yet</Text>}
            {topBrands.map(([brand], i) => (
              <Text key={brand} style={styles.panelItem}>{i + 1}.  {brand}</Text>
            ))}
          </View>
          <View style={styles.darkPanel}>
            <Text style={styles.panelTitle}>Top Colors</Text>
            {topColors.length === 0 && <Text style={styles.panelEmpty}>No data yet</Text>}
            {topColors.map(([color], i) => (
              <Text key={color} style={styles.panelItem}>{i + 1}.  {color}</Text>
            ))}
          </View>
        </View>

        {neverWorn.length > 0 && (
          <View style={styles.darkPanelFull}>
            <Text style={styles.panelTitle}>Never Worn This Month</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {neverWorn.map(item => (
                <View key={item.id} style={styles.neverItem}>
                  {item.uri ? (
                    <Image source={{ uri: item.uri }} style={styles.neverImage} />
                  ) : (
                    <View style={styles.neverImage} />
                  )}
                  <Text style={styles.neverLabel} numberOfLines={1}>{item.label}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {categoryBreakdown.length > 0 && (
          <View style={styles.darkPanelFull}>
            <Text style={styles.panelTitle}>By Category</Text>
            {categoryBreakdown.map(c => (
              <View key={c.cat} style={styles.catRow}>
                <Text style={styles.catName}>{c.cat}</Text>
                <Text style={styles.catCount}>{c.count} items</Text>
                <View style={styles.catBarBg}>
                  <View style={[styles.catBar, { width: `${(c.wears / maxCatWears) * 100}%` }]} />
                </View>
                <Text style={styles.catWears}>{c.wears}×</Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  title: { fontSize: 36, fontFamily: 'PlayfairDisplay_600SemiBold', color: '#1a1a1a' },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navBtnText: { fontSize: 20, color: '#1a1a1a', fontWeight: '500' },
  monthPill: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 50, paddingVertical: 12, marginHorizontal: 8 },
  monthText: { color: '#fff', fontSize: 18, fontFamily: 'PlayfairDisplay_600SemiBold', textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, alignItems: 'center', gap: 6 },
  statLabel: { color: '#aaa', fontSize: 11, textAlign: 'center' },
  statNum: { color: '#fff', fontSize: 32, fontFamily: 'PlayfairDisplay_600SemiBold' },
  twoCol: { flexDirection: 'row', gap: 12 },
  darkPanel: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, gap: 10 },
  darkPanelFull: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, gap: 12 },
  panelTitle: { color: '#fff', fontSize: 16, fontFamily: 'PlayfairDisplay_600SemiBold', textAlign: 'center', marginBottom: 4 },
  panelEmpty: { color: '#666', fontSize: 13, textAlign: 'center' },
  panelItem: { color: '#fff', fontSize: 14, fontFamily: 'PlayfairDisplay_400Regular' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { fontSize: 13, color: '#aaa', width: 24 },
  thumb: { width: 44, height: 56, borderRadius: 8 },
  itemInfo: { flex: 1 },
  itemLabel: { fontSize: 13, fontWeight: '500', color: '#fff' },
  itemBrand: { fontSize: 11, color: '#aaa', marginTop: 1 },
  barBg: { height: 4, backgroundColor: '#333', borderRadius: 2, marginTop: 5 },
  bar: { height: 4, backgroundColor: '#fff', borderRadius: 2 },
  wearCount: { fontSize: 13, color: '#fff', fontWeight: '500', width: 28, textAlign: 'right' },
  neverItem: { alignItems: 'center', marginRight: 12, width: 72 },
  neverImage: { width: 64, height: 80, borderRadius: 8, backgroundColor: '#333', borderWidth: 1.5, borderColor: '#E24B4A' },
  neverLabel: { color: '#aaa', fontSize: 10, marginTop: 4, textAlign: 'center' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catName: { color: '#fff', fontSize: 12, width: 72, fontFamily: 'PlayfairDisplay_400Regular' },
  catCount: { color: '#666', fontSize: 10, width: 44 },
  catBarBg: { flex: 1, height: 6, backgroundColor: '#333', borderRadius: 3 },
  catBar: { height: 6, backgroundColor: '#fff', borderRadius: 3 },
  catWears: { color: '#fff', fontSize: 12, width: 28, textAlign: 'right' },
});