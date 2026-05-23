import React, { useState } from 'react';
import { User, Sparkles, Trophy } from 'lucide-react';

interface PlayerSetupProps {
  onStartGame: (player1: string, player2: string) => void;
  showLeaderboardOnly?: boolean;
}

export default function PlayerSetup({ onStartGame }: PlayerSetupProps) {
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (step === 1) {
      if (!player1.trim()) {
        setError('Please enter a name for Contestant 1');
        return;
      }
      setStep(2);
    } else {
      if (!player2.trim()) {
        setError('Please enter a name for Contestant 2');
        return;
      }
      if (player1.trim().toLowerCase() === player2.trim().toLowerCase()) {
        setError('Contestants must have different names!');
        return;
      }
      onStartGame(player1.trim(), player2.trim());
    }
  };

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
        {/* Glow effect backgrounds */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background: 'var(--neon-indigo-glow)',
          filter: 'blur(50px)',
          zIndex: 0
        }} />
        
        <div style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-10%',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background: 'var(--neon-cyan-glow)',
          filter: 'blur(50px)',
          zIndex: 0
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            background: step === 1 
              ? 'rgba(99, 102, 241, 0.15)' 
              : 'rgba(6, 182, 212, 0.15)',
            border: step === 1
              ? '1px solid rgba(99, 102, 241, 0.3)'
              : '1px solid rgba(6, 182, 212, 0.3)',
            marginBottom: '24px',
            color: step === 1 ? '#818cf8' : '#22d3ee',
          }}>
            {step === 1 ? <User size={36} /> : <Sparkles size={36} />}
          </div>

          <h1 style={{
            fontSize: '32px',
            marginBottom: '8px',
            background: step === 1 
              ? 'linear-gradient(135deg, #a5b4fc 0%, #6366f1 100%)' 
              : 'linear-gradient(135deg, #67e8f9 0%, #06b6d4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 800
          }}>
            {step === 1 ? 'Contestant 1' : 'Contestant 2'}
          </h1>
          
          <p style={{
            color: 'var(--text-secondary)',
            marginBottom: '32px',
            fontSize: '15px',
            lineHeight: 1.5
          }}>
            {step === 1 
              ? 'Welcome to GeoQuest! Enter the name of the first explorer.' 
              : 'Awesome! Now enter the name of the second explorer.'}
          </p>

          <form onSubmit={handleSubmit} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {step === 1 ? (
              <div style={{ textAlign: 'left' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  letterSpacing: '0.05em'
                }}>
                  Player 1 Name
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="glass-input"
                    placeholder="Enter name (e.g. Leo)"
                    value={player1}
                    onChange={(e) => setPlayer1(e.target.value)}
                    autoFocus
                    maxLength={15}
                  />
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'left' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  letterSpacing: '0.05em'
                }}>
                  Player 2 Name
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="glass-input"
                    placeholder="Enter name (e.g. Mia)"
                    value={player2}
                    onChange={(e) => setPlayer2(e.target.value)}
                    autoFocus
                    maxLength={15}
                  />
                </div>
              </div>
            )}

            {error && (
              <div style={{
                color: 'var(--neon-red)',
                fontSize: '14px',
                textAlign: 'left',
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
              }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" className="glass-button" style={{
              marginTop: '10px',
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
          </form>
        </div>
      </div>
    </div>
  );
}
