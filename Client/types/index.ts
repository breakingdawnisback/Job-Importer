export interface ImportLog {
  id: string
  feedUrl: string
  totalJobs: number
  newJobs: number
  updatedJobs: number
  failedJobs: number
  timestamp: string
  status: "completed" | "failed" | "in_progress"
}

export interface JobRecord {
  id: string
  title: string
  company: string
  location: string
  status: "new" | "updated" | "failed"
  failureReason?: string
  url?: string
  importLogId: string
}

export interface ImportLogDetails extends ImportLog {
  jobs: JobRecord[]
}

export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

export interface JobFeed {
  id: string
  name: string
  url: string
  category?: string
  jobTypes?: string
  region?: string
  isActive: boolean
  lastImport?: string
  totalJobsImported: number
}

export interface FeedImportRequest {
  feedId: string
  feedUrl: string
}
