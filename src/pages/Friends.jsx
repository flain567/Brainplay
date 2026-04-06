import { useState, useEffect } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useFriends } from '../context/FriendsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useThemeColors } from '../hooks/useThemeColors.js'
import { useSocial } from '../context/SocialContext.jsx'
import { useMatch } from '../context/MatchContext.jsx'
import UserProfileModal from '../components/UserProfileModal.jsx'

export default function Friends({ onBack }) {
  const { darkMode } = useSettings()
  const { play } = useSound()
  const tc = useThemeColors()
  const { friends, friendCode, requests, loading, error, addFriendByCode, removeFriend, acceptFriendRequest, declineFriendRequest } = useFriends()
  const { incomingInvites, createMatch, acceptMatch, activeMatch } = useMatch()
  const { isLoggedIn, isGuest, userId } = useAuth()
  const { getProfile } = useSocial()

  const [inputCode, setInputCode] = useState('')
  const [adding, setAdding] = useState(false)
  const [addMessage, setAddMessage] = useState(null)
  
  const [friendProfiles, setFriendProfiles] = useState({})
  const [requestProfiles, setRequestProfiles] = useState({})
  const [inviteProfiles, setInviteProfiles] = useState({})
  const [inspectingUid, setInspectingUid] = useState(null)
  const [showGameSelect, setShowGameSelect] = useState(null) // targetUid or null
  
  const dark = tc.dark
  const bg = tc.bg
  const surface = tc.surface
  const textMain = tc.textMain
  const textMuted = tc.textMuted
  const borderCol = tc.borderCol

  // Fetch profiles for friends
  useEffect(() => {
    let mounted = true
    const fetchFriends = async () => {
      const profiles = { ...friendProfiles }
      let changed = false
      for (const f of friends) {
        if (!profiles[f.uid]) {
          const p = await getProfile(f.uid)
          if (p) {
            profiles[f.uid] = p
            changed = true
          }
        }
      }
      if (mounted && changed) setFriendProfiles(profiles)
    }
    fetchFriends()
    return () => { mounted = false }
  }, [friends, getProfile])

  // Fetch profiles for match invites
  useEffect(() => {
    let mounted = true
    const fetchInviteProfiles = async () => {
      const profiles = { ...inviteProfiles }
      let changed = false
      for (const inv of incomingInvites) {
        if (!profiles[inv.hostUid]) {
          const p = await getProfile(inv.hostUid)
          if (p) {
            profiles[inv.hostUid] = p
            changed = true
          }
        }
      }
      if (mounted && changed) setInviteProfiles(profiles)
    }
    fetchInviteProfiles()
    return () => { mounted = false }
  }, [incomingInvites, getProfile])

  const copyCode = () => {
    if (!friendCode) return
    play('click')
    navigator.clipboard.writeText(friendCode)
    setAddMessage({ type: 'success', text: 'Kode berhasil disalin! 📋' })
    setTimeout(() => setAddMessage(null), 2000)
  }

  const handleAdd = async () => {
    if (!inputCode.trim()) return
    play('click')
    setAdding(true)
    const code = inputCode.trim()
    const res = await addFriendByCode(code)
    setAdding(false)
    if (res.success) {
      setAddMessage({ type: 'success', text: 'Teman berhasil ditambahkan! 🎉' })
      setInputCode('')
    } else {
      setAddMessage({ type: 'error', text: res.error || 'Gagal menambahkan teman.' })
    }
    setTimeout(() => setAddMessage(null), 3000)
  }

  const handleRemove = async (e, uid) => {
    e.stopPropagation()
    play('click')
    if (confirm('Yakin ingin menghapus teman ini? 😢')) {
      await removeFriend(uid)
    }
  }

  const handleAccept = async (e, req) => {
    e.stopPropagation()
    play('level_up')
    await acceptFriendRequest(req)
  }

  const handleDecline = async (e, reqId) => {
    e.stopPropagation()
    play('click')
    await declineFriendRequest(reqId)
  }

  const handleChallenge = async (friendUid, gameId) => {
    play('level_up')
    const res = await createMatch(friendUid, gameId)
    if (res.success) {
      setAddMessage({ type: 'success', text: 'Tantangan dikirim! Menunggu teman...' })
      setShowGameSelect(null)
      setTimeout(() => setAddMessage(null), 3000)
    }
  }

  const handleAcceptMatch = async (e, matchId) => {
    e.stopPropagation()
    play('level_up')
    await acceptMatch(matchId)
  }

  return (
    <>
      <style>{`
        .friends-root {
          min-height: 100vh; padding: 20px 20px 100px;
          transition: background 0.4s;
        }
        .friends-inner { max-width: 600px; margin: 0 auto; }
        .friends-back {
          display: inline-flex; align-items: center; gap: 8px;
          background: ${surface}; border: 2px solid ${borderCol};
          border-radius: 12px; padding: 9px 18px;
          font-size: 14px; font-weight: 700; color: ${textMuted};
          cursor: pointer; margin-bottom: 24px; font-family: 'Nunito',sans-serif;
          transition: all 0.18s ease;
        }
        .friends-back:hover { border-color: #A29BFE; color: #A29BFE; transform: translateX(-3px); }

        .f-card {
          background: ${surface}; border: 2px solid ${borderCol};
          border-radius: 20px; padding: 24px; margin-bottom: 24px;
          animation: slide-up 0.4s ease both;
        }
        
        .code-box {
          background: ${dark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)'};
          border: 2px dashed ${borderCol}; border-radius: 16px;
          padding: 16px; display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 16px; cursor: pointer; transition: all 0.2s;
        }
        .code-box:hover { border-color: #4ECDC4; background: ${dark ? 'rgba(78,205,196,0.1)' : 'rgba(78,205,196,0.05)'}; }
        
        .add-input {
          flex: 1; padding: 12px 16px; border-radius: 12px;
          border: 2px solid ${borderCol}; background: ${dark ? '#0d0b1e' : '#f8f8f8'};
          color: ${textMain}; font-size: 15px; font-weight: 700;
          font-family: 'Nunito', sans-serif; outline: none; text-transform: uppercase;
        }
        .add-input:focus { border-color: #A29BFE; }
        
        .add-btn {
          padding: 12px 24px; border-radius: 12px;
          background: linear-gradient(135deg, #A29BFE, #6C5CE7);
          color: #fff; border: none; font-weight: 800;
          font-family: 'Fredoka One', cursive; cursor: pointer;
        }
        .add-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .friend-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px; border-radius: 16px; background: ${dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'};
          border: 1px solid transparent; transition: all 0.2s; cursor: pointer;
          margin-bottom: 8px;
        }
        .friend-item:hover {
          background: ${dark ? 'rgba(255,255,255,0.05)' : 'white'};
          border-color: ${borderCol}; transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
      `}</style>

      {inspectingUid && (
        <UserProfileModal uid={inspectingUid} onClose={() => setInspectingUid(null)} />
      )}

      <div className="friends-root" style={{ background: bg }}>
        <div className="friends-inner">
          <button className="friends-back" onClick={() => { play('click'); onBack() }}>
            ← Kembali
          </button>

          <div style={{ textAlign:'center', marginBottom:32, animation:'slide-up 0.4s ease both' }}>
            <div style={{ fontSize:56, marginBottom:12 }}>🤝</div>
            <h1 style={{ fontFamily:"'Fredoka One',cursive", fontSize:32, color: textMain, marginBottom:8 }}>FRIENDS SYSTEM</h1>
            <p style={{ color: textMuted, fontSize: 14 }}>Batas pertemanan: {friends.length} / 50</p>
          </div>

          {/* Add Friend Card */}
          <div className="f-card">
            <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:18, color: textMain, marginBottom:16 }}>Tambahkan Teman</h2>
            
            <div style={{ display:'flex', gap:12, marginBottom:12 }}>
              <input 
                className="add-input" 
                placeholder="MASUKKAN KODE TEMAN..." 
                value={inputCode} 
                onChange={e => setInputCode(e.target.value)}
                maxLength={6}
              />
              <button className="add-btn" onClick={handleAdd} disabled={adding || !inputCode}>
                {adding ? '...' : 'TAMBAH'}
              </button>
            </div>
            {addMessage && (
              <div style={{ 
                fontSize: 13, fontWeight: 700, 
                color: addMessage.type === 'error' ? '#FF6B6B' : '#4ECDC4',
                animation: 'slide-up 0.2s ease', 
                background: addMessage.type === 'error' ? 'rgba(255,107,107,0.1)' : 'rgba(78,205,196,0.1)',
                padding: '8px 12px', borderRadius: 8, textAlign: 'center'
              }}>
                {addMessage.text}
              </div>
            )}
          </div>

          {/* My Code Card */}
          <div className="f-card" style={{ animationDelay: '0.1s' }}>
            <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:18, color: textMain, marginBottom:16 }}>Kode Kamu</h2>
            <div className="code-box" onClick={copyCode}>
              <div>
                <div style={{ fontSize: 13, color: textMuted, marginBottom: 4, fontWeight: 700 }}>KETUK UNTUK MENYALIN</div>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize: 28, color: '#4ECDC4', letterSpacing: '4px' }}>
                  {friendCode || '------'}
                </div>
              </div>
              <div style={{ fontSize: 24 }}>📋</div>
            </div>
            <p style={{ fontSize: 13, color: textMuted, lineHeight: 1.5 }}>
              Berikan kode ini ke temanmu agar mereka bisa menambahkanmu ke daftar teman.
            </p>
          </div>

          {/* Incoming Match Invites Section */}
          {(incomingInvites.length > 0 || activeMatch?.status === 'pending') && (
            <div className="f-card" style={{ 
              animationDelay: '0.1s', 
              border: '2px solid #FDCB6E',
              background: dark ? 'rgba(253,203,110,0.05)' : '#FFF9F0'
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                <span style={{ fontSize:20 }}>⚔️</span>
                <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:18, color: textMain, margin:0 }}>Tantangan Masuk</h2>
              </div>

              {activeMatch?.status === 'pending' && activeMatch.hostUid === userId && (
                 <div className="friend-item" style={{ background: dark ? 'rgba(255,255,255,0.03)' : 'white' }}>
                    <div style={{ fontSize: 13, color: textMuted, fontWeight: 700 }}>
                      MENUNGGU TEMAN MENERIMA TANTANGAN...
                    </div>
                    <div className="pulse-dot" style={{ width:8, height:8, background:'#FDCB6E', borderRadius:'50%' }} />
                 </div>
              )}

              {incomingInvites.map((inv, i) => {
                const prof = inviteProfiles[inv.hostUid]
                return (
                  <div key={inv.id} className="friend-item" style={{ background: dark ? 'rgba(255,255,255,0.03)' : 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                       <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                          {prof?.photoURL ? <img src={prof.photoURL} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <div style={{ fontSize: 20, textAlign:'center', marginTop:8 }}>👤</div>}
                       </div>
                       <div>
                          <div style={{ fontFamily:"'Fredoka One',cursive", fontSize: 15, color: textMain }}>{prof?.displayName || 'Teman'}</div>
                          <div style={{ fontSize: 10, color: '#FDCB6E', fontWeight: 800, textTransform: 'uppercase' }}>
                            Tantang Main {inv.gameId === 'math-challenge' ? 'Math' : 'Reaction'}!
                          </div>
                       </div>
                    </div>
                    <button 
                      onClick={(e) => handleAcceptMatch(e, inv.id)}
                      style={{ padding: '8px 16px', borderRadius: 10, background: '#FDCB6E', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: "'Fredoka One', cursive", fontSize: 12 }}
                    > TERIMA </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Incoming Requests Section with Error/Loading Handling */}
          <div className="f-card" style={{ 
            animationDelay: '0.15s', 
            border: requests.length > 0 ? '2px solid #A29BFE' : `2px solid ${borderCol}`,
            background: requests.length > 0 ? (dark ? 'rgba(162,155,254,0.05)' : '#F0F0FF') : surface
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:20 }}>📬</span>
                <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:18, color: textMain, margin:0 }}>Permintaan Pertemanan</h2>
              </div>
              {requests.length > 0 && <div className="pulse-dot" style={{ width:10, height:10, background:'#FF6B6B', borderRadius:'50%' }} />}
            </div>

            {error && (
              <div style={{ color: '#FF6B6B', fontSize: 12, fontWeight: 700, padding: 10, background: 'rgba(255,107,107,0.1)', borderRadius: 10, marginBottom: 12 }}>
                ⚠️ {error}
              </div>
            )}

            {requests.length === 0 ? (
              <div style={{ textAlign:'center', padding:'10px 0', color:textMuted, fontSize:13 }}>
                {loading ? '⏳ Mencari permintaan...' : 'Belum ada permintaan baru.'}
              </div>
            ) : (
              <div>
                {requests.map((r, i) => {
                  const prof = requestProfiles[r.fromUid]
                  return (
                    <div 
                      key={r.id} 
                      className="friend-item" 
                      style={{ animation: `slide-up 0.3s ${i * 0.05}s ease both`, background: dark ? 'rgba(255,255,255,0.03)' : 'white' }}
                      onClick={() => setInspectingUid(r.fromUid)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {prof?.photoURL ? (
                            <img src={prof.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ fontSize: 20 }}>👤</div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontFamily:"'Fredoka One',cursive", fontSize: 15, color: textMain }}>
                            {prof?.displayName || 'Pemain'}
                          </div>
                          <div style={{ fontSize: 10, color: '#A29BFE', fontWeight: 800, textTransform: 'uppercase', marginTop: 2 }}>
                            Ingin Berteman!
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button 
                          onClick={(e) => handleAccept(e, r)}
                          style={{ padding: '8px 16px', borderRadius: 10, background: '#4ECDC4', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: "'Fredoka One', cursive", fontSize: 12 }}
                        >
                          TERIMA
                        </button>
                        <button 
                          onClick={(e) => handleDecline(e, r.id)}
                          style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,107,107,0.1)', color: '#FF6B6B', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Friends List */}
          <div className="f-card" style={{ animationDelay: '0.2s' }}>
            <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:18, color: textMain, marginBottom:16 }}>Daftar Teman ({friends.length})</h2>
            
            {friends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 20px', color: textMuted }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>👻</div>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize: 15 }}>Masih sepi nih...</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Ayo tambahkan teman pertamamu!</div>
              </div>
            ) : (
              <div>
                {friends.map((f, i) => {
                  const prof = friendProfiles[f.uid]
                  return (
                    <div 
                      key={f.uid} 
                      className="friend-item" 
                      style={{ animation: `slide-up 0.3s ${i * 0.05}s ease both` }}
                      onClick={() => setInspectingUid(f.uid)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {prof?.photoURL ? (
                            <img src={prof.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ fontSize: 20 }}>👤</div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontFamily:"'Fredoka One',cursive", fontSize: 15, color: textMain }}>
                            {prof?.displayName || 'Pemain'}
                          </div>
                          {prof?.progress?.selectedTitle && (
                            <div style={{ fontSize: 10, color: '#A29BFE', fontWeight: 800, textTransform: 'uppercase', marginTop: 2 }}>
                              {prof.progress.selectedTitle}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowGameSelect(f.uid) }}
                          style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(162,155,254,0.1)', color: '#A29BFE', border: 'none', cursor: 'pointer', fontFamily: "'Fredoka One', cursive", fontSize: 11 }}
                        >
                          ⚔️ TANTANG
                        </button>
                        <button 
                          onClick={(e) => handleRemove(e, f.uid)}
                          style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,107,107,0.1)', color: '#FF6B6B', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {showGameSelect && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
            }} onClick={() => setShowGameSelect(null)}>
              <div style={{
                background: surface, border: `2px solid ${borderCol}`, borderRadius: 24, padding: 32,
                width: '100%', maxWidth: 400, textAlign: 'center'
              }} onClick={e => e.stopPropagation()}>
                <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 24, color: textMain, marginBottom: 24 }}>Pilih Game</h3>
                <div style={{ display: 'grid', gap: 12 }}>
                  <button onClick={() => handleChallenge(showGameSelect, 'math-challenge')} className="add-btn" style={{ background: '#6C5CE7' }}>
                    🧮 MATH CHALLENGE
                  </button>
                  <button onClick={() => handleChallenge(showGameSelect, 'reaction-test')} className="add-btn" style={{ background: '#F39C12' }}>
                    ⚡ REACTION TEST
                  </button>
                </div>
                <button onClick={() => setShowGameSelect(null)} style={{ marginTop: 24, background: 'none', border: 'none', color: textMuted, fontWeight: 700, cursor: 'pointer' }}>
                  BATAL
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
