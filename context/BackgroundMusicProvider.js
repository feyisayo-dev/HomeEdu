import React, { createContext, useEffect, useState, useRef } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
export const BackgroundMusicContext = createContext();

const SCREEN_MUSIC_MAP = {
  Dashboard: 'Quiet Rooftop Sunrise.mp3',
  Question: ['Clockwork Curiosity.mp3', 'Sunrise Gbedu Cruise.mp3'],
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
  const soundObjectRef = useRef(null);
  const memeSoundRef = useRef(null);
  const isSwitchingRef = useRef(false);
  const currentSongRef = useRef(null);
  const isAudioSetupRef = useRef(false);
  const loadingTimeoutRef = useRef(null);
  const isMutedRef = useRef(true); // ✅ NEW: Track mute state in ref
  const isMemePausedRef = useRef(false); // ✅ NEW: Track if paused by meme

  const [currentSong, setCurrentSong] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [songToPackMap, setSongToPackMap] = useState({});
  const [memeCategories, setMemeCategories] = useState({ correct: [], wrong: [] });
  const [mapLoaded, setMapLoaded] = useState(false);

  const currentScreenRef = useRef(null);
  const appState = useRef(AppState.currentState);

  // ✅ Keep ref in sync with state
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Setup Audio Session Once
useEffect(() => {
    const setupAudioAndPreferences = async () => {
      try {
        // 1. Fetch the user's saved mute preference first
        const savedMuteState = await AsyncStorage.getItem('user_is_muted');
        if (savedMuteState !== null) {
          const parsedMute = JSON.parse(savedMuteState);
          setIsMuted(parsedMute);
          isMutedRef.current = parsedMute;
        } else {
          // If no preference is saved, default to unmuted
          setIsMuted(false);
          isMutedRef.current = false;
        }

        // 2. Setup Audio Mode
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          interruptionModeIOS: 1,
          interruptionModeAndroid: 1,
        });
        
        // 3. Mark audio as setup ONLY after preferences are loaded
        isAudioSetupRef.current = true;
      } catch (error) {
        console.error("❌ Setup failed:", error);
        isAudioSetupRef.current = true; // allow app to continue even if storage fails
      }
    };
    setupAudioAndPreferences();
  }, []);

  // Handle app going to background/foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - resume if not muted
        if (soundObjectRef.current && !isMutedRef.current && !isMemePausedRef.current) {
          try {
            const status = await soundObjectRef.current.getStatusAsync();
            if (status.isLoaded && !status.isPlaying) {
              await soundObjectRef.current.playAsync();
            }
          } catch (e) {
            console.log("Resume error:", e.message);
          }
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App going to background - pause
        if (soundObjectRef.current) {
          try {
            await soundObjectRef.current.pauseAsync();
          } catch (e) { }
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Fetch JSON and Build Maps
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
                const key = file.name.endsWith('.mp3') ? file.name : `${file.name}.mp3`;
                newSongMap[key] = pack.id;

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
        setMemeCategories(newMemeCats);
        setMapLoaded(true);
      } catch (error) {
        console.error("❌ Error fetching music map:", error);
      }
    };
    fetchMap();
  }, []);

  useEffect(() => {
    if (mapLoaded && currentScreenRef.current) {
      handleScreenChange(currentScreenRef.current);
    }
  }, [mapLoaded]);

  const handleScreenChange = async (currentRouteName) => {
    currentScreenRef.current = currentRouteName;
    let musicConfig = SCREEN_MUSIC_MAP[currentRouteName];
    if (!musicConfig) return;

    let selectedSong;
    if (Array.isArray(musicConfig)) {
      if (musicConfig.includes(currentSongRef.current)) return;
      selectedSong = musicConfig[Math.floor(Math.random() * musicConfig.length)];
    } else {
      selectedSong = musicConfig;
    }

    if (currentSongRef.current === selectedSong) return;
    await safePlayMusic(selectedSong);
  };

  const safePlayMusic = async (fileName) => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    if (!isAudioSetupRef.current) {
      console.log("⏳ Waiting for audio setup...");
      return;
    }

    if (isSwitchingRef.current) {
      console.log("⏸️ Already switching, ignoring:", fileName);
      return;
    }

    if (!mapLoaded) {
      console.log("⏳ Map not loaded yet");
      return;
    }

    if (currentSongRef.current === fileName && soundObjectRef.current) {
      try {
        const status = await soundObjectRef.current.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          console.log("✅ Already playing:", fileName);
          return;
        }
      } catch (e) {
        // Sound object might be corrupt, proceed with reload
      }
    }

    isSwitchingRef.current = true;

    loadingTimeoutRef.current = setTimeout(() => {
      console.log("⚠️ Loading timeout, unlocking...");
      isSwitchingRef.current = false;
      loadingTimeoutRef.current = null;
    }, 5000);

    try {
      const packId = songToPackMap[fileName];

      if (!packId) {
        console.log("🛑 No pack for:", fileName);
        await cleanupCurrentSound();
        currentSongRef.current = null;
        setCurrentSong(null);
        return;
      }

      const nameWithoutExt = fileName.replace('.mp3', '');
      const safeName = nameWithoutExt.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".mp3";
      const localUri = `${FileSystem.documentDirectory}music_packs/${packId}/${safeName}`;

      const fileInfo = await FileSystem.getInfoAsync(localUri);

      if (!fileInfo.exists) {
        console.log("❌ File not found:", localUri);
        await cleanupCurrentSound();
        currentSongRef.current = null;
        setCurrentSong(null);
        return;
      }

      await cleanupCurrentSound();
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log("🎵 Loading:", fileName);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: localUri },
        {
          shouldPlay: !isMutedRef.current, // ✅ Use ref instead of state
          isLooping: true,
          volume: 0.3,
          progressUpdateIntervalMillis: 1000,
        },
        onPlaybackStatusUpdate
      );

      soundObjectRef.current = newSound;
      currentSongRef.current = fileName;
      setCurrentSong(fileName);
      console.log("✅ Now playing:", fileName);

    } catch (error) {
      console.error("❌ Audio Error:", error);
      await cleanupCurrentSound();
      currentSongRef.current = null;
      setCurrentSong(null);
    } finally {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      isSwitchingRef.current = false;
    }
  };

  // ✅ FIXED: Monitor playback status with proper checks
  const onPlaybackStatusUpdate = (status) => {
    if (status.error) {
      console.error("Playback error:", status.error);
      cleanupCurrentSound();
      currentSongRef.current = null;
      setCurrentSong(null);
      return;
    }

    // ✅ CRITICAL FIX: Only restart if NOT muted and NOT paused by meme
    if (status.isLoaded &&
      !status.isPlaying &&
      !status.isBuffering &&
      !isMutedRef.current && // ✅ Check mute state
      !isMemePausedRef.current && // ✅ Check if paused by meme
      status.positionMillis > 0 // ✅ Only if it was actually playing (not just paused)
    ) {
      console.log("⚠️ Song stopped unexpectedly, attempting restart...");
      setTimeout(async () => {
        if (soundObjectRef.current && currentSongRef.current && !isMutedRef.current) {
          try {
            await soundObjectRef.current.playAsync();
          } catch (e) {
            console.log("Restart failed:", e.message);
          }
        }
      }, 500);
    }
  };

  const cleanupCurrentSound = async () => {
    if (soundObjectRef.current) {
      try {
        soundObjectRef.current.setOnPlaybackStatusUpdate(null);
        await soundObjectRef.current.stopAsync();
        await soundObjectRef.current.unloadAsync();
      } catch (e) {
        console.log("Cleanup error (safe to ignore):", e.message);
      }
      soundObjectRef.current = null;
    }
  };

  const playMemeSound = async (type) => {
    if (isMutedRef.current) return; // ✅ Use ref

    const availableMemes = type === 'correct' ? memeCategories.correct : memeCategories.wrong;

    if (!availableMemes || availableMemes.length === 0) {
      console.log(`No memes found for category: ${type}`);
      return;
    }

    const randomMeme = availableMemes[Math.floor(Math.random() * availableMemes.length)];
    const nameWithoutExt = randomMeme.name.replace('.mp3', '');
    const safeName = nameWithoutExt.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".mp3";
    const localUri = `${FileSystem.documentDirectory}music_packs/meme/${safeName}`;

    try {
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) {
        console.log("Meme file not found:", safeName);
        return;
      }

      // ✅ Mark as paused by meme
      isMemePausedRef.current = true;

      // Pause background
      if (soundObjectRef.current) {
        await soundObjectRef.current.pauseAsync();
      }

      // Cleanup previous meme
      if (memeSoundRef.current) {
        try {
          await memeSoundRef.current.unloadAsync();
        } catch (e) { }
        memeSoundRef.current = null;
      }

      // Play meme
      const { sound: memeSound } = await Audio.Sound.createAsync(
        { uri: localUri },
        { shouldPlay: true, volume: 0.5 }
      );

      memeSoundRef.current = memeSound;

      // Resume background when done
      memeSound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.didJustFinish) {
          try {
            // ✅ Unmark meme pause
            isMemePausedRef.current = false;

            if (soundObjectRef.current && !isMutedRef.current) {
              await soundObjectRef.current.playAsync();
            }
            await memeSound.unloadAsync();
            memeSoundRef.current = null;
          } catch (e) {
            console.log("Meme cleanup error:", e.message);
            isMemePausedRef.current = false; // ✅ Ensure we unmark even on error
          }
        }
      });

    } catch (error) {
      console.error("Meme Playback Error:", error);
      isMemePausedRef.current = false; // ✅ Unmark on error
      if (soundObjectRef.current && !isMutedRef.current) {
        try {
          await soundObjectRef.current.playAsync();
        } catch (e) { }
      }
    }
  };

  const toggleMute = async () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    isMutedRef.current = newMutedState; 

    // Save to device storage
    try {
      await AsyncStorage.setItem('user_is_muted', JSON.stringify(newMutedState));
    } catch (e) {
      console.error("Failed to save mute state:", e);
    }

    if (soundObjectRef.current) {
      try {
        if (newMutedState) {
          await soundObjectRef.current.pauseAsync();
          console.log("🔇 Muted");
        } else {
          await soundObjectRef.current.playAsync();
          console.log("🔊 Unmuted");
        }
      } catch (e) {
        console.log("Toggle mute error:", e.message);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      cleanupCurrentSound();
      if (memeSoundRef.current) {
        try {
          memeSoundRef.current.unloadAsync();
        } catch (e) { }
      }
    };
  }, []);

  return (
    <BackgroundMusicContext.Provider value={{ handleScreenChange, toggleMute, isMuted, playMemeSound }}>
      {children}
    </BackgroundMusicContext.Provider>
  );
};