import { useState, useEffect, lazy, Suspense } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useFriends } from '../context/FriendsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useThemeColors } from '../hooks/useThemeColors.js'
import { useSocial } from '../context/SocialContext.jsx'
import UserProfileModal from '../components/UserProfileModal.jsx'
import BorderGlow from '../components/BorderGlow.jsx'

const ChallengeModal = lazy(() => import('../components/ChallengeModal.jsx'))

export default function Friends({ onBack }) {
  const { darkMode } = useSettings()
  const { play } = useSound()
  const tc = useThemeColors()
  const { friends, friendCode, requests, loading, error, addFriendByCode, removeFriend, acceptFriendRequest, declineFriendRequest } = useFriends()
  const { getProfile } = useSocial()

  const [activeTab, setActiveTab] = useState('list') // 'list', 'add', 'requests'
  const [inputCode, setInputCode] = useState('')
  const [adding, setAdding] = useState(false)
  const [addMessage, setAddMessage] = useState(null)

  const [friendProfiles, setFriendProfiles] = useState({})
  const [inspectingUid, setInspectingUid] = useState(null)
  const [challengingFriend, setChallengingFriend] = useState(null)

  const dark = tc.dark
  const bg = tc.bg
  const surface = tc.surface
  const textMain = tc.textMain
  const textMuted = tc.textMuted
  const borderCol = tc.borderCol

  useEffect(() => {
    let mounted = true
    const fetchFriends = async () => {
      const profiles = { ...friendProfiles }
      let changed = false
      for (const f of friends) {
        if (!profiles[f.uid]) {
          const p = await getProfile(f.uid)
          if (p) { profiles[f.uid] = p; changed = true }
        }
      }
      if (mounted && changed) setFriendProfiles(profiles)
    }
    fetchFriends()
    return () => { mounted = false }
  }, [friends, getProfile])

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
    const res = await addFriendByCode(inputCode.trim())
    setAdding(false)
    if (res.success) {
      const msg = res.autoAccepted
        ? 'Langsung berteman! Kalian saling menambahkan 🎉'
        : 'Permintaan terkirim! Tunggu diterima 📨'
      setAddMessage({ type: 'success', text: msg })
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
    play('levelUp')
    await acceptFriendRequest(req)
  }

  const handleDecline = async (e, reqId) => {
    e.stopPropagation()
    play('click')
    await declineFriendRequest(reqId)
  }

  const handleChallenge = (e, f) => {
    e.stopPropagation()
    play('click')
    const prof = friendProfiles[f.uid]
    setChallengingFriend({
      uid: f.uid,
      displayName: prof?.displayName || f.displayName || 'Teman',
      photoURL: prof?.photoURL || f.photoURL || ''
    })
  }

  return (
    <>
      <style>{`
        .friends-root {
          min-height: 100vh; padding: 20px 20px 100px;
          background: ${bg}; transition: background 0.4s;
        }
        .friends-inner { max-width: 500px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
        
        .f-top-bar { display: flex; align-items: center; justify-content: space-between; }
        .f-back {
          display: inline-flex; align-items: center; justify-content: center;
          width: 44px; height: 44px; border-radius: 14px;
          background: ${surface}; border: 2px solid ${borderCol};
          color: ${textMain}; cursor: pointer; transition: all 0.2s;
        }
        .f-back:hover { border-color: #6C5CE7; color: #6C5CE7; transform: scale(1.05); }

        .f-header { text-align: center; animation: slide-down 0.4s ease both; }
        .f-title { fontFamily: 'Fredoka One', cursive; fontSize: 28px; color: ${textMain}; margin: 0; }
        .f-subtitle { fontSize: 13px; color: ${textMuted}; font-weight: 600; margin-top: 4px; }

        /* Tabs */
        .f-tabs {
          display: flex; gap: 8px; background: ${surface}; padding: 6px;
          border-radius: 18px; border: 2px solid ${borderCol};
        }
        .f-tab {
          flex: 1; padding: 12px 0; border-radius: 14px; border: none;
          background: transparent; color: ${textMuted}; font-family: 'Fredoka One', cursive;
          font-size: 13px; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
        }
        .f-tab.active {
          background: ${dark ? 'linear-gradient(135deg, rgba(108,92,231,0.2), rgba(162,155,254,0.1))' : 'linear-gradient(135deg, #e4e1fb, #f0effe)'};
          color: #6C5CE7; box-shadow: 0 4px 12px rgba(108,92,231,0.1);
          transform: translateY(-2px);
        }
        .f-tab-badge {
          position: absolute; top: 4px; right: 12px; width: 8px; height: 8px;
          background: #FF6B6B; border-radius: 50%; box-shadow: 0 0 8px rgba(255,107,107,0.8);
        }

        /* Lists and Cards */
        .f-content { animation: fade-in 0.3s ease both; }
        .f-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px; border-radius: 20px;
          background: ${surface}; border: 1px solid ${borderCol};
          margin-bottom: 12px; transition: all 0.2s; cursor: pointer;
        }
        .f-item:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.06); border-color: rgba(108,92,231,0.3); }
        
        .f-avatar-wrap {
          position: relative; width: 48px; height: 48px; flex-shrink: 0;
          border-radius: 14px; overflow: hidden; background: ${dark ? '#2a2a3e' : '#f0f0f0'};
          display: flex; alignItems: center; justifyContent: center;
        }
        .f-avatar-wrap img { width: 100%; height: 100%; objectFit: 'cover'; }

        .f-name { fontFamily: 'Fredoka One', cursive; fontSize: 16px; color: ${textMain}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .f-title-badge { 
          fontSize: 10px; color: #fff; background: linear-gradient(90deg, #A29BFE, #6C5CE7);
          padding: 2px 8px; border-radius: 8px; text-transform: uppercase; font-weight: 800; display: inline-block; margin-top: 4px;
        }

        /* PvP Button */
        .btn-pvp {
          display: flex; align-items: center; justify-content: center; width: 42px; height: 42px;
          background: linear-gradient(135deg, #FF6B6B, #FD79A8); border: none; border-radius: 14px;
          color: white; font-size: 20px; cursor: pointer; transition: all 0.2s;
          box-shadow: 0 6px 15px rgba(255,107,107,0.3);
        }
        .btn-pvp:hover { transform: scale(1.1) rotate(5deg); box-shadow: 0 8px 20px rgba(255,107,107,0.5); }
        .btn-remove {
          background: transparent; border: 2px solid ${borderCol}; color: ${textMuted};
          width: 38px; height: 38px; border-radius: 12px; display: flex; align-items: center; justifyContent: center;
          cursor: pointer; transition: all 0.2s;
        }
        .btn-remove:hover { background: rgba(255,107,107,0.1); border-color: #FF6B6B; color: #FF6B6B; }

        /* Add Friend UI */
        .code-display {
          background: ${dark ? 'rgba(78,205,196,0.1)' : 'rgba(78,205,196,0.05)'};
          border: 2px dashed #4ECDC4; border-radius: 20px; padding: 24px; text-align: center;
          cursor: pointer; transition: all 0.2s; margin-bottom: 24px;
        }
        .code-display:hover { transform: scale(1.02); background: rgba(78,205,196,0.15); }
        
        .code-input-wrap {
          display: flex; gap: 12px; background: ${surface}; padding: 8px;
          border-radius: 20px; border: 2px solid ${borderCol}; box-shadow: inset 0 2px 8px rgba(0,0,0,0.02);
        }
        .code-input-wrap input {
          flex: 1; border: none; background: transparent; padding: 0 16px;
          font-size: 16px; font-weight: 800; font-family: 'Nunito', sans-serif;
          color: ${textMain}; outline: none; text-transform: uppercase;
        }
        .code-input-wrap button {
          background: linear-gradient(135deg, #4ECDC4, #00B894); color: white;
          border: none; border-radius: 14px; padding: 12px 24px;
          font-family: 'Fredoka One', cursive; cursor: pointer; transition: transform 0.15s;
        }
        .code-input-wrap button:hover:not(:disabled) { transform: scale(1.05); }

        @keyframes slide-down { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fade-in { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      {inspectingUid && <UserProfileModal uid={inspectingUid} onClose={() => setInspectingUid(null)} />}
      
      {challengingFriend && (
        <Suspense fallback={null}>
          <ChallengeModal friend={challengingFriend} friendProfile={friendProfiles[challengingFriend.uid]} onClose={() => setChallengingFriend(null)} />
        </Suspense>
      )}

      <div className="friends-root">
        <div className="friends-inner">
          <div className="f-top-bar">
            <button className="f-back" onClick={() => { play('click'); onBack() }}>
              <span style={{ fontSize: 20 }}>←</span>
            </button>
            <div className="f-header">
              <h1 className="f-title">KONEKSI</h1>
              <div className="f-subtitle">{friends.length}/50 Teman Setia</div>
            </div>
            <div style={{ width: 44 }} /> {/* Spacer */}
          </div>

          <div className="f-tabs">
            <button className={`f-tab ${activeTab === 'list' ? 'active' : ''}`} onClick={() => { play('click'); setActiveTab('list') }}>
              DAFTAR
            </button>
            <button className={`f-tab ${activeTab === 'add' ? 'active' : ''}`} onClick={() => { play('click'); setActiveTab('add') }}>
              TAMBAH
            </button>
            <button className={`f-tab ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => { play('click'); setActiveTab('requests') }}>
              PERMINTAAN
              {requests.length > 0 && <div className="f-tab-badge" />}
            </button>
          </div>

          <div className="f-content">
            {/* ───── TAB: DAFTAR TEMAN ───── */}
            {activeTab === 'list' && (
              <div>
                {friends.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: 64, marginBottom: 16 }}>👻</div>
                    <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 20, color: textMain }}>Sepi sekali...</div>
                    <div style={{ color: textMuted, marginTop: 8 }}>Belum ada koneksi. Ayo perluas jaringanmu dan tantang teman-teman di tab "Tambah"!</div>
                  </div>
                ) : (
                  friends.map((f, i) => {
                    const prof = friendProfiles[f.uid]
                    return (
                      <div key={f.uid} className="f-item" style={{ animationDelay: `${i * 0.05}s` }} onClick={() => setInspectingUid(f.uid)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                          <div className="f-avatar-wrap">
                            {(prof?.photoURL || f.photoURL)
                              ? <img src={prof?.photoURL || f.photoURL} alt="" />
                              : <div style={{ fontSize: 24 }}>👤</div>
                            }
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="f-name">{prof?.displayName || f.displayName || 'Pemain'}</div>
                            {prof?.progress?.selectedTitle ? (
                              <div className="f-title-badge">{prof.progress.selectedTitle}</div>
                            ) : (
                              <div style={{ fontSize: 12, color: textMuted, fontWeight: 700, marginTop: 4 }}>Petualang Pemula</div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          <button className="btn-pvp" onClick={(e) => handleChallenge(e, f)}>⚔️</button>
                          <button className="btn-remove" onClick={(e) => handleRemove(e, f.uid)}>✕</button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* ───── TAB: TAMBAH TEMAN ───── */}
            {activeTab === 'add' && (
              <div>
                <BorderGlow glowColor="#4ECDC4" borderRadius="22px" style={{ marginBottom: 24, padding: 2 }}>
                  <div className="code-display" onClick={copyCode} style={{ margin: 0, borderRadius: 20, background: surface, border: 'none' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: textMuted, letterSpacing: 2, marginBottom: 8 }}>KODE RAHASIAMU</div>
                    <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 40, color: '#4ECDC4', letterSpacing: 8, textShadow: '0 4px 10px rgba(78,205,196,0.3)' }}>
                      {friendCode || '------'}
                    </div>
                    <div style={{ fontSize: 13, color: textMuted, marginTop: 8, fontWeight: 600 }}>KETUK UNTUK MENYALIN 📋</div>
                  </div>
                </BorderGlow>

                <h3 style={{ fontFamily: "'Fredoka One',cursive", color: textMain, fontSize: 16, marginBottom: 12 }}>
                  Masukkan Kode Teman:
                </h3>
                <div className="code-input-wrap">
                  <input
                    placeholder="Contoh: A1B2C3"
                    value={inputCode}
                    onChange={e => setInputCode(e.target.value)}
                    maxLength={6}
                  />
                  <button onClick={handleAdd} disabled={adding || !inputCode}>
                    {adding ? '...' : 'CARI & TAMBAH'}
                  </button>
                </div>

                {addMessage && (
                  <div style={{
                    marginTop: 16, textAlign: 'center', padding: '12px', borderRadius: 14,
                    background: addMessage.type === 'error' ? 'rgba(255,107,107,0.1)' : 'rgba(78,205,196,0.1)',
                    color: addMessage.type === 'error' ? '#FF6B6B' : '#4ECDC4',
                    fontWeight: 800, fontSize: 14, border: `1px dashed ${addMessage.type === 'error' ? 'rgba(255,107,107,0.4)' : 'rgba(78,205,196,0.4)'}`
                  }}>
                    {addMessage.text}
                  </div>
                )}
              </div>
            )}

            {/* ───── TAB: PERMINTAAN KONEKSI ───── */}
            {activeTab === 'requests' && (
              <div>
                {error && (
                  <div style={{ padding: 12, background: 'rgba(255,107,107,0.1)', color: '#FF6B6B', borderRadius: 12, marginBottom: 16, textAlign: 'center', fontWeight: 700 }}>
                    ⚠️ {error}
                  </div>
                )}
                
                {requests.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }}>📭</div>
                    <div style={{ fontFamily: "'Fredoka One',cursive", fontSize: 20, color: textMuted }}>Tidak ada panggilan</div>
                    <div style={{ color: textMuted, marginTop: 8 }}>Belum ada yang minta temenan nih. Coba bagikan kodemu!</div>
                  </div>
                ) : (
                  requests.map((r, i) => (
                    <div key={r.id} className="f-item" style={{ animationDelay: `${i * 0.05}s` }} onClick={() => setInspectingUid(r.fromUid)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                        <div className="f-avatar-wrap" style={{ border: '2px solid rgba(255,255,255,0.1)' }}>
                          {r.fromPhoto ? <img src={r.fromPhoto} alt="" /> : <div style={{ fontSize: 24 }}>👤</div>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="f-name">{r.fromName || 'Pemain'}</div>
                          <div style={{ fontSize: 11, color: '#4ECDC4', fontWeight: 800, textTransform: 'uppercase', marginTop: 4 }}>Ingin Terkoneksi!</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <button onClick={(e) => handleAccept(e, r)} style={{
                          background: 'linear-gradient(135deg, #4ECDC4, #00B894)', color: '#fff', border: 'none',
                          borderRadius: 12, padding: '10px 16px', fontFamily: "'Fredoka One',cursive", fontSize: 13,
                          cursor: 'pointer', boxShadow: '0 4px 10px rgba(78,205,196,0.3)'
                        }}>TERIMA</button>
                        <button onClick={(e) => handleDecline(e, r.id)} style={{
                          background: 'rgba(255,107,107,0.1)', color: '#FF6B6B', border: 'none',
                          borderRadius: 12, width: 38, height: 38, fontSize: 16, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>✕</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
