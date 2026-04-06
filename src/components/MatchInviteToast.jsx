import { useMatch } from '../context/MatchContext.jsx'
import { useThemeColors } from '../hooks/useThemeColors.js'
import { useSound } from '../hooks/useSound.js'
import { useState, useEffect } from 'react'
import { auth } from '../firebase.js'

export default function MatchInviteToast() {
  const { incomingInvites, acceptMatch, setActiveMatch } = useMatch()
  const { play } = useSound()
  const tc = useThemeColors()
  
  const [activeInvite, setActiveInvite] = useState(null)
  const [isExiting, setIsExiting] = useState(false)
  const [processing, setProcessing] = useState(null) // 'accept' | null

  useEffect(() => {
    if (incomingInvites.length > 0 && !activeInvite) {
      setActiveInvite(incomingInvites[0])
      setIsExiting(false)
      play('level_up')
    } else if (incomingInvites.length === 0 && activeInvite) {
      handleClose()
    }
  }, [incomingInvites, activeInvite, play])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      setActiveInvite(null)
      setIsExiting(false)
    }, 400)
  }

  const handleAccept = async () => {
    if (!activeInvite || processing) return
    setProcessing('accept')
    play('level_up')
    const res = await acceptMatch(activeInvite.id)
    if (res.success) {
      // Manually set activeMatch so App.jsx can redirect immediately with gameId
      setActiveMatch({
        id: activeInvite.id,
        ...activeInvite,
        status: 'active',
        guestProfile: {
          displayName: auth.currentUser?.displayName || 'Pemain',
          photoURL: auth.currentUser?.photoURL || ''
        }
      })
      handleClose()
    }
    setProcessing(null)
  }

  if (!activeInvite) return null

  const dark = tc.dark
  const surface = tc.surface
  const textMain = tc.textMain
  const borderCol = tc.borderCol

  return (
    <>
      <style>{`
        .match-toast {
          position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
          z-index: 1000; width: 90%; max-width: 360px;
          background: ${surface}; border: 2px solid #FDCB6E;
          border-radius: 20px; padding: 16px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2), 0 0 20px rgba(253,203,110,0.2);
          display: flex; align-items: center; gap: 16px;
          animation: toast-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
        }
        .match-toast.exit {
          animation: toast-out 0.4s cubic-bezier(0.6, -0.28, 0.735, 0.045) both;
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translate(-50%, -30px) scale(0.9); }
          to { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        @keyframes toast-out {
          from { opacity: 1; transform: translate(-50%, 0) scale(1); }
          to { opacity: 0; transform: translate(-50%, -30px) scale(0.9); }
        }
        .toast-icon {
          width: 48px; height: 48px; border-radius: 14px;
          background: linear-gradient(135deg, #FDCB6E, #F39C12);
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(243,156,18,0.3);
        }
        .toast-btn-accept {
          background: #FDCB6E; color: #fff; border: none;
          padding: 8px 16px; border-radius: 10px; font-weight: 800;
          font-family: 'Fredoka One', cursive; cursor: pointer;
          font-size: 13px; transition: transform 0.1s;
        }
        .toast-btn-accept:active { transform: scale(0.95); }
        .toast-btn-ignore {
          background: none; border: none; color: ${tc.textMuted};
          font-size: 11px; font-weight: 700; cursor: pointer; padding: 4px;
        }
      `}</style>

      <div className={`match-toast ${isExiting ? 'exit' : ''}`}>
        <div className="toast-icon">⚔️</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: textMain, fontSize: 14, fontWeight: 800, fontFamily: "'Fredoka One', cursive", marginBottom: 2 }}>
            TANTANGAN BARU!
          </div>
          <div style={{ color: tc.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
             {activeInvite.gameId === 'math-challenge' ? 'Math Challenge' : 'Reaction Test'}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
          <button className="toast-btn-accept" onClick={handleAccept} disabled={!!processing}>
            {processing === 'accept' ? '...' : 'TERIMA'}
          </button>
          <button className="toast-btn-ignore" onClick={handleClose} disabled={!!processing}>ABAIKAN</button>
        </div>
      </div>
    </>
  )
}
