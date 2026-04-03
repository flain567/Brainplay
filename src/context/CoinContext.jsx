import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { getJSON, setJSON, StorageKeys } from '../utils/storage.js'
import { useLimitedMode } from './LimitedModeContext.jsx'

const CoinContext = createContext(null)

// ─── Card Icon Packs (Memory Card Match) ────────────────────────────────────
export const ICON_PACKS = [
  { id:'default', name:'Emoji Pack', desc:'Emoji klasik yang ekspresif dan berwarna', price:0, icon:'😀', color:'#FDCB6E',
    icons:['🐶','🐱','🦊','🐻','🦁','🐯','🐸','🐧','🦄','🐼','🦋','🐙'] },
  { id:'pixel', name:'Pixel Art Pack', desc:'Kartu pixel art bergambar — Lucky Wheel exclusive!', price:0, icon:'🎨', color:'#E040FB', wheelOnly:true,
    cardBack:'/cards/cardBackground.png',
    icons:['/cards/card1View.png','/cards/card2Flowers.png','/cards/card3Soup.png','/cards/card4cactus.png','/cards/card5Balloons.png','/cards/card6BaldMann.png',
           '/cards/card1View.png','/cards/card2Flowers.png','/cards/card3Soup.png','/cards/card4cactus.png','/cards/card5Balloons.png','/cards/card6BaldMann.png'] },
  { id:'animal', name:'Animal Pack', desc:'Berbagai jenis hewan lucu dari seluruh dunia', price:150, icon:'🐾', color:'#4ECDC4',
    icons:['🐘','🦒','🦘','🐬','🦜','🦩','🐢','🦔','🦦','🐝','🦚','🐞'] },
  { id:'food', name:'Food Pack', desc:'Makanan dan buah-buahan yang menggugah selera', price:150, icon:'🍔', color:'#FF6B6B',
    icons:['🍕','🍔','🍣','🌮','🍩','🧁','🍦','🥐','🍪','🫐','🍜','🥟'] },
  { id:'space', name:'Space Pack', desc:'Tema luar angkasa — planet, bintang, dan galaksi', price:250, icon:'🚀', color:'#A29BFE',
    icons:['🚀','🌍','🌙','⭐','🪐','☄️','🛸','👽','🌌','🔭','🌞','💫'] },
  { id:'sport', name:'Sport Pack', desc:'Peralatan olahraga dan aktivitas seru', price:200, icon:'⚽', color:'#00B894',
    icons:['⚽','🏀','🎾','🏐','🏈','⚾','🎱','🏓','🥊','🏹','🎣','🛹'] },
  { id:'flag', name:'Flag Pack', desc:'Bendera dari berbagai negara di dunia', price:200, icon:'🏳️', color:'#FD79A8',
    icons:['🇮🇩','🇯🇵','🇧🇷','🇺🇸','🇬🇧','🇫🇷','🇩🇪','🇰🇷','🇪🇸','🇮🇹','🇹🇭','🇲🇽'] },
  { id:'music', name:'Music Pack', desc:'Instrumen musik dan simbol melodi', price:300, icon:'🎵', color:'#E17055',
    icons:['🎸','🎹','🥁','🎺','🎷','🎻','🪗','🪘','🎤','🎧','🎼','🎵'] },
  { id:'fantasy', name:'Fantasy Pack', desc:'Makhluk mistis dan sihir dari dunia fantasi', price:350, icon:'🐉', color:'#6C5CE7',
    icons:['🐉','🧙','🧚','🦅','🗡️','🛡️','👑','💎','🔮','⚔️','🏰','🧝'] },
]

// ─── Snake Skin Packs (Slither Worm) ────────────────────────────────────────
export const SNAKE_SKINS = [
  { id:'default', name:'Tosca Classic', desc:'Warna tosca default yang elegan', price:0, icon:'🟢', color:'#4ECDC4',
    skin:{ head:'#4ecdc4', body:'#2eada4', glow:'#4ecdc4' } },
  { id:'neon-pink', name:'Neon Pink', desc:'Pink neon yang menyala terang di kegelapan', price:100, icon:'💗', color:'#FF6B9D',
    skin:{ head:'#FF6B9D', body:'#D4437A', glow:'#FF6B9D' } },
  { id:'golden-dragon', name:'Golden Dragon', desc:'Emas berkilau bak naga legendaris', price:200, icon:'🐲', color:'#FFD700',
    skin:{ head:'#FFD700', body:'#DAA520', glow:'#FFD700' } },
  { id:'ice-blue', name:'Ice Blue', desc:'Biru es yang dingin dan membekukan arena', price:150, icon:'🧊', color:'#74B9FF',
    skin:{ head:'#74B9FF', body:'#4A8DD8', glow:'#74B9FF' } },
  { id:'lava-red', name:'Lava Red', desc:'Merah lava panas membara dari kedalaman bumi', price:150, icon:'🌋', color:'#FF4757',
    skin:{ head:'#FF4757', body:'#C0392B', glow:'#FF4757' } },
  { id:'galaxy', name:'Galaxy Purple', desc:'Ungu galaksi yang misterius dan kosmik', price:250, icon:'🌌', color:'#A29BFE',
    skin:{ head:'#A29BFE', body:'#6C5CE7', glow:'#A29BFE' } },
  { id:'rainbow', name:'Rainbow', desc:'Pelangi warna-warni yang berubah-ubah!', price:300, icon:'🌈', color:'#FF6B6B',
    skin:{ head:'#FF6B6B', body:'#A29BFE', glow:'#FDCB6E', rainbow:true } },
  { id:'premium-awesome', name:'Awesome Alien', desc:'Skin monster lucu luar angkasa', price:1000, icon:'👽', color:'#3498DB',
    skin:{ head:'#3498DB', body:'#2980B9', glow:'#3498DB', isImage:true, headImg:'/slither/snake_awesome_head.png', bodyImg:'/slither/snake_awesome_body.png' } },
  { id:'premium-vamp', name:'Vampire Bat', desc:'Kekuatan kelelawar vampir penghisap', price:1500, icon:'🦇', color:'#8E44AD',
    skin:{ head:'#8E44AD', body:'#732D91', glow:'#8E44AD', isImage:true, headImg:'/slither/snake_vamp_head.png', bodyImg:'/slither/snake_vamp_body.png' } },
  { id:'premium-stare', name:'Staring Eye', desc:'Tatapan mata mistis yang menakutkan', price:1800, icon:'👁️', color:'#E67E22',
    skin:{ head:'#E67E22', body:'#D35400', glow:'#E67E22', isImage:true, headImg:'/slither/snake_stare_head.png', bodyImg:'/slither/snake_stare_body.png' } },
  { id:'premium-jelly', name:'Jelly Slime', desc:'Lendir ubur-ubur neon transparan', price:2000, icon:'🦠', color:'#2ECC71',
    skin:{ head:'#2ECC71', body:'#27AE60', glow:'#2ECC71', isImage:true, headImg:'/slither/snake_jelly.png', bodyImg:'/slither/snake_jelly.png' } },
  { id:'premium-canada', name:'Maple Snake', desc:'Cacing dengan daun maple musim gugur', price:2500, icon:'🍁', color:'#E74C3C',
    skin:{ head:'#E74C3C', body:'#C0392B', glow:'#E74C3C', isImage:true, headImg:'/slither/snake_canada.png', bodyImg:'/slither/snake_canada.png' } },
]

// ─── Tile Theme Packs (Connect Blocks / 2048) ──────────────────────────────
export const TILE_THEMES = [
  { id:'default', name:'Classic', desc:'Warna klasik yang sudah familiar', price:0, icon:'🎨', color:'#4CAF50',
    colors:{
      2:{bg:'#4CAF50',dark:'#388E3C',text:'#fff'},4:{bg:'#FFC107',dark:'#F9A825',text:'#333'},
      8:{bg:'#9C27B0',dark:'#7B1FA2',text:'#fff'},16:{bg:'#E91E63',dark:'#C2185B',text:'#fff'},
      32:{bg:'#2196F3',dark:'#1565C0',text:'#fff'},64:{bg:'#FF5722',dark:'#D84315',text:'#fff'},
      128:{bg:'#00BCD4',dark:'#00838F',text:'#fff'},256:{bg:'#8BC34A',dark:'#558B2F',text:'#fff'},
      512:{bg:'#FF9800',dark:'#E65100',text:'#fff'},1024:{bg:'#3F51B5',dark:'#283593',text:'#fff'},
      2048:{bg:'#F44336',dark:'#B71C1C',text:'#fff'},
    }},
  { id:'ocean', name:'Ocean', desc:'Nuansa biru laut yang menenangkan', price:150, icon:'🌊', color:'#0984E3',
    colors:{
      2:{bg:'#74B9FF',dark:'#5A9FE6',text:'#fff'},4:{bg:'#0984E3',dark:'#0767B0',text:'#fff'},
      8:{bg:'#00CEC9',dark:'#00A8A3',text:'#fff'},16:{bg:'#006266',dark:'#004D50',text:'#fff'},
      32:{bg:'#1289A7',dark:'#0E6B83',text:'#fff'},64:{bg:'#3DC1D3',dark:'#2FA3B3',text:'#fff'},
      128:{bg:'#22A6B3',dark:'#1A8490',text:'#fff'},256:{bg:'#7ED6DF',dark:'#5FC0CC',text:'#333'},
      512:{bg:'#01A3A4',dark:'#007F80',text:'#fff'},1024:{bg:'#0652DD',dark:'#043DB0',text:'#fff'},
      2048:{bg:'#1B1464',dark:'#120D44',text:'#fff'},
    }},
  { id:'sunset', name:'Sunset', desc:'Gradien senja yang hangat dan romantis', price:150, icon:'🌅', color:'#E17055',
    colors:{
      2:{bg:'#FFECD2',dark:'#E8D4BA',text:'#5D4037'},4:{bg:'#FCAF45',dark:'#E09A30',text:'#fff'},
      8:{bg:'#F97F51',dark:'#D66A3E',text:'#fff'},16:{bg:'#EE5A24',dark:'#C44818',text:'#fff'},
      32:{bg:'#EA2027',dark:'#C01A1F',text:'#fff'},64:{bg:'#B53471',dark:'#8E2959',text:'#fff'},
      128:{bg:'#833471',dark:'#66285A',text:'#fff'},256:{bg:'#6F1E51',dark:'#56173F',text:'#fff'},
      512:{bg:'#FDA7DF',dark:'#E48EC6',text:'#333'},1024:{bg:'#D980FA',dark:'#BD66E0',text:'#fff'},
      2048:{bg:'#9B59B6',dark:'#7D3F94',text:'#fff'},
    }},
  { id:'mono', name:'Monochrome', desc:'Hitam putih minimalis — elegan dan bersih', price:100, icon:'⬛', color:'#636E72',
    colors:{
      2:{bg:'#DFE6E9',dark:'#B2BEC3',text:'#2D3436'},4:{bg:'#B2BEC3',dark:'#95A5A6',text:'#2D3436'},
      8:{bg:'#95A5A6',dark:'#7F8C8D',text:'#fff'},16:{bg:'#7F8C8D',dark:'#636E72',text:'#fff'},
      32:{bg:'#636E72',dark:'#4A5457',text:'#fff'},64:{bg:'#4A5457',dark:'#363D3F',text:'#fff'},
      128:{bg:'#2D3436',dark:'#1E2324',text:'#fff'},256:{bg:'#1E2324',dark:'#131818',text:'#fff'},
      512:{bg:'#0D1111',dark:'#060909',text:'#fff'},1024:{bg:'#000000',dark:'#000000',text:'#fff'},
      2048:{bg:'#2D3436',dark:'#1E2324',text:'#FDCB6E'},
    }},
  { id:'candy', name:'Candy Pastel', desc:'Warna pastel manis bak permen kapas', price:200, icon:'🍬', color:'#FD79A8',
    colors:{
      2:{bg:'#FFB8D0',dark:'#E8A0B8',text:'#5D4037'},4:{bg:'#B8E6FF',dark:'#A0CEE8',text:'#2D3436'},
      8:{bg:'#C8FFB8',dark:'#B0E8A0',text:'#2D3436'},16:{bg:'#FFE0B8',dark:'#E8C8A0',text:'#5D4037'},
      32:{bg:'#E0B8FF',dark:'#C8A0E8',text:'#2D3436'},64:{bg:'#FFFAB8',dark:'#E8E2A0',text:'#5D4037'},
      128:{bg:'#FD79A8',dark:'#D45E88',text:'#fff'},256:{bg:'#81ECEC',dark:'#5ED4D4',text:'#2D3436'},
      512:{bg:'#55EFC4',dark:'#3ED7AC',text:'#2D3436'},1024:{bg:'#A29BFE',dark:'#8880E0',text:'#fff'},
      2048:{bg:'#6C5CE7',dark:'#5544CC',text:'#fff'},
    }},
  { id:'neon', name:'Neon', desc:'Neon terang yang bersinar di kegelapan', price:200, icon:'💡', color:'#00FF88',
    colors:{
      2:{bg:'#00FF88',dark:'#00CC6E',text:'#0a0a1a'},4:{bg:'#00FFFF',dark:'#00CCCC',text:'#0a0a1a'},
      8:{bg:'#FF00FF',dark:'#CC00CC',text:'#fff'},16:{bg:'#FFFF00',dark:'#CCCC00',text:'#0a0a1a'},
      32:{bg:'#FF0066',dark:'#CC0052',text:'#fff'},64:{bg:'#0066FF',dark:'#0052CC',text:'#fff'},
      128:{bg:'#FF6600',dark:'#CC5200',text:'#fff'},256:{bg:'#9900FF',dark:'#7A00CC',text:'#fff'},
      512:{bg:'#00FF00',dark:'#00CC00',text:'#0a0a1a'},1024:{bg:'#FF0000',dark:'#CC0000',text:'#fff'},
      2048:{bg:'#FFFFFF',dark:'#CCCCCC',text:'#0a0a1a'},
    }},
]

