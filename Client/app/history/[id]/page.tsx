"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, ExternalLink } from "lucide-react"
import type { ImportLogDetails, JobRecord } from "@/types"
import { fetchImportLogDetails } from "@/lib/api"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/table" 
import { Loader } from "@/components/loader"
import { Error } from "@/components/error"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function HistoryDetails() {
  const params = useParams()
  const router = useRouter()
  const [importLog, setImportLog] = useState<ImportLogDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    if (params.id) {
      loadImportLogDetails(params.id as string)
    }
  }, [params.id])

  const loadImportLogDetails = async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      const details = await fetchImportLogDetails(id)
      setImportLog(details)
    } catch (err) {
      setError("Failed to load import log details. Please try again.")
    } finally {
      setLoading(false)
    }
  }

const getFilteredJobs = (status?: string) => {
  if (!importLog || !Array.isArray(importLog.jobs)) {
    return []
  }
  if (!status || status === "all") return importLog.jobs
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
          <Error message={error || "Import log not found"} onRetry={() => loadImportLogDetails(params.id as string)} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4 flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Button>

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
                <TabsTrigger value="all">All ({importLog.jobs?.length || 0})</TabsTrigger>
                <TabsTrigger value="new">New ({importLog.newJobs})</TabsTrigger>
                <TabsTrigger value="updated">Updated ({importLog.updatedJobs})</TabsTrigger>
                <TabsTrigger value="failed">Failed ({importLog.failedJobs})</TabsTrigger>
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
          {Array.isArray(jobs) && jobs.map((job) => (
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
                  <div className="text-red-600 text-sm max-w-xs truncate">{job.failureReason || "N/A"}</div>
                </TableCell>
              )}
              <TableCell>
                {job.url && (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
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