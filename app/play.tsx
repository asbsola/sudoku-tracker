import React, { useRef } from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet, View } from 'react-native';
import { saveCompletedPuzzle } from '../utils/storage'; // Import your save function
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function PlayScreen() {
  const webviewRef = useRef(null);
  const router = useRouter();
  const { url } = useLocalSearchParams<{ url: string }>();

  // The script injected into the SudokuPad website
  const injectedScript = `
    (function startVictoryObserver() {
      const observer = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach(node => {
              
              // 1. Check if the new node is a DOM element and has the dialog class
              if (node.nodeType === 1 && node.classList.contains('dialog-overlay')) {
                
                // 2. Double-check that it's actually the victory modal (not a settings menu)
                if (node.innerText.includes('solved the puzzle') || node.innerText.includes('Congrats')) {
                  
                  // 3. Scrape the completion time!
                  let completionTime = "Unknown";
                  const timeElement = node.querySelector('#clipboardcopy span');
                  if (timeElement) {
                    completionTime = timeElement.innerText.trim();
                  }

                  // 4. Extract a clean Puzzle ID from the URL
                  // Handles both /sudoku/12345 and ?puzzleid=12345
                  let puzId = window.location.pathname.split('/').pop();
                  if (!puzId || puzId === 'sudoku') {
                     const params = new URLSearchParams(window.location.search);
                     puzId = params.get('puzzleid') || 'Unknown_Puzzle';
                  }

                  // 5. Fire the payload back to React Native
                  window.ReactNativeWebView.postMessage(JSON.stringify({ 
                    event: 'PUZZLE_SOLVED',
                    puzzleId: puzId,
                    time: completionTime
                  }));

                  // Optional: Stop observing so it doesn't double-fire
                  observer.disconnect(); 
                }
              }
            });
          }
        }
      });

      // Watch the whole body for UI changes
      observer.observe(document.body, { childList: true, subtree: true });
    })();
    true; // Required so the WebView doesn't crash on evaluation
  `;
return (
    <View style={styles.container}>
      <WebView 
        ref={webviewRef}
        // Fallback to a safe URL just in case routing fails
        source={{ uri: url || 'https://sudokupad.app/' }} 
        style={{ flex: 1 }} 
        injectedJavaScript={injectedScript}
        onMessage={async (event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.event === 'PUZZLE_SOLVED') {
              console.log(`Victory! You solved ${data.puzzleId} in ${data.time}`);
              await saveCompletedPuzzle(data.puzzleId, data.time);
            }
            
            // router.replace('/streaks'); 

          } catch (e) {
            console.error("Failed to parse message from WebView", e);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', 
  }
});