import { useEffect, useState } from 'react';
import { Trophy, Clock, Swords, Users, RefreshCw } from 'lucide-react';

interface LeaderboardEntry {
  name: string;
  high_score: number;
  games_played: number;
}

interface PlayerResult {
  name: string;
  score: number;
}

interface MatchHistoryEntry {
  player1_name: string;
  player2_name: string;
  player1_score: number;
  player2_score: number;
  winner_name: string | null;
  player_results: string | null; // JSON array for family games
  played_at: string;
}

interface LeaderboardProps {
  refreshTrigger: number;
}

export default function Leaderboard({ refreshTrigger }: LeaderboardProps) {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [history, setHistory] = useState<MatchHistoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'history'>('leaderboard');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leaderRes, historyRes] = await Promise.all([
        fetch('/api/leaderboard'),
        fetch('/api/matches')
      ]);

      if (leaderRes.ok) {
        const leadersData = await leaderRes.json();
        setLeaders(leadersData);
      }
      
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData);
      }
    } catch (error) {
      console.warn('Failed to fetch stats from SQLite backend:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  return (
    <div className="glass-container" style={{
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      height: '100%',
      minHeight: '450px'
    }}>
      {/* Tabs Menu */}
      <div style={{
        display: 'flex',
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '10px',
        padding: '4px',
        border: '1px solid var(--color-glass-border)'
      }}>
        <button
          onClick={() => setActiveTab('leaderboard')}
          style={{
            flex: 1,
            background: activeTab === 'leaderboard' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
            border: 'none',
            borderRadius: '6px',
            color: activeTab === 'leaderboard' ? 'var(--text-primary)' : 'var(--text-secondary)',
            padding: '8px 12px',
            fontFamily: 'var(--font-display)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'var(--transition-smooth)'
          }}
        >
          <Trophy size={14} className={activeTab === 'leaderboard' ? 'text-amber' : ''} />
          High Scores
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            flex: 1,
            background: activeTab === 'history' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
            border: 'none',
            borderRadius: '6px',
            color: activeTab === 'history' ? 'var(--text-primary)' : 'var(--text-secondary)',
            padding: '8px 12px',
            fontFamily: 'var(--font-display)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'var(--transition-smooth)'
          }}
        >
          <Clock size={14} />
          Match Logs
        </button>
      </div>

      {/* Header and Refresh */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeTab === 'leaderboard' ? (
            <Users size={18} style={{ color: 'var(--neon-indigo)' }} />
          ) : (
            <Swords size={18} style={{ color: 'var(--neon-cyan)' }} />
          )}
          <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
            {activeTab === 'leaderboard' ? 'Hall of Fame' : 'Recent Contests'}
          </h3>
        </div>
        <button
          onClick={fetchData}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'var(--transition-smooth)'
          }}
          title="Refresh statistics"
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <RefreshCw size={14} className={loading ? 'spin-anim' : ''} />
          <style>{`
            @keyframes spin-cw {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .spin-anim {
              animation: spin-cw 1s linear infinite;
            }
          `}</style>
        </button>
      </div>

      {/* Data lists */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        maxHeight: '380px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        paddingRight: '4px'
      }}>
        {loading && leaders.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '150px',
            color: 'var(--text-muted)',
            fontSize: '14px'
          }}>
            Synchronizing DB...
          </div>
        ) : activeTab === 'leaderboard' ? (
          leaders.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '150px',
              color: 'var(--text-muted)',
              fontSize: '14px',
              textAlign: 'center',
              gap: '6px'
            }}>
              <Trophy size={28} strokeWidth={1.5} />
              No scores recorded yet.<br/>Be the first to complete a game!
            </div>
          ) : (
            leaders.map((entry, idx) => (
              <div
                key={entry.name}
                className="glass-card"
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: '10px',
                  background: idx === 0 
                    ? 'rgba(245, 158, 11, 0.04)' 
                    : idx === 1 
                      ? 'rgba(255, 255, 255, 0.03)' 
                      : 'rgba(255, 255, 255, 0.01)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    width: '24px',
                    color: idx === 0 
                      ? '#fbbf24' 
                      : idx === 1 
                        ? '#cbd5e1' 
                        : idx === 2 
                          ? '#b45309' 
                          : 'var(--text-muted)',
                    fontFamily: 'var(--font-display)'
                  }}>
                    #{idx + 1}
                  </span>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 600 }}>{entry.name}</h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Games Played: {entry.games_played}
                    </span>
                  </div>
                </div>
                
                <span className="badge badge-green" style={{ fontSize: '14px', fontWeight: 700 }}>
                  {entry.high_score} pts
                </span>
              </div>
            ))
          )
        ) : (
          history.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '150px',
              color: 'var(--text-muted)',
              fontSize: '14px',
              textAlign: 'center',
              gap: '6px'
            }}>
              <Swords size={28} strokeWidth={1.5} />
              No matches recorded yet.
            </div>
          ) : (
            history.map((match, idx) => {
              const playedDate = new Date(match.played_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              // Parse family game results if present
              let familyResults: PlayerResult[] | null = null;
              if (match.player_results) {
                try {
                  const parsed = JSON.parse(match.player_results);
                  if (Array.isArray(parsed) && parsed.length > 2) {
                    familyResults = [...parsed].sort((a: PlayerResult, b: PlayerResult) => b.score - a.score);
                  }
                } catch {
                  // Ignore parse errors for legacy rows
                }
              }

              return (
                <div
                  key={idx}
                  className="glass-card"
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    borderRadius: '10px'
                  }}
                >
                  {familyResults ? (
                    // Family Game display
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--neon-green)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          👨‍👩‍👧‍👦 Family Game ({familyResults.length} players)
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{playedDate}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {familyResults.map((pr, ri) => (
                          <div key={pr.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span style={{
                              fontWeight: pr.name === match.winner_name ? 700 : 400,
                              color: pr.name === match.winner_name ? 'var(--neon-green)' : 'var(--text-primary)'
                            }}>
                              {ri === 0 && match.winner_name === pr.name ? '🏆 ' : `#${ri + 1} `}{pr.name}
                            </span>
                            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{pr.score} pts</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    // Classic Duel display
                    <>
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', fontSize: '14px'
                      }}>
                        <span style={{
                          fontWeight: match.winner_name === match.player1_name ? 700 : 400,
                          color: match.winner_name === match.player1_name ? 'var(--neon-green)' : 'var(--text-primary)'
                        }}>
                          {match.player1_name} ({match.player1_score})
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>VS</span>
                        <span style={{
                          fontWeight: match.winner_name === match.player2_name ? 700 : 400,
                          color: match.winner_name === match.player2_name ? 'var(--neon-green)' : 'var(--text-primary)'
                        }}>
                          ({match.player2_score}) {match.player2_name}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)'
                      }}>
                        <span>{match.winner_name ? `Winner: ${match.winner_name}` : 'Tie Game'}</span>
                        <span>{playedDate}</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
}
