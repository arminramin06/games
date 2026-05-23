import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, HelpCircle, User, Zap, AlertTriangle, ArrowRight, Play, RotateCcw, Volume2, Mic, MicOff, Sliders, Skull, Globe } from 'lucide-react';
import PlayerSetup from './components/PlayerSetup';
import WorldMap from './components/WorldMap';
import Leaderboard from './components/Leaderboard';
import {
  findCountry, getCountryFlagUrl, countriesDatabase,
  getCountryContinent, getContinentStats, getAvailableContinents,
  Continent, ALL_CONTINENTS, CONTINENT_EMOJIS, CONTINENT_COLORS
} from './utils/countries';
import { playSuccess, playFailure, playWinner } from './utils/audio';
import { isSpeechRecognitionSupported, createSpeechRecognitionInstance, announceTurn } from './utils/speech';

type GamePhase = 'setup' | 'active' | 'gameover';
type GameOverReason = 'timer' | 'double_fail' | 'all_named';

// 6 distinct neon colors cycling by player index
const PLAYER_COLORS = [
  { bg: 'rgba(99, 102, 241, 0.15)',  border: 'rgba(99, 102, 241, 0.3)',  text: '#818cf8', score: 'var(--neon-indigo)', mapFill: '#818cf8' },
  { bg: 'rgba(6, 182, 212, 0.15)',   border: 'rgba(6, 182, 212, 0.3)',   text: '#22d3ee', score: 'var(--neon-cyan)',   mapFill: '#22d3ee' },
  { bg: 'rgba(251, 191, 36, 0.15)',  border: 'rgba(251, 191, 36, 0.3)',  text: '#fbbf24', score: '#fbbf24',            mapFill: '#fbbf24' },
  { bg: 'rgba(52, 211, 153, 0.15)',  border: 'rgba(52, 211, 153, 0.3)',  text: '#34d399', score: '#34d399',            mapFill: '#34d399' },
  { bg: 'rgba(244, 114, 182, 0.15)', border: 'rgba(244, 114, 182, 0.3)', text: '#f472b6', score: '#f472b6',            mapFill: '#f472b6' },
  { bg: 'rgba(251, 146, 60, 0.15)',  border: 'rgba(251, 146, 60, 0.3)',  text: '#fb923c', score: '#fb923c',            mapFill: '#fb923c' },
];

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('setup');

  // Dynamic player state (supports 2–6 players)
  const [players, setPlayers] = useState<string[]>([]);
  const [scores, setScores] = useState<number[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Game Logic
  // guessedCountries: Map<isoA3, playerIndex> — tracks who discovered each country
  const [guessedCountries, setGuessedCountries] = useState<Map<string, number>>(new Map());
  const [guessedNames, setGuessedNames] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameMessage, setGameMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | null }>({ text: '', type: null });

  // Animations
  const [showCross, setShowCross] = useState(false);
  const [shakeMap, setShakeMap] = useState(false);

  // Time Limits (90 seconds game timer)
  const [timeLeft, setTimeLeft] = useState(90);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // DB Sync Trigger
  const [dbRefresh, setDbRefresh] = useState(0);

  // Game Over Reason — drives banner on game-over screen
  const [gameOverReason, setGameOverReason] = useState<GameOverReason>('timer');
  const [eliminatedPlayer, setEliminatedPlayer] = useState<string>('');

  // Continent challenge — the continent each active player must name a country from
  const [currentContinent, setCurrentContinent] = useState<Continent>('Europe');
  const currentContinentRef = useRef<Continent>('Europe');
  useEffect(() => { currentContinentRef.current = currentContinent; }, [currentContinent]);

  // Sound warm up notice
  const [audioWarmed, setAudioWarmed] = useState(false);

  // Voice Controls State
  const [isListening, setIsListening] = useState(false);
  const [announcerEnabled, setAnnouncerEnabled] = useState(true);
  const [speechPitch, setSpeechPitch] = useState(1.1);
  const [speechRate, setSpeechRate] = useState(1.0);

  // Push-to-talk state
  const [pttActive, setPttActive] = useState(false);
  const pttRecognitionRef = useRef<any>(null); // separate instance for PTT

  const recognitionRef = useRef<any>(null);
  // Always-current ref for activeIndex — prevents stale closure bugs in speech callbacks
  const activeIndexRef = useRef(activeIndex);
  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);

  // Mirrors phase state in a ref so setTimeout callbacks can check it without stale closure issues
  const gamePhaseRef = useRef<GamePhase>('setup');
  useEffect(() => { gamePhaseRef.current = phase; }, [phase]);

  // Per-player consecutive wrong-guess streak
  // ref = never stale inside processGuess; state = triggers re-render for the warning badge UI
  const consecutiveFailsRef = useRef<number[]>([]);
  const [missStreaks, setMissStreaks] = useState<number[]>([]);

  // Always-current ref for processGuess — the speech onresult calls this so it never uses a stale version
  const processGuessRef = useRef<(query: string) => void>(() => {});

  // Flag Overlay State
  const [activeFlag, setActiveFlag] = useState<{ name: string; url: string; fadeOut: boolean } | null>(null);

  const fadeActiveFlag = () => {
    setActiveFlag(prev => prev ? { ...prev, fadeOut: true } : null);
    setTimeout(() => setActiveFlag(null), 500);
  };

  // Derived helpers
  const activeName = players[activeIndex] ?? '';

  /**
   * Picks a random continent that still has unguessed countries.
   * Avoids repeating the same continent back-to-back if alternatives exist.
   */
  const pickNextContinent = (guessedCodes: Set<string>, excludeContinent: Continent | null): Continent => {
    const available = getAvailableContinents(guessedCodes);
    if (available.length === 0) {
      // All countries named — game should end, but fallback to any continent
      return ALL_CONTINENTS[Math.floor(Math.random() * ALL_CONTINENTS.length)];
    }
    const preferred = available.filter(c => c !== excludeContinent);
    const pool = preferred.length > 0 ? preferred : available;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  // Start the match
  const handleStartGame = async (playerNames: string[]) => {
    setPlayers(playerNames);
    setScores(new Array(playerNames.length).fill(0));
    setActiveIndex(0);
    setGuessedCountries(new Map());
    setGuessedNames([]);
    setCurrentGuess('');
    setGameMessage({ text: 'Game Started! Type or say a country name.', type: 'info' });
    setTimeLeft(90);
    setGameOverReason('timer');
    setEliminatedPlayer('');
    consecutiveFailsRef.current = new Array(playerNames.length).fill(0);
    setMissStreaks(new Array(playerNames.length).fill(0));
    setPhase('active');

    // Warm up Web Audio API
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      await ctx.resume();
      setAudioWarmed(true);
    } catch {
      // Ignore
    }

    // Pick initial continent and announce
    const initialContinent = pickNextContinent(new Set(), null);
    setCurrentContinent(initialContinent);
    currentContinentRef.current = initialContinent;

    if (announcerEnabled) {
      setTimeout(() => announceTurn(playerNames[0], initialContinent, speechPitch, speechRate), 1000);
    }

    // Register all players in local SQLite database
    try {
      for (const name of playerNames) {
        await fetch('/api/players', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
      }
      setDbRefresh(prev => prev + 1);
    } catch (e) {
      console.warn('Could not register players in SQLite database:', e);
    }
  };

  // Setup native browser Speech Recognition
  useEffect(() => {
    if (isSpeechRecognitionSupported()) {
      const rec = createSpeechRecognitionInstance();
      if (rec) {
        rec.onstart = () => {
          setIsListening(true);
          setGameMessage({ text: '🎙️ Listening... Say a country name!', type: 'info' });
        };
        rec.onend = () => setIsListening(false);
        rec.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setGameMessage({ text: '⚠️ Microphone permission blocked! Allow it in browser settings.', type: 'error' });
          } else if (event.error === 'no-speech') {
            setGameMessage({ text: '🔇 Didn\'t hear anything. Click the mic to try again!', type: 'info' });
          } else {
            setGameMessage({ text: '⚠️ Could not understand. Try speaking again!', type: 'error' });
          }
        };
        rec.onresult = (event: any) => {
          // In continuous mode, results accumulate — always read the latest entry
          const lastResult = event.results[event.results.length - 1];
          if (lastResult && lastResult.isFinal) {
            const spokenText = lastResult[0].transcript.trim();
            if (spokenText) {
              setGameMessage({ text: `🎤 Heard: "${spokenText}"`, type: 'info' });
              // Call via ref so we always use the CURRENT processGuess (never stale)
              processGuessRef.current(spokenText);
            }
          }
        };
        recognitionRef.current = rec;
      }
    }
  // Only recreate on mount — activeIndex is handled via activeIndexRef
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Spacebar Push-to-Talk ────────────────────────────────────────────────
  useEffect(() => {
    if (!isSpeechRecognitionSupported()) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      if (e.repeat) return; // ignore key-hold repeats
      if (gamePhaseRef.current !== 'active') return;
      // Don't hijack spacebar when user is typing in an input/textarea
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      e.preventDefault(); // stop page scroll

      // Stop the always-on mic if it was running
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }

      // Create a fresh short-lived PTT recognition instance
      const rec = createSpeechRecognitionInstance();
      if (!rec) return;
      rec.continuous = false;
      rec.interimResults = true;
      rec.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript.trim();
        if (transcript) setCurrentGuess(transcript);
      };
      rec.onerror = () => { setPttActive(false); };
      rec.onend = () => {
        setPttActive(false);
        // After recognition ends, submit whatever is in the input
        // Use a tiny delay so React state (currentGuess) has settled
        setTimeout(() => {
          const inputEl = document.querySelector<HTMLInputElement>('input.glass-input');
          const val = inputEl?.value.trim();
          if (val) processGuessRef.current(val);
        }, 80);
      };
      pttRecognitionRef.current = rec;
      try {
        rec.start();
        setPttActive(true);
        setCurrentGuess(''); // clear box so transcript can fill it fresh
      } catch { /* recognition already started */ }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      if (!pttRecognitionRef.current) return;
      e.preventDefault();
      try { pttRecognitionRef.current.stop(); } catch { /* ignore */ }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  // Re-register if speech support changes; processGuessRef is a ref so it never changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Microphone toggle button click handler
  const toggleListening = () => {
    if (!isSpeechRecognitionSupported()) {
      alert('Speech recognition is not supported in this browser. Please try Chrome, Safari, or Edge!');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        if (activeFlag && !activeFlag.fadeOut) fadeActiveFlag();
        recognitionRef.current?.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  // Timer countdown hook
  useEffect(() => {
    if (phase === 'active') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleEndGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // Handle Game End & record in SQLite
  // reason: why the game ended (for display on game-over screen)
  const handleEndGame = async (reason: GameOverReason = 'timer') => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameOverReason(reason);
    setPhase('gameover');
    gamePhaseRef.current = 'gameover'; // set immediately so in-flight timeouts see it

    // Stop mic and kill any announcer speech immediately
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // Use latest scores from state via functional update pattern
    setScores(currentScores => {
      const playerResults = players.map((name, i) => ({ name, score: currentScores[i] }));
      const sorted = [...playerResults].sort((a, b) => b.score - a.score);
      const topScore = sorted[0]?.score ?? 0;
      const winners = sorted.filter(p => p.score === topScore);

      // Play Victory Fanfare
      playWinner();

      if (winners.length === 1) {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      }

      // Save match in SQLite
      fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerResults,
          winnerName: winners.length === 1 ? winners[0].name : null
        })
      }).then(() => setDbRefresh(prev => prev + 1))
        .catch(e => console.warn('Failed to save match to SQLite:', e));

      return currentScores;
    });
  };

  // Process a Guess (keyboard submit or speech recognition)
  // NOTE: Keep this before the processGuessRef assignment below
  const processGuess = (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    // ── Skip phrases: treat "I don't know", "pass", etc. as a miss ───────
    const normalizedQuery = trimmedQuery.toLowerCase().replace(/['']/g, "'").replace(/[^a-z\s']/g, '').trim();
    const SKIP_PHRASES = [
      "i don't know", "i dont know", "don't know", "dont know",
      "no idea", "i have no idea", "i don't have an idea",
      "skip", "pass", "next", "i give up", "give up",
      "no clue", "i have no clue", "not sure", "i'm not sure", "im not sure",
      "i don't know this", "i dont know this",
    ];
    if (SKIP_PHRASES.includes(normalizedQuery)) {
      // Treat as a wrong answer — reuse the miss/elimination logic below
      const currentIdx = activeIndexRef.current;
      const nextIdx = (currentIdx + 1) % players.length;
      const currentPlayerName = players[currentIdx] ?? '';
      playFailure();
      setShowCross(true);
      setShakeMap(true);
      consecutiveFailsRef.current[currentIdx] = (consecutiveFailsRef.current[currentIdx] ?? 0) + 1;
      const failStreak = consecutiveFailsRef.current[currentIdx];
      setMissStreaks(prev => { const next = [...prev]; next[currentIdx] = failStreak; return next; });
      if (failStreak >= 2) {
        setGameMessage({ text: `💀 ${currentPlayerName} gave up twice in a row! Game over!`, type: 'error' });
        setEliminatedPlayer(currentPlayerName);
        setTimeout(() => { setShowCross(false); setShakeMap(false); }, 1000);
        setTimeout(() => handleEndGame('double_fail'), 1800);
      } else {
        setGameMessage({ text: `🏳️ ${currentPlayerName} skipped! (${failStreak}/2 misses)`, type: 'error' });
        setTimeout(() => { setShowCross(false); setShakeMap(false); }, 1000);
        const nextContinent = pickNextContinent(new Set(guessedCountries.keys()), currentContinentRef.current);
        setCurrentContinent(nextContinent);
        currentContinentRef.current = nextContinent;
        setActiveIndex(nextIdx);
        if (announcerEnabled) {
          setTimeout(() => {
            if (gamePhaseRef.current === 'active') announceTurn(players[nextIdx], nextContinent, speechPitch, speechRate);
          }, 1100);
        }
      }
      setCurrentGuess('');
      return;
    }

    // Read current index from ref — guaranteed fresh even in stale speech recognition callbacks
    const currentIdx = activeIndexRef.current;
    const matched = findCountry(trimmedQuery);
    const nextIdx = (currentIdx + 1) % players.length;
    const currentPlayerName = players[currentIdx] ?? '';

    /**
     * Advance the turn: pick new continent, set active player, announce.
     * Pass the current guessedCodes set so pickNextContinent can avoid empty continents.
     */
    const handleTurnChange = (toIdx: number, guessedCodes: Set<string>) => {
      const nextContinent = pickNextContinent(guessedCodes, currentContinentRef.current);
      setCurrentContinent(nextContinent);
      currentContinentRef.current = nextContinent;
      setActiveIndex(toIdx);
      if (announcerEnabled) {
        setTimeout(() => {
          if (gamePhaseRef.current === 'active') {
            announceTurn(players[toIdx], nextContinent, speechPitch, speechRate);
          }
        }, 1100);
      }
    };

    /** Shared miss handler — increments streak, checks double-fail. Returns true if game ended. */
    const handleMiss = (msg: string): boolean => {
      playFailure();
      setShowCross(true);
      setShakeMap(true);
      consecutiveFailsRef.current[currentIdx] = (consecutiveFailsRef.current[currentIdx] ?? 0) + 1;
      const failStreak = consecutiveFailsRef.current[currentIdx];
      setMissStreaks(prev => { const next = [...prev]; next[currentIdx] = failStreak; return next; });

      if (failStreak >= 2) {
        setGameMessage({ text: `💀 ${currentPlayerName} missed twice in a row! Game over!`, type: 'error' });
        setEliminatedPlayer(currentPlayerName);
        setTimeout(() => { setShowCross(false); setShakeMap(false); }, 1000);
        setTimeout(() => handleEndGame('double_fail'), 1800);
        return true;
      }
      setGameMessage({ text: `${msg} (${failStreak}/2 misses)`, type: 'error' });
      setTimeout(() => { setShowCross(false); setShakeMap(false); }, 1000);
      handleTurnChange(nextIdx, new Set(guessedCountries.keys()));
      return false;
    };

    if (!matched) {
      // ── Wrong guess: country not recognised ──────────────────────────
      handleMiss(`${currentPlayerName} guessed "${trimmedQuery}" — not found!`);

    } else if (guessedCountries.has(matched.isoA3)) {
      // ── Already guessed ──────────────────────────────────────────────
      handleMiss(`"${matched.name}" already guessed!`);

    } else {
      // ── Valid, unguessed country — check continent ───────────────────
      const countryContinent = getCountryContinent(matched.isoA3);
      const requiredContinent = currentContinentRef.current;

      if (countryContinent !== requiredContinent) {
        // ── Wrong continent ─────────────────────────────────────────────
        handleMiss(
          `${matched.name} is in ${countryContinent ?? 'Unknown'}, not ${requiredContinent}!`
        );
      } else {
        // ── Correct country in correct continent ────────────────────────
        playSuccess();

        // Reset this player's fail streak
        consecutiveFailsRef.current[currentIdx] = 0;
        setMissStreaks(prev => { const next = [...prev]; next[currentIdx] = 0; return next; });

        const nextGuessed = new Map(guessedCountries);
        nextGuessed.set(matched.isoA3, currentIdx);
        setGuessedCountries(nextGuessed);
        setGuessedNames(prev => [matched.name, ...prev]);

        // Confetti origin spread across players evenly
        const xOrigin = players.length === 1 ? 0.5 : currentIdx / (players.length - 1);
        confetti({
          particleCount: 30,
          angle: 60 + (xOrigin * 60),
          spread: 55,
          origin: { x: Math.max(0.1, Math.min(0.9, xOrigin)), y: 0.2 }
        });

        // Award point to the CURRENT player using ref index (never stale)
        setScores(prev => {
          const next = [...prev];
          next[currentIdx] = (next[currentIdx] ?? 0) + 1;
          return next;
        });

        const flagUrl = getCountryFlagUrl(matched.isoA3);
        if (flagUrl) setActiveFlag({ name: matched.name, url: flagUrl, fadeOut: false });

        // Check win condition 2: all countries named
        if (nextGuessed.size >= countriesDatabase.length) {
          setGameMessage({ text: `🌍 ${currentPlayerName} named the last country! All ${countriesDatabase.length} countries discovered!`, type: 'success' });
          setTimeout(() => handleEndGame('all_named'), 2000);
        } else {
          setGameMessage({ text: `🎉 ${currentPlayerName} found ${matched.name}! (+1 pt)`, type: 'success' });
          handleTurnChange(nextIdx, new Set(nextGuessed.keys()));
        }
      }
    }

    setCurrentGuess('');
  };

  // Keep processGuessRef always pointing to the latest version of processGuess
  processGuessRef.current = processGuess;

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processGuess(currentGuess);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Sorted leaderboard for game over screen
  const sortedResults = players
    .map((name, i) => ({ name, score: scores[i] ?? 0, color: PLAYER_COLORS[i % PLAYER_COLORS.length] }))
    .sort((a, b) => b.score - a.score);

  const topScore = sortedResults[0]?.score ?? 0;
  const winnerNames = sortedResults.filter(p => p.score === topScore).map(p => p.name);
  const isTie = winnerNames.length > 1;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Navigation / Header */}
      <header className="glass-container" style={{
        margin: '16px 24px 0 24px',
        padding: '16px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>🌍</span>
          <div>
            <h1 style={{
              fontSize: '22px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              GeoQuest
            </h1>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Interactive World Map Explorer
            </span>
          </div>
        </div>

        {phase === 'active' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            background: 'rgba(0,0,0,0.3)', padding: '8px 20px',
            borderRadius: '9999px', border: '1px solid var(--color-glass-border)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Time Remaining</span>
              <span style={{
                fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-display)',
                color: timeLeft <= 15 ? 'var(--neon-red)' : 'var(--neon-cyan)',
                textShadow: timeLeft <= 15 ? '0 0 10px var(--neon-red-glow)' : 'none',
                transition: 'color 0.3s ease'
              }}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="badge badge-cyan">
            <Volume2 size={12} />
            Synth Sound Effects
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {phase === 'setup' && (
        <PlayerSetup onStartGame={handleStartGame} />
      )}

      {phase === 'active' && (
        <div className="dashboard-grid">
          {/* Sidebar Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Scorecard Panel */}
            <div className="glass-container" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '16px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={16} /> Explorers
              </h3>

              {players.map((name, idx) => {
                const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
                const isActive = idx === activeIndex;
                return (
                  <div
                    key={name}
                    className={`glass-card ${isActive ? 'active-player-glow' : ''}`}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: color.bg, border: `1px solid ${color.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: color.text
                      }}>
                        <User size={16} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 600 }}>{name}</h4>
                        <span style={{ fontSize: '10px', color: isActive ? 'var(--neon-cyan)' : 'var(--text-muted)' }}>
                          {isActive ? 'Active Turn' : 'Waiting...'}
                        </span>
                        {/* Miss streak warning — uses missStreaks state (not ref) to trigger re-render */}
                        {(missStreaks[idx] ?? 0) >= 1 && (
                          <span style={{
                            display: 'block', fontSize: '9px', fontWeight: 700,
                            color: 'var(--neon-amber)', letterSpacing: '0.03em', marginTop: '1px'
                          }}>
                            ⚠️ 1 miss — one more = out!
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: '22px', fontWeight: 800, color: color.score }}>
                      {scores[idx] ?? 0}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Discovered Countries */}
            <div className="glass-container" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trophy size={14} /> Discovered ({guessedCountries.size})
              </h3>
              <div style={{
                flex: 1, overflowY: 'auto', maxHeight: '200px',
                display: 'flex', flexWrap: 'wrap', gap: '8px', alignContent: 'flex-start'
              }}>
                {guessedNames.length === 0 ? (
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px' }}>
                    Type correct countries to discover the map!
                  </span>
                ) : (
                  guessedNames.map((name, i) => (
                    <span key={i} className="badge badge-green" style={{ animation: 'pop 0.3s ease' }}>
                      📍 {name}
                    </span>
                  ))
                )}
              </div>
            </div>
            {/* Continent Progress */}
            <div className="glass-container" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Globe size={14} style={{ color: 'var(--neon-cyan)' }} /> Continent Progress
              </h3>
              {(() => {
                const stats = getContinentStats(new Set(guessedCountries.keys()));
                return ALL_CONTINENTS.map(continent => {
                  const { named, total } = stats[continent];
                  const pct = total > 0 ? (named / total) * 100 : 0;
                  const color = CONTINENT_COLORS[continent];
                  const isActive = continent === currentContinent;
                  return (
                    <div key={continent} style={{
                      padding: '7px 10px', borderRadius: '10px',
                      background: isActive ? color.bg : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isActive ? color.border : 'rgba(255,255,255,0.05)'}`,
                      transition: 'all 0.3s ease',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: isActive ? 700 : 500, color: isActive ? color.text : 'var(--text-secondary)' }}>
                          {CONTINENT_EMOJIS[continent]} {continent}
                          {isActive && <span style={{ marginLeft: '5px', fontSize: '8px', background: color.bg, border: `1px solid ${color.border}`, color: color.text, padding: '1px 4px', borderRadius: '4px', fontWeight: 800 }}>NOW</span>}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: named === total && total > 0 ? 'var(--neon-green)' : color.text }}>
                          {named}/{total}{named === total && total > 0 ? ' ✅' : ''}
                        </span>
                      </div>
                      <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px' }}>
                        <div style={{
                          width: `${pct}%`, height: '100%', borderRadius: '2px',
                          background: named === total && total > 0 ? 'var(--neon-green)' : color.text,
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Voice announcer controls */}
            <div className="glass-container" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={14} style={{ color: 'var(--neon-amber)' }} /> Announcer Voice
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>Turn Caller</span>
                <button
                  onClick={() => setAnnouncerEnabled(!announcerEnabled)}
                  style={{
                    background: announcerEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    border: announcerEnabled ? '1px solid var(--neon-green)' : '1px solid var(--color-glass-border)',
                    color: announcerEnabled ? 'var(--neon-green)' : 'var(--text-secondary)',
                    borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 600,
                    cursor: 'pointer', transition: 'var(--transition-smooth)'
                  }}
                >
                  {announcerEnabled ? '🔊 ON' : '🔇 OFF'}
                </button>
              </div>

              {announcerEnabled && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>Voice Pitch</span>
                      <span style={{ fontWeight: 600, color: 'var(--neon-amber)' }}>
                        {speechPitch < 0.9 ? '🤖 Low' : speechPitch > 1.3 ? '🐿️ High' : '👤 Normal'} ({speechPitch.toFixed(1)})
                      </span>
                    </div>
                    <input
                      type="range" min="0.5" max="2.0" step="0.1" value={speechPitch}
                      onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--neon-amber)', height: '6px', borderRadius: '3px', outline: 'none', cursor: 'pointer' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>Voice Speed</span>
                      <span style={{ fontWeight: 600, color: 'var(--neon-amber)' }}>
                        {speechRate < 0.9 ? 'Slow' : speechRate > 1.3 ? 'Fast' : 'Normal'} ({speechRate.toFixed(1)}x)
                      </span>
                    </div>
                    <input
                      type="range" min="0.5" max="2.0" step="0.1" value={speechRate}
                      onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--neon-amber)', height: '6px', borderRadius: '3px', outline: 'none', cursor: 'pointer' }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Tip */}
            <div className="glass-container" style={{ padding: '16px', background: 'rgba(0,0,0,0.1)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '6px' }}>
                <HelpCircle size={14} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--neon-cyan)' }} />
                <span>
                  <strong>Tip:</strong> Aliases work! E.g. typing "USA" or "UK" is automatically mapped to the full country.
                </span>
              </span>
            </div>
          </div>

          {/* Map and Guess Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Console Guess Input Bar */}
            <div className="glass-container" style={{ padding: '20px' }}>
              {/* Continent Challenge Banner */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                marginBottom: '16px', padding: '10px 16px', borderRadius: '12px',
                background: CONTINENT_COLORS[currentContinent].bg,
                border: `1.5px solid ${CONTINENT_COLORS[currentContinent].border}`,
              }}>
                <Globe size={18} style={{ color: CONTINENT_COLORS[currentContinent].text, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: CONTINENT_COLORS[currentContinent].text, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.8 }}>
                    Continent Challenge
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginTop: '1px' }}>
                    {CONTINENT_EMOJIS[currentContinent]}&nbsp; Name a country in&nbsp;
                    <span style={{ color: CONTINENT_COLORS[currentContinent].text }}>{currentContinent}</span>
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
                  Wrong continent = miss!
                </div>
              </div>

              <form onSubmit={handleGuessSubmit} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: PLAYER_COLORS[activeIndex % PLAYER_COLORS.length].bg,
                  padding: '6px 16px', borderRadius: '8px',
                  border: `1px solid ${PLAYER_COLORS[activeIndex % PLAYER_COLORS.length].border}`,
                  fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap'
                }}>
                  <span style={{ color: PLAYER_COLORS[activeIndex % PLAYER_COLORS.length].text }}>
                    🎤 {activeName}
                  </span>
                </div>

                <input
                  type="text"
                  className="glass-input"
                  placeholder="Type or say a country name (e.g. Canada, Brazil)..."
                  value={currentGuess}
                  onChange={(e) => {
                    setCurrentGuess(e.target.value);
                    if (activeFlag && !activeFlag.fadeOut) fadeActiveFlag();
                  }}
                  autoFocus
                  style={{ flex: 1 }}
                />

                {isSpeechRecognitionSupported() && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`mic-btn ${isListening ? 'mic-active' : ''}`}
                    title={isListening ? '🔴 Mic is ON — click to stop' : '🎙️ Click to start hands-free mode'}
                    style={{ flexShrink: 0 }}
                  >
                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                )}

                <button type="submit" className="glass-button" style={{
                  background: `linear-gradient(135deg, ${PLAYER_COLORS[activeIndex % PLAYER_COLORS.length].text} 0%, ${PLAYER_COLORS[activeIndex % PLAYER_COLORS.length].text}99 100%)`,
                  boxShadow: `0 4px 14px 0 ${PLAYER_COLORS[activeIndex % PLAYER_COLORS.length].bg}`
                }}>
                  Submit <ArrowRight size={16} />
                </button>
              </form>

              {/* PTT active indicator — replaces normal game message while space is held */}
              {pttActive ? (
                <div style={{
                  marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 14px', borderRadius: '10px',
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)',
                  animation: 'neonPulse 0.8s infinite ease-in-out',
                }}>
                  <div style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    background: 'var(--neon-red)', boxShadow: '0 0 8px var(--neon-red)',
                    animation: 'neonPulse 0.6s infinite ease-in-out',
                  }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--neon-red)', letterSpacing: '0.04em' }}>
                    SPEAKING… Release SPACE to submit
                  </span>
                </div>
              ) : (
                gameMessage.text && (
                  <div style={{
                    marginTop: '12px', fontSize: '13px', fontWeight: 500,
                    color: gameMessage.type === 'success' ? 'var(--neon-green)'
                      : gameMessage.type === 'error' ? 'var(--neon-red)'
                      : 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '4px'
                  }}>
                    {gameMessage.type === 'error' && <AlertTriangle size={14} />}
                    {gameMessage.type === 'success' && <span>🎉</span>}
                    {gameMessage.type === 'info' && <span>🎮</span>}
                    {gameMessage.text}
                  </div>
                )
              )}

              {/* PTT keyboard hint */}
              {isSpeechRecognitionSupported() && !pttActive && (
                <div style={{
                  marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '4px'
                }}>
                  <kbd style={{
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '4px', padding: '1px 6px', fontSize: '10px', fontFamily: 'monospace',
                    color: 'var(--text-secondary)'
                  }}>SPACE</kbd>
                  <span>Hold to speak • Release to submit</span>
                </div>
              )}
            </div>

            {/* Interactive World Map — wrapper is position:relative so the flag overlay is positioned here, NOT inside WorldMap which has overflow:hidden */}
            <div
              className={shakeMap ? 'shake-animation' : ''}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}
            >
              {/* Flag overlay — rendered here to avoid WorldMap overflow:hidden clipping */}
              {activeFlag && (
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  left: '50%',
                  zIndex: 30,
                  pointerEvents: 'none',
                  transition: 'opacity 0.4s ease, transform 0.4s ease',
                  opacity: activeFlag.fadeOut ? 0 : 1,
                  transform: activeFlag.fadeOut
                    ? 'translateX(-50%) translateY(-12px) scale(0.92)'
                    : 'translateX(-50%) translateY(0) scale(1)',
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '14px 22px',
                    background: 'rgba(10, 12, 28, 0.92)',
                    border: '1.5px solid rgba(6, 182, 212, 0.5)',
                    borderRadius: '16px',
                    boxShadow: '0 10px 30px rgba(6, 182, 212, 0.2), 0 4px 16px rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    animation: activeFlag.fadeOut ? 'none' : 'flagPop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                  }}>
                    <img
                      src={activeFlag.url}
                      alt={`${activeFlag.name} flag`}
                      style={{
                        width: '140px',
                        height: '85px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                      }}
                    />
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '15px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      textAlign: 'center',
                      letterSpacing: '0.02em',
                    }}>
                      {activeFlag.name}
                    </div>
                  </div>
                </div>
              )}

              <WorldMap
                guessedCountriesMap={guessedCountries}
                playerMapColors={PLAYER_COLORS.map(c => c.mapFill)}
                showFailureCross={showCross}
                onCountryClick={(name) => setCurrentGuess(name)}
              />
            </div>

            {!audioWarmed && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                Note: Click anywhere on the screen first to enable chiptune audio sounds!
              </span>
            )}
          </div>
        </div>
      )}

      {phase === 'gameover' && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '40px 20px', maxWidth: '1200px', margin: '0 auto', width: '100%'
        }}>
          <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 380px', width: '100%' }}>

            {/* Celebratory Winner Screen */}
            <div className="glass-container" style={{
              padding: '48px', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', position: 'relative', overflow: 'hidden'
            }}>
              {/* Dynamic glow based on reason */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '300px', height: '300px', borderRadius: '50%',
                background: gameOverReason === 'double_fail' ? 'rgba(239, 68, 68, 0.4)' : 'var(--neon-green-glow)',
                filter: 'blur(100px)', zIndex: 0, opacity: 0.6
              }} />

              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>

                {/* Icon — changes by reason */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '96px', height: '96px', borderRadius: '24px',
                  background: gameOverReason === 'double_fail'
                    ? 'rgba(239, 68, 68, 0.15)'
                    : gameOverReason === 'all_named'
                      ? 'rgba(6, 182, 212, 0.15)'
                      : 'rgba(16, 185, 129, 0.15)',
                  border: `1px solid ${gameOverReason === 'double_fail' ? 'rgba(239,68,68,0.3)' : gameOverReason === 'all_named' ? 'rgba(6,182,212,0.3)' : 'rgba(16,185,129,0.3)'}`,
                  marginBottom: '24px',
                  color: gameOverReason === 'double_fail' ? 'var(--neon-red)' : gameOverReason === 'all_named' ? 'var(--neon-cyan)' : 'var(--neon-green)',
                  animation: 'neonPulse 2s infinite ease-in-out'
                }}>
                  {gameOverReason === 'double_fail' ? <Skull size={48} /> : gameOverReason === 'all_named' ? <span style={{ fontSize: '48px' }}>🌍</span> : <Trophy size={48} />}
                </div>

                {/* Game-over reason banner */}
                <div style={{
                  marginBottom: '12px',
                  padding: '6px 18px',
                  borderRadius: '9999px',
                  fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                  background: gameOverReason === 'double_fail'
                    ? 'rgba(239,68,68,0.12)' : gameOverReason === 'all_named'
                    ? 'rgba(6,182,212,0.12)' : 'rgba(16,185,129,0.12)',
                  border: `1px solid ${gameOverReason === 'double_fail' ? 'rgba(239,68,68,0.3)' : gameOverReason === 'all_named' ? 'rgba(6,182,212,0.3)' : 'rgba(16,185,129,0.3)'}`,
                  color: gameOverReason === 'double_fail' ? 'var(--neon-red)' : gameOverReason === 'all_named' ? 'var(--neon-cyan)' : 'var(--neon-green)',
                }}>
                  {gameOverReason === 'double_fail'
                    ? `💀 ${eliminatedPlayer} missed twice — eliminated!`
                    : gameOverReason === 'all_named'
                    ? `🌍 All ${countriesDatabase.length} countries discovered!`
                    : '⏱️ Time\'s Up!'}
                </div>

                <h1 style={{
                  fontSize: '44px', fontWeight: 800, marginBottom: '8px',
                  background: gameOverReason === 'double_fail'
                    ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.03em'
                }}>
                  {isTie ? 'Tie Game!' : 'Victory!'}
                </h1>

                <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '28px', color: '#ffffff' }}>
                  {isTie
                    ? `🤝 ${winnerNames.join(' & ')} tied at the top!`
                    : `🏆 ${winnerNames[0]} Wins the Match!`}
                </h2>

                {/* Final Scoreboard — all players sorted */}
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '10px',
                  marginBottom: '36px', width: '100%', maxWidth: '420px'
                }}>
                  {sortedResults.map((player, idx) => {
                    const isWinner = player.score === topScore;
                    return (
                      <div key={player.name} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 20px', borderRadius: '12px',
                        background: isWinner ? 'rgba(16, 185, 129, 0.08)' : 'rgba(0,0,0,0.2)',
                        border: isWinner ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--color-glass-border)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{
                            fontSize: '14px', fontWeight: 700, width: '24px',
                            color: idx === 0 ? '#fbbf24' : idx === 1 ? '#cbd5e1' : 'var(--text-muted)'
                          }}>
                            #{idx + 1}
                          </span>
                          <span style={{ fontSize: '15px', fontWeight: isWinner ? 700 : 500 }}>{player.name}</span>
                          {isWinner && <span style={{ fontSize: '14px' }}>🏆</span>}
                        </div>
                        <span style={{ fontSize: '22px', fontWeight: 800, color: player.color.score }}>
                          {player.score}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <button onClick={() => handleStartGame(players)} className="glass-button">
                    <RotateCcw size={18} /> Rematch!
                  </button>
                  <button onClick={() => setPhase('setup')} className="glass-button-secondary">
                    <Play size={18} /> New Players
                  </button>
                </div>
              </div>
            </div>

            {/* Hall of Fame / Match log retrieved from SQLite */}
            <Leaderboard refreshTrigger={dbRefresh} />
          </div>
        </div>
      )}
    </div>
  );
}