// ─── Highlight Packs (Word Search) ──────────────────────────────────────────
export const HIGHLIGHT_PACKS = [
  { id:'default', name:'Rainbow', desc:'Warna pelangi yang ceria dan bervariasi', price:0, icon:'🌈', color:'#FF6B6B',
    colors:['#FF6B6B','#4ECDC4','#A29BFE','#FD79A8','#00B894','#FDCB6E','#6C5CE7','#E17055','#00CEC9','#0984E3','#E84393','#55EFC4','#81ECEC','#FAB1A0','#74B9FF'] },
  { id:'neon-glow', name:'Neon Glow', desc:'Neon terang yang menyala di kegelapan', price:100, icon:'💡', color:'#00FF88',
    colors:['#00FF88','#00FFFF','#FF00FF','#FFFF00','#FF0066','#0066FF','#FF6600','#9900FF','#00FF00','#FF3366','#33FFCC','#FF9900','#6633FF','#CCFF00','#FF0099'] },
  { id:'pastel', name:'Pastel Dream', desc:'Warna pastel lembut yang menenangkan mata', price:100, icon:'🎀', color:'#FFB8D0',
    colors:['#FFB8D0','#B8E6FF','#C8FFB8','#FFE0B8','#E0B8FF','#FFFAB8','#FFD1DC','#B8FFE0','#D4B8FF','#FFF0B8','#B8FFFA','#FFB8B8','#B8D4FF','#E8FFB8','#FFB8F0'] },
  { id:'fire', name:'Fire', desc:'Api membara dari merah ke kuning', price:150, icon:'🔥', color:'#FF4500',
    colors:['#FF0000','#FF2200','#FF4400','#FF6600','#FF8800','#FFAA00','#FFCC00','#FFE000','#FF3300','#FF5500','#FF7700','#FF9900','#FFBB00','#FFDD00','#FF1100'] },
  { id:'ocean-wave', name:'Ocean Wave', desc:'Gelombang laut biru yang menenangkan', price:150, icon:'🌊', color:'#0984E3',
    colors:['#0984E3','#74B9FF','#00CEC9','#00A8A3','#1289A7','#3DC1D3','#22A6B3','#7ED6DF','#01A3A4','#0652DD','#1B1464','#48DBFB','#0ABDE3','#54A0FF','#2E86DE'] },
  { id:'minimalist', name:'Minimalist', desc:'Warna netral yang bersih dan minimalis', price:100, icon:'⬜', color:'#636E72',
    colors:['#636E72','#95A5A6','#2D3436','#B2BEC3','#7F8C8D','#4A5457','#DFE6E9','#1E2324','#ABB2B9','#6C7A82','#3D4E56','#8395A7','#576574','#222F3E','#C8D6E5'] },
]

// ─── Ship Catalog (Space Shooter) ────────────────────────────────────────────
export const BASE_SHIP_CATALOG = [
  { id:'falcon', name:'Valkyrie Interceptor', desc:'Interceptor elit dengan sistem aerodinamis Valkyrie untuk kecepatan dan presisi tempur.',
    price:0, icon:'🚀', img: '/ships/valkyrie.png', color:'#4ECDC4',
    stats:{ speed:5, fireRate:8, bulletCount:1, maxHP:5, specialType:'bomb', specialCharge:300 },
    weaponEvolution:{
      1:{ type:'standard', count:1 },
      2:{ type:'standard', count:2 },
      3:{ type:'standard', count:3 },
      4:{ type:'standard', count:3, spread:true },
      5:{ type:'guided', count:3 }
    },
    design:{ body:'#4ECDC4', wing:'#2d8a85', cockpit:'#74B9FF', engine:'#FDCB6E', accent:'#fff' }
  },
  { id:'viper', name:'Viper Striker', desc:'Pesawat serang cepat yang dirancang untuk pertempuran kilat dan manuver ekstrim.',
    price:200, icon:'⚡', img: '/ships/viper.png', color:'#00FF88',
    stats:{ speed:7, fireRate:5, bulletCount:1, maxHP:4, specialType:'rapid', specialCharge:250 },
    weaponEvolution:{
      1:{ type:'pulse', count:1 },
      2:{ type:'pulse', count:2 },
      3:{ type:'pulse', count:3 },
      4:{ type:'needle', count:2 },
      5:{ type:'needle', count:3 }
    },
    design:{ body:'#00FF88', wing:'#00CC6E', cockpit:'#B8FFD0', engine:'#00FF88', accent:'#fff' }
  },
  { id:'titan', name:'Titan Juggernaut', desc:'Benteng terbang dengan armor komposit berat dan daya hancur area yang luas.',
    price:350, icon:'🛡️', img: '/ships/titan.png', color:'#FF6B6B',
    stats:{ speed:3.5, fireRate:10, bulletCount:3, maxHP:8, specialType:'shield', specialCharge:200 },
    weaponEvolution:{
      1:{ type:'heavy', count:2 },
      2:{ type:'heavy', count:3 },
      3:{ type:'heavy', count:3, spread:true },
      4:{ type:'heavy-shock', count:2 },
      5:{ type:'heavy-shock', count:3 }
    },
    design:{ body:'#FF6B6B', wing:'#CC4444', cockpit:'#FFB8B8', engine:'#FF4444', accent:'#fff' }
  },
  { id:'phoenix', name:'Phoenix Eternal', desc:'Pesawat eksperimental dengan inti reaktor plasma yang membara di setiap tembakan.',
    price:500, icon:'🔥', img: '/ships/falcon.png', color:'#FF8C00',
    stats:{ speed:5.5, fireRate:7, bulletCount:2, maxHP:6, specialType:'firetrail', specialCharge:280 },
    weaponEvolution:{
      1:{ type:'fire', count:1 },
      2:{ type:'fire', count:2 },
      3:{ type:'heavy', count:2 },
      4:{ type:'heavy', count:3 },
      5:{ type:'fire-spiral', count:3 }
    },
    design:{ body:'#FF8C00', wing:'#CC6600', cockpit:'#FFD700', engine:'#FF4500', accent:'#FFE0A0' }
  },
  { id:'shadow', name:'Obsidian Voyager', desc:'Pesawat siluman berlapis obsidian yang mampu menyerap deteksi radar musuh.',
    price:700, icon:'🌑', img: '/ships/obsidian.png', color:'#A29BFE',
    stats:{ speed:6, fireRate:7, bulletCount:2, maxHP:5, specialType:'cloak', specialCharge:260, critChance:0.2 },
    weaponEvolution:{
      1:{ type:'ghost', count:1 },
      2:{ type:'ghost', count:2 },
      3:{ type:'ghost', count:3 },
      4:{ type:'ghost-pulse', count:2 },
      5:{ type:'ghost-pulse', count:3 }
    },
    design:{ body:'#A29BFE', wing:'#6C5CE7', cockpit:'#D4CFFF', engine:'#A29BFE', accent:'#E0DDFF' }
  },
  { id:'nebula', name:'Nebula Crystal', desc:'Mahakarya futuristik dengan sayap kristal energi dan laser penghancur bintang.',
    price:1000, icon:'💎', img: '/ships/nebula.png', color:'#FFD700',
    stats:{ speed:5.5, fireRate:6, bulletCount:3, maxHP:7, specialType:'beam', specialCharge:350 },
    weaponEvolution:{
      1:{ type:'pulse', count:1 },
      2:{ type:'pulse', count:2 },
      3:{ type:'pulse', count:3 },
      4:{ type:'flare', count:2 },
      5:{ type:'star-guided', count:3 }
    },
    design:{ body:'#FFD700', wing:'#DAA520', cockpit:'#FFFACD', engine:'#FFA500', accent:'#FFF8DC' }
  },
  { id:'phantom', name:'Phantom Striker', desc:'Pesawat tempur siluman ultra-premium. Damage dan speed maksimal!',
    price:5000, icon:'🛩️', img: '/ships/phantom.png', color:'#2c3e50',
    stats:{ speed:8, fireRate:4, bulletCount:4, maxHP:10, specialType:'cloak', specialCharge:400, critChance:0.5 },
    weaponEvolution:{
      1:{ type:'standard', count:2 },
      2:{ type:'standard', count:3 },
      3:{ type:'guided', count:2 },
      4:{ type:'guided', count:3 },
      5:{ type:'needle', count:4 }
    },
    design:{ body:'#2c3e50', wing:'#1a252f', cockpit:'#e74c3c', engine:'#c0392b', accent:'#e74c3c' }
  },
  // ── Lucky Wheel Exclusive ──
  { id:'wheel-ship-ice', name:'Ice Striker', desc:'Pesawat tempur biru es dari dimensi beku. Lucky Wheel Only!',
    price:0, icon:'❄️', color:'#00BFFF', exclusive:true, rarity:'epic',
    stats:{ speed:6, fireRate:5, bulletCount:3, maxHP:7, specialType:'beam', specialCharge:280, critChance:0.15 },
    weaponEvolution:{
      1:{ type:'pulse', count:1 },
      2:{ type:'ice-needle', count:2 },
      3:{ type:'ice-needle', count:3 },
      4:{ type:'ice-shard', count:2 },
      5:{ type:'ice-shard', count:3 }
    },
    img: '/wheel_ship.png',
    design:{ body:'#00BFFF', wing:'#006994', cockpit:'#E0FFFF', engine:'#00CED1', accent:'#B0E0E6' }
  },
]

