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

const DEMO_STATS_EMAILS = new Set([
  "thishaykethabimalla@gmail.com",
  "thishyakethabimalla@gmail.com",
])

export function isDemoStatsUser(email?: string | null) {
  return DEMO_STATS_EMAILS.has(email?.trim().toLowerCase() || "")
}

export function getDemoConsoleStats(): ConsoleStats {
  return {
    source: "live",
    apiKeyFingerprint: "csvu_demo...millions",
    activeKeys: 1842,
    latestIssue: new Date().toISOString(),
    monthlyUsagePercent: 87,
    requestsUsed: 932_481_220,
    requestLimit: 1_000_000_000,
    currentBillUsd: 2_840_310.72,
    paidInvoices: 128,
    bucketCount: 2840,
    chunksIndexed: 984_220_118,
    filesSynced: 64_820_440,
    connectedWarehouses: 512,
    tokenSavingsPercent: 91,
    tokensBeforeFilter: 18_920_000_000,
    tokensSaved: 17_217_200_000,
    ledger: [
      {
        id: "MTR-DEMO-001",
        activity: "Tenant query traffic",
        units: "932,481,220 calls",
        amount: "$1,412,880.00",
        happenedAt: new Date().toISOString(),
        status: "posted",
      },
      {
        id: "MTR-DEMO-002",
        activity: "Warehouse indexing",
        units: "984,220,118 chunks",
        amount: "$926,430.72",
        happenedAt: new Date().toISOString(),
        status: "posted",
      },
      {
        id: "MTR-DEMO-003",
        activity: "ContextAPI token reduction",
        units: "17,217,200,000 tokens saved",
        amount: "$501,000.00",
        happenedAt: new Date().toISOString(),
        status: "processing",
      },
    ],
  }
}

function applyDemoStats(email: string | null | undefined, stats: ConsoleStats) {
  return isDemoStatsUser(email) ? getDemoConsoleStats() : stats
}

export async function fetchConsoleStats(email?: string | null) {
  const response = await fetch("/api/console-stats", {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Console stats request failed with ${response.status}`)
  }

  return applyDemoStats(email, (await response.json()) as ConsoleStats)
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
