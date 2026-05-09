import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Sudoku Tracker" }} />
      <Stack.Screen name="play" options={{ title: "Back" }} />
      <Stack.Screen name="streaks" options={{ title: "My Streaks" }} />
    </Stack>
  );
}