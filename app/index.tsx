import { View, Text, Button, StyleSheet, ActivityIndicator, Alert, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDailySudokus, getRandomUnplayedSudoku, DailyPuzzle } from '../utils/scraper';
import { getCurrentStreak } from '../utils/storage';

export default function Home() {
  const router = useRouter();
  
  const [streak, setStreak] = useState(0);
  const [dailyPuzzles, setDailyPuzzles] = useState<DailyPuzzle[]>([]);
  const [loadingRandom, setLoadingRandom] = useState(false);

  // useFocusEffect runs EVERY time you navigate to this screen
  useFocusEffect(
    useCallback(() => {
      const loadDashboardData = async () => {
        // 1. Get the current streak
        const currentStreak = await getCurrentStreak();
        setStreak(currentStreak);

        // 2. Fetch today's Simon & Mark puzzles
        const puzzles = await getDailySudokus();
        setDailyPuzzles(puzzles);
      };

      loadDashboardData();
    }, [])
  );

  const getPlayedIds = async () => {
    const allKeys = await AsyncStorage.getAllKeys();
    return allKeys
      .filter(key => key.startsWith('@sudoku_'))
      .map(key => key.replace('@sudoku_', ''));
  };

  const handlePlayDaily = (index: number) => {
    if (dailyPuzzles.length > index) {
      router.push({ pathname: '/play', params: { url: dailyPuzzles[index].url } });
    } else {
      Alert.alert("Hold on", "Still fetching today's puzzles. Try again in a second!");
    }
  };

  const handlePlayRandom = async () => {
    setLoadingRandom(true);
    const playedIds = await getPlayedIds();
    const url = await getRandomUnplayedSudoku(playedIds);
    setLoadingRandom(false);

    if (url) {
      router.push({ pathname: '/play', params: { url } });
    } else {
      Alert.alert("Wow!", "You might have played every puzzle, or the connection failed.");
    }
  };

return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      
      <View style={styles.headerBox}>
        <Text style={styles.streakNumber}>{streak}{streak > 0 ? ' 🔥' : ''}</Text>
        <Text style={styles.streakLabel}>Day Streak</Text>
      </View>

      {/* --- DAILY PUZZLES WITH PIZZAZZ --- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Puzzles</Text>
        {dailyPuzzles.length === 0 ? (
          <ActivityIndicator size="small" color="#ff4500" />
        ) : (<View style={styles.rowGroup}>
            
            {/* Simon's Card */}
            <TouchableOpacity 
              style={[styles.cardWrapper, { backgroundColor: '#2196F3', borderColor: '#1976D2' }]} 
              onPress={() => handlePlayDaily(0)}
              activeOpacity={0.8}
            >
              {dailyPuzzles[0]?.thumbnail && (
                <Image 
                  source={{ uri: dailyPuzzles[0].thumbnail }} 
                  style={styles.thumbnail} 
                  resizeMode="cover"
                />
              )}
              <View style={styles.textContainer}>
                 <Text style={styles.cardText}>Simon's Puzzle</Text>
              </View>
            </TouchableOpacity>

            {/* Mark's Card */}
            <TouchableOpacity 
              style={[styles.cardWrapper, { backgroundColor: '#4CAF50', borderColor: '#388E3C' }]} 
              onPress={() => handlePlayDaily(1)}
              activeOpacity={0.8}
            >
              {dailyPuzzles[1]?.thumbnail && (
                <Image 
                  source={{ uri: dailyPuzzles[1].thumbnail }} 
                  style={styles.thumbnail} 
                  resizeMode="cover"
                />
              )}
              <View style={styles.textContainer}>
                 <Text style={styles.cardText}>Mark's Puzzle</Text>
              </View>
            </TouchableOpacity>

          </View>
        )}
      </View>

      <View style={styles.divider} />

      {/* --- RANDOM PUZZLE --- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Random Puzzle</Text>
        {loadingRandom ? (
           <ActivityIndicator size="small" color="#ff4500" />
        ) : (
           <TouchableOpacity 
             style={[styles.actionButton, { backgroundColor: '#FF9800', borderColor: '#E65100' }]} 
             onPress={handlePlayRandom}
             activeOpacity={0.8}
           >
             <Text style={styles.cardText}>🎲 Play a Random Sudoku</Text>
           </TouchableOpacity>
        )}
      </View>

      <View style={styles.divider} />
      
      {/* --- HISTORY --- */}
      <View style={[styles.section]}>
        <Text style={styles.sectionTitle}>The Archive</Text>
         <TouchableOpacity 
           style={[styles.actionButton, { backgroundColor: '#666666', borderColor: '#444444' }]} 
           onPress={() => router.push('/streaks')}
           activeOpacity={0.8}
         >
           <Text style={styles.cardText}>📚 View Full History</Text>
         </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
// The background of the scroll view
  container: { 
    flex: 1, 
    backgroundColor: '#f4f4f4' 
  },
  // The layout of the items inside it
  scrollContent: { 
    alignItems: 'center', 
    padding: 20, 
    paddingTop: 60, 
    paddingBottom: 40 // Gives a nice buffer at the bottom so your history button doesn't hit the screen edge
  },
  headerBox: { alignItems: 'center', marginBottom: 40, padding: 20, backgroundColor: 'white', borderRadius: 20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, width: '80%' },
  streakNumber: { fontSize: 54, fontWeight: '900', color: '#ff4500' },
  streakLabel: { fontSize: 18, fontWeight: 'bold', color: '#666', textTransform: 'uppercase', letterSpacing: 2 },
  section: { width: '100%', maxWidth: 340, alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  actionButton: {
    width: '100%',
    padding: 16,
    borderRadius: 12, // Uniform rounded corners since there's no image
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3, 
    shadowColor: '#000', 
    shadowOpacity: 0.15, 
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  divider: { height: 1, width: '80%', backgroundColor: '#ddd', marginVertical: 15 },
  
  // New Styles for the Thumbnail Cards
  rowGroup: { flexDirection: 'column', gap: 15, width: '100%', justifyContent: 'space-between' },
  cardWrapper: { 
    width: '100%',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderTopLeftRadius: 5, 
    borderTopRightRadius: 5,
    
    overflow: 'hidden', 
    elevation: 3, 
    shadowColor: '#000', 
    shadowOpacity: 0.15, 
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 2, 
  },
  thumbnail: { 
    width: '100%', 
    aspectRatio: 16 / 9, 
    backgroundColor: '#eee' 
  },
  textContainer: {
    padding: 10, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  }
});