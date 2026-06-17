function toFiniteNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function collectPrizeStockSources(source) {
  if (!source || typeof source !== 'object') return []
  return [
    source.activityConfig?.snapshot?.prize,
    source.activityConfig?.snapshot,
    source.activityConfig?.prize,
    source.activityConfig,
    source.snapshot?.prize,
    source.snapshot,
    source.prize,
    source.currentPhase?.prize,
    source.currentPhase?.prizes?.[0],
    source.prizes?.[0],
    source,
  ].filter(Boolean)
}

function readStockValue(source, keys) {
  for (const key of keys) {
    const value = toFiniteNumber(source?.[key])
    if (value !== null) return value
  }
  return null
}

export function resolvePrizeStockInfo(...sources) {
  for (const source of sources) {
    const stockSources = collectPrizeStockSources(source)
    for (const stockSource of stockSources) {
      const stockTotal = readStockValue(stockSource, ['stock_total', 'stockTotal', 'totalStock'])
      const stockUsed = readStockValue(stockSource, ['stock_used', 'stockUsed', 'usedStock'])
      const stockRemaining = readStockValue(stockSource, ['stock_remaining', 'stockRemaining', 'remainingStock'])

      if (stockRemaining !== null) {
        return { stockRemaining, stockTotal, stockUsed }
      }
      if (stockTotal !== null && stockUsed !== null) {
        return { stockRemaining: stockTotal - stockUsed, stockTotal, stockUsed }
      }
    }
  }
  return null
}

export function isPrizeStockExhausted(stockInfo) {
  return Boolean(stockInfo && stockInfo.stockRemaining <= 0)
}

export function drawEntryGuard(activityState) {
  if (!activityState) {
    return {
      allow: false,
      reason: 'NOT_ELIGIBLE',
    }
  }
  if (
    (Number.isFinite(activityState.stockRemaining) && activityState.stockRemaining <= 0) ||
    (
      Number.isFinite(activityState.stockUsed) &&
      Number.isFinite(activityState.stockTotal) &&
      activityState.stockUsed >= activityState.stockTotal
    )
  ) {
    return {
      allow: false,
      reason: 'STOCK_EMPTY',
    }
  }
  if (activityState.eligibleForDraw !== true) {
    return {
      allow: false,
      reason: 'NOT_ELIGIBLE',
    }
  }
  return { allow: true }
}
