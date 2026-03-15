import { useState, useEffect } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useLeaderboard } from '../context/LeaderboardContext.jsx'

const GAME_TABS = [
  { id:'memory-card',    emoji:'🃏', label:'Memory' },
  { id:'slither-worm',   emoji:'🐍', label:'Slither' },
  { id:'2048',           emoji:'🔗', label:'Blocks' },
  { id:'word-search',    emoji:'🔍', label:'Words' },
  { id:'space-shooter',  emoji:'🚀', label:'Space' },
  { id:'hangman',        emoji:'💀', label:'Hangman' },
  { id:'color-sort',     emoji:'🧪', label:'Colors' },
  { id:'sudoku',         emoji:'🔢', label:'Sudoku' },
  { id:'jigsaw',         emoji:'🧩', label:'Jigsaw' },
]

const DIFF_TABS = [
  { id: null, label: '🏆 Semua' },
  { id: 'easy', label: '🟢 Mudah' },
  { id: 'medium', label: '🟡 Sedang' },
  { id: 'hard', label: '🔴 Sulit' },
]

const MEDALS = ['🥇','🥈','🥉']

function formatDate(ts) {
  if (!ts) return ''
  const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts)
  return d.toLocaleDateString('id-ID', { day:'numeric', month:'short' })
}

