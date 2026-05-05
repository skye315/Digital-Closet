import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

type ClothingItem = { id: string; uri: string; label: string; brand: string; category: string; color: string; wornCount: number; };
type PackItem = { id: string; label: string; uri?: string; checked: boolean; };
type Trip = { id: string; name: string; dates: string; items: PackItem[]; };

export default function PackScreen() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [clothes, setClothes] = useState<ClothingItem[]>([]);
  const [tripModalVisible, setTripModalVisible] = useState(false);
  const [packModalVisible, setPackModalVisible] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tripName, setTripName] = useState('');
  const [tripDates, setTripDates] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const savedTrips = await AsyncStorage.getItem('trips');
      const savedClothes = await AsyncStorage.getItem('closet_items');
      if (savedTrips) setTrips(JSON.parse(savedTrips));
      if (savedClothes) setClothes(JSON.parse(savedClothes));
    };
    load();
  }, []);

  const saveTrips = async (updated: Trip[]) => {
    await AsyncStorage.setItem('trips', JSON.stringify(updated));
  };

  const createTrip = () => {
    if (!tripName.trim()) { Alert.alert('Name required', 'Please name your trip.'); return; }
    const newTrip: Trip = {
      id: Date.now().toString(),
      name: tripName.trim(),
      dates: tripDates.trim(),
      items: [],
    };
    const updated = [newTrip, ...trips];
    setTrips(updated);
    saveTrips(updated);
    setTripModalVisible(false);
    setTripName('');
    setTripDates('');
  };

  const openPackModal = (trip: Trip) => {
    setSelectedTrip(trip);
    setSelectedIds(trip.items.map(i => i.id));
    setPackModalVisible(true);
  };

  const savePacking = () => {
    if (!selectedTrip) return;
    const packItems: PackItem[] = selectedIds.map(id => {
      const cloth = clothes.find(c => c.id === id);
      const existing = selectedTrip.items.find(i => i.id === id);
      return {
        id,
        label: cloth?.label || existing?.label || '',
        uri: cloth?.uri,
        checked: existing?.checked || false,
      };
    });
    const updated = trips.map(t =>
      t.id === selectedTrip.id ? { ...t, items: packItems } : t
    );
    setTrips(updated);
    saveTrips(updated);
    setPackModalVisible(false);
  };

  const toggleCheck = (tripId: string, itemId: string) => {
    const updated = trips.map(trip =>
      trip.id === tripId
        ? { ...trip, items: trip.items.map(item =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          )}
        : trip
    );
    setTrips(updated);
    saveTrips(updated);
  };

  const deleteTrip = (id: string) => {
    Alert.alert('Delete trip', 'Remove this trip?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        const updated = trips.filter(t => t.id !== id);
        setTrips(updated);
        saveTrips(updated);
      }}
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trip packing</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setTripModalVisible(true)}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={trips}
        keyExtractor={t => t.id}
        contentContainerStyle={styles.list}
        renderItem={({ item: trip }) => (
          <View style={styles.tripCard}>
            <View style={styles.tripHeader}>
              <View style={styles.tripMeta}>
                <Text style={styles.tripName}>{trip.name}</Text>
                {trip.dates ? <Text style={styles.tripDates}>{trip.dates}</Text> : null}
              </View>
              <View style={styles.tripActions}>
                <View style={styles.progress}>
                  <Text style={styles.progressText}>
                    {trip.items.filter(i => i.checked).length}/{trip.items.length}
                  </Text>
                </View>
                <TouchableOpacity style={styles.editBtn} onPress={() => openPackModal(trip)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteTrip(trip.id)}>
                  <Text style={styles.deleteBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {trip.items.length === 0 ? (
              <TouchableOpacity style={styles.emptyTrip} onPress={() => openPackModal(trip)}>
                <Text style={styles.emptyTripText}>Tap Edit to add clothes from your closet</Text>
              </TouchableOpacity>
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
                  {trip.items.map(item => (
                    item.uri ? (
                      <Image
                        key={item.id}
                        source={{ uri: item.uri }}
                        style={[styles.tripThumb, item.checked && styles.tripThumbChecked]}
                      />
                    ) : null
                  ))}
                </ScrollView>
                {trip.items.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.packItem}
                    onPress={() => toggleCheck(trip.id, item.id)}>
                    <View style={[styles.check, item.checked && styles.checkDone]}>
                      {item.checked && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                    <Text style={[styles.itemLabel, item.checked && styles.itemLabelDone]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Tap + to create your first trip</Text>
          </View>
        }
      />

      <Modal visible={tripModalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New trip</Text>
            <TextInput
              style={styles.input}
              placeholder="Trip name (e.g. Weekend in NYC)"
              placeholderTextColor="#bbb"
              value={tripName}
              onChangeText={setTripName}
            />
            <TextInput
              style={styles.input}
              placeholder="Dates — optional (e.g. May 3–5)"
              placeholderTextColor="#bbb"
              value={tripDates}
              onChangeText={setTripDates}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={createTrip}>
              <Text style={styles.saveBtnText}>Create trip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setTripModalVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={packModalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Pack for {selectedTrip?.name}</Text>
            <Text style={styles.sheetLabel}>Pick clothes from your closet</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.picker}>
              {clothes.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.pickItem}
                  onPress={() => setSelectedIds(prev =>
                    prev.includes(c.id) ? prev.filter(i => i !== c.id) : [...prev, c.id]
                  )}>
                  <Image source={{ uri: c.uri }} style={styles.pickImage} />
                  {selectedIds.includes(c.id) && (
                    <View style={styles.checkOverlay}>
                      <Text style={styles.checkOverlayText}>✓</Text>
                    </View>
                  )}
                  <Text style={styles.pickLabel} numberOfLines={1}>{c.label}</Text>
                </TouchableOpacity>
              ))}
              {clothes.length === 0 && (
                <Text style={styles.noClothes}>Add clothes to your closet first</Text>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.saveBtn} onPress={savePacking}>
              <Text style={styles.saveBtnText}>Save packing list</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setPackModalVisible(false)}>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { fontSize: 22, fontWeight: '500' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#534AB7', alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 22, lineHeight: 26 },
  list: { padding: 16, gap: 14 },
  tripCard: { borderWidth: 0.5, borderColor: '#e0e0e0', borderRadius: 14, padding: 14 },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tripMeta: { flex: 1 },
  tripName: { fontSize: 15, fontWeight: '500' },
  tripDates: { fontSize: 12, color: '#888', marginTop: 2 },
  tripActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progress: { backgroundColor: '#EEEDFE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  progressText: { fontSize: 12, color: '#534AB7', fontWeight: '500' },
  editBtn: { backgroundColor: '#f0f0f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  editBtnText: { fontSize: 12, color: '#666' },
  deleteBtn: { fontSize: 14, color: '#ccc', padding: 4 },
  thumbRow: { marginBottom: 10 },
  tripThumb: { width: 44, height: 56, borderRadius: 8, marginRight: 6 },
  tripThumbChecked: { opacity: 0.4 },
  packItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  check: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: '#3B6D11', borderColor: '#3B6D11' },
  checkMark: { color: '#fff', fontSize: 11, fontWeight: '500' },
  itemLabel: { fontSize: 13, color: '#333' },
  itemLabelDone: { color: '#aaa', textDecorationLine: 'line-through' },
  emptyTrip: { padding: 12, alignItems: 'center' },
  emptyTripText: { color: '#aaa', fontSize: 13 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#aaa', fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 18, fontWeight: '500', marginBottom: 16, textAlign: 'center' },
  sheetLabel: { fontSize: 13, color: '#888', marginBottom: 8 },
  input: { borderWidth: 0.5, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 12, color: '#333' },
  picker: { marginBottom: 20, maxHeight: 130 },
  pickItem: { width: 70, marginRight: 10, alignItems: 'center', position: 'relative' },
  pickImage: { width: 64, height: 80, borderRadius: 8, backgroundColor: '#f0f0f0' },
  checkOverlay: { position: 'absolute', top: 0, left: 0, width: 64, height: 80, borderRadius: 8, backgroundColor: 'rgba(83,74,183,0.5)', alignItems: 'center', justifyContent: 'center' },
  checkOverlayText: { color: '#fff', fontSize: 24, fontWeight: '500' },
  pickLabel: { fontSize: 10, color: '#666', marginTop: 4, textAlign: 'center' },
  noClothes: { color: '#aaa', fontSize: 13, alignSelf: 'center', marginTop: 20 },
  saveBtn: { backgroundColor: '#534AB7', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  cancelBtn: { alignItems: 'center', padding: 10 },
  cancelBtnText: { color: '#888', fontSize: 14 },
});