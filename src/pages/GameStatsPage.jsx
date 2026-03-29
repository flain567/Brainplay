import { useState, useMemo } from 'react'
import { useProgress } from '../context/ProgressContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useThemeColors } from '../hooks/useThemeColors.js'

const GAME_DATA = [
  { id: 'memory-card', emoji: '🃏', name: 'Memory Card' },
  { id: 'slither-worm', emoji: '🐍', name: 'Slither Worm' },
  { id: '2048', emoji: '🔗', name: 'Connect Blocks' },
  { id: 'word-search', emoji: '🔍', name: 'Word Search' },
  { id: 'space-shooter', emoji: '🚀', name: 'Space Shooter' },
  { id: 'hangman', emoji: '💀', name: 'Hangman' },
  { id: 'color-sort', emoji: '🧪', name: 'Color Sort' },
  { id: 'sudoku', emoji: '🔢', name: 'Sudoku' },
  { id: 'jigsaw', emoji: '🧩', name: 'Jigsaw Puzzle' },
  { id: 'memory-pattern', emoji: '🧠', name: 'Memory Pattern Pro' },
  { id: 'reaction-test', emoji: '⚡', name: 'Reaction Test' },
  { id: 'neon-dash', emoji: '💎', name: 'Neon Dash' },
  { id: 'brick-breaker', emoji: '🧱', name: 'Brick Breaker' },
  { id: 'voxel-racer', emoji: '🚗', name: 'Voxel Racer' },
  { id: 'wordle', emoji: '💬', name: 'Wordle Indonesia' },
  { id: 'math-challenge', emoji: '🧮', name: 'Math Challenge' },
  { id: 'number-sequence', emoji: '🔢', name: 'Number Sequence' },
  { id: 'quiz-trivia', emoji: '🇮🇩', name: 'Quiz Trivia' },
  { id: 'binary-puzzle', emoji: '🔲', name: 'Binary Puzzle' },
  { id: 'sliding-puzzle', emoji: '🧩', name: 'Sliding Puzzle' },
  { id: 'tower-hanoi', emoji: '🗼', name: 'Tower of Hanoi' },
  { id: 'minesweeper', emoji: '💣', name: 'Minesweeper' },
  { id: 'fields-adventure', emoji: '🗺️', name: 'Fields of Adventure' },
]