function formatTime(s) {
  if (!s && s !== 0) return ''
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`
}

export default function Leaderboard({ onBack, games }) {
  const { darkMode } = useSettings()
  const { play } = useSound()
  const { nickname, setNickname, getOnlineScores, getLocalBoard, loading } = useLeaderboard()

  const [gameTab, setGameTab] = useState('space-shooter')
  const [diffTab, setDiffTab] = useState(null)
  const [mode, setMode] = useState('online') // 'online' | 'local'
  const [scores, setScores] = useState([])
  const [showNickname, setShowNickname] = useState(!nickname)
  const [nameInput, setNameInput] = useState(nickname || '')

  const dark = darkMode
  const bg = dark ? '#0d0b1e' : '#FFF9F0'
  const surface = dark ? '#16213e' : '#fff'
  const textMain = dark ? '#e8e8f0' : '#2D3436'
  const textMuted = dark ? '#8892b0' : '#636E72'
  const borderCol = dark ? '#2d3561' : '#DFE6E9'

  // Fetch scores when tab/mode changes
  useEffect(() => {
    let cancelled = false
    async function load() {
      let data
      if (mode === 'online') {
        data = await getOnlineScores(gameTab, diffTab)
      } else {
        data = getLocalBoard(gameTab, diffTab)
      }
      if (!cancelled) setScores(data || [])
    }
    load()
    return () => { cancelled = true }
  }, [gameTab, diffTab, mode, getOnlineScores, getLocalBoard])

  const saveNickname = () => {
    const n = nameInput.trim()
    if (n.length >= 2) {
      setNickname(n)
      setShowNickname(false)
      play('click')
    }
  }

  return (
    <>
      <style>{`
        .lb-root { min-height:100vh; padding:32px 20px 80px; transition:background 0.4s; }
        .lb-inner { max-width:600px; margin:0 auto; }
        .lb-back {
          display:inline-flex; align-items:center; gap:8px;
          background:${surface}; border:2px solid ${borderCol};
          border-radius:12px; padding:9px 18px;
          font-size:14px; font-weight:700; color:${textMuted};
          cursor:pointer; margin-bottom:24px; font-family:'Nunito',sans-serif;
          transition:all 0.18s;
        }
        .lb-back:hover { border-color:#A29BFE; color:#A29BFE; transform:translateX(-3px); }
        .lb-game-row {
          display:flex; gap:6px; margin-bottom:14px; flex-wrap:nowrap;
          overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; padding-bottom:4px;
        }
        .lb-game-row::-webkit-scrollbar { display:none; }
        .lb-game-tab {
          flex:0 0 auto; padding:8px 14px; border-radius:14px;
          border:2px solid ${borderCol}; background:transparent;
          font-family:'Fredoka One',cursive; font-size:12px;
          color:${textMuted}; cursor:pointer; transition:all 0.2s;
          text-align:center; white-space:nowrap; display:flex; align-items:center; gap:4px;
        }
        .lb-game-tab.active { border-color:#A29BFE; background:#A29BFE18; color:#A29BFE; }
        .lb-diff-row { display:flex; gap:6px; margin-bottom:14px; flex-wrap:wrap; }
        .lb-diff-tab {
          flex:1; min-width:60px; padding:7px 8px; border-radius:12px;
          border:2px solid ${borderCol}; background:transparent;
          font-size:11px; font-weight:700; color:${textMuted};
          cursor:pointer; transition:all 0.2s; text-align:center;
        }
        .lb-diff-tab.active { border-color:#FDCB6E; background:#FDCB6E18; color:#F9A825; }
        .lb-mode-row { display:flex; gap:6px; margin-bottom:20px; }
        .lb-mode-btn {
          flex:1; padding:10px; border-radius:14px;
          border:2px solid ${borderCol}; background:transparent;
          font-family:'Fredoka One',cursive; font-size:13px;
          color:${textMuted}; cursor:pointer; transition:all 0.2s; text-align:center;
        }
        .lb-mode-btn.active-online { border-color:#4ECDC4; background:#4ECDC418; color:#4ECDC4; }
        .lb-mode-btn.active-local { border-color:#A29BFE; background:#A29BFE18; color:#A29BFE; }
        .lb-row {
          display:flex; align-items:center; gap:12px; padding:12px 16px;
          border-radius:16px; margin-bottom:8px; transition:all 0.2s;
          background:${surface}; border:1.5px solid ${borderCol};
        }
        .lb-row:hover { transform:translateY(-1px); border-color:#A29BFE44; }
        .lb-row.top-3 { border-color:#FDCB6E66; background:${dark?'#1a1a30':('#FFFCF0')}; }
        @keyframes slideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div className="lb-root" style={{ background:bg }}>
        <div className="lb-inner">
          <button className="lb-back" onClick={() => { play('click'); onBack() }}>← Kembali</button>

          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:24, animation:'slideUp 0.4s ease both' }}>
            <div style={{ fontSize:48, marginBottom:8 }}>🏆</div>
            <h1 style={{ fontFamily:"'Fredoka One',cursive", fontSize:28, color:textMain, marginBottom:6 }}>Leaderboard</h1>
            <p style={{ fontSize:13, color:textMuted }}>Lihat ranking pemain terbaik di setiap game!</p>
          </div>

          {/* Nickname */}
          {showNickname || !nickname ? (
            <div style={{
              background:surface, border:`2px solid #A29BFE44`, borderRadius:20,
              padding:'20px', marginBottom:24, textAlign:'center',
              animation:'slideUp 0.4s 0.05s ease both',
            }}>
              <div style={{ fontSize:28, marginBottom:8 }}>✏️</div>
              <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:16, color:textMain, marginBottom:4 }}>
                {nickname ? 'Ganti Nickname' : 'Set Nickname Dulu!'}
              </div>
              <p style={{ fontSize:12, color:textMuted, marginBottom:14 }}>
                Nickname akan tampil di leaderboard global
              </p>
              <div style={{ display:'flex', gap:8, maxWidth:300, margin:'0 auto' }}>
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value.slice(0, 20))}
                  onKeyDown={(e) => e.key === 'Enter' && saveNickname()}
                  placeholder="Masukkan nickname..."
                  style={{
                    flex:1, padding:'10px 16px', borderRadius:12,
                    border:`2px solid ${borderCol}`, background:dark?'#0d0b1e':'#f8f8f8',
                    color:textMain, fontSize:14, fontWeight:700,
                    fontFamily:"'Nunito',sans-serif", outline:'none',
                  }}
                />
                <button onClick={saveNickname} disabled={nameInput.trim().length < 2}
                  style={{
                    background: nameInput.trim().length >= 2 ? 'linear-gradient(135deg,#A29BFE,#6C5CE7)' : (dark?'#1e2a4a':'#eee'),
                    color: nameInput.trim().length >= 2 ? '#fff' : textMuted,
                    border:'none', borderRadius:12, padding:'10px 20px',
                    fontFamily:"'Fredoka One',cursive", fontSize:14,
                    cursor: nameInput.trim().length >= 2 ? 'pointer' : 'default',
                  }}>
                  ✓
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              background:surface, border:`1.5px solid ${borderCol}`, borderRadius:14,
              padding:'10px 16px', marginBottom:20, animation:'slideUp 0.4s 0.05s ease both',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:18 }}>👤</span>
                <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:15, color:'#A29BFE' }}>{nickname}</span>
              </div>
              <button onClick={() => setShowNickname(true)}
                style={{ background:'transparent', border:`1.5px solid ${borderCol}`, borderRadius:8, padding:'5px 12px', fontSize:11, color:textMuted, cursor:'pointer', fontWeight:700 }}>
                ✏️ Ganti
              </button>
            </div>
          )}

          {/* Game tabs */}
          <div className="lb-game-row">
            {GAME_TABS.map(g => (
              <button key={g.id} className={`lb-game-tab ${gameTab===g.id?'active':''}`}
                onClick={() => { play('click'); setGameTab(g.id); setScores([]) }}>
                {g.emoji} {g.label}
              </button>
            ))}
          </div>

          {/* Difficulty tabs */}
          <div className="lb-diff-row">
            {DIFF_TABS.map(d => (
              <button key={d.id||'all'} className={`lb-diff-tab ${diffTab===d.id?'active':''}`}
                onClick={() => { play('click'); setDiffTab(d.id); setScores([]) }}>
                {d.label}
              </button>
            ))}
          </div>

          {/* Mode toggle */}
          <div className="lb-mode-row">
            <button className={`lb-mode-btn ${mode==='online'?'active-online':''}`}
              onClick={() => { play('click'); setMode('online'); setScores([]) }}>
              🌐 Global
            </button>
            <button className={`lb-mode-btn ${mode==='local'?'active-local':''}`}
              onClick={() => { play('click'); setMode('local'); setScores([]) }}>
              📱 Lokal
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign:'center', padding:'30px 20px', color:textMuted }}>
              <div style={{ fontSize:32, marginBottom:8, animation:'spin 1s linear infinite' }}>⏳</div>
              <p style={{ fontFamily:"'Fredoka One',cursive", fontSize:14 }}>Memuat skor...</p>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {/* Scores list */}
          {!loading && scores.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px 20px', color:textMuted, animation:'slideUp 0.3s ease' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📊</div>
              <p style={{ fontFamily:"'Fredoka One',cursive", fontSize:16, marginBottom:6 }}>
                {mode === 'online' ? 'Belum ada skor global' : 'Belum ada skor lokal'}
              </p>
              <p style={{ fontSize:12 }}>Mainkan game dan jadi yang pertama di leaderboard!</p>
            </div>
          )}

          {!loading && scores.length > 0 && (
            <div style={{ animation:'slideUp 0.3s ease' }}>
              {scores.map((entry, i) => {
                const rank = entry.rank || i + 1
                const isTop3 = rank <= 3
                return (
                  <div key={entry.id || `${i}-${entry.score}`}
                    className={`lb-row ${isTop3 ? 'top-3' : ''}`}
                    style={{ animation: `slideUp 0.3s ${i * 0.03}s ease both` }}>
                    {/* Rank */}
                    <div style={{
                      width:36, height:36, borderRadius:10, flexShrink:0,
                      background: isTop3
                        ? 'linear-gradient(135deg,#FDCB6E,#F9A825)'
                        : (dark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.04)'),
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontFamily:"'Fredoka One',cursive",
                      fontSize: isTop3 ? 18 : 14,
                      color: isTop3 ? '#fff' : textMuted,
                      boxShadow: isTop3 ? '0 3px 10px rgba(253,203,110,0.3)' : 'none',
                    }}>
                      {isTop3 ? MEDALS[rank-1] : rank}
                    </div>
                    {/* Name + date */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{
                        fontFamily:"'Fredoka One',cursive", fontSize:14, color:textMain,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                      }}>
                        {entry.name || 'Anon'}
                        {entry.name === nickname && (
                          <span style={{ fontSize:10, color:'#A29BFE', marginLeft:6 }}>← Kamu</span>
                        )}
                      </div>
                      <div style={{ fontSize:10, color:textMuted, marginTop:1 }}>
                        {formatDate(entry.createdAt || entry.date)}
                        {entry.wave ? ` • Wave ${entry.wave}` : ''}
                        {entry.level ? ` • Lv${entry.level}` : ''}
                        {entry.time ? ` • ${formatTime(entry.time)}` : ''}
                        {entry.diffId ? ` • ${entry.diffId}` : ''}
                      </div>
                    </div>
                    {/* Score */}
                    <div style={{
                      fontFamily:"'Fredoka One',cursive", fontSize:isTop3?18:16,
                      color: isTop3 ? '#F9A825' : '#4ECDC4',
                      flexShrink:0,
                    }}>
                      {(entry.score || 0).toLocaleString()}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </div>
    </>
  )
}
