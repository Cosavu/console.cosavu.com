import { NextResponse } from "next/server"

import { COSAVU_ENDPOINTS } from "@/lib/cosavu-api"

export const runtime = "nodejs"

function getAdminToken() {
  return (
    process.env.COSAVU_ADMIN_TOKEN ||
    process.env.COSAVU_DATA_ADMIN_TOKEN ||
    process.env.DATAAPI_ADMIN_TOKEN ||
    process.env.NEXT_PUBLIC_COSAVU_ADMIN_TOKEN
  )
}

function getAdminHeaders(): Record<string, string> {
  const adminToken = getAdminToken()

  if (!adminToken) return {}

  return {
    "X-Admin-Token": adminToken,
  }
}

async function readDataApiError(response: Response) {
  const fallback = `DataAPI request failed with ${response.status}.`

  try {
    const payload = (await response.json()) as {
      error?: string
      detail?: string
      message?: string
    }

    return payload.error || payload.detail || payload.message || fallback
  } catch {
    return fallback
  }
}

export async function GET() {
  const adminHeaders = getAdminHeaders()

  try {
    const response = await fetch(COSAVU_ENDPOINTS.data.tenants, {
      headers: adminHeaders,
      cache: "no-store",
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: await readDataApiError(response) },
        { status: response.status }
      )
    }

    return NextResponse.json(await response.json())
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to list DataAPI tenants."

    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function POST(req: Request) {
  const adminHeaders = getAdminHeaders()

  const { name, slug, keyName } = (await req.json().catch(() => ({}))) as {
    name?: string
    slug?: string
    keyName?: string
  }

  if (!name?.trim() || !slug?.trim()) {
    return NextResponse.json(
      { error: "Tenant name and slug are required." },
      { status: 400 }
    )
  }

  try {
    const response = await fetch(COSAVU_ENDPOINTS.data.tenants, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...adminHeaders,
      },
      body: JSON.stringify({
        name: name.trim(),
        slug: slug.trim(),
        key_name: keyName?.trim() || "Console key",
      }),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: await readDataApiError(response) },
        { status: response.status }
      )
    }

    return NextResponse.json(await response.json())
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create DataAPI tenant."

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
