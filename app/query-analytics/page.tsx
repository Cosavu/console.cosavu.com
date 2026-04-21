"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { onAuthStateChanged, type User } from "firebase/auth"
import {
  BarChart2,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Database,
  Gauge,
  Moon,
  RefreshCw,
  Search,
  ShieldCheck,
  Sun,
  Target,
  Zap,
} from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { COSAVU_DATA_API_BASE_URL, COSAVU_ENDPOINTS } from "@/lib/cosavu-api"
import { auth } from "@/lib/firebase"

type QuerySystem = "car-0" | "car-1"
type QueryStatus = "success" | "empty" | "error"

type QueryEvent = {
  id: string
  timestamp: string
  tenant: string
  actor: string
  apiKey: string
  requestId: string
  route: string
  query: string
  system: QuerySystem
  collection: string
  topK: number
  cosavuCandidates: number
  car1Threshold: number
  candidateCount: number
  retainedCount: number
  returnedCount: number
  dbLatencyMs: number
  car1LatencyMs: number
  totalMs: number
  status: QueryStatus
}

const LOCAL_QUERY_ANALYTICS_STORAGE_PREFIX = "cosavu:query-analytics"

const SYSTEM_LABELS: Record<QuerySystem, string> = {
  "car-0": "CAR-0",
  "car-1": "CAR-1",
}

const STATUS_LABELS: Record<QueryStatus, string> = {
  success: "Success",
  empty: "No results",
  error: "Error",
}

const TIME_OPTIONS = [
  { value: "1h", label: "Last hour", minutes: 60 },
  { value: "24h", label: "Last 24 hours", minutes: 1440 },
  { value: "7d", label: "Last 7 days", minutes: 10080 },
  { value: "all", label: "All time", minutes: null },
]

function getAnalyticsStorageKey(email?: string | null) {
  return `${LOCAL_QUERY_ANALYTICS_STORAGE_PREFIX}:${email?.toLowerCase() || "unknown"}`
}

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
  }

  return `${prefix}-${Date.now().toString(36)}`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value)
}

function formatTimestamp(value?: string | null) {
  if (!value) return "Unknown"

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value))
}

function getStatusVariant(status: QueryStatus) {
  if (status === "success") return "secondary"
  if (status === "empty") return "outline"

  return "destructive"
}

function readLocalQueryEvents(email?: string | null) {
  if (typeof window === "undefined") return []

  try {
    const storedEvents = window.localStorage.getItem(
      getAnalyticsStorageKey(email)
    )
    if (!storedEvents) return []

    const parsedEvents = JSON.parse(storedEvents)
    if (!Array.isArray(parsedEvents)) return []

    return parsedEvents.filter((event): event is QueryEvent => {
      return Boolean(event?.id && event?.timestamp && event?.query)
    })
  } catch {
    return []
  }
}

function saveLocalQueryEvents(
  email: string | null | undefined,
  events: QueryEvent[]
) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(
    getAnalyticsStorageKey(email),
    JSON.stringify(events.slice(0, 300))
  )
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) return 0

  const sortedValues = [...values].sort((a, b) => a - b)
  const index = Math.ceil((percentileValue / 100) * sortedValues.length) - 1

  return sortedValues[Math.max(0, Math.min(sortedValues.length - 1, index))]
}

function createQueryEvent(
  email: string | null | undefined,
  overrides: Partial<QueryEvent>
) {
  const tenant = email?.split("@")[0]?.replace(/[^a-z0-9]+/gi, "-") || "cosavu"
  const timestamp = overrides.timestamp || new Date().toISOString()
  const dbLatencyMs = overrides.dbLatencyMs ?? 34
  const car1LatencyMs = overrides.car1LatencyMs ?? 12

  return {
    id: overrides.id || makeId("query"),
    timestamp,
    tenant: overrides.tenant || tenant.toLowerCase(),
    actor: overrides.actor || email || "workspace@cosavu.com",
    apiKey: overrides.apiKey || "csvu_prod_7e3f",
    requestId: overrides.requestId || makeId("req"),
    route: `POST ${COSAVU_ENDPOINTS.data.query}`,
    query: overrides.query || "How does Cosavu isolate tenant documents?",
    system: overrides.system || "car-0",
    collection: overrides.collection || "tenant-docs",
    topK: overrides.topK ?? 5,
    cosavuCandidates: overrides.cosavuCandidates ?? 20,
    car1Threshold: overrides.car1Threshold ?? 0.5,
    candidateCount: overrides.candidateCount ?? 20,
    retainedCount: overrides.retainedCount ?? 12,
    returnedCount: overrides.returnedCount ?? 5,
    dbLatencyMs,
    car1LatencyMs,
    totalMs: overrides.totalMs ?? dbLatencyMs + car1LatencyMs,
    status: overrides.status || "success",
  } satisfies QueryEvent
}

