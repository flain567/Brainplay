// Minimal match-3 grid utilities for prototype
const TILE_TYPES = 6

export function createGrid(rows, cols){
  const g = Array.from({length:rows}, ()=> Array.from({length:cols}, ()=> randType()))
  // ensure no starting matches
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      while(hasMatchAt(g,r,c)) g[r][c] = randType()
    }
  }
  return g
}

function randType(){ return Math.floor(Math.random()*TILE_TYPES)+1 }

function hasMatchAt(grid,r,c){
  const t = grid[r][c]
  // horizontal
  if(c>=2 && grid[r][c-1]===t && grid[r][c-2]===t) return true
  // vertical
  if(r>=2 && grid[r-1][c]===t && grid[r-2][c]===t) return true
  return false
}

export function swapCells(grid, a, b){
  const g = grid.map(row=>row.slice())
  const [ar,ac]=a, [br,bc]=b
  const tmp = g[ar][ac]
  g[ar][ac] = g[br][bc]
  g[br][bc] = tmp
  return g
}

export function resolveMatches(grid){
  let g = grid.map(row=>row.slice())
  let removed = true
  const rows = g.length, cols = g[0].length
  while(removed){
    removed = false
    const removeMask = Array.from({length:rows}, ()=> Array(cols).fill(false))
    // find matches
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const t = g[r][c]
        if(!t) continue
        // horiz
        if(c<=cols-3 && g[r][c+1]===t && g[r][c+2]===t){
          let k=c
          while(k<cols && g[r][k]===t){ removeMask[r][k]=true; k++ }
        }
        // vert
        if(r<=rows-3 && g[r+1][c]===t && g[r+2][c]===t){
          let k=r
          while(k<rows && g[k][c]===t){ removeMask[k][c]=true; k++ }
        }
      }
    }
    // apply removals
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        if(removeMask[r][c]){ g[r][c]=0; removed=true }
      }
    }
    if(removed){
      // collapse
      for(let c=0;c<cols;c++){
        let write = rows-1
        for(let r=rows-1;r>=0;r--){
          if(g[r][c]!==0){ g[write][c]=g[r][c]; write-- }
        }
        for(let r=write;r>=0;r--) g[r][c]=randType()
      }
    }
  }
  return g
}

export default {createGrid, swapCells, resolveMatches}