// ─── Battle Pass Ships (Season 1 - V2) ───────────────────────────────────────
export const BP_SHIP_CATALOG = [
  { id:'bp-v2-1', name:'Veridian Aurora', desc:'Kapal dengan ornamen hijau zamrud yang elegan. Memiliki tembakan burst.',
    price:0, icon:'🚀', color:'#00FF88', exclusive:true, rarity:'legendary',
    stats:{ speed:6, fireRate:7, bulletCount:1, maxHP:6, specialType:'emerald-barrage', specialCharge:200 },
    weaponEvolution:{
      1:{ type:'burst-3', count:1 },
      2:{ type:'burst-3', count:2 },
      3:{ type:'burst-3', count:3 },
      4:{ type:'petal', count:3 },
      5:{ type:'blossom', count:1 }
    },
    img:'/ships/bp_v2_ship1.png', bulletType:'burst-3' },
  { id:'bp-v2-2', name:'Amber Horizon', desc:'Dudesain dengan warna emas hangat. Tembakan gelombang yang kuat.',
    price:0, icon:'🚀', color:'#FFD700', exclusive:true, rarity:'legendary',
    stats:{ speed:5, fireRate:8, bulletCount:1, maxHP:7, specialType:'golden-shockwave', specialCharge:220 },
    weaponEvolution:{
      1:{ type:'wave', count:1 },
      2:{ type:'wave', count:2 },
      3:{ type:'wave', count:3 },
      4:{ type:'tsunami', count:1 },
      5:{ type:'tsunami', count:2 }
    },
    img:'/ships/bp_v2_ship2.png', bulletType:'wave' },
  { id:'bp-v2-3', name:'Cobalt Wings', desc:'Sayap kobalt yang tajam memberikan kelincahan maksimal di angkasa.',
    price:0, icon:'🚀', color:'#74B9FF', exclusive:true, rarity:'legendary',
    stats:{ speed:7.5, fireRate:5, bulletCount:2, maxHP:5, specialType:'time-warp', specialCharge:250 },
    weaponEvolution:{
      1:{ type:'plasma', count:1 },
      2:{ type:'plasma', count:2 },
      3:{ type:'plasma', count:3 },
      4:{ type:'spiral', count:2 },
      5:{ type:'spiral', count:3 }
    },
    img:'/ships/bp_v2_ship3.png', bulletType:'plasma' },
  { id:'bp-v2-ultimate', name:'Aegis Prime - B4', desc:'Unit Mecha legendaris terkuat. Senjata Mega Beam penghancur segalanya.',
    price:0, icon:'👑', color:'#FFF200', exclusive:true, rarity:'mythic',
    stats:{ speed:8, fireRate:4, bulletCount:1, maxHP:10, specialType:'omega-beam', specialCharge:450 },
    weaponEvolution:{
      1:{ type:'flare', count:1 },
      2:{ type:'flare', count:2 },
      3:{ type:'plasma', count:2 },
      4:{ type:'mega-beam', count:2 },
      5:{ type:'omega-blast', count:1 }
    },
    img:'/ships/bp_v2_ultimate.png', bulletType:'mega-beam' },
  { id:'bp-v2-final', name:'Aegis Prime - X1', desc:'Unit Mecha puncak evolusi. Dilengkapi dengan dual Omega Pulse dan armor nanotech.',
    price:0, icon:'👑', color:'#00F5FF', exclusive:true, rarity:'mythic',
    stats:{ speed:9, fireRate:3, bulletCount:2, maxHP:12, specialType:'omega-burst', specialCharge:500 },
    weaponEvolution:{
      1:{ type:'plasma', count:2 },
      2:{ type:'mega-beam', count:2 },
      3:{ type:'omega-blast', count:1 },
      4:{ type:'omega-blast', count:2 },
      5:{ type:'omega-ultra', count:1 }
    },
    img:'/ships/bp_v2_ultimate.png', bulletType:'omega-ultra' },
  { id:'astra-warden', name:'Veridian Warden', desc:'Kapal penjaga galaksi dengan teknologi inti zamrud. Keseimbangan antara pertahanan dan serangan.',
    price:0, icon:'🛡️', color:'#2ECC71', exclusive:true, rarity:'legendary',
    stats:{ speed:6.5, fireRate:6, bulletCount:2, maxHP:8, specialType:'shield', specialCharge:240 },
    weaponEvolution:{
      1:{ type:'standard', count:2 },
      2:{ type:'standard', count:3 },
      3:{ type:'heavy', count:2 },
      4:{ type:'heavy', count:3 },
      5:{ type:'plasma', count:3 }
    },
    img:'/ships/bp_v2_ship1.png', bulletType:'heavy' },
]

export const SHIP_CATALOG = [
  ...BASE_SHIP_CATALOG,
  ...BP_SHIP_CATALOG,
]

// ─── Hangman Themes (Hangman) ────────────────────────────────────────────────
export const HANGMAN_THEMES = [
  { id:'default', name:'Classic', desc:'Tiang gantung klasik hitam-putih', price:0, icon:'💀', color:'#E17055',
    style:{ stick:'#ffffff', man:'#ffffff', bg:'transparent' } },
  { id:'neon', name:'Neon Glow', desc:'Garis neon yang menyala di kegelapan', price:100, icon:'💡', color:'#00FF88',
    style:{ stick:'#00FF88', man:'#00FFFF', bg:'transparent' } },
  { id:'sketch', name:'Pencil Sketch', desc:'Gaya sketsa pensil yang artistik', price:100, icon:'✏️', color:'#B2BEC3',
    style:{ stick:'#B2BEC3', man:'#DFE6E9', bg:'transparent' } },
  { id:'fire', name:'Fire Theme', desc:'Api neraka — tiang dan orang menyala!', price:150, icon:'🔥', color:'#FF4500',
    style:{ stick:'#FF6B6B', man:'#FF4500', bg:'transparent' } },
  { id:'ice', name:'Ice Theme', desc:'Tema es beku yang membekukan jiwa', price:150, icon:'🧊', color:'#74B9FF',
    style:{ stick:'#74B9FF', man:'#0984E3', bg:'transparent' } },
  { id:'galaxy', name:'Galaxy', desc:'Warna galaksi kosmik yang misterius', price:200, icon:'🌌', color:'#A29BFE',
    style:{ stick:'#A29BFE', man:'#6C5CE7', bg:'transparent' } },
  { id:'gold', name:'Golden', desc:'Emas berkilau untuk yang menghargai keindahan', price:250, icon:'👑', color:'#FFD700',
    style:{ stick:'#FFD700', man:'#DAA520', bg:'transparent' } },
  { id:'premium-cyberpunk', name:'Cyberpunk Noir', desc:'Masa depan neon yang gelap dan hujan', price:500, icon:'🌃', color:'#00FF88',
    style:{ stick:'#00FF88', man:'#FF00FF', bgImg:'/hangman/bg_cyberpunk.png', filter:'drop-shadow(0 0 12px #00FF88)', glass: true } },
  { id:'premium-dungeon', name:'Ancient Dungeon', desc:'Penjara batu abad pertengahan yang lembap', price:500, icon:'⛓️', color:'#D63031',
    style:{ stick:'#5D4037', man:'#2D3436', bgImg:'/hangman/bg_dungeon.png', filter:'brightness(0.7) sepia(0.3)', glass: true } },
  { id:'premium-nebula', name:'Cosmic Nebula', desc:'Keindahan galaksi di antara awan bintang', price:600, icon:'🪐', color:'#A29BFE',
    style:{ stick:'#ffffff', man:'#00F5FF', bgGrad:'linear-gradient(135deg, #020111 0%, #3a1c71 50%, #d76d77 100%)', filter:'drop-shadow(0 0 15px #00F5FF)', glass: true, particles: 'stars' } },
  { id:'premium-forest', name:'Mystic Forest', desc:'Hutan ajaib dengan kunang-kunang malam', price:600, icon:'🍄', color:'#00B894',
    style:{ stick:'#3E2723', man:'#55EFC4', bgGrad:'linear-gradient(to bottom, #000428, #004e92)', filter:'drop-shadow(0 0 12px #55EFC4)', glass: true, particles: 'fireflies' } },
]


// ─── Color Sort Themes (Color Sort) ─────────────────────────────────────────
export const TUBE_THEMES = [
  { id:'default', name:'Glass Tube', desc:'Tabung kaca bening klasik', price:0, icon:'🧪', color:'#6C5CE7',
    style:{ tube:'rgba(255,255,255,0.1)', border:'rgba(255,255,255,0.25)', shape:'round' } },
  { id:'flask', name:'Lab Flask', desc:'Labu erlenmeyer dari laboratorium sains', price:100, icon:'⚗️', color:'#00B894',
    style:{ tube:'rgba(0,184,148,0.08)', border:'rgba(0,184,148,0.3)', shape:'flask' } },
  { id:'bubble', name:'Bubble Jar', desc:'Toples gelembung yang lucu dan bulat', price:100, icon:'🫧', color:'#74B9FF',
    style:{ tube:'rgba(116,185,255,0.08)', border:'rgba(116,185,255,0.3)', shape:'bubble' } },
  { id:'neon', name:'Neon Tube', desc:'Tabung neon yang bersinar terang', price:150, icon:'💡', color:'#00FF88',
    style:{ tube:'rgba(0,255,136,0.06)', border:'rgba(0,255,136,0.35)', shape:'round' } },
  { id:'bamboo', name:'Bamboo', desc:'Ruas bambu alami dari hutan', price:150, icon:'🎋', color:'#55EFC4',
    style:{ tube:'rgba(85,239,196,0.08)', border:'rgba(85,239,196,0.3)', shape:'bamboo' } },
  { id:'crystal', name:'Crystal Vial', desc:'Botol kristal yang berkilauan', price:200, icon:'💎', color:'#A29BFE',
    style:{ tube:'rgba(162,155,254,0.08)', border:'rgba(162,155,254,0.35)', shape:'crystal' } },
  { id:'lava', name:'Lava Lamp', desc:'Lampu lava retro yang meleleh', price:250, icon:'🌋', color:'#FF6B6B',
    style:{ tube:'rgba(255,107,107,0.08)', border:'rgba(255,107,107,0.35)', shape:'round' } },
]

// ─── Sudoku Themes (Sudoku) ─────────────────────────────────────────────────
export const SUDOKU_THEMES = [
  { id:'default', name:'Classic Blue', desc:'Tema biru klasik yang bersih', price:0, icon:'🔢', color:'#0984E3',
    style:{ grid:'#0984E3', selected:'#74B9FF', given:'#ffffff', input:'#4ECDC4', error:'#FF6B6B', bg:'#0a1628' } },
  { id:'paper', name:'Newspaper', desc:'Gaya koran kertas dengan angka serif', price:100, icon:'📰', color:'#636E72',
    style:{ grid:'#636E72', selected:'#DFE6E9', given:'#2D3436', input:'#0984E3', error:'#E17055', bg:'#FFF9F0' } },
  { id:'mint', name:'Mint Fresh', desc:'Hijau mint segar yang menyegarkan mata', price:100, icon:'🌿', color:'#00B894',
    style:{ grid:'#00B894', selected:'#55EFC4', given:'#ffffff', input:'#00CEC9', error:'#FF6B6B', bg:'#0a2018' } },
  { id:'sunset', name:'Sunset', desc:'Warna sunset yang hangat dan indah', price:150, icon:'🌅', color:'#E17055',
    style:{ grid:'#E17055', selected:'#FAB1A0', given:'#ffffff', input:'#FDCB6E', error:'#FF6B6B', bg:'#1a0f0a' } },
  { id:'purple', name:'Royal Purple', desc:'Ungu kerajaan yang megah dan mewah', price:150, icon:'👑', color:'#6C5CE7',
    style:{ grid:'#6C5CE7', selected:'#A29BFE', given:'#ffffff', input:'#FD79A8', error:'#FF6B6B', bg:'#0d0a1e' } },
  { id:'matrix', name:'Matrix', desc:'Hijau terminal hacker — angka berjatuhan', price:200, icon:'💻', color:'#00FF41',
    style:{ grid:'#00FF41', selected:'#39FF14', given:'#00FF41', input:'#7CFF00', error:'#FF0040', bg:'#0a0a0a' } },
  { id:'wheel-sudoku-pastel', name:'Pastel Dream', desc:'Grid pastel cantik — Lucky Wheel exclusive!', price:0, icon:'🌸', color:'#E8B4CB', wheelOnly:true,
    style:{ grid:'#D4A5BD', selected:'#F0C6D8', given:'#4A4A4A', input:'#8B6D80', error:'#FF6B6B', bg:'#FFF0F5' },
    assets:{ gridImg:'/sudoku/Grid.png', numberImgs:'/sudoku/', tickImgs:'/sudoku/Tick', titleImg:'/sudoku/Title.png' } },
]