function createDefaultQueryEvents(email?: string | null) {
  return [
    createQueryEvent(email, {
      id: "query-tenant-isolation",
      timestamp: "2026-04-21T09:52:22.000Z",
      query: "How does Cosavu keep customer files isolated?",
      system: "car-0",
      collection: "tenant-docs",
      cosavuCandidates: 20,
      candidateCount: 20,
      retainedCount: 14,
      returnedCount: 5,
      dbLatencyMs: 28,
      car1LatencyMs: 9,
      totalMs: 37,
    }),
    createQueryEvent(email, {
      id: "query-car1-policy",
      timestamp: "2026-04-21T09:49:10.000Z",
      query: "Which policy mentions warehouse credential rotation?",
      system: "car-1",
      collection: "security-policy",
      cosavuCandidates: 24,
      candidateCount: 24,
      retainedCount: 11,
      returnedCount: 5,
      dbLatencyMs: 46,
      car1LatencyMs: 14,
      totalMs: 60,
    }),
    createQueryEvent(email, {
      id: "query-product-api",
      timestamp: "2026-04-21T09:44:31.000Z",
      query: "Show the upload API flow for raw files",
      system: "car-0",
      collection: "product-handbook",
      cosavuCandidates: 18,
      candidateCount: 18,
      retainedCount: 10,
      returnedCount: 5,
      dbLatencyMs: 31,
      car1LatencyMs: 11,
      totalMs: 42,
    }),
    createQueryEvent(email, {
      id: "query-empty-archive",
      timestamp: "2026-04-21T09:36:03.000Z",
      query: "Find all archived parity test artifacts",
      system: "car-0",
      collection: "archive-dropbox",
      cosavuCandidates: 20,
      candidateCount: 3,
      retainedCount: 0,
      returnedCount: 0,
      dbLatencyMs: 24,
      car1LatencyMs: 3,
      totalMs: 27,
      status: "empty",
    }),
    createQueryEvent(email, {
      id: "query-customer-contracts",
      timestamp: "2026-04-21T09:21:55.000Z",
      query: "Summarize renewal terms from customer contracts",
      system: "car-1",
      collection: "customer-contracts",
      cosavuCandidates: 32,
      candidateCount: 32,
      retainedCount: 19,
      returnedCount: 8,
      topK: 8,
      car1Threshold: 0.45,
      dbLatencyMs: 55,
      car1LatencyMs: 18,
      totalMs: 73,
    }),
    createQueryEvent(email, {
      id: "query-engine-error",
      timestamp: "2026-04-21T08:58:39.000Z",
      query: "Search the missing legacy collection",
      system: "car-0",
      collection: "legacy-imports",
      cosavuCandidates: 20,
      candidateCount: 0,
      retainedCount: 0,
      returnedCount: 0,
      dbLatencyMs: 88,
      car1LatencyMs: 0,
      totalMs: 88,
      status: "error",
    }),
    createQueryEvent(email, {
      id: "query-billing-docs",
      timestamp: "2026-04-21T08:45:18.000Z",
      query: "What does the invoice payout threshold do?",
      system: "car-0",
      collection: "billing-docs",
      cosavuCandidates: 16,
      candidateCount: 16,
      retainedCount: 9,
      returnedCount: 5,
      dbLatencyMs: 29,
      car1LatencyMs: 8,
      totalMs: 37,
    }),
    createQueryEvent(email, {
      id: "query-research-engram",
      timestamp: "2026-04-21T08:33:40.000Z",
      query: "Compare CAR-1 engram results against direct vector search",
      system: "car-1",
      collection: "research-exports",
      cosavuCandidates: 28,
      candidateCount: 28,
      retainedCount: 16,
      returnedCount: 6,
      topK: 6,
      car1Threshold: 0.5,
      dbLatencyMs: 51,
      car1LatencyMs: 16,
      totalMs: 67,
    }),
  ] satisfies QueryEvent[]
}

