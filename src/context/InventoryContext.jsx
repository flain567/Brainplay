import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const InventoryContext = createContext(null)

const INVENTORY_KEY = 'bp_inventory'

export const MATERIALS = {
  neon_shard: { id: 'neon_shard', name: 'Neon Shard', icon: '💎', color: '#4ECDC4', desc: 'Pecahan kristal neon bercahaya. Umum ditemukan.', rarity: 'common' },
  stardust:   { id: 'stardust',   name: 'Stardust',   icon: '✨', color: '#FDCB6E', desc: 'Serbuk kosmik ajaib. Berguna untuk item langka.', rarity: 'rare' },
  cyber_core: { id: 'cyber_core', name: 'Cyber Core', icon: '🔋', color: '#FF6B6B', desc: 'Inti energi tingkat tinggi bernilai tinggi.', rarity: 'epic' },
}

export const CHESTS = {
  basic_chest:   { id: 'basic_chest',   name: 'Basic Chest',   icon: '📦', color: '#A29BFE', desc: 'Peti standar. Berisi Neon Shard atau Stardust.' },
  premium_chest: { id: 'premium_chest', name: 'Premium Chest', icon: '🎁', color: '#F9A825', desc: 'Peti mewah. Jaminan Stardust dan peluang Cyber Core!' },
}

export const CONSUMABLES = {
  xp_boost_2x: { id: 'xp_boost_2x', name: 'XP Booster (2x)', icon: '🧪', color: '#00B894', desc: 'Menggandakan XP yang didapat dari game selama 30 menit.' },
  hint_combo:  { id: 'hint_combo',  name: 'Hint Bundle',     icon: '💡', color: '#0984E3', desc: 'Memberikan 5 Hint gratis untuk semua game.' }
}

export const CRAFTING_RECIPES = [
  {
    id: 'title_crafter',
    targetType: 'title', // What is produced
    targetId: 'Master Crafter',
    name: 'Gelar Legendaris: Master Crafter',
    desc: 'Gelar eksklusif untuk para perakit sejati.',
    icon: '🎖️',
    color: '#FFD700',
    cost: { neon_shard: 50, stardust: 20, cyber_core: 5 }
  },
  {
    id: 'skin_rainbow',
    targetType: 'cosmetic',
    cosmeticType: 'snakeSkins',
    targetId: 'rainbow',
    name: 'Snake Skin: Rainbow Effect',
    desc: 'Buka skin rainbow epik (Bisa juga dibeli dengan koin, tapi ini gratis!)',
    icon: '🌈',
    color: '#FF6B6B',
    cost: { neon_shard: 30, stardust: 10 }
  },
  {
    id: 'premium_chest_craft',
    targetType: 'chest',
    targetId: 'premium_chest',
    name: 'Transmute: Premium Chest',
    desc: 'Peleburan material dasar menjadi satu peti premium.',
    icon: '🎁',
    color: '#F9A825',
    cost: { neon_shard: 40 }
  }
]

