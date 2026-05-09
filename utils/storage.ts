import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@sudoku_';

export const saveCompletedPuzzle = async (puzzleId: string, time: string) => {
  try {
    const timestamp = new Date().toISOString();
    
    // Create an object holding all our stats for this puzzle
    const puzzleData = {
      completedAt: timestamp,
      solveTime: time
    };

    // Save the stringified object to storage
    await AsyncStorage.setItem(`${PREFIX}${puzzleId}`, JSON.stringify(puzzleData));
  } catch (e) {
    console.error("Failed to save puzzle:", e);
  }
};

export const getCurrentStreak = async (): Promise<number> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const sudokuKeys = allKeys.filter(key => key.startsWith('@sudoku_'));
    if (sudokuKeys.length === 0) return 0;

    const results = await AsyncStorage.multiGet(sudokuKeys);
    
    // Get all the dates and sort them newest to oldest
    const parsedDates = results.map(([key, value]) => {
      const data = value ? JSON.parse(value) : { completedAt: new Date().toISOString() };
      return new Date(data.completedAt);
    });
    parsedDates.sort((a, b) => b.getTime() - a.getTime());

    // Extract unique calendar days
    const uniqueDates = [...new Set(parsedDates.map(d => d.toDateString()))];

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < uniqueDates.length; i++) {
      const checkDate = new Date(uniqueDates[i]);
      checkDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === streak) {
        streak++;
      } else if (diffDays === streak + 1 && i === 0) {
        streak++;
        today.setDate(today.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  } catch (e) {
    console.error("Failed to calculate streak", e);
    return 0;
  }
};