function createLiveQueryEvent(email?: string | null) {
  return createQueryEvent(email, {
    query: "What changed in the latest warehouse sync?",
    system: "car-0",
    collection: "warehouse-sync",
    candidateCount: 20,
    retainedCount: 13,
    returnedCount: 5,
    dbLatencyMs: 32,
    car1LatencyMs: 10,
    totalMs: 42,
  })
}

export default function QueryAnalyticsPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [clockNow, setClockNow] = useState(() => Date.now())
  const [user, setUser] = useState<User | null>(null)
  const [events, setEvents] = useState<QueryEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [querySearch, setQuerySearch] = useState("")
  const [systemFilter, setSystemFilter] = useState("all")
  const [collectionFilter, setCollectionFilter] = useState("all")
  const [timeFilter, setTimeFilter] = useState("24h")

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true))

    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => setClockNow(Date.now()), 30000)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login")
        return
      }

      const storedEvents = readLocalQueryEvents(currentUser.email)
      const nextEvents =
        storedEvents.length > 0
          ? storedEvents
          : createDefaultQueryEvents(currentUser.email)

      if (storedEvents.length === 0) {
        saveLocalQueryEvents(currentUser.email, nextEvents)
      }

      setUser(currentUser)
      setEvents(nextEvents)
      setSelectedEventId(nextEvents[0]?.id ?? null)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const collections = useMemo(() => {
    return Array.from(new Set(events.map((event) => event.collection))).sort()
  }, [events])

  const filteredEvents = useMemo(() => {
    const normalizedQuery = querySearch.trim().toLowerCase()
    const timeOption = TIME_OPTIONS.find(
      (option) => option.value === timeFilter
    )
    const cutoff =
      timeOption?.minutes == null
        ? null
        : clockNow - timeOption.minutes * 60 * 1000

    return events.filter((event) => {
      const matchesSystem =
        systemFilter === "all" || event.system === systemFilter
      const matchesCollection =
        collectionFilter === "all" || event.collection === collectionFilter
      const matchesTime =
        !cutoff || new Date(event.timestamp).getTime() >= cutoff
      const matchesQuery =
        !normalizedQuery ||
        event.query.toLowerCase().includes(normalizedQuery) ||
        event.collection.toLowerCase().includes(normalizedQuery) ||
        event.requestId.toLowerCase().includes(normalizedQuery)

      return matchesSystem && matchesCollection && matchesTime && matchesQuery
    })
  }, [
    clockNow,
    collectionFilter,
    events,
    querySearch,
    systemFilter,
    timeFilter,
  ])

  const selectedEvent = useMemo(() => {
    return (
      events.find((event) => event.id === selectedEventId) ||
      filteredEvents[0] ||
      events[0]
    )
  }, [events, filteredEvents, selectedEventId])

  const stats = useMemo(() => {
    const totalQueries = filteredEvents.length
    const successfulQueries = filteredEvents.filter(
      (event) => event.status === "success"
    ).length
    const errorQueries = filteredEvents.filter(
      (event) => event.status === "error"
    ).length
    const averageLatency =
      totalQueries === 0
        ? 0
        : Math.round(
            filteredEvents.reduce((sum, event) => sum + event.totalMs, 0) /
              totalQueries
          )
    const p95Latency = Math.round(
      percentile(
        filteredEvents.map((event) => event.totalMs),
        95
      )
    )
    const averageRetention =
      totalQueries === 0
        ? 0
        : Math.round(
            (filteredEvents.reduce((sum, event) => {
              if (event.candidateCount === 0) return sum

              return sum + event.retainedCount / event.candidateCount
            }, 0) /
              totalQueries) *
              100
          )
    const successRate =
      totalQueries === 0
        ? 100
        : Math.round((successfulQueries / totalQueries) * 100)
    const errorRate =
      totalQueries === 0 ? 0 : Math.round((errorQueries / totalQueries) * 100)

    return {
      totalQueries,
      averageLatency,
      p95Latency,
      averageRetention,
      successRate,
      errorRate,
    }
  }, [filteredEvents])

  const systemBreakdown = useMemo(() => {
    return (["car-0", "car-1"] as QuerySystem[]).map((system) => {
      const systemEvents = filteredEvents.filter(
        (event) => event.system === system
      )
      const avgLatency =
        systemEvents.length === 0
          ? 0
          : Math.round(
              systemEvents.reduce((sum, event) => sum + event.totalMs, 0) /
                systemEvents.length
            )
      const avgRetention =
        systemEvents.length === 0
          ? 0
          : Math.round(
              (systemEvents.reduce((sum, event) => {
                if (event.candidateCount === 0) return sum

                return sum + event.retainedCount / event.candidateCount
              }, 0) /
                systemEvents.length) *
                100
            )

      return {
        system,
        count: systemEvents.length,
        avgLatency,
        avgRetention,
      }
    })
  }, [filteredEvents])

  const collectionBreakdown = useMemo(() => {
    return collections
      .map((collection) => {
        const collectionEvents = filteredEvents.filter(
          (event) => event.collection === collection
        )

        return {
          collection,
          count: collectionEvents.length,
          latency:
            collectionEvents.length === 0
              ? 0
              : Math.round(
                  collectionEvents.reduce(
                    (sum, event) => sum + event.totalMs,
                    0
                  ) / collectionEvents.length
                ),
        }
      })
      .filter((collection) => collection.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [collections, filteredEvents])

  const refreshAnalytics = () => {
    setRefreshing(true)
    const storedEvents = readLocalQueryEvents(user?.email)
    const nextEvents = [
      createLiveQueryEvent(user?.email),
      ...(storedEvents.length > 0 ? storedEvents : events),
    ]

    setEvents(nextEvents)
    setSelectedEventId(nextEvents[0]?.id ?? null)
    saveLocalQueryEvents(user?.email, nextEvents)

    window.setTimeout(() => setRefreshing(false), 650)
  }

  const copyPipeline = async () => {
    if (!selectedEvent) return

    const payload = JSON.stringify(
      {
        endpoint: COSAVU_ENDPOINTS.data.query,
        query: selectedEvent.query,
        tenant: selectedEvent.tenant,
        headers: {
          "X-API-Key": selectedEvent.apiKey,
        },
        pipeline: {
          system: selectedEvent.system,
          collection: selectedEvent.collection,
          top_k: selectedEvent.topK,
          cosavu_candidates: selectedEvent.cosavuCandidates,
          car1_threshold: selectedEvent.car1Threshold,
          db_latency_ms: selectedEvent.dbLatencyMs,
          car1_latency_ms: selectedEvent.car1LatencyMs,
          total_ms: selectedEvent.totalMs,
        },
      },
      null,
      2
    )

    await navigator.clipboard.writeText(payload)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  if (loading) {
    return (
      <SidebarProvider defaultOpen>
        <div className="flex min-h-screen w-full bg-background text-foreground">
          <AppSidebar />
          <SidebarInset className="flex h-screen w-full flex-col overflow-y-auto shadow-none">
            <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 bg-background px-4">
              <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="ml-auto size-8 rounded-full" />
            </header>
            <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 p-4 lg:p-6">
              <Skeleton className="h-40 w-full rounded-sm" />
              <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
                <Skeleton className="h-96 w-full rounded-sm" />
                <Skeleton className="h-96 w-full rounded-sm" />
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <SidebarInset className="relative flex h-screen w-full flex-col overflow-y-auto shadow-none">
          <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 bg-background/60 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/45">
            <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>Observability</BreadcrumbItem>
                <BreadcrumbSeparator>
                  <ChevronRight className="size-3.5" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage>Query Analytics</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-sm"
                    aria-label="Refresh analytics"
                    disabled={refreshing}
                    onClick={refreshAnalytics}
                  >
                    <RefreshCw
                      className={refreshing ? "size-4 animate-spin" : "size-4"}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh analytics</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-sm"
                    aria-label="Toggle theme"
                    disabled={!mounted}
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")
                    }
                  >
                    {mounted && theme === "dark" ? (
                      <Sun className="size-4" />
                    ) : (
                      <Moon className="size-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle theme</TooltipContent>
              </Tooltip>
            </div>
          </header>

          <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 p-4 lg:p-6">
            <Card className="rounded-sm border-border/60 shadow-sm">
              <CardHeader className="gap-4 md:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <Badge className="w-fit rounded-sm" variant="secondary">
                    {COSAVU_DATA_API_BASE_URL.replace(/^https?:\/\//, "")}
                  </Badge>
                  <CardTitle className="text-2xl font-semibold tracking-tight md:text-3xl">
                    Query Analytics
                  </CardTitle>
                  <CardDescription className="max-w-2xl">
                    Monitor tenant-scoped Cosavu retrieval across CAR-0
                    collections, CAR-1 vector search, candidate fanout, and
                    engram gating.
                  </CardDescription>
                </div>
                <CardAction className="col-span-full col-start-1 row-start-2 flex flex-wrap items-center gap-2 justify-self-start md:col-span-1 md:col-start-2 md:row-start-1 md:justify-self-end">
                  <Button
                    variant="outline"
                    className="rounded-sm"
                    onClick={copyPipeline}
                    disabled={!selectedEvent}
                  >
                    {copied ? (
                      <Check className="size-4 text-emerald-600" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                    Copy pipeline
                  </Button>
                  <Button
                    className="rounded-sm"
                    onClick={refreshAnalytics}
                    disabled={refreshing}
                  >
                    <RefreshCw
                      className={refreshing ? "size-4 animate-spin" : "size-4"}
                    />
                    Refresh
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-sm bg-muted/30 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Queries
                      </span>
                      <BarChart2 className="size-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-semibold">
                      {formatNumber(stats.totalQueries)}
                    </p>
                  </div>
                  <div className="rounded-sm bg-muted/30 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        P95 latency
                      </span>
                      <Clock className="size-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-semibold">
                      {stats.p95Latency}ms
                    </p>
                  </div>
                  <div className="rounded-sm bg-muted/30 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        CAR-1 retained
                      </span>
                      <Target className="size-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-semibold">
                      {stats.averageRetention}%
                    </p>
                  </div>
                  <div className="rounded-sm bg-muted/30 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Success
                      </span>
                      <ShieldCheck className="size-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-semibold">
                      {stats.successRate}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
              <Card className="rounded-sm border-border/60 shadow-sm">
                <CardHeader className="gap-4 lg:grid-cols-[1fr_auto]">
                  <div>
                    <CardTitle>Query stream</CardTitle>
                    <CardDescription>
                      Search requests sent through Cosavu retrieval.
                    </CardDescription>
                  </div>
                  <CardAction className="col-span-full col-start-1 row-start-2 flex w-full flex-col gap-2 justify-self-stretch lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:w-auto lg:justify-self-end">
                    <div className="flex w-full flex-col gap-2 sm:flex-row">
                      <div className="relative w-full sm:w-72">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          className="h-9 rounded-sm pl-9"
                          placeholder="Search queries..."
                          value={querySearch}
                          onChange={(event) =>
                            setQuerySearch(event.target.value)
                          }
                        />
                      </div>
                      <Select
                        value={collectionFilter}
                        onValueChange={setCollectionFilter}
                      >
                        <SelectTrigger className="h-9 w-full rounded-sm sm:w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-sm">
                          <SelectItem className="rounded-sm" value="all">
                            All collections
                          </SelectItem>
                          {collections.map((collection) => (
                            <SelectItem
                              key={collection}
                              className="rounded-sm"
                              value={collection}
                            >
                              {collection}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={timeFilter} onValueChange={setTimeFilter}>
                        <SelectTrigger className="h-9 w-full rounded-sm sm:w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-sm">
                          {TIME_OPTIONS.map((option) => (
                            <SelectItem
                              key={option.value}
                              className="rounded-sm"
                              value={option.value}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Tabs
                      value={systemFilter}
                      onValueChange={setSystemFilter}
                      className="w-full"
                    >
                      <TabsList className="w-full rounded-sm [&_[data-slot=tabs-trigger]]:rounded-sm">
                        <TabsTrigger className="rounded-sm" value="all">
                          All
                        </TabsTrigger>
                        <TabsTrigger className="rounded-sm" value="car-0">
                          CAR-0
                        </TabsTrigger>
                        <TabsTrigger className="rounded-sm" value="car-1">
                          CAR-1
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredEvents.length > 0 ? (
                      filteredEvents.map((event) => {
                        const isSelected = selectedEvent?.id === event.id
                        const retainedPercent =
                          event.candidateCount === 0
                            ? 0
                            : Math.round(
                                (event.retainedCount / event.candidateCount) *
                                  100
                              )

                        return (
                          <button
                            key={event.id}
                            type="button"
                            className={`w-full rounded-sm bg-muted/20 p-4 text-left transition-colors hover:bg-muted/35 ${
                              isSelected ? "ring-2 ring-primary/40" : ""
                            }`}
                            onClick={() => setSelectedEventId(event.id)}
                          >
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.65fr)] lg:items-center">
                              <div className="flex min-w-0 items-start gap-4">
                                <div className="flex size-11 shrink-0 items-center justify-center rounded-sm bg-background text-muted-foreground">
                                  {event.system === "car-0" ? (
                                    <Database className="size-5" />
                                  ) : (
                                    <Zap className="size-5" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge
                                      className="rounded-sm"
                                      variant={getStatusVariant(event.status)}
                                    >
                                      {STATUS_LABELS[event.status]}
                                    </Badge>
                                    <Badge
                                      className="rounded-sm"
                                      variant="outline"
                                    >
                                      {SYSTEM_LABELS[event.system]}
                                    </Badge>
                                    <p className="text-xs text-muted-foreground">
                                      {formatTimestamp(event.timestamp)}
                                    </p>
                                  </div>
                                  <p className="mt-2 truncate font-medium">
                                    {event.query}
                                  </p>
                                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                                    {event.collection} | {event.requestId}
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">
                                    {retainedPercent}% retained
                                  </span>
                                  <span className="font-medium">
                                    {event.totalMs}ms
                                  </span>
                                </div>
                                <Progress
                                  value={Math.min(100, event.totalMs)}
                                  className="h-2"
                                />
                              </div>
                            </div>
                          </button>
                        )
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center rounded-sm bg-muted/20 px-6 py-16 text-center">
                        <div className="mb-4 flex size-12 items-center justify-center rounded-sm bg-muted">
                          <BarChart2 className="size-5 text-muted-foreground" />
                        </div>
                        <p className="font-medium">No query traffic matches</p>
                        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                          Change filters or refresh analytics to append a live
                          sample.
                        </p>
                        <Button
                          className="mt-5 rounded-sm"
                          onClick={refreshAnalytics}
                        >
                          <RefreshCw className="size-4" />
                          Refresh analytics
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="rounded-sm border-border/60 shadow-sm">
                  <CardHeader>
                    <CardTitle>Selected query</CardTitle>
                    <CardDescription>
                      Request parameters and response pipeline timing.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedEvent ? (
                      <>
                        <div className="rounded-sm bg-muted/30 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  className="rounded-sm"
                                  variant={getStatusVariant(
                                    selectedEvent.status
                                  )}
                                >
                                  {STATUS_LABELS[selectedEvent.status]}
                                </Badge>
                                <Badge className="rounded-sm" variant="outline">
                                  {SYSTEM_LABELS[selectedEvent.system]}
                                </Badge>
                              </div>
                              <p className="mt-3 text-lg font-semibold">
                                {selectedEvent.query}
                              </p>
                              <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                                {selectedEvent.route} |{" "}
                                {selectedEvent.requestId}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="rounded-sm"
                              aria-label="Copy pipeline"
                              onClick={copyPipeline}
                            >
                              {copied ? (
                                <Check className="size-4 text-emerald-600" />
                              ) : (
                                <Copy className="size-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-sm bg-muted/30 p-4">
                            <p className="text-sm text-muted-foreground">
                              Tenant
                            </p>
                            <p className="mt-2 text-sm font-medium">
                              {selectedEvent.tenant}
                            </p>
                          </div>
                          <div className="rounded-sm bg-muted/30 p-4">
                            <p className="text-sm text-muted-foreground">
                              API key
                            </p>
                            <p className="mt-2 truncate font-mono text-xs font-medium">
                              {selectedEvent.apiKey}
                            </p>
                          </div>
                          <div className="rounded-sm bg-muted/30 p-4">
                            <p className="text-sm text-muted-foreground">
                              Collection
                            </p>
                            <p className="mt-2 text-sm font-medium">
                              {selectedEvent.collection}
                            </p>
                          </div>
                          <div className="rounded-sm bg-muted/30 p-4">
                            <p className="text-sm text-muted-foreground">
                              Threshold
                            </p>
                            <p className="mt-2 text-sm font-medium">
                              {selectedEvent.car1Threshold.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3 rounded-sm bg-muted/30 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="font-medium">Candidate funnel</p>
                              <p className="text-sm text-muted-foreground">
                                Fanout, CAR-1 retained chunks, and final top-k.
                              </p>
                            </div>
                            <Gauge className="size-5 shrink-0 text-muted-foreground" />
                          </div>
                          <Separator />
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Candidates
                              </p>
                              <p className="mt-1 text-xl font-semibold">
                                {selectedEvent.candidateCount}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Retained
                              </p>
                              <p className="mt-1 text-xl font-semibold">
                                {selectedEvent.retainedCount}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Returned
                              </p>
                              <p className="mt-1 text-xl font-semibold">
                                {selectedEvent.returnedCount}
                              </p>
                            </div>
                          </div>
                          <Progress
                            value={
                              selectedEvent.candidateCount === 0
                                ? 0
                                : Math.round(
                                    (selectedEvent.retainedCount /
                                      selectedEvent.candidateCount) *
                                      100
                                  )
                            }
                            className="h-2"
                          />
                        </div>

                        <div className="space-y-3 rounded-sm bg-muted/30 p-4">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">Pipeline timing</p>
                            <Badge className="rounded-sm" variant="secondary">
                              {selectedEvent.totalMs}ms total
                            </Badge>
                          </div>
                          <Separator />
                          <div className="space-y-3">
                            <div>
                              <div className="mb-2 flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Database search
                                </span>
                                <span className="font-medium">
                                  {selectedEvent.dbLatencyMs}ms
                                </span>
                              </div>
                              <Progress
                                value={Math.min(100, selectedEvent.dbLatencyMs)}
                                className="h-2"
                              />
                            </div>
                            <div>
                              <div className="mb-2 flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                  CAR-1 gating
                                </span>
                                <span className="font-medium">
                                  {selectedEvent.car1LatencyMs}ms
                                </span>
                              </div>
                              <Progress
                                value={Math.min(
                                  100,
                                  selectedEvent.car1LatencyMs * 2
                                )}
                                className="h-2"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className="rounded-sm border-border/60 shadow-sm">
                  <CardHeader>
                    <CardTitle>System mix</CardTitle>
                    <CardDescription>
                      CAR-0 and CAR-1 traffic for the current filters.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {systemBreakdown.map((system) => (
                      <div
                        key={system.system}
                        className="rounded-sm bg-muted/30 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {SYSTEM_LABELS[system.system]}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatNumber(system.count)} queries
                            </p>
                          </div>
                          <Badge className="rounded-sm" variant="outline">
                            {system.avgLatency}ms avg
                          </Badge>
                        </div>
                        <Progress value={system.avgRetention} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card className="rounded-sm border-border/60 shadow-sm">
              <CardHeader className="gap-4 lg:grid-cols-[1fr_auto]">
                <div>
                  <CardTitle>Top collections</CardTitle>
                  <CardDescription>
                    Collections receiving query traffic in the current filter.
                  </CardDescription>
                </div>
                <CardAction className="justify-self-start lg:justify-self-end">
                  <Badge className="rounded-sm" variant="outline">
                    {collectionBreakdown.length} collections
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {collectionBreakdown.length > 0 ? (
                    collectionBreakdown.map((collection) => (
                      <div
                        key={collection.collection}
                        className="rounded-sm bg-muted/30 p-4"
                      >
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <p className="truncate font-medium">
                            {collection.collection}
                          </p>
                          <Database className="size-4 shrink-0 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                          {collection.count}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {collection.latency}ms avg
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full flex flex-col items-center justify-center rounded-sm bg-muted/20 px-6 py-12 text-center">
                      <p className="font-medium">No collection traffic</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Query events will appear here once the filter has
                        matching requests.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
