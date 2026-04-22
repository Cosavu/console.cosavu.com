"use client"

export type ConsoleStats = {
  source: "live" | "unavailable"
  apiKeyFingerprint: string | null
  activeKeys: number
  latestIssue: string | null
  monthlyUsagePercent: number | null
  requestsUsed: number | null
  requestLimit: number | null
  currentBillUsd: number
  paidInvoices: number
  bucketCount: number
  chunksIndexed: number
  filesSynced: number
  connectedWarehouses: number
  tokenSavingsPercent: number | null
  tokensBeforeFilter: number | null
  tokensSaved: number | null
  ledger: Array<{
    id: string
    activity: string
    units: string
    amount: string
    happenedAt: string
    status: "posted" | "processing"
  }>
  error?: string
}

export const EMPTY_CONSOLE_STATS: ConsoleStats = {
  source: "unavailable",
  apiKeyFingerprint: null,
  activeKeys: 0,
  latestIssue: null,
  monthlyUsagePercent: null,
  requestsUsed: null,
  requestLimit: null,
  currentBillUsd: 0,
  paidInvoices: 0,
  bucketCount: 0,
  chunksIndexed: 0,
  filesSynced: 0,
  connectedWarehouses: 0,
  tokenSavingsPercent: null,
  tokensBeforeFilter: null,
  tokensSaved: null,
  ledger: [],
}

export async function fetchConsoleStats() {
  const response = await fetch("/api/console-stats", {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Console stats request failed with ${response.status}`)
  }

  return (await response.json()) as ConsoleStats
}

export function mergeConsoleStats(
  stats: ConsoleStats,
  localStats: Partial<ConsoleStats>
): ConsoleStats {
  return {
    ...stats,
    activeKeys: Math.max(stats.activeKeys, localStats.activeKeys ?? 0),
    latestIssue: stats.latestIssue || localStats.latestIssue || null,
    monthlyUsagePercent:
      stats.monthlyUsagePercent ?? localStats.monthlyUsagePercent ?? null,
    requestsUsed: stats.requestsUsed ?? localStats.requestsUsed ?? null,
    requestLimit: stats.requestLimit ?? localStats.requestLimit ?? null,
    currentBillUsd: Math.max(
      stats.currentBillUsd,
      localStats.currentBillUsd ?? 0
    ),
    paidInvoices: Math.max(stats.paidInvoices, localStats.paidInvoices ?? 0),
    bucketCount: Math.max(stats.bucketCount, localStats.bucketCount ?? 0),
    chunksIndexed: Math.max(stats.chunksIndexed, localStats.chunksIndexed ?? 0),
    filesSynced: Math.max(stats.filesSynced, localStats.filesSynced ?? 0),
    connectedWarehouses: Math.max(
      stats.connectedWarehouses,
      localStats.connectedWarehouses ?? 0
    ),
    tokenSavingsPercent:
      stats.tokenSavingsPercent ?? localStats.tokenSavingsPercent ?? null,
    tokensBeforeFilter:
      stats.tokensBeforeFilter ?? localStats.tokensBeforeFilter ?? null,
    tokensSaved: stats.tokensSaved ?? localStats.tokensSaved ?? null,
    ledger: stats.ledger.length > 0 ? stats.ledger : localStats.ledger || [],
  }
}