// ─── Binary Puzzle Themes (Day 19) ──────────────────────────────────────────
export const BINARY_THEMES = [
  { id:'default', name:'Classic Blue', desc:'Biru klasik yang menenangkan', price:0, icon:'🔲', color:'#3B82F6',
    style:{ bg0:'#dbeafe', text0:'#3B82F6', bg1:'#ede9fe', text1:'#8B5CF6', bg0_dark:'#1a2e4a', bg1_dark:'#2e1a4a', errorBorder:'#FF6B6B' } },
  { id:'matrix', name:'Matrix', desc:'Tema hacker terminal hijau', price:100, icon:'💻', color:'#00FF41',
    style:{ bg0:'#0a1a0a', text0:'#00FF41', bg1:'#0a1a0a', text1:'#39FF14', bg0_dark:'#0a1a0a', bg1_dark:'#0a1a0a', errorBorder:'#FF0000' } },
  { id:'neon', name:'Neon Cyber', desc:'Warna-warni neon mencolok', price:150, icon:'💡', color:'#FF00FF',
    style:{ bg0:'rgba(255,0,255,0.1)', text0:'#FF00FF', bg1:'rgba(0,255,255,0.1)', text1:'#00FFFF', bg0_dark:'rgba(255,0,255,0.1)', bg1_dark:'rgba(0,255,255,0.1)', errorBorder:'#FF0000' } },
  { id:'fire', name:'Fire & Ice', desc:'Pertarungan panas dan dingin', price:200, icon:'🔥', color:'#FF4500',
    style:{ bg0:'rgba(255,69,0,0.15)', text0:'#FF4500', bg1:'rgba(0,191,255,0.15)', text1:'#00BFFF', bg0_dark:'rgba(255,69,0,0.15)', bg1_dark:'rgba(0,191,255,0.15)', errorBorder:'#FFD700' } },
  { id:'retro', name:'Retro 8-Bit', desc:'Gaya konsol klasik monokrom hijau', price:150, icon:'📟', color:'#00FF41',
    style:{ bg0:'#1a2a1a', text0:'#00FF41', bg1:'#2a3a2a', text1:'#00FF41', bg0_dark:'#0a140a', bg1_dark:'#0a140a', errorBorder:'#FF3D00' } },
]

// ─── Sliding Puzzle Themes (Day 20) ─────────────────────────────────────────
export const SLIDING_THEMES = [
  { id:'default', name:'Gradient', desc:'Warna warni pelangi', price:0, icon:'🌈', color:'#FF6B6B',
    style:{ type:'gradient' } },
  { id:'glass', name:'Glassmorphism', desc:'Gaya kaca transparan masa depan', price:150, icon:'🔮', color:'#74B9FF',
    style:{ type:'glass', bg:'rgba(255,255,255,0.1)', border:'rgba(255,255,255,0.2)', shadow:'0 4px 15px rgba(0,0,0,0.1)', textShadow:'0 2px 5px rgba(0,0,0,0.2)' } },
  { id:'neon', name:'Neon Wireframe', desc:'Garis neon tegas bernyala', price:150, icon:'💡', color:'#00FF88',
    style:{ type:'wireframe', bg:'transparent', border:'#00FF88', color:'#00FF88', shadow:'none', textShadow:'0 0 8px #00FF88' } },
  { id:'wood', name:'Classic Wood', desc:'Gaya klasik kayu mahoni tua', price:200, icon:'🪵', color:'#8B4513',
    style:{ type:'solid', bg:'#8B4513', border:'#5C2E0B', color:'#FFEeba', shadow:'0 4px 6px rgba(0,0,0,0.3)', textShadow:'none' } },
  { id:'gold', name:'Royal Gold', desc:'Emas batangan murni', price:250, icon:'👑', color:'#FFD700',
    style:{ type:'solid', bg:'linear-gradient(135deg, #FFD700, #DAA520)', border:'#B8860B', color:'#fff', shadow:'0 4px 10px rgba(218,165,32,0.4)', textShadow:'0 1px 2px rgba(0,0,0,0.5)' } },
  { id:'img1', name:'Cyberpunk City', desc:'Pemandangan kota neon futuristik di malam hari', price:300, icon:'🌃', color:'#FF00FF',
    style:{ type:'image', bgUrl:'/sliding/img1.png', border:'transparent', color:'#fff', shadow:'0 2px 5px rgba(0,0,0,0.5)', textShadow:'0 2px 4px rgba(0,0,0,0.8)' } },
  { id:'img2', name:'Enchanted Forest', desc:'Hutan sihir penuh cahaya ajaib', price:300, icon:'🌿', color:'#00B894',
    style:{ type:'image', bgUrl:'/sliding/img2.png', border:'transparent', color:'#fff', shadow:'0 2px 5px rgba(0,0,0,0.5)', textShadow:'0 2px 4px rgba(0,0,0,0.8)' } },
  { id:'img3', name:'Golden Dragon', desc:'Mitologi naga emas yang epik', price:300, icon:'🐉', color:'#FFD700',
    style:{ type:'image', bgUrl:'/sliding/img3.png', border:'transparent', color:'#fff', shadow:'0 2px 5px rgba(0,0,0,0.5)', textShadow:'0 2px 4px rgba(0,0,0,0.8)' } },
  { id:'img4', name:'Treasure Map', desc:'Peta rahasia peninggalan kuno', price:300, icon:'🗺️', color:'#E17055',
    style:{ type:'image', bgUrl:'/sliding/img4.png', border:'transparent', color:'#fff', shadow:'0 2px 5px rgba(0,0,0,0.5)', textShadow:'0 2px 4px rgba(0,0,0,0.8)' } },
  { id:'neo-tokyo', name:'Neo-Tokyo', desc:'Kota masa depan dengan balutan lampu neon', price:500, icon:'🌃', color:'#A29BFE',
    style:{ type:'image', bgUrl:'/sliding/neo_tokyo.png', border:'transparent', color:'#fff', shadow:'0 2px 5px rgba(0,0,0,0.5)', textShadow:'0 2px 4px rgba(0,0,0,0.8)' } },
  { id:'ancient-jungle', name:'Ancient Jungle', desc:'Reruntuhan candi kuno di tengah hutan', price:500, icon:'🌿', color:'#00B894',
    style:{ type:'image', bgUrl:'/sliding/ancient_jungle.png', border:'transparent', color:'#fff', shadow:'0 2px 5px rgba(0,0,0,0.5)', textShadow:'0 2px 4px rgba(0,0,0,0.8)' } },
]

// ─── Minesweeper Themes (Day 22) ────────────────────────────────────────────
export const MINE_THEMES = [
  { id:'default', name:'Classic', desc:'Rumput dan ranjau standar', price:0, icon:'💣', color:'#4CAF50',
    style:{ coveredLight:'#A2D149', coveredDark:'#AAD751', revealedLight:'#E5C29F', revealedDark:'#D7B899', flag:'🚩', mine:'💣' } },
  { id:'ice', name:'Ice Lake', desc:'Danau beku penuh duri es', price:150, icon:'🧊', color:'#74B9FF',
    style:{ coveredLight:'#74B9FF', coveredDark:'#0984E3', revealedLight:'#DFE6E9', revealedDark:'#B2BEC3', flag:'🔥', mine:'❄️' } },
  { id:'lava', name:'Volcanic', desc:'Kerak lava panas membara', price:150, icon:'🌋', color:'#FF4757',
    style:{ coveredLight:'#2d3436', coveredDark:'#1e272e', revealedLight:'#FF4757', revealedDark:'#c0392b', flag:'🗡️', mine:'🔥' } },
  { id:'moon', name:'Lunar Base', desc:'Pangkalan rahasia di bulan', price:200, icon:'🌕', color:'#A29BFE',
    style:{ coveredLight:'#DFE6E9', coveredDark:'#B2BEC3', revealedLight:'#636E72', revealedDark:'#2d3436', flag:'📡', mine:'👽' } },
  { id:'gold', name:'Treasure Hunt', desc:'Mencari harta di padang pasir', price:250, icon:'👑', color:'#FDCB6E',
    style:{ coveredLight:'#FDCB6E', coveredDark:'#e1b12c', revealedLight:'#fff200', revealedDark:'#fbc531', flag:'🗡️', mine:'🐍' } },
  { id:'space-mission', name:'Space Mission', desc:'Misi rahasia di sabuk asteroid', price:200, icon:'🚀', color:'#A29BFE',
    style:{ coveredLight:'#1a1a2e', coveredDark:'#16213e', revealedLight:'#A29BFE', revealedDark:'#6C5CE7', flag:'🚀', mine:'🛸' } },
  { id:'nuclear', name:'Nuclear Zone', desc:'Zona radiasi tinggi berbahaya', price:200, icon:'☢️', color:'#F1C40F',
    style:{ coveredLight:'#2c3e50', coveredDark:'#1a252f', revealedLight:'#F1C40F', revealedDark:'#D4AC0D', flag:'⚠️', mine:'☢️' } },
]

// ─── Jigsaw Themes (Jigsaw Puzzle) ──────────────────────────────────────────
export const JIGSAW_THEMES = [
  { id:'default', name:'Gradient', desc:'Gradien warna-warni yang indah', price:0, icon:'🧩', color:'#E84393',
    style:{ type:'gradient', colors:['#FF6B6B','#A29BFE','#FDCB6E','#4ECDC4'] } },
  { id:'ocean', name:'Ocean Blue', desc:'Gradien biru laut yang menenangkan', price:100, icon:'🌊', color:'#0984E3',
    style:{ type:'gradient', colors:['#0984E3','#74B9FF','#00CEC9','#48DBFB'] } },
  { id:'sunset', name:'Sunset Glow', desc:'Warna matahari terbenam yang spektakuler', price:100, icon:'🌅', color:'#E17055',
    style:{ type:'gradient', colors:['#FF6B6B','#E17055','#FDCB6E','#FD79A8'] } },
  { id:'forest', name:'Forest', desc:'Hijau hutan yang alami dan asri', price:150, icon:'🌲', color:'#00B894',
    style:{ type:'gradient', colors:['#00B894','#55EFC4','#00CEC9','#1DD1A1'] } },
  { id:'galaxy', name:'Galaxy', desc:'Warna galaksi ungu yang misterius', price:150, icon:'🌌', color:'#6C5CE7',
    style:{ type:'gradient', colors:['#6C5CE7','#A29BFE','#FD79A8','#E84393'] } },
  { id:'candy', name:'Candy Pop', desc:'Warna permen yang cerah dan manis', price:200, icon:'🍬', color:'#FD79A8',
    style:{ type:'gradient', colors:['#FD79A8','#FDCB6E','#6C5CE7','#00B894'] } },
  { id:'mono', name:'Monochrome', desc:'Hitam-putih minimalis yang elegan', price:200, icon:'⬛', color:'#636E72',
    style:{ type:'gradient', colors:['#2D3436','#636E72','#B2BEC3','#DFE6E9'] } },
]

