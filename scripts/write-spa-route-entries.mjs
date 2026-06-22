import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const distDir = join(process.cwd(), 'dist')
const indexFile = join(distDir, 'index.html')

const routeEntries = [
  'anti_fraud_board_game/anti_fraud_board_game_20260623',
  'anti-fraud-board-game/anti_fraud_board_game_20260623',
]

if (!existsSync(indexFile)) {
  throw new Error('dist/index.html not found. Run vite build first.')
}

for (const routeEntry of routeEntries) {
  const target = join(distDir, routeEntry)
  mkdirSync(dirname(target), { recursive: true })
  copyFileSync(indexFile, target)
}
