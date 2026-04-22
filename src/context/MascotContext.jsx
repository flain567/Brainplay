import { createContext, useContext, useState, useCallback } from 'react'

const MascotContext = createContext(null)

export function MascotProvider({ children }) {
  const [mascotEvent, setMascotEvent] = useState(null)

  // dialogOverride = { text: "...", actions: [...] }
  const triggerMascot = useCallback((dialogOverride, moodOverride = 'happy') => {
    setMascotEvent({ dialog: dialogOverride, mood: moodOverride, ts: Date.now() })
  }, [])

  return (
    <MascotContext.Provider value={{ mascotEvent, triggerMascot }}>
      {children}
    </MascotContext.Provider>
  )
}

export function useMascot() {
  return useContext(MascotContext) || { triggerMascot: () => {} }
}
