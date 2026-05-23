import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, HelpCircle, User, Zap, AlertTriangle, ArrowRight, Play, RotateCcw, Volume2, Mic, MicOff, Sliders } from 'lucide-react';
import PlayerSetup from './components/PlayerSetup';
import WorldMap from './components/WorldMap';
import Leaderboard from './components/Leaderboard';
import { findCountry, getCountryFlagUrl } from './utils/countries';
import { playSuccess, playFailure, playWinner } from './utils/audio';
import { isSpeechRecognitionSupported, createSpeechRecognitionInstance, announceTurn } from './utils/speech';

type GamePhase = 'setup' | 'active' | 'gameover';

// 6 distinct neon colors cycling by player index
const PLAYER_COLORS = [
  { bg: 'rgba(99, 102, 241, 0.15)',  border: 'rgba(99, 102, 241, 0.3)',  text: '#818cf8', score: 'var(--neon-indigo)' },
  { bg: 'rgba(6, 182, 212, 0.15)',   border: 'rgba(6, 182, 212, 0.3)',   text: '#22d3ee', score: 'var(--neon-cyan)'   },
  { bg: 'rgba(251, 191, 36, 0.15)',  border: 'rgba(251, 191, 36, 0.3)',  text: '#fbbf24', score: '#fbbf24'            },
  { bg: 'rgba(52, 211, 153, 0.15)',  border: 'rgba(52, 211, 153, 0.3)',  text: '#34d399', score: '#34d399'            },
  { bg: 'rgba(244, 114, 182, 0.15)', border: 'rgba(244, 114, 182, 0.3)', text: '#f472b6', score: '#f472b6'            },
  { bg: 'rgba(251, 146, 60, 0.15)',  border: 'rgba(251, 146, 60, 0.3)',  text: '#fb923c', score: '#fb923c'            },
];

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('setup');

  // Dynamic player state (supports 2–6 players)
  const [players, setPlayers] = useState<string[]>([]);
  const [scores, setScores] = useState<number[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Game Logic
  const [guessedCountries, setGuessedCountries] = useState<Set<string>>(new Set());
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

  // Sound warm up notice
  const [audioWarmed, setAudioWarmed] = useState(false);

  // Voice Controls State
  const [isListening, setIsListening] = useState(false);
  const [announcerEnabled, setAnnouncerEnabled] = useState(true);
  const [speechPitch, setSpeechPitch] = useState(1.1);
  const [speechRate, setSpeechRate] = useState(1.0);

  const recognitionRef = useRef<any>(null);

  // Flag Overlay State
  const [activeFlag, setActiveFlag] = useState<{ name: string; url: string; fadeOut: boolean } | null>(null);

  const fadeActiveFlag = () => {
    setActiveFlag(prev => prev ? { ...prev, fadeOut: true } : null);
    setTimeout(() => setActiveFlag(null), 500);
  };

  // Derived helpers
  const activeName = players[activeIndex] ?? '';

  // Start the match
  const handleStartGame = async (playerNames: string[]) => {
    setPlayers(playerNames);
    setScores(new Array(playerNames.length).fill(0));
    setActiveIndex(0);
    setGuessedCountries(new Set());
    setGuessedNames([]);
    setCurrentGuess('');
    setGameMessage({ text: 'Game Started! Type or say a country name.', type: 'info' });
    setTimeLeft(90);
    setPhase('active');

    // Warm up Web Audio API
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      await ctx.resume();
      setAudioWarmed(true);
    } catch {
      // Ignore
    }

    if (announcerEnabled) {
      setTimeout(() => announceTurn(playerNames[0], speechPitch, speechRate), 1000);
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
        rec.onresult = (event: any) =>
          // In continuous mode, results accumulate — always read the latest entry
          {
          const lastResult = event.results[event.results.length - 1];
          if (lastResult && lastResult.isFinal) {
            const spokenText = lastResult[0].transcript.trim();
            if (spokenText) {
              setGameMessage({ text: `🎤 Heard: "${spokenText}"`, type: 'info' });
              processGuess(spokenText);
            }
          }
        };
        recognitionRef.current = rec;
      }
    }
  }, [announcerEnabled, speechPitch, speechRate, players, activeIndex]);

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
  const handleEndGame = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('gameover');

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
  const processGuess = (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    const matched = findCountry(trimmedQuery);
    const nextIdx = (activeIndex + 1) % players.length;
    const nextPlayerName = players[nextIdx];

    const triggerTurnAnnouncement = () => {
      if (announcerEnabled) {
        setTimeout(() => announceTurn(nextPlayerName, speechPitch, speechRate), 1100);
      }
    };

    if (!matched) {
      playFailure();
      setShowCross(true);
      setShakeMap(true);
      setGameMessage({ text: `${activeName} guessed "${trimmedQuery}" - Country not found!`, type: 'error' });
      setTimeout(() => { setShowCross(false); setShakeMap(false); }, 1000);
      setActiveIndex(nextIdx);
      triggerTurnAnnouncement();
    } else if (guessedCountries.has(matched.isoA3)) {
      playFailure();
      setShowCross(true);
      setShakeMap(true);
      setGameMessage({ text: `"${matched.name}" has already been guessed!`, type: 'error' });
      setTimeout(() => { setShowCross(false); setShakeMap(false); }, 1000);
      setActiveIndex(nextIdx);
      triggerTurnAnnouncement();
    } else {
      playSuccess();

      const nextGuessed = new Set(guessedCountries);
      nextGuessed.add(matched.isoA3);
      setGuessedCountries(nextGuessed);
      setGuessedNames(prev => [matched.name, ...prev]);

      // Confetti origin spread across players evenly
      const xOrigin = players.length === 1 ? 0.5 : activeIndex / (players.length - 1);
      confetti({
        particleCount: 30,
        angle: 60 + (xOrigin * 60),
        spread: 55,
        origin: { x: Math.max(0.1, Math.min(0.9, xOrigin)), y: 0.2 }
      });

      setScores(prev => {
        const next = [...prev];
        next[activeIndex] = (next[activeIndex] ?? 0) + 1;
        return next;
      });

      const flagUrl = getCountryFlagUrl(matched.isoA3);
      if (flagUrl) setActiveFlag({ name: matched.name, url: flagUrl, fadeOut: false });

      setGameMessage({ text: `🎉 ${activeName} found ${matched.name}! (+1 pt)`, type: 'success' });
      setActiveIndex(nextIdx);
      triggerTurnAnnouncement();
    }

    setCurrentGuess('');
  };

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

              {gameMessage.text && (
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
              )}
            </div>

            {/* Interactive World Map */}
            <div className={shakeMap ? 'shake-animation' : ''} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <WorldMap
                guessedIsoCodes={guessedCountries}
                showFailureCross={showCross}
                onCountryClick={(name) => setCurrentGuess(name)}
                activeFlag={activeFlag}
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
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '300px', height: '300px', borderRadius: '50%',
                background: 'var(--neon-green-glow)', filter: 'blur(100px)',
                zIndex: 0, opacity: 0.6
              }} />

              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '96px', height: '96px', borderRadius: '24px',
                  background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)',
                  marginBottom: '24px', color: 'var(--neon-green)',
                  filter: 'drop-shadow(0 0 15px var(--neon-green-glow))',
                  animation: 'neonPulse 2s infinite ease-in-out'
                }}>
                  <Trophy size={48} />
                </div>

                <h1 style={{
                  fontSize: '44px', fontWeight: 800, marginBottom: '8px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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
