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

// ─── Firebase Status Banner ──────────────────────────────────────────────────

function FirebaseStatusBanner({ dark, surface, borderCol, textMain, textMuted }) {
  const { firebaseStatus, firebaseMessage, retestFirebase, pendingCount } = useLeaderboard()
  const [showGuide, setShowGuide] = useState(false)
  const [testing, setTesting] = useState(false)

  if (firebaseStatus === 'connected' && pendingCount === 0) {
    return (
      <div style={{
        display:'flex', alignItems:'center', gap:8, padding:'8px 14px',
        background: dark ? 'rgba(78,205,196,0.08)' : 'rgba(78,205,196,0.06)',
        border:'1.5px solid rgba(78,205,196,0.3)', borderRadius:12,
        marginBottom:16, fontSize:12,
      }}>
        <span style={{ fontSize:14 }}>🟢</span>
        <span style={{ color:'#4ECDC4', fontWeight:700, flex:1 }}>Firebase Terhubung</span>
        <span style={{ color:textMuted, fontSize:10 }}>Skor sync ke semua device</span>
      </div>
    )
  }

  if (firebaseStatus === 'unknown') {
    return (
      <div style={{
        display:'flex', alignItems:'center', gap:8, padding:'8px 14px',
        background: dark ? 'rgba(253,203,110,0.08)' : 'rgba(253,203,110,0.06)',
        border:'1.5px solid rgba(253,203,110,0.3)', borderRadius:12,
        marginBottom:16, fontSize:12,
      }}>
        <span style={{ fontSize:14, animation:'spin 1s linear infinite' }}>⏳</span>
        <span style={{ color:'#FDCB6E', fontWeight:700 }}>{firebaseMessage || 'Mengecek Firebase...'}</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  // Error state
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{
        background: dark ? 'rgba(255,107,107,0.08)' : 'rgba(255,107,107,0.06)',
        border:'1.5px solid rgba(255,107,107,0.3)', borderRadius:14,
        padding:'14px 16px',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <span style={{ fontSize:16 }}>🔴</span>
          <span style={{ color:'#FF6B6B', fontWeight:700, fontSize:13, flex:1 }}>Firebase Tidak Terhubung</span>
          <button
            onClick={async () => { setTesting(true); await retestFirebase(); setTesting(false) }}
            disabled={testing}
            style={{
              background:'#FF6B6B22', border:'1px solid #FF6B6B44', borderRadius:8,
              padding:'5px 12px', color:'#FF6B6B', fontSize:11, fontWeight:700,
              cursor:'pointer', opacity: testing ? 0.5 : 1,
            }}>
            {testing ? '⏳' : '🔄'} Test
          </button>
        </div>
        <div style={{ fontSize:12, color:textMuted, lineHeight:1.6, marginBottom:8 }}>
          {firebaseMessage || 'Skor hanya tersimpan di device ini. Untuk sync antar device, Firebase harus aktif.'}
        </div>

        {pendingCount > 0 && (
          <div style={{
            fontSize:11, color:'#FDCB6E', fontWeight:700, marginBottom:8,
            padding:'6px 10px', background:'rgba(253,203,110,0.08)',
            borderRadius:8, display:'inline-block',
          }}>
            ⏳ {pendingCount} skor menunggu upload
          </div>
        )}

        <button
          onClick={() => setShowGuide(g => !g)}
          style={{
            background:'transparent', border:`1px solid ${borderCol}`, borderRadius:8,
            padding:'6px 14px', color:textMuted, fontSize:11, fontWeight:700,
            cursor:'pointer', width:'100%', textAlign:'center',
          }}>
          {showGuide ? '▲ Tutup Panduan' : '📖 Lihat Panduan Setup Firebase'}
        </button>

        {showGuide && (
          <div style={{
            marginTop:12, padding:'16px', background: dark ? '#0d0b1e' : '#f8f8f8',
            borderRadius:12, fontSize:12, color:textMain, lineHeight:1.8,
          }}>
            <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:14, marginBottom:10, color:'#A29BFE' }}>
              Setup Firestore Rules
            </div>
            <div style={{ marginBottom:12 }}>
              <strong>1.</strong> Buka <span style={{ color:'#4ECDC4', fontWeight:700 }}>Firebase Console</span> → project kamu
              <br/>
              <strong>2.</strong> Klik <strong>Firestore Database</strong> di sidebar
              <br/>
              <strong>3.</strong> Klik tab <strong>Rules</strong>
              <br/>
              <strong>4.</strong> Ganti isinya dengan:
            </div>
            <div style={{
              background: dark ? '#1a1a2e' : '#2d3436', color:'#a5f3fc',
              padding:'14px', borderRadius:10, fontSize:11,
              fontFamily:'monospace', whiteSpace:'pre-wrap', lineHeight:1.7,
              overflowX:'auto', userSelect:'all', marginBottom:12,
            }}>
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leaderboard/{docId} {
      allow read: if true;
      allow create: if request.resource.data.keys()
        .hasAll(['gameId','score','name'])
        && request.resource.data.score is number
        && request.resource.data.score >= 0
        && request.resource.data.score <= 9999999;
    }
  }
}`}
            </div>
            <div style={{ fontSize:11, color:textMuted, lineHeight:1.6 }}>
              <strong>5.</strong> Klik <strong>Publish</strong>
              <br/>
              <strong>6.</strong> Kembali ke sini dan klik tombol <strong>🔄 Test</strong>
              <br/><br/>
              <span style={{ color:'#FDCB6E' }}>💡</span> Rules di atas memperbolehkan semua orang <strong>membaca</strong> leaderboard dan <strong>menambah</strong> skor (tapi tidak bisa edit/hapus skor orang lain). Ini aman untuk leaderboard publik.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Leaderboard Page ───────────────────────────────────────────────────

export default function Leaderboard({ onBack, games }) {
  const { darkMode } = useSettings()
  const { play } = useSound()
  const { nickname, setNickname, getOnlineScores, getLocalBoard, clearCache, loading, lastError, firebaseStatus } = useLeaderboard()

  const [gameTab, setGameTab] = useState('space-shooter')
  const [diffTab, setDiffTab] = useState(null)
  const [mode, setMode] = useState('online')
  const [scores, setScores] = useState([])
  const [showNickname, setShowNickname] = useState(!nickname)
  const [nameInput, setNameInput] = useState(nickname || '')
  const [refreshKey, setRefreshKey] = useState(0)

  const dark = darkMode
  const bg = dark ? '#0d0b1e' : '#FFF9F0'
  const surface = dark ? '#16213e' : '#fff'
  const textMain = dark ? '#e8e8f0' : '#2D3436'
  const textMuted = dark ? '#8892b0' : '#636E72'
  const borderCol = dark ? '#2d3561' : '#DFE6E9'

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
  }, [gameTab, diffTab, mode, refreshKey, getOnlineScores, getLocalBoard])

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

          {/* Firebase Status Banner */}
          <FirebaseStatusBanner dark={dark} surface={surface} borderCol={borderCol} textMain={textMain} textMuted={textMuted} />

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
                    fontFamily:"'Nunito',sans-serif", outline:'none', boxSizing:'border-box',
                  }}
                />
                <button onClick={saveNickname}
                  style={{
                    padding:'10px 18px', borderRadius:12,
                    background:'linear-gradient(135deg,#A29BFE,#6C5CE7)',
                    color:'#fff', border:'none', fontWeight:800,
                    fontFamily:"'Fredoka One',cursive", cursor:'pointer', fontSize:13,
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

          {/* Mode toggle + refresh */}
          <div className="lb-mode-row">
            <button className={`lb-mode-btn ${mode==='online'?'active-online':''}`}
              onClick={() => { play('click'); setMode('online'); setScores([]) }}>
              🌐 Global {firebaseStatus === 'connected' ? '' : '⚠️'}
            </button>
            <button className={`lb-mode-btn ${mode==='local'?'active-local':''}`}
              onClick={() => { play('click'); setMode('local'); setScores([]) }}>
              📱 Lokal
            </button>
            <button
              onClick={() => { play('click'); clearCache(); setScores([]); setRefreshKey(k => k+1) }}
              style={{
                width:44, height:44, borderRadius:14, border:`2px solid ${borderCol}`,
                background:'transparent', fontSize:18, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                transition:'all 0.2s', flexShrink:0,
              }}
              title="Refresh"
            >
              🔄
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

          {/* Error banner */}
          {!loading && lastError && mode === 'online' && (
            <div style={{
              background:dark?'rgba(255,107,107,0.08)':'rgba(255,107,107,0.06)',
              border:'1.5px solid #FF6B6B44', borderRadius:14,
              padding:'12px 16px', marginBottom:14,
              display:'flex', alignItems:'center', gap:10,
            }}>
              <span style={{ fontSize:18 }}>⚠️</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, color:'#FF6B6B', fontWeight:700 }}>{lastError}</div>
                <div style={{ fontSize:11, color:textMuted, marginTop:2 }}>Scroll ke atas untuk lihat panduan setup Firebase</div>
              </div>
              <button onClick={() => { clearCache(); setScores([]); setRefreshKey(k => k+1) }}
                style={{ background:'#FF6B6B22', border:'1px solid #FF6B6B44', borderRadius:8, padding:'6px 12px', color:'#FF6B6B', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                🔄
              </button>
            </div>
          )}

          {/* Scores list */}
          {!loading && scores.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px 20px', color:textMuted, animation:'slideUp 0.3s ease' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📊</div>
              <p style={{ fontFamily:"'Fredoka One',cursive", fontSize:16, marginBottom:6 }}>
                {mode === 'online' ? 'Belum ada skor global' : 'Belum ada skor lokal'}
              </p>
              <p style={{ fontSize:12, lineHeight:1.6 }}>
                {mode === 'online'
                  ? firebaseStatus === 'error'
                    ? 'Firebase belum terhubung. Ikuti panduan setup di atas untuk mengaktifkan leaderboard global.'
                    : 'Mainkan game untuk submit skor ke leaderboard global! Skor akan muncul di semua device.'
                  : 'Skor lokal hanya tersimpan di device ini. Main game untuk mulai!'
                }
              </p>
              {mode === 'online' && firebaseStatus === 'connected' && (
                <button onClick={() => { clearCache(); setRefreshKey(k => k+1) }}
                  style={{ marginTop:14, background:dark?'rgba(78,205,196,0.1)':'rgba(78,205,196,0.08)', border:'1.5px solid #4ECDC444', borderRadius:12, padding:'8px 20px', color:'#4ECDC4', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:"'Fredoka One',cursive" }}>
                  🔄 Coba Refresh
                </button>
              )}
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
