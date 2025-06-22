"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Search, Calendar, ExternalLink, RefreshCw, Trash2 } from "lucide-react"
import type { ImportLog } from "@/types"
import { apiClient } from "@/lib/api-client"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/table"
import { Loader } from "@/components/loader"
import { Error } from "@/components/error"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EnhancedFeedManager } from "@/components/enhanced-feed-manager"
import { Pagination } from "@/components/pagination"
import { useToast } from "@/hooks/use-toast"
import { useDebounce } from "@/hooks/use-debounce"
import { useWebSocket } from "@/hooks/use-websocket"
import { ToastContainer } from "@/components/toast"
import { WS_URL } from "@/constraint"

const ITEMS_PER_PAGE = 10

export default function Dashboard() {
  const [importLogs, setImportLogs] = useState<ImportLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLogs, setTotalLogs] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const router = useRouter()
  const { toasts, removeToast, error: showError, success: showSuccess } = useToast()
  
  // WebSocket for real-time updates
  const { lastMessage, isConnected } = useWebSocket(WS_URL)
  
  // Debounced search terms to prevent API calls on every keystroke
  const debouncedSearchTerm = useDebounce(searchTerm, 500)
  const debouncedDateFilter = useDebounce(dateFilter, 500)

  const loadImportLogs = useCallback(
    async (page = 1, search?: string, date?: string) => {
      try {
        setLoading(page === 1)
        setError(null)

        const result = await apiClient.getImportLogs({
          search: search || undefined,
          date: date || undefined,
          page,
          limit: ITEMS_PER_PAGE,
        })

        // Ensure we always set an array for importLogs
        setImportLogs(Array.isArray(result.data) ? result.data : [])
        setTotalPages(result.totalPages || 1)
        setTotalLogs(result.total || 0)
        setCurrentPage(result.page || 1)
      } catch (err) {
        setError("Failed to load import logs. Please try again.")
        showError("Failed to load data", "Please check your connection and try again.")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [showError],
  )

  useEffect(() => {
    loadImportLogs(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Search effect using debounced values
  useEffect(() => {
    if (currentPage === 1) {
      loadImportLogs(1, debouncedSearchTerm, debouncedDateFilter)
    } else {
      setCurrentPage(1)
      loadImportLogs(1, debouncedSearchTerm, debouncedDateFilter)
    }
  }, [debouncedSearchTerm, debouncedDateFilter, loadImportLogs])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    loadImportLogs(page, searchTerm, dateFilter)
  }, [loadImportLogs, searchTerm, dateFilter])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadImportLogs(currentPage, searchTerm, dateFilter)
  }, [loadImportLogs, currentPage, searchTerm, dateFilter])

  const handleDeleteImportLog = useCallback(async (id: string, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent row click navigation
    
    if (!confirm("Are you sure you want to delete this import log? This action cannot be undone.")) {
      return
    }

    try {
      await apiClient.deleteImportLog(id)
      showSuccess("Import Log Deleted", "The import log has been successfully deleted.")
      
      // Refresh the current page or go to previous page if current page becomes empty
      const remainingLogs = importLogs.length - 1
      const shouldGoToPreviousPage = remainingLogs === 0 && currentPage > 1
      
      if (shouldGoToPreviousPage) {
        handlePageChange(currentPage - 1)
      } else {
        await loadImportLogs(currentPage, searchTerm, dateFilter)
      }
    } catch (error) {
      console.error("Error deleting import log:", error)
      showError("Delete Failed", "Failed to delete the import log. Please try again.")
    }
  }, [apiClient, showSuccess, showError, importLogs.length, currentPage, handlePageChange, loadImportLogs, searchTerm, dateFilter])

  // Handle WebSocket messages for real-time updates
  useEffect(() => {
    if (lastMessage && isConnected) {
      try {
        const message = lastMessage
        switch (message.type) {
          case 'import_completed':
            showSuccess("Import Completed", `Successfully imported ${message.data.jobCount} jobs for ${message.data.feedName}`)
            // Refresh the import logs to show the new data with a delay
            setTimeout(() => {
              loadImportLogs(currentPage, searchTerm, dateFilter)
            }, 1000)
            break
          case 'import_failed':
            showError("Import Failed", `Import failed for ${message.data.feedName}: ${message.data.error}`)
            // Still refresh to update the status with a delay
            setTimeout(() => {
              loadImportLogs(currentPage, searchTerm, dateFilter)
            }, 1000)
            break
          case 'import_started':
            // Optional: Show import started notification
            break
          case 'connection_established':
            // WebSocket connection established
            break
        }
      } catch (error) {
        console.error('Error handling WebSocket message in dashboard:', error)
      }
    }
  }, [lastMessage, isConnected, showSuccess, showError, loadImportLogs, currentPage, searchTerm, dateFilter])

  const formatDate = useCallback((timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }, [])

  const getStatusBadge = useCallback((status: ImportLog["status"]) => {
    const variants = {
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      in_progress: "bg-yellow-100 text-yellow-800",
    }

    return <Badge className={variants[status]}>{status.replace("_", " ").toUpperCase()}</Badge>
  }, [])

  // Memoized stats calculation to prevent recalculation on every render
  const stats = useMemo(() => {
    // Ensure importLogs is always an array and each log has numeric fields
    if (!importLogs || !Array.isArray(importLogs)) {
      return {
        totalJobs: 0,
        newJobs: 0,
        updatedJobs: 0,
        failedJobs: 0,
      }
    }
    
    const logs = importLogs.filter(log => log && typeof log === 'object');
    
    // Additional safety check - if logs is empty, return zeros
    if (logs.length === 0) {
      return {
        totalJobs: 0,
        newJobs: 0,
        updatedJobs: 0,
        failedJobs: 0,
      }
    }
    
    return {
      totalJobs: logs.reduce((sum, log) => {
        const value = log && typeof log.totalJobs === "number" ? log.totalJobs : 0;
        return sum + value;
      }, 0),
      newJobs: logs.reduce((sum, log) => {
        const value = log && typeof log.newJobs === "number" ? log.newJobs : 0;
        return sum + value;
      }, 0),
      updatedJobs: logs.reduce((sum, log) => {
        const value = log && typeof log.updatedJobs === "number" ? log.updatedJobs : 0;
        return sum + value;
      }, 0),
      failedJobs: logs.reduce((sum, log) => {
        const value = log && typeof log.failedJobs === "number" ? log.failedJobs : 0;
        return sum + value;
      }, 0),
    }
  }, [importLogs])

  if (loading && currentPage === 1) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Loader size="lg" text="Loading dashboard..." />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Import Dashboard</h1>
            <p className="text-gray-600">Monitor and manage your job import activities</p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by feed URL or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="pl-10" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Imports</p>
                <p className="text-2xl font-bold text-gray-900">{totalLogs}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalJobs}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">New Jobs</p>
                <p className="text-2xl font-bold text-green-600">{stats.newJobs}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Failed Jobs</p>
                <p className="text-2xl font-bold text-red-600">{stats.failedJobs}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feed Management */}
        <div className="mb-8">
          <EnhancedFeedManager 
            searchTerm={searchTerm} 
            onRefresh={() => loadImportLogs(currentPage, searchTerm, dateFilter)} 
          />
        </div>

        {/* Import Logs Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Recent Import History</h2>
            {totalLogs > 0 && (
              <p className="text-sm text-gray-500">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalLogs)}{" "}
                of {totalLogs} imports
              </p>
            )}
          </div>

          {error ? (
            <Error message={error} onRetry={() => loadImportLogs(currentPage)} />
          ) : !importLogs || !Array.isArray(importLogs) || importLogs.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No import logs found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || dateFilter
                  ? "Try adjusting your search criteria."
                  : "Import logs will appear here once you start importing jobs."}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feed URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Total Jobs</TableHead>
                    <TableHead className="text-center">New</TableHead>
                    <TableHead className="text-center">Updated</TableHead>
                    <TableHead className="text-center">Failed</TableHead>
                    <TableHead>Import Date</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(importLogs || []).filter(log => log && log.id).map((log) => (
                    <TableRow key={log.id} onClick={() => router.push(`/import-log/${log.id}`)}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-blue-600 truncate max-w-xs">{log.feedUrl || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="text-center font-medium">{log.totalJobs || 0}</TableCell>
                      <TableCell className="text-center text-green-600 font-medium">{log.newJobs || 0}</TableCell>
                      <TableCell className="text-center text-blue-600 font-medium">{log.updatedJobs || 0}</TableCell>
                      <TableCell className="text-center text-red-600 font-medium">{log.failedJobs || 0}</TableCell>
                      <TableCell className="text-gray-500">{log.timestamp ? formatDate(log.timestamp) : 'N/A'}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={(e) => handleDeleteImportLog(log.id, e)}
                            className="inline-flex items-center justify-center w-8 h-8  text-red-600 hover:bg-red-200 hover:text-red-800 rounded-md border  transition-colors duration-200"
                            title="Delete import log"
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}