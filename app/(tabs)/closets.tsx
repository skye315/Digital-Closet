import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  FlatList, Modal, TextInput, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import { router } from 'expo-router';

export type Closet = {
  id: string;
  name: string;
  emoji: string;
};

const EMOJIS = ['👔', '🎓', '🏠', '🌴', '❄️', '💼', '👗', '🧳'];

export default function ClosetsScreen() {
  const [fontsLoaded] = useFonts({ PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold });
  const [closets, setClosets] = useState<Closet[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('👔');
  const [activeClosetId, setActiveClosetId] = useState<string>('all');

  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem('closets');
      const active = await AsyncStorage.getItem('active_closet');
      if (saved) setClosets(JSON.parse(saved));
      if (active) setActiveClosetId(active);
    };
    load();
  }, []);

  const saveClosets = async (updated: Closet[]) => {
    await AsyncStorage.setItem('closets', JSON.stringify(updated));
  };

  const setActive = async (id: string) => {
    setActiveClosetId(id);
    await AsyncStorage.setItem('active_closet', id);
  };

  const createCloset = () => {
    if (!name.trim()) { Alert.alert('Name required', 'Please name your closet.'); return; }
    const newCloset: Closet = {
      id: Date.now().toString(),
      name: name.trim(),
      emoji: selectedEmoji,
    };
    const updated = [...closets, newCloset];
    setClosets(updated);
    saveClosets(updated);
    setModalVisible(false);
    setName('');
    setSelectedEmoji('👔');
  };

  const deleteCloset = (id: string) => {
    Alert.alert(
      'Delete closet',
      'This will remove the closet but keep all items in it. They will show up under All.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          const updated = closets.filter(c => c.id !== id);
          setClosets(updated);
          saveClosets(updated);
          if (activeClosetId === id) setActive('all');
        }}
      ]
    );
  };

  const allClosets = [{ id: 'all', name: 'All closets', emoji: '🗂️' }, ...closets];

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Closets</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>Tap a closet to make it active. The whole app will filter to that closet.</Text>

      <FlatList
        data={allClosets}
        keyExtractor={c => c.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, activeClosetId === item.id && styles.cardActive]}
            onPress={() => setActive(item.id)}
            onLongPress={() => item.id !== 'all' && deleteCloset(item.id)}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <View style={styles.info}>
              <Text style={[styles.closetName, activeClosetId === item.id && styles.closetNameActive]}>{item.name}</Text>
              <Text style={[styles.closetSub, activeClosetId === item.id && styles.closetSubActive]}>
                {item.id === 'all' ? 'Shows everything' : 'Long press to delete'}
              </Text>
            </View>
            {activeClosetId === item.id && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New closet</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Dorm closet, Home closet"
              placeholderTextColor="#bbb"
              value={name}
              onChangeText={setName}
            />
            <Text style={styles.sheetLabel}>Pick an icon</Text>
            <View style={styles.emojiRow}>
              {EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiBtn, selectedEmoji === e && styles.emojiBtnActive]}
                  onPress={() => setSelectedEmoji(e)}>
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={createCloset}>
              <Text style={styles.saveBtnText}>Create closet</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 8 },
  title: { fontSize: 36, fontFamily: 'PlayfairDisplay_600SemiBold', color: '#1a1a1a' },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 24, lineHeight: 28 },
  subtitle: { fontSize: 13, color: '#aaa', paddingHorizontal: 20, marginBottom: 16 },
  list: { padding: 20, gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, borderWidth: 0.5, borderColor: '#e0e0e0' },
  cardActive: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  emoji: { fontSize: 28 },
  info: { flex: 1 },
  closetName: { fontSize: 15, fontWeight: '500', color: '#333' },
  closetNameActive: { color: '#fff' },
  closetSub: { fontSize: 12, color: '#aaa', marginTop: 2 },
  closetSubActive: { color: '#888' },
  activeBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  activeBadgeText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 22, fontFamily: 'PlayfairDisplay_600SemiBold', marginBottom: 16, textAlign: 'center', color: '#1a1a1a' },
  input: { borderWidth: 0.5, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 16, color: '#333' },
  sheetLabel: { fontSize: 13, color: '#888', marginBottom: 8 },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  emojiBtn: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: '#ddd', backgroundColor: '#f5f5f5' },
  emojiBtnActive: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  emojiText: { fontSize: 24 },
  saveBtn: { backgroundColor: '#1a1a1a', borderRadius: 50, padding: 14, alignItems: 'center', marginBottom: 10 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  cancelBtn: { alignItems: 'center', padding: 10 },
  cancelBtnText: { color: '#888', fontSize: 14 },
});