export function InventoryProvider({ children }) {
  const [inventory, setInventory] = useState(() => {
    const saved = localStorage.getItem(INVENTORY_KEY)
    let inv = { chests: { basic_chest: 1 }, materials: {}, consumables: {} }
    if (saved) {
      try { inv = JSON.parse(saved) } catch(e) {}
    }
    
    // ONE-TIME COMPESATION GIFT FOR BUG 
    if (!localStorage.getItem('bp-gift-v1')) {
      if (!inv.chests) inv.chests = {}
      inv.chests['basic_chest'] = (inv.chests['basic_chest'] || 0) + 15
      inv.chests['premium_chest'] = (inv.chests['premium_chest'] || 0) + 7
      localStorage.setItem('bp-gift-v1', 'true')
    }
    
    return inv
  })

  // Persist State automatically on change
  useEffect(() => {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory))
    try { window.dispatchEvent(new CustomEvent('bp-save-triggered')) } catch(e) {}
  }, [inventory])

  // Helper modifier
  const updateItem = useCallback((category, itemId, delta) => {
    setInventory(prev => {
      const current = prev[category]?.[itemId] || 0
      const updated = Math.max(0, current + delta)
      return {
        ...prev,
        [category]: {
          ...(prev[category] || {}),
          [itemId]: updated
        }
      }
    })
  }, [])

  // Listen to cross-tab or cloud sync changes
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === INVENTORY_KEY && e.newValue) {
        try { setInventory(JSON.parse(e.newValue)) } catch(err) {}
      }
    }
    const handleCloudSync = () => {
      const saved = localStorage.getItem(INVENTORY_KEY)
      if (saved) { try { setInventory(JSON.parse(saved)) } catch(err) {} }
    }
    const handleAddChest = (e) => {
      const { chestId, amount } = e.detail || {}
      if (chestId) updateItem('chests', chestId, amount || 1)
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('bp-cloud-sync', handleCloudSync)
    window.addEventListener('bp-add-chest', handleAddChest)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('bp-cloud-sync', handleCloudSync)
      window.removeEventListener('bp-add-chest', handleAddChest)
    }
  }, [updateItem])


  const addChest = useCallback((chestId, amount = 1) => updateItem('chests', chestId, amount), [updateItem])
  const removeChest = useCallback((chestId, amount = 1) => updateItem('chests', chestId, -amount), [updateItem])
  const addMaterial = useCallback((matId, amount = 1) => updateItem('materials', matId, amount), [updateItem])
  const removeMaterial = useCallback((matId, amount = 1) => updateItem('materials', matId, -amount), [updateItem])
  
  // Open Chest Logic
  const openChest = useCallback((chestId) => {
    const current = inventory.chests?.[chestId] || 0
    if (current <= 0) return { success: false, reason: 'Peti tidak cukup' }

    let drops = []
    
    // RNG Logic
    if (chestId === 'basic_chest') {
      const qty1 = 1 + Math.floor(Math.random() * 3)
      drops.push({ id: 'neon_shard', qty: qty1 })
      
      // 30% chance for Stardust
      if (Math.random() < 0.3) {
        drops.push({ id: 'stardust', qty: 1 })
      }
    } else if (chestId === 'premium_chest') {
      const qty1 = 3 + Math.floor(Math.random() * 5)
      drops.push({ id: 'neon_shard', qty: qty1 })

      const qty2 = 1 + Math.floor(Math.random() * 3)
      drops.push({ id: 'stardust', qty: qty2 })

      // 40% chance for Cyber Core
      if (Math.random() < 0.4) {
        drops.push({ id: 'cyber_core', qty: 1 })
      }
    }

    // Apply outcome
    let nextState = { ...inventory }
    // Deduct chest
    nextState.chests = { ...nextState.chests, [chestId]: current - 1 }
    // Add drops
    nextState.materials = { ...nextState.materials }
    drops.forEach(d => {
      nextState.materials[d.id] = (nextState.materials[d.id] || 0) + d.qty
    })
    
    setInventory(nextState)
    return { success: true, drops }
  }, [inventory])

  // Crafting Logic
  const craftRecipe = useCallback((recipeId) => {
    const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId)
    if (!recipe) return { success: false, reason: 'Resep tidak ditemukan' }

    const cost = recipe.cost
    for (const [matId, needed] of Object.entries(cost)) {
      if ((inventory.materials[matId] || 0) < needed) {
        return { success: false, reason: `Material ${MATERIALS[matId]?.name || matId} tidak cukup` }
      }
    }

    // Deduct cost
    let nextState = { ...inventory, materials: { ...inventory.materials } }
    for (const [matId, needed] of Object.entries(cost)) {
      nextState.materials[matId] -= needed
    }

    // Apply reward
    if (recipe.targetType === 'chest') {
       nextState.chests = {
         ...(nextState.chests || {}),
         [recipe.targetId]: (nextState.chests[recipe.targetId] || 0) + 1
       }
       setInventory(nextState)
       return { success: true, type: 'chest', target: CHESTS[recipe.targetId], message: 'Berhasil membuat peti!' }
    } else if (recipe.targetType === 'title') {
       // Since Title unlock is managed by ProgressContext/CoinContext, we fire an event
       try { window.dispatchEvent(new CustomEvent('bp-title-unlock', { detail: { title: recipe.targetId } })) } catch(e) {}
       setInventory(nextState)
       return { success: true, type: 'title', target: { name: recipe.targetId }, message: 'Gelar legendaris terbuka!' }
    } else if (recipe.targetType === 'cosmetic') {    
       // We'll fire an event to unlock cosmetic
       try { window.dispatchEvent(new CustomEvent('bp-cosmetic-unlock', { detail: { type: recipe.cosmeticType, id: recipe.targetId } })) } catch(e) {}
       setInventory(nextState)
       return { success: true, type: 'cosmetic', target: { name: recipe.name }, message: 'Kosmetik berhasil di-craft!' }
    }

    return { success: false, reason: 'Tipe hadiah tidak didukung' }
  }, [inventory])

  return (
    <InventoryContext.Provider value={{
      inventory, addChest, openChest, craftRecipe
    }}>
      {children}
    </InventoryContext.Provider>
  )
}

export function useInventory() { return useContext(InventoryContext) }