// ─── Website Themes (global app themes) ────────────────────────────────────
export const WEBSITE_THEMES = [
  { id:'default', name:'BrainPlay Classic', desc:'Tema default — warm cream & lavender',
    price:0, icon:'🎮', color:'#A29BFE',
    light:{
      bg:'#F5F0E8', surface:'#FEFCF8', text:'#2D3436', muted:'#555E62', border:'#D5DAE0',
      accent:'#A29BFE', accentAlt:'#FD79A8', navBg:'rgba(245,240,232,0.92)', navScrolled:'rgba(245,240,232,0.98)',
    },
    dark:{
      bg:'#1a1a2e', surface:'#16213e', text:'#e8e8f0', muted:'#8892b0', border:'#2d3561',
      accent:'#A29BFE', accentAlt:'#FD79A8', navBg:'rgba(16,10,40,0.85)', navScrolled:'rgba(16,10,40,0.97)',
    },
  },
  { id:'sakura', name:'Sakura Bloom', desc:'Pink bunga sakura yang lembut dan romantis',
    price:200, icon:'🌸', color:'#F8A4C8',
    light:{
      bg:'#F5EBF0', surface:'#FDF8FA', text:'#4A2040', muted:'#9C6B8A', border:'#F8D7E8',
      accent:'#E84393', accentAlt:'#FD79A8', navBg:'rgba(245,235,240,0.94)', navScrolled:'rgba(255,245,249,0.98)',
    },
    dark:{
      bg:'#1E0A18', surface:'#2A1025', text:'#F8D7E8', muted:'#B87DA0', border:'#4A1A38',
      accent:'#E84393', accentAlt:'#FD79A8', navBg:'rgba(30,10,24,0.85)', navScrolled:'rgba(30,10,24,0.97)',
    },
  },
  { id:'ocean', name:'Deep Ocean', desc:'Biru laut dalam yang misterius dan tenang',
    price:200, icon:'🌊', color:'#0984E3',
    light:{
      bg:'#E8F0F8', surface:'#F5FAFF', text:'#1B3A5C', muted:'#5A7DA0', border:'#C8E0F4',
      accent:'#0984E3', accentAlt:'#00CEC9', navBg:'rgba(232,240,248,0.94)', navScrolled:'rgba(240,248,255,0.98)',
    },
    dark:{
      bg:'#0A1628', surface:'#0F2038', text:'#C8E0F4', muted:'#5A8AB5', border:'#1A3050',
      accent:'#0984E3', accentAlt:'#00CEC9', navBg:'rgba(10,22,40,0.85)', navScrolled:'rgba(10,22,40,0.97)',
    },
  },
  { id:'forest', name:'Enchanted Forest', desc:'Hijau hutan ajaib yang menyegarkan mata',
    price:200, icon:'🌿', color:'#00B894',
    light:{
      bg:'#E6F5EC', surface:'#F5FFF8', text:'#1A3C2A', muted:'#5A8A6A', border:'#C8F0D8',
      accent:'#00B894', accentAlt:'#55EFC4', navBg:'rgba(230,245,236,0.94)', navScrolled:'rgba(240,255,245,0.98)',
    },
    dark:{
      bg:'#0A1E14', surface:'#0F2A1C', text:'#C8F0D8', muted:'#5AAF7A', border:'#1A4030',
      accent:'#00B894', accentAlt:'#55EFC4', navBg:'rgba(10,30,20,0.85)', navScrolled:'rgba(10,30,20,0.97)',
    },
  },
  { id:'sunset', name:'Golden Sunset', desc:'Sunset emas hangat yang menenangkan jiwa',
    price:250, icon:'🌅', color:'#F39C12',
    light:{
      bg:'#F5F0E5', surface:'#FEFAF2', text:'#5D3A00', muted:'#A07A40', border:'#F0E0C0',
      accent:'#F39C12', accentAlt:'#E17055', navBg:'rgba(245,240,229,0.94)', navScrolled:'rgba(255,251,240,0.98)',
    },
    dark:{
      bg:'#1E1400', surface:'#2A1E08', text:'#F0E0C0', muted:'#B89050', border:'#4A3818',
      accent:'#F39C12', accentAlt:'#E17055', navBg:'rgba(30,20,0,0.85)', navScrolled:'rgba(30,20,0,0.97)',
    },
  },
  { id:'cyberpunk', name:'Cyberpunk Neon', desc:'Neon futuristik ala kota cyberpunk',
    price:350, icon:'🏙️', color:'#00FF88',
    light:{
      bg:'#E6F5EC', surface:'#F5FFF8', text:'#0A2A15', muted:'#3A7A4A', border:'#B8F0C8',
      accent:'#00D975', accentAlt:'#FF0066', navBg:'rgba(230,245,236,0.94)', navScrolled:'rgba(240,255,245,0.98)',
    },
    dark:{
      bg:'#0A0A1A', surface:'#12122A', text:'#00FF88', muted:'#00CC6E', border:'#1A1A3A',
      accent:'#00FF88', accentAlt:'#FF0066', navBg:'rgba(10,10,26,0.9)', navScrolled:'rgba(10,10,26,0.97)',
    },
  },
  { id:'lavaglow', name:'Lava Glow', desc:'Merah lava membara dari kedalaman bumi',
    price:300, icon:'🌋', color:'#FF4757',
    light:{
      bg:'#F5EDED', surface:'#FDF8F8', text:'#4A0A0A', muted:'#A04040', border:'#F0C8C8',
      accent:'#FF4757', accentAlt:'#FF8C00', navBg:'rgba(245,237,237,0.94)', navScrolled:'rgba(255,245,245,0.98)',
    },
    dark:{
      bg:'#1A0808', surface:'#2A1010', text:'#F0C8C8', muted:'#B06060', border:'#4A1818',
      accent:'#FF4757', accentAlt:'#FF8C00', navBg:'rgba(26,8,8,0.85)', navScrolled:'rgba(26,8,8,0.97)',
    },
  },
  { id:'arctic', name:'Arctic Frost', desc:'Putih es arktik yang bersih dan premium',
    price:300, icon:'❄️', color:'#74B9FF',
    light:{
      bg:'#EDF4FA', surface:'#F8FCFF', text:'#1A2E40', muted:'#5A7A9A', border:'#D0E8F8',
      accent:'#3498DB', accentAlt:'#74B9FF', navBg:'rgba(248,252,255,0.85)', navScrolled:'rgba(248,252,255,0.98)',
    },
    dark:{
      bg:'#0C1820', surface:'#10202E', text:'#D0E8F8', muted:'#5A90B8', border:'#1A3448',
      accent:'#3498DB', accentAlt:'#74B9FF', navBg:'rgba(12,24,32,0.85)', navScrolled:'rgba(12,24,32,0.97)',
    },
  },
  { id:'royal', name:'Royal Velvet', desc:'Ungu kerajaan yang mewah dan megah',
    price:400, icon:'👑', color:'#6C5CE7',
    light:{
      bg:'#F0ECF8', surface:'#F8F5FF', text:'#2A1E50', muted:'#7A68B0', border:'#D8D0F0',
      accent:'#6C5CE7', accentAlt:'#A29BFE', navBg:'rgba(240,236,248,0.94)', navScrolled:'rgba(248,245,255,0.98)',
    },
    dark:{
      bg:'#0E0A20', surface:'#16103A', text:'#D8D0F0', muted:'#8A7CC0', border:'#2A2058',
      accent:'#6C5CE7', accentAlt:'#A29BFE', navBg:'rgba(14,10,32,0.85)', navScrolled:'rgba(14,10,32,0.97)',
    },
  },
]

// ─── Consumable Items (deprecated — hints are now in-game) ──────────────────
export const CONSUMABLES = []

// ─── Memory Pattern Pro Themes (Day 10) ─────────────────────────────────────
export const PATTERN_THEMES = [
  { id:'default', name:'Neon Classic', desc:'Grid neon biru klasik', price:0, icon:'🧠', color:'#00F5FF',
    style:{ cell:'#12123a', cellStroke:'#2a2a5a', glow:'#A29BFE', hit:'#00F5FF', error:'#FF4757', bg:'#060620' } },
  { id:'ember', name:'Ember Grid', desc:'Grid api menyala dalam kegelapan', price:150, icon:'🔥', color:'#FF4500',
    style:{ cell:'#2a1008', cellStroke:'#5a2010', glow:'#FF6348', hit:'#FF4500', error:'#FFD700', bg:'#0a0400' } },
  { id:'matrix', name:'Matrix Code', desc:'Hijau terminal hacker style', price:150, icon:'💻', color:'#00FF41',
    style:{ cell:'#0a1a0a', cellStroke:'#1a3a1a', glow:'#00FF41', hit:'#00FF41', error:'#FF0000', bg:'#000800' } },
  { id:'aurora', name:'Aurora Borealis', desc:'Cahaya utara yang memukau', price:200, icon:'🌌', color:'#7B68EE',
    style:{ cell:'#0a0a28', cellStroke:'#2a2060', glow:'#7B68EE', hit:'#00CED1', error:'#FF69B4', bg:'#020018' } },
  { id:'sakurap', name:'Sakura Pattern', desc:'Pink bunga sakura yang lembut', price:200, icon:'🌸', color:'#FF69B4',
    style:{ cell:'#1e0a18', cellStroke:'#4a1a38', glow:'#FF69B4', hit:'#FFB7D5', error:'#FF4757', bg:'#0e0008' } },
]

// ─── Reaction Test Themes (Day 11) ───────────────────────────────────────────
export const REACTION_THEMES = [
  { id:'default', name:'Classic Colors', desc:'Warna standar yang cerah', price:0, icon:'🎨', color:'#FF6B6B',
    style:{ primary:'#FF6B6B', accent:'#4ECDC4', bg:'#A29BFE', success:'#00B894', warning:'#FDCB6E' } },
  { id:'neon', name:'Neon Glow', desc:'Warna neon yang menyala terang', price:150, icon:'💡', color:'#00FF88',
    style:{ primary:'#00FF88', accent:'#FF00FF', bg:'#00F5FF', success:'#39FF14', warning:'#FFE700' } },
  { id:'pastel', name:'Soft Pastel', desc:'Warna pastel yang lembut di mata', price:150, icon:'🎀', color:'#FFB5E8',
    style:{ primary:'#FFB5E8', accent:'#B5DEFF', bg:'#E7FFAC', success:'#AFF8DB', warning:'#FFDAC1' } },
  { id:'midnight', name:'Midnight', desc:'Gelap misterius dengan aksen tajam', price:200, icon:'🌙', color:'#E74C3C',
    style:{ primary:'#E74C3C', accent:'#3498DB', bg:'#9B59B6', success:'#2ECC71', warning:'#F39C12' } },
]

// ─── Neon Dash Trail Themes (Day 12) ─────────────────────────────────────────
export const DASH_THEMES = [
  { id:'default', name:'Neon Green', desc:'Trail hijau neon klasik', price:0, icon:'💚', color:'#7dff3a',
    style:{ player:'#7dff3a', playerOutline:'#2d8a08', trail:'#7dff3a', glow:'#00F5FF', wave:'#FF6348' } },
  { id:'cyber', name:'Cyber Pink', desc:'Pink cyberpunk yang keren', price:150, icon:'💗', color:'#FF006E',
    style:{ player:'#FF006E', playerOutline:'#8B0040', trail:'#FF006E', glow:'#FF61D2', wave:'#FFD700' } },
  { id:'ice', name:'Ice Dash', desc:'Trail es biru yang membekukan', price:150, icon:'❄️', color:'#00BFFF',
    style:{ player:'#00BFFF', playerOutline:'#006994', trail:'#00BFFF', glow:'#E0FFFF', wave:'#FF4500' } },
  { id:'gold', name:'Golden Rush', desc:'Trail emas berkilau mewah', price:200, icon:'👑', color:'#FFD700',
    style:{ player:'#FFD700', playerOutline:'#B8860B', trail:'#FFD700', glow:'#FFFACD', wave:'#FF6B6B' } },
  { id:'toxic', name:'Toxic', desc:'Hijau beracun yang berbahaya', price:200, icon:'☢️', color:'#ADFF2F',
    style:{ player:'#ADFF2F', playerOutline:'#556B2F', trail:'#ADFF2F', glow:'#7FFF00', wave:'#FF1493' } },
  // ── Lucky Wheel Exclusives ──
  { id:'wheel-dash-robot', name:'Robo Truck', desc:'Truk robot merah-kuning. Lucky Wheel Only!', price:0, icon:'🤖', color:'#E53935', exclusive:true, rarity:'epic',
    img: '/wheel_racer_epic.png',
    style:{ player:'#E53935', playerOutline:'#C62828', trail:'#FFD600', glow:'#FF6F00', wave:'#FF8A65' } },
  { id:'wheel-dash-graffiti', name:'Graffiti Cube', desc:'Cube graffiti penuh warna. Lucky Wheel Only!', price:0, icon:'🎨', color:'#E040FB', exclusive:true, rarity:'epic',
    img: '/wheel_dash.png',
    style:{ player:'#E040FB', playerOutline:'#6A1B9A', trail:'#FF4081', glow:'#E1BEE7', wave:'#FFD740' } },
  { id: 'void-phantom', name: 'Void Phantom', desc: 'Cube dari dimensi hampa. Memiliki efek glitch transparan. Tier 30 Reward!', price: 0, icon: '👻', color: '#A29BFE', exclusive: true, rarity: 'mythic',
    style: { player: '#1a1a2e', playerOutline: '#6c5ce7', trail: '#00f5ff', glow: '#a29bfe', wave: '#ff0064' } },
  { id: 'nebula-runner', name: 'Nebula Runner', desc: 'Pelari kosmik dengan jejak nebula ungu-cyan. Tier 26 Reward!', price: 0, icon: '🌌', color: '#A29BFE', exclusive: true, rarity: 'mythic',
    style: { player: '#a29bfe', playerOutline: '#6c5ce7', trail: '#a29bfe', glow: '#00f5ff', wave: '#ff7675' } },
  { id: 'magma-surge', name: 'Magma Surge', desc: 'Cube berenergi lava panas dengan jejak membara. Tier 29 Reward!', price: 0, icon: '🌋', color: '#ff4757', exclusive: true, rarity: 'mythic',
    style: { player: '#ff4757', playerOutline: '#ff6b81', trail: '#ffa502', glow: '#ff7f50', wave: '#2f3542' } },
]

