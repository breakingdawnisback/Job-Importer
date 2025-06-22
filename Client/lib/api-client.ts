import type { ImportLog, ImportLogDetails, JobFeed, ApiResponse } from "@/types"
import { API_ENDPOINTS, API_BASE_URL } from "@/constraint"

class ApiClient {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      // Handle 204 No Content responses (like DELETE operations)
      if (response.status === 204) {
        return undefined as T
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error(`API Error [${url}]:`, error)
      throw error
    }
  }

  async getFeeds(search?: string): Promise<JobFeed[]> {
    const params = new URLSearchParams()
    if (search) params.append("search", search)
    const url = params.toString() ? `${API_ENDPOINTS.FEEDS}?${params}` : API_ENDPOINTS.FEEDS
    const response = await this.request<ApiResponse<JobFeed[]>>(url)
    if (!Array.isArray(response.data)) {
      console.warn("API returned non-array data for feeds, defaulting to empty array.", response.data)
      return []
    }
    return response.data
  }

  async createFeed(feed: Omit<JobFeed, "id" | "totalJobsImported" | "lastImport">): Promise<JobFeed> {
    const response = await this.request<ApiResponse<JobFeed>>(API_ENDPOINTS.FEEDS, {
      method: "POST",
      body: JSON.stringify(feed),
    })
    return response.data
  }

  async updateFeed(id: string, updates: Partial<JobFeed>): Promise<JobFeed> {
    const response = await this.request<ApiResponse<JobFeed>>(`${API_ENDPOINTS.FEEDS}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    })
    return response.data
  }

  async deleteFeed(id: string): Promise<void> {
    await this.request(`${API_ENDPOINTS.FEEDS}/${id}`, {
      method: "DELETE",
    })
  }

  async getImportLogs(params?: {
    search?: string
    date?: string
    page?: number
    limit?: number
  }): Promise<{ data: ImportLog[]; total: number; page: number; totalPages: number }> {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.append("search", params.search)
    if (params?.date) searchParams.append("date", params.date)
    if (params?.page) searchParams.append("page", params.page.toString())
    if (params?.limit) searchParams.append("limit", params.limit.toString())
    const url = searchParams.toString() ? `${API_ENDPOINTS.IMPORT_LOGS}?${searchParams}` : API_ENDPOINTS.IMPORT_LOGS
    const response = await this.request<ApiResponse<{
      data: ImportLog[]
      total: number
      page: number
      totalPages: number
    }>>(url)
    
    // Safeguard for import logs data
    if (!response.data || !Array.isArray(response.data.data)) {
        console.warn("API returned non-array data for import logs, defaulting to empty array.", response.data);
        // Return a default structure that matches the Promise return type
        return { data: [], total: 0, page: 1, totalPages: 1 };
    }
    return response.data
  }

  async getImportLogDetails(id: string): Promise<ImportLogDetails> {
    const response = await this.request<ApiResponse<ImportLogDetails>>(`${API_ENDPOINTS.IMPORT_LOGS}/${id}`)
    return response.data
  }

  async startImport(feedId: string): Promise<{ importId: string; message: string }> {
    const url = `${API_ENDPOINTS.IMPORT_START}?feedId=${feedId}`
    const response = await this.request<ApiResponse<{ importId: string; message: string }>>(url, { method: "POST" })
    return response.data
  }

  async getImportStatus(importId: string): Promise<{ status: string; progress: number }> {
    const response = await this.request<ApiResponse<{ status: string; progress: number }>>(
      API_ENDPOINTS.IMPORT_STATUS(importId)
    )
    return response.data
  }

  async getJobs(): Promise<any[]> {
    const response = await this.request<ApiResponse<any[]>>(API_ENDPOINTS.JOBS)
    
    // Safeguard for jobs data
    if (!Array.isArray(response.data)) {
        console.warn("API returned non-array data for jobs, defaulting to empty array.", response.data);
        return []; // Ensure an array is always returned
    }
    return response.data
  }
}

export const apiClient = new ApiClient()