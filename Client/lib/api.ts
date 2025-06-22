import type { ImportLog, ImportLogDetails } from "@/types"

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

export const API_ENDPOINTS = {
  FEEDS: `${API_BASE_URL}/api/feeds`,
  IMPORT_LOGS: `${API_BASE_URL}/api/import-logs`,
  IMPORT_START: `${API_BASE_URL}/api/import/start`,
  IMPORT_STATUS: (id: string) => `${API_BASE_URL}/api/import/status/${id}`,
  JOBS: `${API_BASE_URL}/api/jobs`,
}

export async function fetchImportLogs(): Promise<ImportLog[]> {
  try {
    const response = await fetch(API_ENDPOINTS.IMPORT_LOGS)
    if (!response.ok) {
      throw new Error("Failed to fetch import logs")
    }
    return await response.json()
  } catch (error) {
    console.error("Error fetching import logs:", error)
    throw error
  }
}

export async function fetchImportLogDetails(id: string): Promise<ImportLogDetails> {
  try {
    const response = await fetch(`${API_ENDPOINTS.IMPORT_LOGS}/${id}`)
    if (!response.ok) {
      throw new Error("Failed to fetch import log details")
    }
    return await response.json()
  } catch (error) {
    console.error("Error fetching import log details:", error)
    throw error
  }
}

export async function importJobFeed(feedId: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(API_ENDPOINTS.IMPORT_START, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ feedId }),
    })

    if (!response.ok) {
      throw new Error("Failed to import feed")
    }

    return await response.json()
  } catch (error) {
    console.error("Error importing feed:", error)
    throw error
  }
}
