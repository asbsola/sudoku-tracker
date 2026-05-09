import { View, Text, StyleSheet, FlatList, Dimensions } from 'react-native';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentStreak } from '../utils/storage'; // <-- Import our new utility!
import { LineChart } from 'react-native-chart-kit';

type PuzzleRecord = {
  id: string;
  solveTime: string;
  completedAt: string;
  rawDate: Date; 
};
const parseTimeToMinutes = (timeStr: string): number | null => {
  if (!timeStr || timeStr === 'Unknown') return null;
  const parts = timeStr.split(':').map(Number);
  
  if (parts.length === 2) {
    return parts[0] + parts[1] / 60; // MM:SS
  } else if (parts.length === 3) {
    return parts[0] * 60 + parts[1] + parts[2] / 60; // HH:MM:SS
  }
  return null;
};

const screenWidth = Dimensions.get('window').width;

export default function StreaksScreen() {
  const [history, setHistory] = useState<PuzzleRecord[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // 1. Fetch the streak using our shared utility
        const streak = await getCurrentStreak();
        setCurrentStreak(streak);

        // 2. Fetch the raw data just to build our history list
        const allKeys = await AsyncStorage.getAllKeys();
        const sudokuKeys = allKeys.filter(key => key.startsWith('@sudoku_'));
        const results = await AsyncStorage.multiGet(sudokuKeys);

        const parsedHistory: PuzzleRecord[] = results.map(([key, value]) => {
          const data = value ? JSON.parse(value) : { solveTime: 'Unknown', completedAt: new Date().toISOString() };
          return {
            id: key.replace('@sudoku_', ''),
            solveTime: data.solveTime,
            rawDate: new Date(data.completedAt),
            completedAt: new Date(data.completedAt).toLocaleDateString() 
          };
        });

        // Sort history newest to oldest
        parsedHistory.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
        setHistory(parsedHistory);

      } catch (e) {
        console.error("Failed to load stats:", e);
      }
    };
    
    loadStats();
  }, []);

  const chartDataPoints = history
    .slice(0, 10)
    .reverse()
    .map(p => parseTimeToMinutes(p.solveTime))
    .filter((time): time is number => time !== null);
  
  return (
    <View style={styles.container}>
      <View style={styles.streakContainer}>
        <Text style={styles.streakNumber}>{currentStreak}{currentStreak > 0 ? ' 🔥' : ''}</Text>
        <Text style={styles.streakLabel}>Day Streak</Text>
      </View>
      {chartDataPoints.length >= 2 && (
        <View style={styles.chartWrapper}>
          <Text style={styles.chartTitle}>Recent Solve Times (Minutes)</Text>
          <LineChart
            data={{
              labels: chartDataPoints.map((_, index) => `#${index + 1}`), // X-Axis labels
              datasets: [{ data: chartDataPoints }] // Y-Axis data
            }}
            width={screenWidth - 40} // Screen width minus padding
            height={220}
            yAxisSuffix="m"
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 1, // Only show 1 decimal (e.g. 7.5m)
              color: (opacity = 1) => `rgba(255, 69, 0, ${opacity})`, // Orange line to match the fire!
              labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: "6", strokeWidth: "2", stroke: "#ffa726" }
            }}
            bezier // Makes the line curved and smooth instead of jagged
            style={styles.chart}
          />
        </View>
      )}
      <Text style={styles.header}>Total Puzzles: {history.length}</Text>
      
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        style={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>Puzzle: {item.id}</Text>
            <Text style={styles.details}>Time: {item.solveTime}</Text>
            <Text style={styles.date}>Solved on: {item.completedAt}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4', paddingTop: 20 },
  streakContainer: { alignItems: 'center', marginBottom: 20, padding: 15, backgroundColor: 'white', marginHorizontal: 20, borderRadius: 15, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  streakNumber: { fontSize: 48, fontWeight: '900', color: '#ff4500' },
  streakLabel: { fontSize: 16, fontWeight: 'bold', color: '#666', textTransform: 'uppercase', letterSpacing: 1 },
  chartWrapper: { marginHorizontal: 20, marginBottom: 20, backgroundColor: 'white', borderRadius: 16, padding: 10, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  chartTitle: { textAlign: 'center', fontWeight: 'bold', color: '#666', marginBottom: 10 },
  chart: { borderRadius: 16 },
  header: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, color: '#333' },
  list: { paddingHorizontal: 20 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  details: { fontSize: 16, color: '#333' },
  date: { fontSize: 12, color: '#888', marginTop: 5 }
});