// ─── Brick Breaker Skins (Day 13) ────────────────────────────────────────────
export const BREAKER_THEMES = [
  { id:'default', name:'Classic Paddle', desc:'Paddle ungu standar', price:0, icon:'🏓', color:'#A29BFE',
    style:{ paddleTop:'#A29BFE', paddleBot:'#6C5CE7', ballColor:'#fff', ballGlow:'#A29BFE', trailColor:'#A29BFE' } },
  { id:'fire', name:'Fire Paddle', desc:'Paddle api yang membakar bata!', price:150, icon:'🔥', color:'#FF4500',
    style:{ paddleTop:'#FF6348', paddleBot:'#EE5A24', ballColor:'#FFD700', ballGlow:'#FF4500', trailColor:'#FF6348' } },
  { id:'ice', name:'Ice Paddle', desc:'Paddle es yang membekukan', price:150, icon:'🧊', color:'#74B9FF',
    style:{ paddleTop:'#74B9FF', paddleBot:'#0984E3', ballColor:'#E0FFFF', ballGlow:'#00CED1', trailColor:'#74B9FF' } },
  { id:'neon', name:'Neon Paddle', desc:'Paddle neon menyala di kegelapan', price:200, icon:'💜', color:'#FF00FF',
    style:{ paddleTop:'#FF00FF', paddleBot:'#8B00FF', ballColor:'#fff', ballGlow:'#FF00FF', trailColor:'#FF00FF' } },
  { id:'gold', name:'Golden Paddle', desc:'Paddle emas premium eksklusif', price:250, icon:'👑', color:'#FFD700',
    style:{ paddleTop:'#FFD700', paddleBot:'#DAA520', ballColor:'#FFFACD', ballGlow:'#FFD700', trailColor:'#FFD700' } },
  { id:'lightning', name:'Lightning Strike', desc:'Paddle bertenaga listrik kilat', price:200, icon:'⚡', color:'#00F5FF',
    style:{ paddleTop:'#00A8FF', paddleBot:'#0097E6', ballColor:'#fff', ballGlow:'#00F5FF', trailColor:'#00F5FF' } },
]

// ─── Wordle Tile Themes (Day 14) ─────────────────────────────────────────────
export const WORDLE_THEMES = [
  { id:'default', name:'Classic Wordle', desc:'Hijau-kuning klasik', price:0, icon:'📝', color:'#27AE60',
    style:{ correct:'#27AE60', present:'#F39C12', absent:'#3B3B3B', absentLight:'#787C7E', empty:'#2A2A2E', emptyLight:'#EDEFF1' } },
  { id:'ocean', name:'Ocean Tiles', desc:'Biru laut untuk tile yang benar', price:150, icon:'🌊', color:'#0984E3',
    style:{ correct:'#0984E3', present:'#00CEC9', absent:'#2C3E50', absentLight:'#95A5A6', empty:'#1A252F', emptyLight:'#ECF0F1' } },
  { id:'sunset', name:'Sunset Tiles', desc:'Merah senja yang hangat', price:150, icon:'🌅', color:'#E74C3C',
    style:{ correct:'#E74C3C', present:'#E67E22', absent:'#34495E', absentLight:'#7F8C8D', empty:'#2C3A47', emptyLight:'#F5F6FA' } },
  { id:'forest', name:'Forest Tiles', desc:'Hijau hutan yang segar', price:200, icon:'🌿', color:'#00B894',
    style:{ correct:'#00B894', present:'#FDCB6E', absent:'#2D3436', absentLight:'#636E72', empty:'#1E272E', emptyLight:'#F0F0F0' } },
  { id:'galaxy', name:'Galaxy Tiles', desc:'Ungu galaksi yang kosmik', price:200, icon:'🔮', color:'#6C5CE7',
    style:{ correct:'#6C5CE7', present:'#FD79A8', absent:'#2D3436', absentLight:'#636E72', empty:'#0A0A1E', emptyLight:'#F0EFFF' } },
]

// ─── Voxel Racer Car Skins (Day 15) ──────────────────────────────────────────
export const RACER_THEMES = [
  { id:'default', name:'Blue Racer', desc:'Mobil biru standar', price:0, icon:'🚗', color:'#3498DB',
    style:{ body:'#3498DB', roof:'#2980B9', accent:'#E74C3C', wheel:'#2C3E50', exhaust:'#FF6348' } },
  { id:'red', name:'Red Devil', desc:'Mobil sport merah menyala', price:150, icon:'🏎️', color:'#E74C3C',
    style:{ body:'#E74C3C', roof:'#C0392B', accent:'#FFD700', wheel:'#1A1A2E', exhaust:'#FF4500' } },
  { id:'toxic', name:'Toxic Green', desc:'Mobil hijau beracun mencolok', price:150, icon:'☢️', color:'#00B894',
    style:{ body:'#00B894', roof:'#00896A', accent:'#FDCB6E', wheel:'#1A2E1A', exhaust:'#7DFF3A' } },
  { id:'gold', name:'Gold Edition', desc:'Mobil emas mewah premium', price:250, icon:'👑', color:'#FFD700',
    style:{ body:'#FFD700', roof:'#DAA520', accent:'#FF6B6B', wheel:'#2C2C1A', exhaust:'#FFFACD' } },
  { id:'shadow', name:'Shadow Runner', desc:'Hitam misterius dengan glow ungu', price:200, icon:'🌑', color:'#6C5CE7',
    style:{ body:'#2D3436', roof:'#1A1A2E', accent:'#6C5CE7', wheel:'#0A0A0A', exhaust:'#A29BFE' } },
  // ── Lucky Wheel Exclusives ──
  { id:'wheel-racer-monster', name:'Monster Truck', desc:'Monster truck legendaris! LEGENDARY!', price:0, icon:'🛻', color:'#FF6D00', exclusive:true, rarity:'legendary',
    img: '/wheel_racer_monster.png',
    style:{ body:'#FF6D00', roof:'#E65100', accent:'#FFD740', wheel:'#3E2723', exhaust:'#FF3D00' } },
  { id:'wheel-racer-beetle', name:'Retro Beetle', desc:'Mobil klasik retro melegenda. LEGENDARY!', price:0, icon:'🚙', color:'#FF8A65', exclusive:true, rarity:'legendary',
    img: '/wheel_racer_legendary.png',
    style:{ body:'#FF8A65', roof:'#FF7043', accent:'#4FC3F7', wheel:'#455A64', exhaust:'#FFAB91' } },
]

// ─── Voxel Racer Maps (NEW) ─────────────────────────────────────────────────
export const RACER_MAP_CATALOG = [
  { id:'default', name:'Classic Hills', desc:'Perbukitan hijau klasik yang cerah', price:0, icon:'⛰️', color:'#4CAF50',
    img: null,
    style:{ skyLight:'#4FC3F7', skyDark:'#B3E5FC', ground:'#5D4037', surface:'#4CAF50', edge:'#388E3C', mountain:'#81C784', accent:'#2E7D32' } },
  { id:'swamp', name:'Toxic Swamp', desc:'Rawa beracun dengan tanah mutasi', price:2000, icon:'🦠', color:'#00B894',
    img: '/map_swamp.png',
    style:{ skyLight:'#1A2E1A', skyDark:'#0A140A', ground:'#1E271C', surface:'#00896A', edge:'#00664D', mountain:'#1A3E24', accent:'#00FF88' } },
  { id:'cave', name:'Ice Cave', desc:'Gua es dingin membekukan ban mobilmu', price:2500, icon:'🧊', color:'#74B9FF',
    img: '/map_cave.png',
    style:{ skyLight:'#0A192F', skyDark:'#020C1B', ground:'#102A43', surface:'#486581', edge:'#334E68', mountain:'#243B53', accent:'#74B9FF' } },
  { id:'factory', name:'Neon Factory', desc:'Pabrik penuh baja dan lava kimia', price:3000, icon:'🏭', color:'#FFD700',
    img: '/map_factory.png',
    style:{ skyLight:'#2C001E', skyDark:'#12000F', ground:'#1E1E1E', surface:'#EB4D4B', edge:'#C23616', mountain:'#2B2B2B', accent:'#FFD700' } },
  { id:'forest', name:'Pine Forest', desc:'Hutan pinus misterius dan tenang', price:4000, icon:'🌲', color:'#00B894',
    img: '/map_forest.png',
    style:{ skyLight:'#0D1B2A', skyDark:'#1B263B', ground:'#3A2E26', surface:'#1D5620', edge:'#113A13', mountain:'#1D3557', accent:'#00B894' } },
  { id:'mars', name:'Mars Valley', desc:'Bukit berbatu merah di planet lain', price:5000, icon:'🪐', color:'#E74C3C',
    img: '/map_mars.png',
    style:{ skyLight:'#200404', skyDark:'#0F0202', ground:'#5A1212', surface:'#D84315', edge:'#BF360C', mountain:'#8E1C1C', accent:'#FF8C00' } },
  { id:'neon-circuit', name:'Neon Circuit', desc:'Lintasan balap kota masa depan', price:3500, icon:'🌃', color:'#FF00FF',
    img: '/racer_neon_circuit.png',
    style:{ skyLight:'#0a0a28', skyDark:'#020210', ground:'#101032', surface:'#6c5ce7', edge:'#4834d4', mountain:'#1a1a4a', accent:'#00f5ff' } },
  { id:'sunset-dunes', name:'Sunset Dunes', desc:'Padang pasir voxel saat senja', price:3500, icon:'🏜️', color:'#E17055',
    img: '/racer_sunset_dunes.png',
    style:{ skyLight:'#f39c12', skyDark:'#e67e22', ground:'#5d4037', surface:'#e17055', edge:'#d35400', mountain:'#a04000', accent:'#f1c40f' } },
]

