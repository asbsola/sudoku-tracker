// utils/scraper.ts

// Regex for the actual playable iframes
const SUDOKU_URL_REGEX = /https:\/\/(?:sudokupad\.app|app\.crackingthecryptic\.com)[^"'\s<>]+/g;
// Regex for the archive list links
const CTC_ARCHIVE_REGEX = /\/sudoku\?id=(\d+)/g;
// Regex to grab the YouTube Video ID from the embed link
const YOUTUBE_REGEX = /https:\/\/www\.youtube\.com\/embed\/([a-zA-Z0-9_-]+)/g;

export interface DailyPuzzle {
  url: string;
  thumbnail: string | null;
}

const extractUrls = (html: string): string[] => {
  const matches = html.match(SUDOKU_URL_REGEX);
  return matches ? [...new Set(matches)] : [];
};

// Helper to extract the core ID from a SudokuPad URL to check against our played history
const extractSudokuPadId = (url: string): string => {
  try {
    const urlObj = new URL(url);
    let puzId = urlObj.pathname.split('/').pop();
    if (!puzId || puzId === 'sudoku') {
      puzId = urlObj.searchParams.get('puzzleid') || 'Unknown_Puzzle';
    }
    return puzId;
  } catch {
    return 'Unknown_Puzzle';
  }
};

export const getDailySudokus = async (): Promise<DailyPuzzle[]> => {
  try {
    const response = await fetch('https://crackingthecryptic.com/latest');
    const html = await response.text();
    
    // 1. Get the puzzle URLs
    const sudokuUrls = extractUrls(html);
    
    // 2. Get the YouTube Video IDs
    const ytMatches = [...html.matchAll(YOUTUBE_REGEX)];
    const ytIds = [...new Set(ytMatches.map(m => m[1]))]; // Ensure unique IDs

    // 3. Pair them up! (Assuming index 0 is Simon, index 1 is Mark)
    return sudokuUrls.slice(0, 2).map((url, index) => {
      const videoId = ytIds[index];
      return {
        url,
        // Construct the direct image link using YouTube's standard thumbnail server
        thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null
      };
    });
  } catch (error) {
    console.error("Failed to fetch daily sudokus:", error);
    return [];
  }
};

export const getRandomUnplayedSudoku = async (playedIds: string[]): Promise<string | null> => {
  try {
    // 1. Get all the CTC archive links
    const response = await fetch('https://crackingthecryptic.com/sudokus');
    const html = await response.text();
    
    // Extract all the internal IDs (e.g., "3211", "3207")
    const matches = [...html.matchAll(CTC_ARCHIVE_REGEX)];
    const ctcIds = [...new Set(matches.map(m => m[1]))];

    if (ctcIds.length === 0) return null;

    // 2. Probe random puzzles until we find an unplayed one 
    // We cap this at 10 attempts so it doesn't infinite loop if you've somehow played all 3000+ puzzles
    let attempts = 0;
    while (attempts < 10 && ctcIds.length > 0) {
      attempts++;
      
      // Pick a random index and remove it from our temporary pool so we don't pick it twice
      const randomIndex = Math.floor(Math.random() * ctcIds.length);
      const testId = ctcIds.splice(randomIndex, 1)[0]; 

      // 3. Fetch that specific puzzle's dedicated page
      const puzzleResponse = await fetch(`https://crackingthecryptic.com/sudoku?id=${testId}`);
      const puzzleHtml = await puzzleResponse.text();
      
      // 4. Extract the SudokuPad iframe link from it
      const iframeUrls = extractUrls(puzzleHtml);
      
      if (iframeUrls.length > 0) {
        const targetUrl = iframeUrls[0];
        const padId = extractSudokuPadId(targetUrl);
        
        // 5. Check if it matches any of the SudokuPad IDs we have saved in AsyncStorage
        if (!playedIds.includes(padId)) {
          return targetUrl; // We found an unplayed one! Return it immediately.
        }
      }
    }
    
    return null; // Exhausted attempts or no unplayed found in this batch
  } catch (error) {
    console.error("Failed to fetch random sudoku:", error);
    return null;
  }
};
