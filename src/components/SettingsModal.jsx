import { useSettings } from '../context/SettingsContext.jsx'
import { useSound } from '../hooks/useSound.js'
import { useThemeColors } from '../hooks/useThemeColors.js'
import { useNotifications, requestNotifPermission } from './NotificationManager.jsx'
import { useEffect } from 'react'

export default function SettingsModal({ onClose }) {
  const { darkMode, muted, musicOff, notifEnabled, hapticsEnabled, reduceMotion, toggle } = useSettings()
  const { play } = useSound()
  const tc = useThemeColors()
  
  // Also hook into notifications just to keep it in sync, though SettingsContext tracks `notifEnabled`
  useNotifications()

  // Prevent background scrolling and handle escape key
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const handleEsc = (e) => { if (e.key === 'Escape') { play('click'); onClose() } }
    window.addEventListener('keydown', handleEsc)
    return () => {
      document.body.style.overflow = 'auto'
      window.removeEventListener('keydown', handleEsc)
    }
  }, [onClose, play])

  const dark = tc.dark
  const bg = tc.bg
  const surface = tc.surface
  const textMain = tc.textMain
  const textMuted = tc.textMuted
  const borderCol = tc.borderCol

  return (
    <>
      <style>{`
        .settings-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.55); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: settings-fade-in 0.25s ease;
        }
        .settings-modal {
          background: ${bg};
          border-radius: 24px; width: 100%; max-width: 440px;
          box-shadow: 0 16px 60px rgba(0,0,0,0.3);
          border: 1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'};
          overflow: hidden; display: flex; flex-direction: column;
          animation: settings-slide-up 0.35s cubic-bezier(0.34,1.56,0.64,1);
        }
        .settings-header {
          padding: 24px; border-bottom: 1.5px solid ${borderCol};
          display: flex; align-items: center; justify-content: space-between;
          background: ${surface};
        }
        .settings-header > div { display: flex; align-items: center; gap: 12px; }
        .settings-icon {
          width: 40px; height: 40px; border-radius: 12px;
          background: linear-gradient(135deg, #A29BFE, #6C5CE7);
          color: white; font-size: 20px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3);
        }
        .settings-title {
          font-family: 'Fredoka One', cursive; font-size: 20px; color: ${textMain};
        }
        .settings-close {
          width: 38px; height: 38px; border-radius: 12px; border: none;
          background: ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
          font-size: 16px; cursor: pointer; color: ${textMuted}; display: flex;
          align-items: center; justify-content: center; transition: all 0.2s;
        }
        .settings-close:hover { background: ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}; color: ${textMain}; transform: scale(1.05); }
        .settings-close:active { transform: scale(0.95); }

        .settings-body {
          padding: 24px; overflow-y: auto; max-height: 70vh;
        }
        
        .settings-section-title {
          font-size: 12px; font-weight: 800; color: ${textMuted};
          letter-spacing: 1.5px; text-transform: uppercase;
          margin: 0 0 12px 10px;
        }
        .settings-group {
          background: ${surface}; border: 1.5px solid ${borderCol};
          border-radius: 18px; padding: 6px 16px; margin-bottom: 24px;
        }

        .settings-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 0; border-bottom: 1px solid ${borderCol};
        }
        .settings-row:last-child { border-bottom: none; }
        
        .settings-label { display: flex; align-items: center; gap: 14px; }
        .settings-label span:first-child { 
          font-size: 22px; width: 34px; height: 34px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          background: ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'};
        }
        .settings-label-text { display: flex; flex-direction: column; gap: 2px; }
        .settings-label-text h4 { margin: 0; font-family: 'Nunito', sans-serif; font-size: 16px; color: ${textMain}; font-weight: 800; }
        .settings-label-text p { margin: 0; font-size: 12px; color: ${textMuted}; font-weight: 600; }

        .set-switch {
          width: 50px; height: 28px; border-radius: 100px; padding: 4px;
          cursor: pointer; transition: background 0.25s; border: none;
          display: flex; align-items: center; flex-shrink: 0;
        }
        .set-switch.on { background: #4ECDC4; justify-content: flex-end; }
        .set-switch.off { background: ${dark ? '#2d3561' : '#DFE6E9'}; justify-content: flex-start; }
        .set-knob {
          width: 20px; height: 20px; border-radius: 50%; background: #fff;
          box-shadow: 0 1px 6px rgba(0,0,0,0.2); transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        .set-switch:active .set-knob { width: 26px; }

        @keyframes settings-fade-in { from{opacity:0} to{opacity:1} }
        @keyframes settings-slide-up { from{transform:translateY(30px) scale(0.96);opacity:0} to{transform:translateY(0) scale(1);opacity:1} }
      `}</style>

      <div className="settings-overlay" onClick={() => { play('click'); onClose() }}>
        <div className="settings-modal" onClick={e => e.stopPropagation()}>
          <div className="settings-header">
            <div>
              <div className="settings-icon">⚙️</div>
              <span className="settings-title">Pengaturan</span>
            </div>
            <button className="settings-close" onClick={() => { play('click'); onClose() }}>✕</button>
          </div>

          <div className="settings-body">
            
            {/* Tampilan */}
            <div className="settings-section-title">🖼 Tampilan</div>
            <div className="settings-group">
              <div className="settings-row">
                <div className="settings-label">
                  <span>{darkMode ? '🌙' : '☀️'}</span>
                  <div className="settings-label-text">
                    <h4>Mode Gelap</h4>
                    <p>Meringankan mata di tempat gelap</p>
                  </div>
                </div>
                <button className={`set-switch ${darkMode ? 'on' : 'off'}`} onClick={() => { play('toggle'); toggle.darkMode() }}>
                  <div className="set-knob" />
                </button>
              </div>
              <div className="settings-row">
                <div className="settings-label">
                  <span>🎬</span>
                  <div className="settings-label-text">
                    <h4>Kurangi animasi</h4>
                    <p>Partikel &amp; gerakan lebih tenang (juga mengikuti pengaturan sistem)</p>
                  </div>
                </div>
                <button className={`set-switch ${reduceMotion ? 'on' : 'off'}`} onClick={() => { play('toggle'); toggle.reduceMotion() }}>
                  <div className="set-knob" />
                </button>
              </div>
            </div>

            {/* Suara & Getaran */}
            <div className="settings-section-title">🔊 Suara & Getaran</div>
            <div className="settings-group">
              <div className="settings-row">
                <div className="settings-label">
                  <span>{musicOff ? '🔇' : '🎶'}</span>
                  <div className="settings-label-text">
                    <h4>Musik Latar</h4>
                    <p>Dianjurkan memakai earphone</p>
                  </div>
                </div>
                <button className={`set-switch ${!musicOff ? 'on' : 'off'}`} onClick={() => { play('click'); toggle.musicOff() }}>
                  <div className="set-knob" />
                </button>
              </div>
              <div className="settings-row">
                <div className="settings-label">
                  <span>{muted ? '🔇' : '🔊'}</span>
                  <div className="settings-label-text">
                    <h4>Efek Suara</h4>
                    <p>Suara tombol & aksi dalam game</p>
                  </div>
                </div>
                <button className={`set-switch ${!muted ? 'on' : 'off'}`} onClick={() => { if (!muted) play('click'); toggle.muted() }}>
                  <div className="set-knob" />
                </button>
              </div>
              <div className="settings-row">
                <div className="settings-label">
                  <span>{hapticsEnabled ? '📳' : '📴'}</span>
                  <div className="settings-label-text">
                    <h4>Getaran (Haptics)</h4>
                    <p>Getaran hardware saat disentuh</p>
                  </div>
                </div>
                <button className={`set-switch ${hapticsEnabled ? 'on' : 'off'}`} onClick={() => { play('click'); toggle.haptics() }}>
                  <div className="set-knob" />
                </button>
              </div>
            </div>

            {/* Sistem */}
            <div className="settings-section-title">⚙️ Sistem</div>
            <div className="settings-group" style={{ marginBottom: 10 }}>
              <div className="settings-row">
                <div className="settings-label">
                  <span>🔔</span>
                  <div className="settings-label-text">
                    <h4>Notifikasi Harian</h4>
                    <p>Pengingat main harian otomatis</p>
                  </div>
                </div>
                <button className={`set-switch ${notifEnabled ? 'on' : 'off'}`} onClick={async () => {
                  play('click')
                  if (!notifEnabled) {
                    const perm = await requestNotifPermission()
                    if (perm === 'denied') return
                  }
                  toggle.notif()
                }}>
                  <div className="set-knob" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
