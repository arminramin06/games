import React, { useState, useRef, useEffect } from 'react';
import { User, Sparkles, Trophy, Users, Swords, Plus, Minus } from 'lucide-react';

type GameMode = 'duel' | 'family';

interface PlayerSetupProps {
  onStartGame: (players: string[]) => void;
}

// 6 distinct neon colors for family player cards
const PLAYER_COLORS = [
  { bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.3)', text: '#818cf8', label: 'Indigo' },
  { bg: 'rgba(6, 182, 212, 0.15)',  border: 'rgba(6, 182, 212, 0.3)',  text: '#22d3ee', label: 'Cyan'   },
  { bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.3)', text: '#fbbf24', label: 'Amber'  },
  { bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.3)', text: '#34d399', label: 'Green'  },
  { bg: 'rgba(244, 114, 182, 0.15)',border: 'rgba(244, 114, 182, 0.3)',text: '#f472b6', label: 'Pink'   },
  { bg: 'rgba(251, 146, 60, 0.15)', border: 'rgba(251, 146, 60, 0.3)', text: '#fb923c', label: 'Orange' },
];

export default function PlayerSetup({ onStartGame }: PlayerSetupProps) {
  const [mode, setMode] = useState<GameMode | null>(null);

  // Duel mode state
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [step, setStep] = useState(1);

  // Ref to imperatively focus the active input whenever mode/step changes
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // Small delay so the element is visible/rendered before we focus
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [mode, step]);

  // Family mode state
  const [familyPlayers, setFamilyPlayers] = useState<string[]>(['', '', '']);

  const [error, setError] = useState('');

  // ── Duel Submit ──────────────────────────────────────────────
  const handleDuelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (step === 1) {
      if (!player1.trim()) { setError('Please enter a name for Contestant 1'); return; }
      setStep(2);
    } else {
      if (!player2.trim()) { setError('Please enter a name for Contestant 2'); return; }
      if (player1.trim().toLowerCase() === player2.trim().toLowerCase()) {
        setError('Contestants must have different names!'); return;
      }
      onStartGame([player1.trim(), player2.trim()]);
    }
  };

  // ── Family Submit ─────────────────────────────────────────────
  const handleFamilySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = familyPlayers.map(p => p.trim());
    for (let i = 0; i < trimmed.length; i++) {
      if (!trimmed[i]) { setError(`Please enter a name for Player ${i + 1}`); return; }
    }

    const unique = new Set(trimmed.map(n => n.toLowerCase()));
    if (unique.size !== trimmed.length) { setError('All players must have different names!'); return; }

    onStartGame(trimmed);
  };

  const addFamilyPlayer = () => {
    if (familyPlayers.length < 6) setFamilyPlayers(prev => [...prev, '']);
  };

  const removeFamilyPlayer = () => {
    if (familyPlayers.length > 3) setFamilyPlayers(prev => prev.slice(0, -1));
  };

  const updateFamilyPlayer = (idx: number, val: string) => {
    setFamilyPlayers(prev => prev.map((p, i) => i === idx ? val : p));
  };

  // ── Mode Selector Screen ──────────────────────────────────────
  if (!mode) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        padding: '20px',
      }}>
        <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
          {/* Title */}
          <div style={{ marginBottom: '40px' }}>
            <span style={{ fontSize: '56px', display: 'block', marginBottom: '16px' }}>🌍</span>
            <h1 style={{
              fontSize: '40px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '10px',
              letterSpacing: '-0.03em'
            }}>
              GeoQuest
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
              Choose your game mode to begin the adventure!
            </p>
          </div>

          {/* Mode Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Duel Card */}
            <button
              onClick={() => { setMode('duel'); setError(''); }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textAlign: 'left',
              }}
            >
              <div className="glass-container" style={{
                padding: '32px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                borderRadius: '20px',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                background: 'rgba(99, 102, 241, 0.05)',
                transition: 'var(--transition-smooth)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)')}
              >
                <div style={{
                  width: '64px', height: '64px', borderRadius: '18px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#818cf8', flexShrink: 0
                }}>
                  <Swords size={32} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#818cf8', marginBottom: '6px' }}>
                    Duel
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Classic head-to-head<br/>battle for 2 players
                  </p>
                </div>
                <span className="badge" style={{
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  color: '#818cf8',
                  fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '999px'
                }}>
                  2 Players
                </span>
              </div>
            </button>

            {/* Family Plan Card */}
            <button
              onClick={() => { setMode('family'); setError(''); }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textAlign: 'left',
              }}
            >
              <div className="glass-container" style={{
                padding: '32px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                borderRadius: '20px',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                background: 'rgba(52, 211, 153, 0.05)',
                transition: 'var(--transition-smooth)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(52, 211, 153, 0.12)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(52, 211, 153, 0.05)')}
              >
                <div style={{
                  width: '64px', height: '64px', borderRadius: '18px',
                  background: 'rgba(52, 211, 153, 0.15)',
                  border: '1px solid rgba(52, 211, 153, 0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#34d399', flexShrink: 0
                }}>
                  <Users size={32} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#34d399', marginBottom: '6px' }}>
                    Family Plan
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Round-robin fun for<br/>the whole family
                  </p>
                </div>
                <span className="badge" style={{
                  background: 'rgba(52, 211, 153, 0.15)',
                  border: '1px solid rgba(52, 211, 153, 0.3)',
                  color: '#34d399',
                  fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '999px'
                }}>
                  3 – 6 Players
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Duel Setup ────────────────────────────────────────────────
  if (mode === 'duel') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        padding: '20px',
      }}>
        <div className="glass-container" style={{
          maxWidth: '480px',
          width: '100%',
          padding: '40px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Glow backgrounds */}
          <div style={{
            position: 'absolute', top: '-10%', right: '-10%',
            width: '150px', height: '150px', borderRadius: '50%',
            background: 'var(--neon-indigo-glow)', filter: 'blur(50px)', zIndex: 0
          }} />
          <div style={{
            position: 'absolute', bottom: '-10%', left: '-10%',
            width: '150px', height: '150px', borderRadius: '50%',
            background: 'var(--neon-cyan-glow)', filter: 'blur(50px)', zIndex: 0
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '72px', height: '72px', borderRadius: '20px',
              background: step === 1 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(6, 182, 212, 0.15)',
              border: step === 1 ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(6, 182, 212, 0.3)',
              marginBottom: '24px',
              color: step === 1 ? '#818cf8' : '#22d3ee',
            }}>
              {step === 1 ? <User size={36} /> : <Sparkles size={36} />}
            </div>

            <h2 style={{
              fontSize: '32px', marginBottom: '8px',
              background: step === 1
                ? 'linear-gradient(135deg, #a5b4fc 0%, #6366f1 100%)'
                : 'linear-gradient(135deg, #67e8f9 0%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800
            }}>
              {step === 1 ? 'Contestant 1' : 'Contestant 2'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '15px', lineHeight: 1.5 }}>
              {step === 1
                ? 'Welcome to GeoQuest! Enter the name of the first explorer.'
                : 'Awesome! Now enter the name of the second explorer.'}
            </p>

            <form onSubmit={handleDuelSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ textAlign: 'left' }}>
                <label style={{
                  display: 'block', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase',
                  color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.05em'
                }}>
                  {step === 1 ? 'Player 1 Name' : 'Player 2 Name'}
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  className="glass-input"
                  placeholder={step === 1 ? 'Enter name (e.g. Leo)' : 'Enter name (e.g. Mia)'}
                  value={step === 1 ? player1 : player2}
                  onChange={(e) => step === 1 ? setPlayer1(e.target.value) : setPlayer2(e.target.value)}
                  maxLength={15}
                />
              </div>

              {error && (
                <div style={{
                  color: 'var(--neon-red)', fontSize: '14px', textAlign: 'left',
                  padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px',
                }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => { step === 1 ? setMode(null) : setStep(1); setError(''); }}
                  className="glass-button-secondary"
                  style={{ flex: '0 0 auto' }}
                >
                  ← Back
                </button>
                <button type="submit" className="glass-button" style={{
                  flex: 1,
                  background: step === 1
                    ? 'linear-gradient(135deg, var(--neon-indigo) 0%, #4f46e5 100%)'
                    : 'linear-gradient(135deg, var(--neon-cyan) 0%, #0891b2 100%)',
                  boxShadow: step === 1
                    ? '0 4px 14px 0 rgba(99, 102, 241, 0.4)'
                    : '0 4px 14px 0 rgba(6, 182, 212, 0.4)'
                }}>
                  {step === 1 ? 'Next Player' : 'Launch Game'}
                  {step === 1 ? <Sparkles size={18} /> : <Trophy size={18} />}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Family Plan Setup ─────────────────────────────────────────
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '20px',
    }}>
      <div className="glass-container" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '40px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow */}
        <div style={{
          position: 'absolute', top: '-10%', right: '-10%',
          width: '180px', height: '180px', borderRadius: '50%',
          background: 'rgba(52, 211, 153, 0.15)', filter: 'blur(60px)', zIndex: 0
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '72px', height: '72px', borderRadius: '20px',
              background: 'rgba(52, 211, 153, 0.15)',
              border: '1px solid rgba(52, 211, 153, 0.3)',
              marginBottom: '20px', color: '#34d399',
            }}>
              <Users size={36} />
            </div>
            <h2 style={{
              fontSize: '28px', fontWeight: 800,
              background: 'linear-gradient(135deg, #6ee7b7 0%, #34d399 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginBottom: '6px'
            }}>
              Family Plan
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Add 3 to 6 players to join the round-robin game!
            </p>
          </div>

          <form onSubmit={handleFamilySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {familyPlayers.map((name, idx) => {
              const color = PLAYER_COLORS[idx];
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                    background: color.bg, border: `1px solid ${color.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: color.text, fontSize: '14px', fontWeight: 700
                  }}>
                    {idx + 1}
                  </div>
                  <input
                    ref={idx === 0 ? inputRef : undefined}
                    type="text"
                    className="glass-input"
                    placeholder={`Player ${idx + 1} name…`}
                    value={name}
                    onChange={(e) => updateFamilyPlayer(idx, e.target.value)}
                    maxLength={15}
                    style={{ flex: 1, borderColor: name.trim() ? color.border : undefined }}
                  />
                </div>
              );
            })}

            {/* Add / Remove Player buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={removeFamilyPlayer}
                disabled={familyPlayers.length <= 3}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--color-glass-border)',
                  borderRadius: '10px',
                  color: familyPlayers.length <= 3 ? 'var(--text-muted)' : 'var(--text-secondary)',
                  padding: '8px',
                  cursor: familyPlayers.length <= 3 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-display)',
                  transition: 'var(--transition-smooth)'
                }}
              >
                <Minus size={14} /> Remove Player
              </button>
              <button
                type="button"
                onClick={addFamilyPlayer}
                disabled={familyPlayers.length >= 6}
                style={{
                  flex: 1,
                  background: familyPlayers.length < 6 ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255,255,255,0.05)',
                  border: familyPlayers.length < 6 ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid var(--color-glass-border)',
                  borderRadius: '10px',
                  color: familyPlayers.length < 6 ? '#34d399' : 'var(--text-muted)',
                  padding: '8px',
                  cursor: familyPlayers.length >= 6 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-display)',
                  transition: 'var(--transition-smooth)'
                }}
              >
                <Plus size={14} /> Add Player
              </button>
            </div>

            {error && (
              <div style={{
                color: 'var(--neon-red)', fontSize: '14px',
                padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px',
              }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => { setMode(null); setError(''); setFamilyPlayers(['', '', '']); }}
                className="glass-button-secondary"
                style={{ flex: '0 0 auto' }}
              >
                ← Back
              </button>
              <button type="submit" className="glass-button" style={{
                flex: 1,
                background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
                boxShadow: '0 4px 14px 0 rgba(52, 211, 153, 0.4)'
              }}>
                Launch Family Game <Trophy size={18} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
