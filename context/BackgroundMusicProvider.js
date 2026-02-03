import React, { createContext, useEffect, useState, useRef } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

export const BackgroundMusicContext = createContext();

// 1. Map Screens to Music Files
const SCREEN_MUSIC_MAP = {
  Dashboard: 'Quiet Rooftop Sunrise.mp3',
  Question: [
    'Clockwork Curiosity.mp3',
    'Sunrise Gbedu Cruise.mp3'
  ],
  Explanation: 'Rain On The Thinking Glass.mp3',
  Example: 'Rain On The Thinking Glass.mp3',
  Novel: 'Rain On The Thinking Glass.mp3',
  Passage: 'Rain On The Thinking Glass.mp3',
  Home: 'Afro Circuit Lounge.mp3',
  Login: 'Afro Circuit Lounge.mp3',
  Register: 'Afro Circuit Lounge.mp3',
  Subject: 'Afro Circuit Lounge.mp3',
  Topic: 'Afro Circuit Lounge.mp3',
  Subtopic: 'Afro Circuit Lounge.mp3',
};

export const BackgroundMusicProvider = ({ children }) => {
  // --- REFS ---
  const soundObjectRef = useRef(null);   // Background Music
  const memeSoundRef = useRef(null);     // Meme SFX
  const isSwitchingRef = useRef(false);  
  const pendingSongRef = useRef(null); 
  
  const [currentSong, setCurrentSong] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  
  // Maps
  const [songToPackMap, setSongToPackMap] = useState({});
  const [memeCategories, setMemeCategories] = useState({ correct: [], wrong: [] }); // Stores list of meme files
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const currentScreenRef = useRef(null);

  // 1. Fetch JSON and Build Maps
  useEffect(() => {
    const fetchMap = async () => {
      try {
        const response = await fetch(`https://fsdgroup.com.ng/Edu/music/music.json?t=${new Date().getTime()}`);
        const json = await response.json();
        
        const newSongMap = {};
        const newMemeCats = { correct: [], wrong: [] };

        if (json.packs) {
          json.packs.forEach(pack => {
            if (pack.files) {
              pack.files.forEach(file => {
                // A. Handle Background Music Map
                const key = file.name.endsWith('.mp3') ? file.name : `${file.name}.mp3`;
                newSongMap[key] = pack.id;

                // B. Handle Meme Categories 
                if (pack.id === 'meme') {
                  if (file.category === 'correct_answer') {
                    newMemeCats.correct.push(file);
                  } else if (file.category === 'wrong_answer') {
                    newMemeCats.wrong.push(file);
                  }
                }
              });
            }
          });
        }
        
        setSongToPackMap(newSongMap);
        setMemeCategories(newMemeCats); // Save categorized memes
        setMapLoaded(true);
      } catch (error) {
        console.error("❌ Error fetching music map:", error);
      }
    };
    fetchMap();
  }, []);

  // 2. Watch for Map Load
  useEffect(() => {
    if (mapLoaded && currentScreenRef.current) {
      handleScreenChange(currentScreenRef.current);
    }
  }, [mapLoaded]);

  // --- BACKGROUND MUSIC LOGIC ---
  const handleScreenChange = async (currentRouteName) => {
    currentScreenRef.current = currentRouteName;
    let musicConfig = SCREEN_MUSIC_MAP[currentRouteName];
    if (!musicConfig) return;

    let selectedSong;
    if (Array.isArray(musicConfig)) {
      if (musicConfig.includes(currentSong)) return; 
      selectedSong = musicConfig[Math.floor(Math.random() * musicConfig.length)];
    } else {
      selectedSong = musicConfig;
    }

    if (currentSong === selectedSong) return;
    await safePlayMusic(selectedSong);
  };

  const safePlayMusic = async (fileName) => {
    if (isSwitchingRef.current) {
      pendingSongRef.current = fileName;
      return;
    }

    isSwitchingRef.current = true;
    pendingSongRef.current = null;

    try {
      if (!mapLoaded) {
        isSwitchingRef.current = false;
        return;
      }

      const packId = songToPackMap[fileName];
      if (!packId) {
        if (soundObjectRef.current) {
          await soundObjectRef.current.unloadAsync();
          soundObjectRef.current = null;
        }
        setCurrentSong(null);
        isSwitchingRef.current = false;
        return;
      }

      const nameWithoutExt = fileName.replace('.mp3', ''); 
      const safeName = nameWithoutExt.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".mp3";
      const localUri = `${FileSystem.documentDirectory}music_packs/${packId}/${safeName}`;

      const fileInfo = await FileSystem.getInfoAsync(localUri);

      if (fileInfo.exists) {
        if (soundObjectRef.current) {
          try { await soundObjectRef.current.unloadAsync(); } catch (e) {}
          soundObjectRef.current = null;
        }

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: localUri },
          { shouldPlay: !isMuted, isLooping: true, volume: 0.3 }
        );

        soundObjectRef.current = newSound;
        setCurrentSong(fileName);
      } 
    } catch (error) {
      console.error("❌ Audio Error:", error);
    } finally {
      isSwitchingRef.current = false;
      if (pendingSongRef.current && pendingSongRef.current !== fileName) {
        safePlayMusic(pendingSongRef.current);
      }
    }
  };

  // --- MEME SOUND LOGIC (NEW) ---
  const playMemeSound = async (type) => {
    // type should be 'correct' or 'wrong'
    if (isMuted) return;

    const availableMemes = type === 'correct' ? memeCategories.correct : memeCategories.wrong;
    
    if (!availableMemes || availableMemes.length === 0) {
      console.log(`No memes found for category: ${type}`);
      return;
    }

    // 1. Pick Random Meme
    const randomMeme = availableMemes[Math.floor(Math.random() * availableMemes.length)];
    
    // 2. Construct Path
    // Note: The meme name from JSON might not have .mp3 in the 'name' field, but logic handles it
    const nameWithoutExt = randomMeme.name.replace('.mp3', ''); 
    const safeName = nameWithoutExt.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".mp3";
    const localUri = `${FileSystem.documentDirectory}music_packs/meme/${safeName}`;

    const fileInfo = await FileSystem.getInfoAsync(localUri);

    if (fileInfo.exists) {
      try {
        // 3. Pause Background Music
        if (soundObjectRef.current) {
          await soundObjectRef.current.pauseAsync();
        }

        // 4. Play Meme
        // Unload previous meme if any
        if (memeSoundRef.current) {
          await memeSoundRef.current.unloadAsync();
        }

        const { sound: memeSound } = await Audio.Sound.createAsync(
          { uri: localUri },
          { shouldPlay: true, volume: 0.2 } // Memes usually louder
        );
        
        memeSoundRef.current = memeSound;

        // 5. Resume Background when Meme finishes
        memeSound.setOnPlaybackStatusUpdate(async (status) => {
          if (status.didJustFinish) {
            // Meme done, resume background
            if (soundObjectRef.current && !isMuted) {
              await soundObjectRef.current.playAsync();
            }
            // Cleanup meme
            await memeSound.unloadAsync();
          }
        });

      } catch (error) {
        console.error("Meme Playback Error:", error);
        // If fail, ensure background resumes
        if (soundObjectRef.current) await soundObjectRef.current.playAsync();
      }
    } else {
      console.log("Meme pack not downloaded yet.");
    }
  };

  const toggleMute = async () => {
    if (soundObjectRef.current) {
      try {
        if (isMuted) {
          await soundObjectRef.current.playAsync();
        } else {
          await soundObjectRef.current.pauseAsync();
        }
      } catch (e) {}
    }
    setIsMuted(!isMuted);
  };

  useEffect(() => {
    return () => {
      if (soundObjectRef.current) soundObjectRef.current.unloadAsync();
      if (memeSoundRef.current) memeSoundRef.current.unloadAsync();
    };
  }, []);

  return (
    <BackgroundMusicContext.Provider value={{ handleScreenChange, toggleMute, isMuted, playMemeSound }}>
      {children}
    </BackgroundMusicContext.Provider>
  );
};