// ─── Math Challenge Themes (Day 16) ────────────────────────────────────────
export const MATH_THEMES = [
  { id:'default', name:'Classic Purple', desc:'Warna ungu klasik yang fokus', price:0, icon:'🧮', color:'#6C5CE7',
    style:{ primary:'#6C5CE7', accent:'#A29BFE', correct:'#00B894', wrong:'#FF6B6B', timer:'#FDCB6E' } },
  { id:'ocean', name:'Ocean Mind', desc:'Biru laut yang menenangkan pikiran', price:150, icon:'🌊', color:'#0984E3',
    style:{ primary:'#0984E3', accent:'#74B9FF', correct:'#00CEC9', wrong:'#D63031', timer:'#55EFC4' } },
  { id:'fire', name:'Fire Math', desc:'Merah menyala untuk kecepatan maksimal', price:150, icon:'🔥', color:'#E17055',
    style:{ primary:'#E17055', accent:'#FAB1A0', correct:'#00B894', wrong:'#FF3838', timer:'#FFD700' } },
  { id:'matrix', name:'Matrix', desc:'Hijau hacker — hitung seperti komputer', price:200, icon:'💻', color:'#00FF88',
    style:{ primary:'#00FF88', accent:'#00B894', correct:'#7DFF3A', wrong:'#FF006E', timer:'#00F5FF' } },
  { id:'royal', name:'Royal Gold', desc:'Emas mewah untuk matematikawan sejati', price:250, icon:'👑', color:'#FFD700',
    style:{ primary:'#FFD700', accent:'#F9A825', correct:'#00E676', wrong:'#FF5252', timer:'#FFAB00' } },
  { id:'cyber', name:'Cyber Digital', desc:'Gaya hacker dengan angka menyala', price:200, icon:'🔢', color:'#00FF88',
    style:{ primary:'#0a0a0a', accent:'#1a1a1a', correct:'#00FF88', wrong:'#FF0055', timer:'#00F5FF' } },
]

// ─── Coin reward rates ──────────────────────────────────────────────────────
export const COIN_REWARDS = {
  gameWin:    { easy:15, medium:25, hard:40 },
  gameLose:   5,
  threeStars: 20,
  achievement:50,
  dailyLogin: [10,15,20,25,30,40,60],
  levelUp:    30,
}

// ─── Default state ──────────────────────────────────────────────────────────
function getDefaultCoinState() {
  return {
    balance:50, totalEarned:50, totalSpent:0,
    ownedPacks:['default'], activePack:'default',
    ownedSkins:['default'], activeSkin:'default',
    ownedTileThemes:['default'], activeTileTheme:'default',
    ownedHighlights:['default'], activeHighlight:'default',
    ownedShips:['falcon'], activeShip:'falcon',
    ownedHangmanThemes:['default'], activeHangmanTheme:'default',
    ownedTubeThemes:['default'], activeTubeTheme:'default',
    ownedSudokuThemes:['default'], activeSudokuTheme:'default',
    ownedJigsawThemes:['default'], activeJigsawTheme:'default',
    ownedWebThemes:['default'], activeWebTheme:'default',
    ownedPatternThemes:['default'], activePatternTheme:'default',
    ownedReactionThemes:['default'], activeReactionTheme:'default',
    ownedDashThemes:['default'], activeDashTheme:'default',
    ownedBreakerThemes:['default'], activeBreakerTheme:'default',
    ownedWordleThemes:['default'], activeWordleTheme:'default',
    ownedRacerThemes:['default'], activeRacerTheme:'default',
    ownedRacerMaps:['default'], activeRacerMap:'default',
    ownedMathThemes:['default'], activeMathTheme:'default',
    ownedBinaryThemes:['default'], activeBinaryTheme:'default',
    ownedMineThemes:['default'], activeMineTheme:'default',
    ownedSlidingThemes:['default'], activeSlidingTheme:'default',
    hints:0, timeFreezes:0,
    lastDailyClaim:null, dailyStreak:0, transactions:[],
  }
}

