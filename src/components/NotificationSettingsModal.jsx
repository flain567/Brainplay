import { useState } from 'react'
import { usePushNotif, REMINDER_HOURS } from '../context/PushNotifContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useCoins } from '../context/CoinContext.jsx'

export default function NotificationSettingsModal({ onClose }) {
  const { darkMode } = useSettings()
  const { permission, isSupported, settings, toggleDailyReminder, updateSettings, sendLocalNotif, requestPermission } = usePushNotif()
  const { dailyStreak } = useCoins()

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const dark = darkMode
  const bg      = dark ? '#0d0b1e' : '#FFF9F0'
  const surface = dark ? '#16213e' : '#FFFFFF'
  const surface2 = dark ? '#1e2a4a' : '#F8F9FA'
  const textMain = dark ? '#e8e8f0' : '#2D3436'
  const textMuted = dark ? '#8892b0' : '#636E72'
  const border  = dark ? '#2d3561' : '#DFE6E9'

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  const handleToggleDaily = async (enabled) => {
    setLoading(true)
    const ok = await toggleDailyReminder(enabled, settings.reminderHour)
    setLoading(false)
    if (!ok && enabled) {
      showMsg('⚠️ Izin notifikasi ditolak browser')
    } else if (enabled) {
      showMsg('✅ Reminder daily challenge aktif!')
    } else {
      showMsg('🔕 Reminder dimatikan')
    }
  }

  const handleToggleStreak = async (enabled) => {
    if (enabled && permission !== 'granted') {
      const perm = await requestPermission()
      if (perm !== 'granted') { showMsg('⚠️ Izin notifikasi ditolak browser'); return }
    }
    updateSettings({ streakAlertEnabled: enabled })
    showMsg(enabled ? '✅ Streak alert aktif!' : '🔕 Streak alert dimatikan')
  }

  const handleChangeHour = async (hourId) => {
    updateSettings({ reminderHour: hourId })
    if (settings.dailyChallengeEnabled) {
      await toggleDailyReminder(true, hourId)
      showMsg('🕐 Waktu reminder diperbarui!')
    }
  }

  const handleTestNotif = async () => {
    if (permission !== 'granted') {
      const perm = await requestPermission()
      if (perm !== 'granted') { showMsg('⚠️ Izin notifikasi ditolak browser'); return }
    }
    sendLocalNotif({
      title: '🎯 Tes Notifikasi BrainPlay',
      body: 'Notifikasi berfungsi dengan baik! 🎉',
      tag: 'test',
    })
    showMsg('📨 Notifikasi tes dikirim!')
  }

  const permLabel = {
    granted: { text: '✅ Diizinkan', color: '#4ECDC4' },
    denied:  { text: '❌ Ditolak (ubah di browser)', color: '#FF6B6B' },
    default: { text: '⏳ Belum diminta', color: '#FDCB6E' },
    unsupported: { text: '🚫 Tidak didukung browser ini', color: '#636E72' },
  }[isSupported ? permission : 'unsupported']

  return (
    <>
      <style>{`
        .notif-overlay { position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;padding:20px; }
        .notif-modal { background:${bg};border-radius:24px;width:100%;max-width:440px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,0.4); }
        .notif-header { padding:24px 24px 0;display:flex;align-items:center;justify-content:space-between; }
        .notif-body { padding:20px 24px 28px; }
        .notif-section { background:${surface2};border-radius:18px;padding:18px;margin-bottom:14px;border:1.5px solid ${border}; }
        .notif-section-title { font-family:'Fredoka One',cursive;font-size:14px;color:${tc.textMuted};margin-bottom:14px;text-transform:uppercase;letter-spacing:0.5px; }
        .notif-row { display:flex;align-items:center;gap:12px; }
        .notif-toggle { position:relative;width:48px;height:26px;flex-shrink:0; }
        .notif-toggle input { opacity:0;width:0;height:0; }
        .notif-slider { position:absolute;inset:0;background:${border};border-radius:13px;cursor:pointer;transition:0.3s; }
        .notif-slider:before { content:'';position:absolute;width:20px;height:20px;left:3px;top:3px;background:#fff;border-radius:50%;transition:0.3s; }
        input:checked + .notif-slider { background:linear-gradient(135deg,#A29BFE,#FD79A8); }
        input:checked + .notif-slider:before { transform:translateX(22px); }
        .notif-hour-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px; }
        .notif-hour-btn { padding:9px 6px;border-radius:12px;border:2px solid ${border};background:transparent;
          font-family:'Fredoka One',cursive;font-size:13px;color:${tc.textMuted};cursor:pointer;transition:all 0.18s;text-align:center; }
        .notif-hour-btn.active { border-color:#A29BFE;background:#A29BFE18;color:#A29BFE; }
        .notif-toast { position:fixed;bottom:100px;left:50%;transform:translateX(-50%);z-index:2100;
          background:${textMain};color:${bg};padding:10px 22px;border-radius:100px;
          font-size:13px;font-weight:700;font-family:'Fredoka One',cursive;
          animation:ntIn 0.25s ease;white-space:nowrap; }
        @keyframes ntIn { from{opacity:0;transform:translateX(-50%) translateY(10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
      `}</style>

      <div className="notif-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        {msg && <div className="notif-toast">{msg}</div>}
        <div className="notif-modal">
          <div className="notif-header">
            <div>
              <div style={{ fontSize:32 }}>🔔</div>
              <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:22, color:textMain, margin:'4px 0 2px' }}>Notifikasi</h2>
              <div style={{ fontSize:12, color:tc.textMuted }}>Atur pengingat & alert game-mu</div>
            </div>
            <button onClick={onClose} style={{ background:'transparent',border:'none',fontSize:22,cursor:'pointer',color:tc.textMuted,padding:8 }}>✕</button>
          </div>

          <div className="notif-body">
            {/* Status */}
            <div className="notif-section">
              <div className="notif-section-title">Status Browser</div>
              <div className="notif-row">
                <span style={{ fontSize:20 }}>📡</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:14, color:textMain }}>Izin Notifikasi</div>
                  <div style={{ fontSize:12, color:permLabel.color, marginTop:2 }}>{permLabel.text}</div>
                </div>
                {permission === 'default' && (
                  <button onClick={requestPermission} style={{ background:'linear-gradient(135deg,#A29BFE,#FD79A8)', color:'#fff', border:'none', borderRadius:12, padding:'8px 14px', fontFamily:"'Fredoka One',cursive", fontSize:12, cursor:'pointer' }}>
                    Izinkan
                  </button>
                )}
              </div>
            </div>

            {/* Daily Challenge Reminder */}
            <div className="notif-section">
              <div className="notif-section-title">Daily Challenge Reminder</div>
              <div className="notif-row">
                <span style={{ fontSize:24 }}>🎯</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:15, color:textMain }}>Pengingat Harian</div>
                  <div style={{ fontSize:12, color:tc.textMuted, marginTop:1 }}>Ingatkan saat daily challenge tersedia</div>
                </div>
                <label className="notif-toggle">
                  <input type="checkbox" checked={settings.dailyChallengeEnabled} onChange={e => handleToggleDaily(e.target.checked)} disabled={loading || permission === 'denied' || !isSupported} />
                  <span className="notif-slider" />
                </label>
              </div>

              {settings.dailyChallengeEnabled && (
                <>
                  <div style={{ marginTop:14, fontSize:12, color:tc.textMuted, fontWeight:700, marginBottom:6 }}>Waktu Pengingat:</div>
                  <div className="notif-hour-grid">
                    {REMINDER_HOURS.map(h => (
                      <button key={h.id} className={`notif-hour-btn ${settings.reminderHour === h.id ? 'active' : ''}`} onClick={() => handleChangeHour(h.id)}>
                        {h.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Streak Alert */}
            <div className="notif-section">
              <div className="notif-section-title">Streak Alert</div>
              <div className="notif-row">
                <span style={{ fontSize:24 }}>🔥</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:15, color:textMain }}>Alert Streak</div>
                  <div style={{ fontSize:12, color:tc.textMuted, marginTop:1 }}>Notifikasi saat streak ≥ 3 hari · Streak sekarang: {dailyStreak || 0}</div>
                </div>
                <label className="notif-toggle">
                  <input type="checkbox" checked={settings.streakAlertEnabled} onChange={e => handleToggleStreak(e.target.checked)} disabled={permission === 'denied' || !isSupported} />
                  <span className="notif-slider" />
                </label>
              </div>
            </div>

            {/* Test button */}
            <button onClick={handleTestNotif} style={{ width:'100%', padding:'14px', background:`linear-gradient(135deg,#A29BFE,#FD79A8)`, color:'#fff', border:'none', borderRadius:16, fontFamily:"'Fredoka One',cursive", fontSize:15, cursor:'pointer', boxShadow:'0 4px 16px rgba(162,155,254,0.3)', transition:'transform 0.15s' }}
              onMouseEnter={e => e.target.style.transform='translateY(-2px)'}
              onMouseLeave={e => e.target.style.transform='translateY(0)'}>
              📨 Kirim Notifikasi Tes
            </button>

            {!isSupported && (
              <div style={{ marginTop:14, padding:14, borderRadius:14, background:'#FF6B6B18', border:'1.5px solid #FF6B6B33', fontSize:12, color:'#FF6B6B', textAlign:'center', lineHeight:1.5 }}>
                Browser ini tidak mendukung Web Notifications. Coba Chrome / Firefox terbaru atau install sebagai PWA.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
