import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
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
  color: string;
  wornCount: number;
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function RecapScreen() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem('closet_items');
      if (saved) setItems(JSON.parse(saved));
    };
    load();
  }, []);

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  const monthKey = (date: Date) =>
    `otd-${date.getFullYear()}-${date.getMonth()}-`;

  const getMonthWears = async () => [];

  const sorted = [...items].sort((a, b) => b.wornCount - a.wornCount);
  const topItems = sorted.slice(0, 5);
  const neverWorn = items.filter(i => i.wornCount === 0);
  const totalWears = items.reduce((a, b) => a + b.wornCount, 0);
  const maxWears = topItems[0]?.wornCount || 1;

  const categoryBreakdown = ['Tops', 'Bottoms', 'Shoes', 'Outerwear', 'Accessories'].map(cat => ({
    cat,
    count: items.filter(i => i.category === cat).length,
    wears: items.filter(i => i.category === cat).reduce((a, b) => a + b.wornCount, 0),
  })).filter(c => c.count > 0);

  const topBrands = Object.entries(
    items.reduce((acc, i) => {
      if (i.brand) acc[i.brand] = (acc[i.brand] || 0) + i.wornCount;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const topColors = Object.entries(
    items.reduce((acc, i) => {
      if (i.color) acc[i.color] = (acc[i.color] || 0) + i.wornCount;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Monthly recap</Text>
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

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{items.length}</Text>
            <Text style={styles.statLabel}>Items</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{totalWears}</Text>
            <Text style={styles.statLabel}>Total wears</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{neverWorn.length}</Text>
            <Text style={styles.statLabel}>Never worn</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>
              {items.length > 0 ? (totalWears / items.length).toFixed(1) : '0'}
            </Text>
            <Text style={styles.statLabel}>Avg wears</Text>
          </View>
        </View>

        {topItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Most worn</Text>
            {topItems.map((item, index) => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.rank}>#{index + 1}</Text>
                <Image source={{ uri: item.uri }} style={styles.thumb} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  {item.brand ? <Text style={styles.itemBrand}>{item.brand}</Text> : null}
                  <View style={styles.barBg}>
                    <View style={[styles.bar, { width: `${(item.wornCount / maxWears) * 100}%` }]} />
                  </View>
                </View>
                <Text style={styles.wearCount}>{item.wornCount}×</Text>
              </View>
            ))}
          </View>
        )}

        {neverWorn.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Never worn</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {neverWorn.map(item => (
                <View key={item.id} style={styles.neverItem}>
                  <Image source={{ uri: item.uri }} style={styles.neverThumb} />
                  <Text style={styles.neverLabel} numberOfLines={1}>{item.label}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {categoryBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>By category</Text>
            {categoryBreakdown.map(c => (
              <View key={c.cat} style={styles.catRow}>
                <Text style={styles.catName}>{c.cat}</Text>
                <Text style={styles.catCount}>{c.count} items</Text>
                <View style={styles.catBarBg}>
                  <View style={[styles.catBar, { width: `${(c.wears / (totalWears || 1)) * 100}%` }]} />
                </View>
                <Text style={styles.catWears}>{c.wears}×</Text>
              </View>
            ))}
          </View>
        )}

        {topBrands.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top brands</Text>
            <View style={styles.tagWrap}>
              {topBrands.map(([brand, wears]) => (
                <View key={brand} style={styles.brandTag}>
                  <Text style={styles.brandTagName}>{brand}</Text>
                  <Text style={styles.brandTagWears}>{wears}×</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {topColors.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top colors</Text>
            <View style={styles.tagWrap}>
              {topColors.map(([color, wears]) => (
                <View key={color} style={styles.colorTag}>
                  <Text style={styles.colorTagName}>{color}</Text>
                  <Text style={styles.colorTagWears}>{wears}×</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
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
  scroll: { padding: 16, gap: 20, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: '#f8f8f8', borderRadius: 12, padding: 12, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '500', color: '#534AB7' },
  statLabel: { fontSize: 10, color: '#aaa', marginTop: 2, textAlign: 'center' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '500', color: '#333' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { fontSize: 13, color: '#aaa', width: 24 },
  thumb: { width: 44, height: 56, borderRadius: 8 },
  itemInfo: { flex: 1 },
  itemLabel: { fontSize: 13, fontWeight: '500' },
  itemBrand: { fontSize: 11, color: '#aaa', marginTop: 1 },
  barBg: { height: 4, backgroundColor: '#f0f0f0', borderRadius: 2, marginTop: 5 },
  bar: { height: 4, backgroundColor: '#534AB7', borderRadius: 2 },
  wearCount: { fontSize: 13, color: '#534AB7', fontWeight: '500', width: 28, textAlign: 'right' },
  neverItem: { alignItems: 'center', marginRight: 10, width: 70 },
  neverThumb: { width: 64, height: 80, borderRadius: 10, borderWidth: 1, borderColor: '#E24B4A' },
  neverLabel: { fontSize: 10, color: '#aaa', marginTop: 4, textAlign: 'center' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catName: { fontSize: 13, color: '#333', width: 80 },
  catCount: { fontSize: 11, color: '#aaa', width: 50 },
  catBarBg: { flex: 1, height: 6, backgroundColor: '#f0f0f0', borderRadius: 3 },
  catBar: { height: 6, backgroundColor: '#534AB7', borderRadius: 3 },
  catWears: { fontSize: 12, color: '#534AB7', width: 28, textAlign: 'right' },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  brandTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EEEDFE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  brandTagName: { fontSize: 13, color: '#534AB7', fontWeight: '500' },
  brandTagWears: { fontSize: 11, color: '#AFA9EC' },
  colorTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EAF3DE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  colorTagName: { fontSize: 13, color: '#3B6D11', fontWeight: '500' },
  colorTagWears: { fontSize: 11, color: '#97C459' },
});