// ─── Provider ───────────────────────────────────────────────────────────────
export function CoinProvider({ children }) {
  const { currentMode } = useLimitedMode()
  const [state, setState] = useState(() => {
    const saved = getJSON(StorageKeys.COINS)
    return saved ? { ...getDefaultCoinState(), ...saved } : getDefaultCoinState()
  })
  const [coinAnim, setCoinAnim] = useState(null)

  useEffect(() => {
    setJSON(StorageKeys.COINS, state)
    // Notify cloud save
    try { window.dispatchEvent(new CustomEvent('bp-coin-change')) } catch(e) {}
  }, [state])

  // ── Helper: reconcile wonExclusives ke ownedList ─────────────────────────
  const EXCLUSIVE_MAP = {
    'wheel-ship-ice':      'ownedShips',
    'wheel-racer-monster': 'ownedRacerThemes',
    'wheel-racer-beetle':  'ownedRacerThemes',
    'wheel-dash-robot':    'ownedDashThemes',
    'wheel-dash-graffiti': 'ownedDashThemes',
    'wheel-card-pixel':    'ownedPacks',
    'wheel-sudoku-pastel': 'ownedSudokuThemes',
  }

  const reconcileWheelItems = useCallback((baseState) => {
    try {
      const wheelData = JSON.parse(localStorage.getItem('bp_lucky_wheel')) || {}
      const wonExclusives = wheelData.wonExclusives || []
      if (wonExclusives.length === 0) return baseState
      let changed = false
      const next = { ...baseState }
      wonExclusives.forEach(id => {
        const ownedKey = EXCLUSIVE_MAP[id]
        if (!ownedKey) return
        const list = next[ownedKey] || []
        if (!list.includes(id)) {
          next[ownedKey] = [...list, id]
          changed = true
        }
      })
      return changed ? next : baseState
    } catch { return baseState }
  }, [])

  const earnCoins = useCallback((amount, desc='') => {
    if (amount <= 0) return

    let finalAmt = amount
    if (currentMode && (desc.includes('Menang') || desc.includes('skor') || desc.includes('Level Up!') || desc.includes('('))) {
      if (currentMode.id === 'speed' && desc.includes('(easy)')) {
        finalAmt = Math.round(finalAmt * currentMode.coinMultiplier)
      } else if (currentMode.id === 'survival' && desc.includes('(hard)')) {
        finalAmt = Math.round(finalAmt * currentMode.coinMultiplier)
      } else if (currentMode.id === 'no_mistakes') {
        finalAmt = Math.round(finalAmt * currentMode.coinMultiplier)
      }
    }

    setCoinAnim({ amount: finalAmt, desc })
    setTimeout(() => setCoinAnim(null), 2000)
    setState(s => {
      const tx = { type:'earn', amount: finalAmt, desc, date:Date.now() }
      const txs = [tx, ...(s.transactions||[])].slice(0,20)
      return { ...s, balance:s.balance+finalAmt, totalEarned:(s.totalEarned||0)+finalAmt, transactions:txs }
    })
  }, [currentMode])

  const spendCoins = useCallback((amount, desc='') => {
    return new Promise((resolve) => {
      setState(s => {
        if (s.balance < amount) { resolve(false); return s }
        const tx = { type:'spend', amount, desc, date:Date.now() }
        const txs = [tx, ...(s.transactions||[])].slice(0,20)
        resolve(true)
        return { ...s, balance:s.balance-amount, totalSpent:(s.totalSpent||0)+amount, transactions:txs }
      })
    })
  }, [])

  // ── Side Effects ─────────────────────────────────────────────────────────

  // Startup reconciliation
  useEffect(() => {
    setState(s => reconcileWheelItems(s))
  }, [reconcileWheelItems])

  // Reload from localStorage when cloud sync completes
  useEffect(() => {
    const handler = () => {
      const saved = getJSON(StorageKeys.COINS)
      if (saved) {
        const merged = { ...getDefaultCoinState(), ...saved }
        const reconciled = reconcileWheelItems(merged)
        setState(reconciled)
        if (reconciled !== merged) setJSON(StorageKeys.COINS, reconciled)
      }
    }
    window.addEventListener('bp-cloud-sync', handler)
    return () => window.removeEventListener('bp-cloud-sync', handler)
  }, [reconcileWheelItems])

  // Lucky Wheel unlock handler
  useEffect(() => {
    const handler = (e) => {
      const { item } = e.detail || {}
      if (!item) return
      const typeToKey  = { ships:'ownedShips', racerThemes:'ownedRacerThemes', dashThemes:'ownedDashThemes', packs:'ownedPacks', sudokuThemes:'ownedSudokuThemes', binaryThemes:'ownedBinaryThemes', mineThemes:'ownedMineThemes', slidingThemes:'ownedSlidingThemes' }
      const activeToKey = { ships:'activeShip', racerThemes:'activeRacerTheme', dashThemes:'activeDashTheme', packs:'activePack', sudokuThemes:'activeSudokuTheme', binaryThemes:'activeBinaryTheme', mineThemes:'activeMineTheme', slidingThemes:'activeSlidingTheme' }
      const key  = typeToKey[item.type]
      const aKey = activeToKey[item.type]
      if (!key) return
      setState(s => {
        if ((s[key] || []).includes(item.id)) return s
        const next = { ...s, [key]: [...(s[key] || []), item.id] }
        if (aKey) next[aKey] = item.id
        return next
      })
    }
    window.addEventListener('bp-wheel-unlock', handler)
    return () => window.removeEventListener('bp-wheel-unlock', handler)
  }, [])

  // Achievement coins handler
  useEffect(() => {
    const handler = (e) => {
      const { amount, desc } = e.detail || {}
      if (amount) earnCoins(amount, desc)
    }
    window.addEventListener('bp-add-coins', handler)
    return () => window.removeEventListener('bp-add-coins', handler)
  }, [earnCoins])

  // ── Functions ─────────────────────────────────────────────────────────────

  const buyCosmetic = useCallback(async (type, itemId) => {
    const catalog = { packs:ICON_PACKS, skins:SNAKE_SKINS, tileThemes:TILE_THEMES, highlights:HIGHLIGHT_PACKS, ships:SHIP_CATALOG, hangmanThemes:HANGMAN_THEMES, tubeThemes:TUBE_THEMES, sudokuThemes:SUDOKU_THEMES, jigsawThemes:JIGSAW_THEMES, webThemes:WEBSITE_THEMES, patternThemes:PATTERN_THEMES, reactionThemes:REACTION_THEMES, dashThemes:DASH_THEMES, breakerThemes:BREAKER_THEMES, wordleThemes:WORDLE_THEMES, racerThemes:RACER_THEMES, racerMaps:RACER_MAP_CATALOG, mathThemes:MATH_THEMES, binaryThemes:BINARY_THEMES, mineThemes:MINE_THEMES, slidingThemes:SLIDING_THEMES }
    const ownedKey = { packs:'ownedPacks', skins:'ownedSkins', tileThemes:'ownedTileThemes', highlights:'ownedHighlights', ships:'ownedShips', hangmanThemes:'ownedHangmanThemes', tubeThemes:'ownedTubeThemes', sudokuThemes:'ownedSudokuThemes', jigsawThemes:'ownedJigsawThemes', webThemes:'ownedWebThemes', patternThemes:'ownedPatternThemes', reactionThemes:'ownedReactionThemes', dashThemes:'ownedDashThemes', breakerThemes:'ownedBreakerThemes', wordleThemes:'ownedWordleThemes', racerThemes:'ownedRacerThemes', racerMaps:'ownedRacerMaps', mathThemes:'ownedMathThemes', binaryThemes:'ownedBinaryThemes', mineThemes:'ownedMineThemes', slidingThemes:'ownedSlidingThemes' }
    const items = catalog[type]; const key = ownedKey[type]
    if (!items||!key) return { success:false, reason:'Tipe tidak valid' }
    const item = items.find(i => i.id === itemId)
    if (!item) return { success:false, reason:'Item tidak ditemukan' }
    if ((state[key]||[]).includes(itemId)) return { success:false, reason:'Sudah dimiliki' }
    if (state.balance < item.price) return { success:false, reason:'Coin tidak cukup' }
    const ok = await spendCoins(item.price, `Beli ${item.name}`)
    if (ok) { setState(s => ({ ...s, [key]:[...(s[key]||[]), itemId] })); return { success:true } }
    return { success:false, reason:'Gagal membeli' }
  }, [state.balance, spendCoins])

  const buyPack = useCallback((packId) => buyCosmetic('packs', packId), [buyCosmetic])

  const equipCosmetic = useCallback((type, itemId) => {
    const ownedKey  = { packs:'ownedPacks', skins:'ownedSkins', tileThemes:'ownedTileThemes', highlights:'ownedHighlights', ships:'ownedShips', hangmanThemes:'ownedHangmanThemes', tubeThemes:'ownedTubeThemes', sudokuThemes:'ownedSudokuThemes', jigsawThemes:'ownedJigsawThemes', webThemes:'ownedWebThemes', patternThemes:'ownedPatternThemes', reactionThemes:'ownedReactionThemes', dashThemes:'ownedDashThemes', breakerThemes:'ownedBreakerThemes', wordleThemes:'ownedWordleThemes', racerThemes:'ownedRacerThemes', racerMaps:'ownedRacerMaps', mathThemes:'ownedMathThemes', binaryThemes:'ownedBinaryThemes', mineThemes:'ownedMineThemes', slidingThemes:'ownedSlidingThemes' }
    const activeKey = { packs:'activePack', skins:'activeSkin', tileThemes:'activeTileTheme', highlights:'activeHighlight', ships:'activeShip', hangmanThemes:'activeHangmanTheme', tubeThemes:'activeTubeTheme', sudokuThemes:'activeSudokuTheme', jigsawThemes:'activeJigsawTheme', webThemes:'activeWebTheme', patternThemes:'activePatternTheme', reactionThemes:'activeReactionTheme', dashThemes:'activeDashTheme', breakerThemes:'activeBreakerTheme', wordleThemes:'activeWordleTheme', racerThemes:'activeRacerTheme', racerMaps:'activeRacerMap', mathThemes:'activeMathTheme', binaryThemes:'activeBinaryTheme', mineThemes:'activeMineTheme', slidingThemes:'activeSlidingTheme' }
    const key = ownedKey[type]; const aKey = activeKey[type]
    if (!key||!aKey) return
    if (!(state[key]||[]).includes(itemId)) return
    setState(s => ({ ...s, [aKey]:itemId }))
  }, [state])

  const setActivePack = useCallback((packId) => equipCosmetic('packs', packId), [equipCosmetic])

  const buyConsumable = useCallback(async (consumableId) => {
    const item = CONSUMABLES.find(c => c.id === consumableId)
    if (!item) return { success:false, reason:'Item tidak ditemukan' }
    if (state.balance < item.price) return { success:false, reason:'Coin tidak cukup' }
    const ok = await spendCoins(item.price, `Beli ${item.name}`)
    if (ok) {
      setState(s => {
        if (consumableId === 'extra-hints') return { ...s, hints:(s.hints||0)+item.amount }
        if (consumableId === 'time-freeze') return { ...s, timeFreezes:(s.timeFreezes||0)+item.amount }
        return s
      })
      return { success:true }
    }
    return { success:false, reason:'Gagal membeli' }
  }, [state.balance, spendCoins])

  const useHint = useCallback(() => {
    if ((state.hints||0) <= 0) return false
    setState(s => ({ ...s, hints:(s.hints||0)-1 })); return true
  }, [state.hints])

  const useTimeFreeze = useCallback(() => {
    if ((state.timeFreezes||0) <= 0) return false
    setState(s => ({ ...s, timeFreezes:(s.timeFreezes||0)-1 })); return true
  }, [state.timeFreezes])

  const claimDaily = useCallback(() => {
    const today = new Date().toDateString()
    if (state.lastDailyClaim === today) return { success:false, reason:'Sudah diklaim hari ini' }
    const yesterday = new Date(Date.now()-86400000).toDateString()
    let newStreak = state.lastDailyClaim === yesterday ? (state.dailyStreak||0)+1 : 1
    if (newStreak > 7) newStreak = 1
    const reward = COIN_REWARDS.dailyLogin[Math.min(newStreak-1, COIN_REWARDS.dailyLogin.length-1)]
    setState(s => ({ ...s, lastDailyClaim:today, dailyStreak:newStreak }))
    earnCoins(reward, `Login harian (hari ke-${newStreak})`)
    return { success:true, amount:reward, streak:newStreak }
  }, [state.lastDailyClaim, state.dailyStreak, earnCoins])

  const isDailyClaimable = state.lastDailyClaim !== new Date().toDateString()

  const getActiveIcons = useCallback(() => {
    const pack = ICON_PACKS.find(p => p.id === state.activePack)
    return pack ? pack.icons : ICON_PACKS[0].icons
  }, [state.activePack])

  const getActiveCardPack = useCallback(() => {
    return ICON_PACKS.find(p => p.id === state.activePack) || ICON_PACKS[0]
  }, [state.activePack])

  const getActiveSkin = useCallback(() => {
    const s = SNAKE_SKINS.find(sk => sk.id === state.activeSkin)
    return s ? s.skin : SNAKE_SKINS[0].skin
  }, [state.activeSkin])

  const getActiveTileColors = useCallback(() => {
    const t = TILE_THEMES.find(th => th.id === state.activeTileTheme)
    return t ? t.colors : TILE_THEMES[0].colors
  }, [state.activeTileTheme])

  const getActiveHighlightColors = useCallback(() => {
    const p = HIGHLIGHT_PACKS.find(h => h.id === state.activeHighlight)
    return p ? p.colors : HIGHLIGHT_PACKS[0].colors
  }, [state.activeHighlight])

  const getActiveShip = useCallback(() => {
    const ship = SHIP_CATALOG.find(s => s.id === state.activeShip)
    return ship || SHIP_CATALOG[0]
  }, [state.activeShip])

  const getActiveHangmanTheme = useCallback(() => {
    const t = HANGMAN_THEMES.find(h => h.id === state.activeHangmanTheme)
    return t ? t.style : HANGMAN_THEMES[0].style
  }, [state.activeHangmanTheme])

  const getActiveTubeTheme = useCallback(() => {
    const t = TUBE_THEMES.find(h => h.id === state.activeTubeTheme)
    return t ? t.style : TUBE_THEMES[0].style
  }, [state.activeTubeTheme])

  const getActiveSudokuTheme = useCallback(() => {
    const t = SUDOKU_THEMES.find(h => h.id === state.activeSudokuTheme)
    const theme = t || SUDOKU_THEMES[0]
    return { ...theme.style, id: theme.id, bg: theme.style.bg, assets: theme.assets || null }
  }, [state.activeSudokuTheme])

  const getActiveJigsawTheme = useCallback(() => {
    const t = JIGSAW_THEMES.find(h => h.id === state.activeJigsawTheme)
    return t ? t.style : JIGSAW_THEMES[0].style
  }, [state.activeJigsawTheme])

  const getActiveWebTheme = useCallback(() => {
    const t = WEBSITE_THEMES.find(h => h.id === state.activeWebTheme)
    return t || WEBSITE_THEMES[0]
  }, [state.activeWebTheme])

  const getActivePatternTheme = useCallback(() => {
    const t = PATTERN_THEMES.find(h => h.id === state.activePatternTheme)
    return t ? t.style : PATTERN_THEMES[0].style
  }, [state.activePatternTheme])

  const getActiveReactionTheme = useCallback(() => {
    const t = REACTION_THEMES.find(h => h.id === state.activeReactionTheme)
    return t ? t.style : REACTION_THEMES[0].style
  }, [state.activeReactionTheme])

  const getActiveDashTheme = useCallback(() => {
    const t = DASH_THEMES.find(h => h.id === state.activeDashTheme)
    return t ? t.style : DASH_THEMES[0].style
  }, [state.activeDashTheme])

  const getActiveBreakerTheme = useCallback(() => {
    const t = BREAKER_THEMES.find(h => h.id === state.activeBreakerTheme)
    return t ? t.style : BREAKER_THEMES[0].style
  }, [state.activeBreakerTheme])

  const getActiveWordleTheme = useCallback(() => {
    const t = WORDLE_THEMES.find(h => h.id === state.activeWordleTheme)
    return t ? t.style : WORDLE_THEMES[0].style
  }, [state.activeWordleTheme])

  const getActiveRacerTheme = useCallback(() => {
    const t = RACER_THEMES.find(h => h.id === state.activeRacerTheme)
    return t ? t.style : RACER_THEMES[0].style
  }, [state.activeRacerTheme])

  const getActiveRacerMap = useCallback(() => {
    const m = RACER_MAP_CATALOG.find(h => h.id === state.activeRacerMap)
    return m || RACER_MAP_CATALOG[0]
  }, [state.activeRacerMap])

  const getActiveMathTheme = useCallback(() => {
    const t = MATH_THEMES.find(h => h.id === state.activeMathTheme)
    return t ? t.style : MATH_THEMES[0].style
  }, [state.activeMathTheme])

  return (
    <CoinContext.Provider value={{
      coins:state.balance, totalEarned:state.totalEarned, totalSpent:state.totalSpent,
      ownedPacks:state.ownedPacks||[], activePack:state.activePack,
      ownedSkins:state.ownedSkins||[], activeSkin:state.activeSkin,
      ownedTileThemes:state.ownedTileThemes||[], activeTileTheme:state.activeTileTheme,
      ownedHighlights:state.ownedHighlights||[], activeHighlight:state.activeHighlight,
      ownedShips:state.ownedShips||[], activeShip:state.activeShip,
      ownedHangmanThemes:state.ownedHangmanThemes||[], activeHangmanTheme:state.activeHangmanTheme,
      ownedTubeThemes:state.ownedTubeThemes||[], activeTubeTheme:state.activeTubeTheme,
      ownedSudokuThemes:state.ownedSudokuThemes||[], activeSudokuTheme:state.activeSudokuTheme,
      ownedJigsawThemes:state.ownedJigsawThemes||[], activeJigsawTheme:state.activeJigsawTheme,
      ownedWebThemes:state.ownedWebThemes||[], activeWebTheme:state.activeWebTheme,
      ownedPatternThemes:state.ownedPatternThemes||[], activePatternTheme:state.activePatternTheme,
      ownedReactionThemes:state.ownedReactionThemes||[], activeReactionTheme:state.activeReactionTheme,
      ownedDashThemes:state.ownedDashThemes||[], activeDashTheme:state.activeDashTheme,
      ownedBreakerThemes:state.ownedBreakerThemes||[], activeBreakerTheme:state.activeBreakerTheme,
      ownedWordleThemes:state.ownedWordleThemes||[], activeWordleTheme:state.activeWordleTheme,
      ownedRacerThemes:state.ownedRacerThemes||[], activeRacerTheme:state.activeRacerTheme,
      ownedRacerMaps:state.ownedRacerMaps||[], activeRacerMap:state.activeRacerMap,
      ownedMathThemes:state.ownedMathThemes||[], activeMathTheme:state.activeMathTheme,
      ownedBinaryThemes:state.ownedBinaryThemes||[], activeBinaryTheme:state.activeBinaryTheme,
      ownedMineThemes:state.ownedMineThemes||[], activeMineTheme:state.activeMineTheme,
      ownedSlidingThemes:state.ownedSlidingThemes||[], activeSlidingTheme:state.activeSlidingTheme,
      hints:state.hints||0, timeFreezes:state.timeFreezes||0,
      dailyStreak:state.dailyStreak, transactions:state.transactions||[],
      isDailyClaimable, coinAnim,
      earnCoins, spendCoins, buyPack, buyCosmetic, equipCosmetic,
      buyConsumable, useHint, useTimeFreeze,
      setActivePack, claimDaily,
      getActiveIcons, getActiveCardPack, getActiveSkin, getActiveTileColors, getActiveHighlightColors, getActiveShip,
      getActiveHangmanTheme, getActiveTubeTheme, getActiveSudokuTheme, getActiveJigsawTheme,
      getActiveWebTheme, getActivePatternTheme, getActiveReactionTheme, getActiveDashTheme,
      getActiveBreakerTheme, getActiveWordleTheme, getActiveRacerTheme, getActiveRacerMap,
      getActiveMathTheme,
    }}>
      {children}
    </CoinContext.Provider>
  )
}

export function useCoins() { return useContext(CoinContext) }
