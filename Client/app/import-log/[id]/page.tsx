// filename: page.tsx
"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, ExternalLink, RefreshCw } from "lucide-react"
import type { ImportLogDetails, JobRecord } from "@/types"
import { apiClient } from "@/lib/api-client"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/table"
import { Loader } from "@/components/loader"
import { Error } from "@/components/error"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { ToastContainer } from "@/components/toast"

export default function ImportLogPage() {
  const params = useParams()
  const router = useRouter()
  const [importLog, setImportLog] = useState<ImportLogDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [refreshing, setRefreshing] = useState(false)

  const { toasts, removeToast, error: showError } = useToast()

  useEffect(() => {
    if (params.id) {
      loadImportLogDetails(params.id as string)
    }
  }, [params.id])

  const loadImportLogDetails = async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      const details = await apiClient.getImportLogDetails(id)
      setImportLog(details)
    } catch (err: any) {
      if (err.message?.includes('Import log not found') || err.message?.includes('404')) {
        setError("Import log not found. This import log may have been deleted or doesn't exist.")
        showError("Import Log Not Found", "Redirecting to dashboard...")
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push('/')
        }, 3000)
      } else {
        setError("Failed to load import log details. Please try again.")
        showError("Failed to load data", "Please check your connection and try again.")
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    if (params.id) {
      setRefreshing(true)
      await loadImportLogDetails(params.id as string)
    }
  }

  // FIX: Ensure importLog.jobs is always an array to prevent "Cannot read properties of undefined (reading 'reduce')" error.
  const getFilteredJobs = (status?: string) => {
    if (!importLog || !Array.isArray(importLog.jobs)) {
      return []
    }
    if (!status || status === "all") {
      return importLog.jobs
    }
    return importLog.jobs.filter((job) => job.status === status)
  }

  const getStatusIcon = (status: JobRecord["status"]) => {
    switch (status) {
      case "new":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "updated":
        return <AlertCircle className="h-4 w-4 text-blue-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusBadge = (status: JobRecord["status"]) => {
    const variants = {
      new: "bg-green-100 text-green-800",
      updated: "bg-blue-100 text-blue-800",
      failed: "bg-red-100 text-red-800",
    }

    return <Badge className={variants[status]}>{status.toUpperCase()}</Badge>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Loader size="lg" text="Loading import details..." />
        </div>
      </div>
    )
  }

  if (error || !importLog) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-4">
            <Button variant="ghost" onClick={() => router.push('/')} className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {error?.includes('not found') ? 'Import Log Not Found' : 'Error Loading Import Log'}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {error || "Import log not found"}
              </p>
              
              {error?.includes('not found') ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    This import log doesn't exist in the database. You will be redirected to the dashboard shortly.
                  </p>
                  <Button onClick={() => router.push('/')} className="w-full sm:w-auto">
                    Go to Dashboard Now
                  </Button>
                </div>
              ) : (
                <Button onClick={() => loadImportLogDetails(params.id as string)} className="w-full sm:w-auto">
                  Try Again
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" onClick={() => router.back()} className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Import Details</h1>
                <p className="text-gray-600 break-all">{importLog.feedUrl}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Imported on {new Date(importLog.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="mt-4 lg:mt-0">
                <Badge
                  className={
                    importLog.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : importLog.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                  }
                >
                  {importLog.status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{importLog.totalJobs}</p>
              <p className="text-sm text-gray-600">Total Jobs</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{importLog.newJobs}</p>
              <p className="text-sm text-gray-600">New Jobs</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{importLog.updatedJobs}</p>
              <p className="text-sm text-gray-600">Updated Jobs</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{importLog.failedJobs}</p>
              <p className="text-sm text-gray-600">Failed Jobs</p>
            </div>
          </div>
        </div>

        {/* Job Details */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Job Records</h2>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All ({importLog.totalJobs})</TabsTrigger>
                <TabsTrigger value="new">New ({getFilteredJobs("new").length})</TabsTrigger>
                <TabsTrigger value="updated">Updated ({getFilteredJobs("updated").length})</TabsTrigger>
                <TabsTrigger value="failed">Failed ({getFilteredJobs("failed").length})</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="mt-0">
              <JobTable jobs={getFilteredJobs("all")} />
            </TabsContent>
            <TabsContent value="new" className="mt-0">
              <JobTable jobs={getFilteredJobs("new")} />
            </TabsContent>
            <TabsContent value="updated" className="mt-0">
              <JobTable jobs={getFilteredJobs("updated")} />
            </TabsContent>
            <TabsContent value="failed" className="mt-0">
              <JobTable jobs={getFilteredJobs("failed")} showFailureReason />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )

  function JobTable({ jobs, showFailureReason = false }: { jobs: JobRecord[]; showFailureReason?: boolean }) {
    if (jobs.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">No jobs found for this category.</p>
        </div>
      )
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Job Title</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Location</TableHead>
            {showFailureReason && <TableHead>Failure Reason</TableHead>}
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(job.status)}
                  {getStatusBadge(job.status)}
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium text-gray-900">{job.title}</div>
              </TableCell>
              <TableCell>
                <div className="text-gray-900">{job.company}</div>
              </TableCell>
              <TableCell>
                <div className="text-gray-500">{job.location}</div>
              </TableCell>
              {showFailureReason && (
                <TableCell>
                  <div className="text-red-600 text-sm max-w-xs" title={job.failureReason}>
                    {job.failureReason
                      ? job.failureReason.length > 50
                        ? `${job.failureReason.substring(0, 50)}...`
                        : job.failureReason
                      : "N/A"}
                  </div>
                </TableCell>
              )}
              <TableCell>
                {job.url && (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }
}