export default function GameStatsPage({ onBack }) {
  const { progress } = useProgress()
  const tc = useThemeColors()
  const [selectedGame, setSelectedGame] = useState(null)
  const [sortBy, setSortBy] = useState('plays') // plays, score, coins

  const bg = tc.bg
  const surface = tc.surface
  const textMain = tc.textMain
  const textMuted = tc.textMuted
  const borderCol = tc.borderCol
  const dark = tc.dark

  // Calculate stats for each game
  const gameStats = useMemo(() => {
    const stats = {}
    
    GAME_DATA.forEach(game => {
      const gameResults = progress.results?.filter(r => r.gameId === game.id) || []
      const totalPlays = gameResults.length
      const wins = gameResults.filter(r => r.won).length
      const losses = totalPlays - wins
      const totalCoins = gameResults.reduce((sum, r) => sum + (r.coinsEarned || 0), 0)
      const bestScore = Math.max(...gameResults.map(r => r.score || 0), 0)
      const avgScore = totalPlays > 0 ? Math.round(gameResults.reduce((sum, r) => sum + (r.score || 0), 0) / totalPlays) : 0
      const totalTime = gameResults.reduce((sum, r) => sum + (r.timeSec || 0), 0)
      const avgTime = totalPlays > 0 ? Math.round(totalTime / totalPlays) : 0
      
      // Win rate per difficulty
      const easyResults = gameResults.filter(r => r.difficultyId === 'easy')
      const mediumResults = gameResults.filter(r => r.difficultyId === 'medium')
      const hardResults = gameResults.filter(r => r.difficultyId === 'hard')

      stats[game.id] = {
        ...game,
        totalPlays,
        wins,
        losses,
        winRate: totalPlays > 0 ? Math.round((wins / totalPlays) * 100) : 0,
        totalCoins,
        bestScore,
        avgScore,
        avgTime,
        easyWinRate: easyResults.length > 0 ? Math.round((easyResults.filter(r => r.won).length / easyResults.length) * 100) : 0,
        mediumWinRate: mediumResults.length > 0 ? Math.round((mediumResults.filter(r => r.won).length / mediumResults.length) * 100) : 0,
        hardWinRate: hardResults.length > 0 ? Math.round((hardResults.filter(r => r.won).length / hardResults.length) * 100) : 0,
        easyCount: easyResults.length,
        mediumCount: mediumResults.length,
        hardCount: hardResults.length,
      }
    })
    
    return stats
  }, [progress.results])

  const sortedGames = useMemo(() => {
    return GAME_DATA
      .map(g => gameStats[g.id])
      .sort((a, b) => {
        if (sortBy === 'plays') return b.totalPlays - a.totalPlays
        if (sortBy === 'score') return b.bestScore - a.bestScore
        if (sortBy === 'coins') return b.totalCoins - a.totalCoins
        return 0
      })
  }, [gameStats, sortBy])

  const totalEarned = Object.values(gameStats).reduce((sum, g) => sum + g.totalCoins, 0)
  const totalPlayed = Object.values(gameStats).reduce((sum, g) => sum + g.totalPlays, 0)
  const totalWins = Object.values(gameStats).reduce((sum, g) => sum + g.wins, 0)
  const overallWinRate = totalPlayed > 0 ? Math.round((totalWins / totalPlayed) * 100) : 0

  if (selectedGame) {
    const stats = gameStats[selectedGame.id]
    return (
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 20px 80px', background: bg, minHeight: '100dvh' }}>
        <button onClick={() => setSelectedGame(null)} style={{ 
          background: surface, border: `2px solid ${borderCol}`, borderRadius: 12, 
          padding: '8px 14px', fontSize: 16, cursor: 'pointer', color: textMain, marginBottom: 24 
        }}>
          ← Kembali
        </button>

        <div style={{ background: surface, borderRadius: 20, padding: 24, border: `2px solid ${borderCol}`, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 48 }}>{selectedGame.emoji}</div>
            <div>
              <h2 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 28, color: textMain, margin: 0 }}>
                {selectedGame.name}
              </h2>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 20 }}>
            <div style={{ background: dark ? 'rgba(162,155,254,0.1)' : 'rgba(162,155,254,0.05)', borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, color: textMuted, fontWeight: 600, marginBottom: 4 }}>Total Games</div>
              <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 32, color: '#A29BFE' }}>{stats.totalPlays}</div>
            </div>
            <div style={{ background: dark ? 'rgba(78,205,196,0.1)' : 'rgba(78,205,196,0.05)', borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, color: textMuted, fontWeight: 600, marginBottom: 4 }}>Win Rate</div>
              <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 32, color: '#4ECDC4' }}>{stats.winRate}%</div>
            </div>
            <div style={{ background: dark ? 'rgba(253,203,110,0.1)' : 'rgba(253,203,110,0.05)', borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, color: textMuted, fontWeight: 600, marginBottom: 4 }}>Best Score</div>
              <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 32, color: '#FDCB6E' }}>{stats.bestScore}</div>
            </div>
            <div style={{ background: dark ? 'rgba(0,184,148,0.1)' : 'rgba(0,184,148,0.05)', borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, color: textMuted, fontWeight: 600, marginBottom: 4 }}>Coins Earned</div>
              <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 32, color: '#00B894' }}>🪙 {stats.totalCoins}</div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: textMain, marginBottom: 12 }}>Win Rate per Difficulty</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              <div style={{ background: dark ? '#1a5a42' : '#E8F8F0', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: textMuted, marginBottom: 6 }}>🟢 Easy</div>
                <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 24, color: '#00B894', marginBottom: 4 }}>{stats.easyWinRate}%</div>
                <div style={{ fontSize: 11, color: textMuted }}>({stats.easyCount} games)</div>
              </div>
              <div style={{ background: dark ? '#4a4a1a' : '#FFFBF0', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: textMuted, marginBottom: 6 }}>🟡 Medium</div>
                <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 24, color: '#FDCB6E', marginBottom: 4 }}>{stats.mediumWinRate}%</div>
                <div style={{ fontSize: 11, color: textMuted }}>({stats.mediumCount} games)</div>
              </div>
              <div style={{ background: dark ? '#5a1a1a' : '#FFF0F0', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: textMuted, marginBottom: 6 }}>🔴 Hard</div>
                <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 24, color: '#FF6B6B', marginBottom: 4 }}>{stats.hardWinRate}%</div>
                <div style={{ fontSize: 11, color: textMuted }}>({stats.hardCount} games)</div>
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: textMain, marginBottom: 12 }}>Other Stats</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
              <div style={{ background: surface, border: `1px solid ${borderCol}`, borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 12, color: textMuted, marginBottom: 4 }}>Average Score</div>
                <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 20, color: textMain }}>{stats.avgScore}</div>
              </div>
              <div style={{ background: surface, border: `1px solid ${borderCol}`, borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 12, color: textMuted, marginBottom: 4 }}>Avg Time/Game</div>
                <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 20, color: textMain }}>{Math.floor(stats.avgTime / 60)}:{String(stats.avgTime % 60).padStart(2, '0')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 20px 80px', background: bg, minHeight: '100dvh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{ 
          background: surface, border: `2px solid ${borderCol}`, borderRadius: 12, 
          padding: '8px 14px', fontSize: 18, cursor: 'pointer', color: textMain 
        }}>
          ←
        </button>
        <h1 style={{ fontFamily: "'Fredoka One',cursive", fontSize: 28, color: textMain, margin: 0 }}>
          📊 Game Statistics
        </h1>
      </div>

      {/* Overall Stats */}
      <div style={{ background: surface, borderRadius: 20, padding: 24, border: `2px solid ${borderCol}`, marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: textMain, marginBottom: 16, margin: 0 }}>Overall Stats</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginTop: 12 }}>
          <div style={{ background: dark ? 'rgba(162,155,254,0.1)' : 'rgba(162,155,254,0.05)', borderRadius: 14, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: textMuted, fontWeight: 600, marginBottom: 8 }}>Total Plays</div>
            <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 36, color: '#A29BFE' }}>{totalPlayed}</div>
          </div>
          <div style={{ background: dark ? 'rgba(78,205,196,0.1)' : 'rgba(78,205,196,0.05)', borderRadius: 14, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: textMuted, fontWeight: 600, marginBottom: 8 }}>Win Rate</div>
            <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 36, color: '#4ECDC4' }}>{overallWinRate}%</div>
          </div>
          <div style={{ background: dark ? 'rgba(0,184,148,0.1)' : 'rgba(0,184,148,0.05)', borderRadius: 14, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: textMuted, fontWeight: 600, marginBottom: 8 }}>Total Wins</div>
            <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 36, color: '#00B894' }}>{totalWins}</div>
          </div>
          <div style={{ background: dark ? 'rgba(253,203,110,0.1)' : 'rgba(253,203,110,0.05)', borderRadius: 14, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: textMuted, fontWeight: 600, marginBottom: 8 }}>Coins Earned</div>
            <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 36, color: '#FDCB6E' }}>🪙 {totalEarned}</div>
          </div>
        </div>
      </div>

      {/* Game List */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: textMain, margin: 0 }}>Per-Game Stats</h2>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{
            background: surface, border: `2px solid ${borderCol}`, borderRadius: 8,
            color: textMain, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer'
          }}>
            <option value="plays">Sort by Plays</option>
            <option value="score">Sort by Best Score</option>
            <option value="coins">Sort by Coins</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sortedGames.map(game => (
            <button
              key={game.id}
              onClick={() => setSelectedGame(game)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: surface, border: `2px solid ${borderCol}`, borderRadius: 14,
                padding: 16, cursor: 'pointer', transition: 'all 0.2s',
                textAlign: 'left', color: 'inherit', fontSize: 'inherit', fontFamily: 'inherit'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#A29BFE'}
              onMouseLeave={e => e.currentTarget.style.borderColor = borderCol}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <span style={{ fontSize: 28 }}>{game.emoji}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: textMain }}>{game.name}</div>
                  <div style={{ fontSize: 11, color: textMuted }}>
                    {game.totalPlays} plays • {game.wins}W {game.losses}L • {game.winRate}%
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: game.bestScore > 0 ? '#FDCB6E' : textMuted }}>
                  {game.bestScore > 0 ? game.bestScore : '—'}
                </div>
                <div style={{ fontSize: 11, color: textMuted }}>🪙 {game.totalCoins}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
