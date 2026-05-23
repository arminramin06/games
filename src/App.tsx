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

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('setup');
  
  // Player Stats
  const [p1Name, setP1Name] = useState('');
  const [p2Name, setP2Name] = useState('');
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [activePlayer, setActivePlayer] = useState<'p1' | 'p2'>('p1');
  
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
  const [speechPitch, setSpeechPitch] = useState(1.1); // Range: 0.5 - 2.0
  const [speechRate, setSpeechRate] = useState(1.0);  // Range: 0.5 - 2.0

  const recognitionRef = useRef<any>(null);

  // Flag Overlay State
  const [activeFlag, setActiveFlag] = useState<{ name: string; url: string; fadeOut: boolean } | null>(null);

  const fadeActiveFlag = () => {
    setActiveFlag(prev => prev ? { ...prev, fadeOut: true } : null);
    setTimeout(() => {
      setActiveFlag(null);
    }, 500); // match CSS fade-out duration (0.5s)
  };

  // Start the match
  const handleStartGame = async (player1: string, player2: string) => {
    setP1Name(player1);
    setP2Name(player2);
    setP1Score(0);
    setP2Score(0);
    setActivePlayer('p1');
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

    // Announce the very first turn using speech synthesis
    if (announcerEnabled) {
      setTimeout(() => {
        announceTurn(player1, speechPitch, speechRate);
      }, 1000);
    }

    // Register players in local SQLite database
    try {
      await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: player1 })
      });
      await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: player2 })
      });
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
        rec.onend = () => {
          setIsListening(false);
        };
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
          const spokenText = event.results[0][0].transcript;
          if (spokenText) {
            setGameMessage({ text: `🎤 Heard: "${spokenText}"`, type: 'info' });
            processGuess(spokenText);
          }
        };
        recognitionRef.current = rec;
      }
    }
  }, [announcerEnabled, speechPitch, speechRate, p1Name, p2Name, activePlayer]);

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
        // Cancel any active speech synthesis so it doesn't feed back into the microphone
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        
        // Fade out previous flag overlay when mic starts listening
        if (activeFlag && !activeFlag.fadeOut) {
          fadeActiveFlag();
        }
        
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

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // Handle Game End & record in SQLite
  const handleEndGame = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('gameover');
    
    // Determine winner
    let winner = null;
    if (p1Score > p2Score) winner = p1Name;
    else if (p2Score > p1Score) winner = p2Name;

    // Play Victory Fanfare
    playWinner();

    // Trigger full screen confetti shower if there is a winner!
    if (winner) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    }

    // Save match log in SQLite database
    try {
      await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player1Name: p1Name,
          player2Name: p2Name,
          player1Score: p1Score,
          player2Score: p2Score,
          winnerName: winner
        })
      });
      setDbRefresh(prev => prev + 1);
    } catch (e) {
      console.warn('Failed to save match to SQLite:', e);
    }
  };

  // Process a Guess (Shared between keyboard submit and spoken speech recognition)
  const processGuess = (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    const matched = findCountry(trimmedQuery);
    const activePlayerName = activePlayer === 'p1' ? p1Name : p2Name;
    const nextPlayer = activePlayer === 'p1' ? 'p2' : 'p1';
    const nextPlayerName = nextPlayer === 'p1' ? p1Name : p2Name;

    // Trigger turn announcement helper
    const triggerTurnAnnouncement = () => {
      if (announcerEnabled) {
        setTimeout(() => {
          announceTurn(nextPlayerName, speechPitch, speechRate);
        }, 1100); // 1.1s delay to let the sound effects play first
      }
    };

    if (!matched) {
      // 1. INCORRECT GUESS
      playFailure();
      setShowCross(true);
      setShakeMap(true);
      setGameMessage({ text: `${activePlayerName} guessed "${trimmedQuery}" - Country not found!`, type: 'error' });
      
      // End animation states & shift turn
      setTimeout(() => {
        setShowCross(false);
        setShakeMap(false);
      }, 1000);
      
      setActivePlayer(nextPlayer);
      triggerTurnAnnouncement();
    } else if (guessedCountries.has(matched.isoA3)) {
      // 2. ALREADY GUESSED COUNTRY
      playFailure();
      setShowCross(true);
      setShakeMap(true);
      setGameMessage({ text: `"${matched.name}" has already been guessed!`, type: 'error' });
      
      setTimeout(() => {
        setShowCross(false);
        setShakeMap(false);
      }, 1000);
      
      setActivePlayer(nextPlayer);
      triggerTurnAnnouncement();
    } else {
      // 3. CORRECT GUESS
      playSuccess();
      
      // Update sets
      const nextGuessed = new Set(guessedCountries);
      nextGuessed.add(matched.isoA3);
      setGuessedCountries(nextGuessed);
      setGuessedNames(prev => [matched.name, ...prev]);

      // Pop mini side-confetti at the score indicators
      confetti({
        particleCount: 30,
        angle: activePlayer === 'p1' ? 60 : 120,
        spread: 55,
        origin: { x: activePlayer === 'p1' ? 0.2 : 0.8, y: 0.2 }
      });

      // Award points
      if (activePlayer === 'p1') {
        setP1Score(prev => prev + 1);
      } else {
        setP2Score(prev => prev + 1);
      }

      // Display the flag overlay card
      const flagUrl = getCountryFlagUrl(matched.isoA3);
      if (flagUrl) {
        setActiveFlag({ name: matched.name, url: flagUrl, fadeOut: false });
      }

      setGameMessage({ text: `🎉 ${activePlayerName} found ${matched.name}! (+1 pt)`, type: 'success' });
      
      // Shift Turn
      setActivePlayer(nextPlayer);
      triggerTurnAnnouncement();
    }

    setCurrentGuess('');
  };

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processGuess(currentGuess);
  };


  // Format Timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            background: 'rgba(0,0,0,0.3)',
            padding: '8px 20px',
            borderRadius: '9999px',
            border: '1px solid var(--color-glass-border)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Time Remaining</span>
              <span style={{
                fontSize: '20px',
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
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
            <div className="glass-container" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '16px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={16} /> Explorers
              </h3>

              {/* Player 1 Card */}
              <div className={`glass-card ${activePlayer === 'p1' ? 'active-player-glow' : ''}`} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#818cf8'
                  }}>
                    <User size={18} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 600 }}>{p1Name}</h4>
                    <span style={{ fontSize: '11px', color: activePlayer === 'p1' ? 'var(--neon-cyan)' : 'var(--text-muted)' }}>
                      {activePlayer === 'p1' ? 'Active Turn' : 'Waiting...'}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--neon-indigo)' }}>
                  {p1Score}
                </span>
              </div>

              {/* Player 2 Card */}
              <div className={`glass-card ${activePlayer === 'p2' ? 'active-player-glow' : ''}`} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(6, 182, 212, 0.15)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#22d3ee'
                  }}>
                    <User size={18} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 600 }}>{p2Name}</h4>
                    <span style={{ fontSize: '11px', color: activePlayer === 'p2' ? 'var(--neon-cyan)' : 'var(--text-muted)' }}>
                      {activePlayer === 'p2' ? 'Active Turn' : 'Waiting...'}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--neon-cyan)' }}>
                  {p2Score}
                </span>
              </div>
            </div>

            {/* List of successfully guessed countries in this match */}
            <div className="glass-container" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trophy size={14} /> Discovered ({guessedCountries.size})
              </h3>
              
              <div style={{
                flex: 1,
                overflowY: 'auto',
                maxHeight: '200px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                alignContent: 'flex-start'
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
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)'
                  }}
                >
                  {announcerEnabled ? '🔊 ON' : '🔇 OFF'}
                </button>
              </div>

              {announcerEnabled && (
                <>
                  {/* Pitch slider */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>Voice Pitch</span>
                      <span style={{ fontWeight: 600, color: 'var(--neon-amber)' }}>
                        {speechPitch < 0.9 ? '🤖 Low' : speechPitch > 1.3 ? '🐿️ High' : '👤 Normal'} ({speechPitch.toFixed(1)})
                      </span>
                    </div>
                    <input 
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={speechPitch}
                      onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                      style={{
                        width: '100%',
                        accentColor: 'var(--neon-amber)',
                        background: 'rgba(255,255,255,0.1)',
                        height: '6px',
                        borderRadius: '3px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    />
                  </div>

                  {/* Rate slider */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>Voice Speed</span>
                      <span style={{ fontWeight: 600, color: 'var(--neon-amber)' }}>
                        {speechRate < 0.9 ? 'Slow' : speechRate > 1.3 ? 'Fast' : 'Normal'} ({speechRate.toFixed(1)}x)
                      </span>
                    </div>
                    <input 
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={speechRate}
                      onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                      style={{
                        width: '100%',
                        accentColor: 'var(--neon-amber)',
                        background: 'rgba(255,255,255,0.1)',
                        height: '6px',
                        borderRadius: '3px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                </>
              )}
            </div>
            
            {/* Quick Helper Rules */}
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: activePlayer === 'p1' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(6, 182, 212, 0.1)',
                  padding: '6px 16px',
                  borderRadius: '8px',
                  border: activePlayer === 'p1' ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid rgba(6, 182, 212, 0.2)',
                  fontSize: '14px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}>
                  <span style={{ color: activePlayer === 'p1' ? '#818cf8' : '#22d3ee' }}>
                    🎤 {activePlayer === 'p1' ? p1Name : p2Name}
                  </span>
                </div>
                
                <input
                  type="text"
                  className="glass-input"
                  placeholder="Type or say a country name (e.g. Canada, Brazil)..."
                  value={currentGuess}
                  onChange={(e) => {
                    setCurrentGuess(e.target.value);
                    if (activeFlag && !activeFlag.fadeOut) {
                      fadeActiveFlag();
                    }
                  }}
                  autoFocus
                  style={{ flex: 1 }}
                />
                
                {/* Speech Input Toggle Button */}
                {isSpeechRecognitionSupported() && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`mic-btn ${isListening ? 'mic-active' : ''}`}
                    title={isListening ? 'Stop listening' : 'Say it instead of typing!'}
                    style={{ flexShrink: 0 }}
                  >
                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                )}
                
                <button type="submit" className="glass-button" style={{
                  background: activePlayer === 'p1' ? 'linear-gradient(135deg, var(--neon-indigo) 0%, #4f46e5 100%)' : 'linear-gradient(135deg, var(--neon-cyan) 0%, #0891b2 100%)',
                  boxShadow: activePlayer === 'p1' ? '0 4px 14px 0 rgba(99, 102, 241, 0.4)' : '0 4px 14px 0 rgba(6, 182, 212, 0.4)'
                }}>
                  Submit <ArrowRight size={16} />
                </button>
              </form>

              {/* Game Ticker Message */}
              {gameMessage.text && (
                <div style={{
                  marginTop: '12px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: gameMessage.type === 'success' 
                    ? 'var(--neon-green)' 
                    : gameMessage.type === 'error' 
                      ? 'var(--neon-red)' 
                      : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  paddingLeft: '4px'
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
            
            {/* Quick audio notice */}
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%'
        }}>
          <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 380px', width: '100%' }}>
            
            {/* Celebratory Winner Screen */}
            <div className="glass-container" style={{
              padding: '48px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Background glows */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '300px',
                height: '300px',
                borderRadius: '50%',
                background: 'var(--neon-green-glow)',
                filter: 'blur(100px)',
                zIndex: 0,
                opacity: 0.6
              }} />

              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '96px',
                  height: '96px',
                  borderRadius: '24px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  marginBottom: '24px',
                  color: 'var(--neon-green)',
                  filter: 'drop-shadow(0 0 15px var(--neon-green-glow))',
                  animation: 'neonPulse 2s infinite ease-in-out'
                }}>
                  <Trophy size={48} />
                </div>

                <h1 style={{
                  fontSize: '44px',
                  fontWeight: 800,
                  marginBottom: '8px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.03em'
                }}>
                  {p1Score === p2Score ? 'Tie Game!' : 'Victory!'}
                </h1>
                
                <h2 style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  marginBottom: '24px',
                  color: '#ffffff'
                }}>
                  {p1Score === p2Score 
                    ? 'Both explorers found equal countries!' 
                    : p1Score > p2Score 
                      ? `🏆 ${p1Name} Wins the Match!` 
                      : `🏆 ${p2Name} Wins the Match!`}
                </h2>

                {/* Final Scoreboard Grid */}
                <div style={{
                  display: 'flex',
                  gap: '32px',
                  marginBottom: '40px',
                  background: 'rgba(0,0,0,0.25)',
                  padding: '24px 48px',
                  borderRadius: '16px',
                  border: '1px solid var(--color-glass-border)'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px' }}>{p1Name}</div>
                    <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--neon-indigo)' }}>{p1Score}</div>
                  </div>
                  <div style={{
                    width: '1px',
                    background: 'var(--color-glass-border)',
                    alignSelf: 'stretch'
                  }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px' }}>{p2Name}</div>
                    <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--neon-cyan)' }}>{p2Score}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <button
                    onClick={() => handleStartGame(p1Name, p2Name)}
                    className="glass-button"
                  >
                    <RotateCcw size={18} /> Rematch!
                  </button>
                  <button
                    onClick={() => setPhase('setup')}
                    className="glass-button-secondary"
                  >
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
