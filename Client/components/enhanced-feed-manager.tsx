"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Play, ExternalLink, Loader2, Trash2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/table"
import { AddFeedModal } from "./add-feed-modal"
import { WebSocketStatus } from "./websocket-status"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { useWebSocket } from "@/hooks/use-websocket"
import { useDebounce } from "@/hooks/use-debounce"
import { WS_URL } from "@/constraint"
import type { JobFeed } from "@/types"

interface EnhancedFeedManagerProps {
  searchTerm?: string
  onRefresh?: () => void
}

export function EnhancedFeedManager({ searchTerm = "", onRefresh }: EnhancedFeedManagerProps) {
  const [feeds, setFeeds] = useState<JobFeed[]>([])
  const [loading, setLoading] = useState(true)
  const [importingFeeds, setImportingFeeds] = useState<Set<string>>(new Set())
  const [updatingFeeds, setUpdatingFeeds] = useState<Set<string>>(new Set())
  const [completedImports, setCompletedImports] = useState<Set<string>>(new Set()) // Track completed imports to stop polling
  const { success, error, info } = useToast()

  // WebSocket for real-time updates (configurable via constraints)
  const { lastMessage, isConnected, connectionError } = useWebSocket(WS_URL)
  
  // Debounced search term to prevent API calls on every keystroke
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Define loadFeeds function first
  const loadFeeds = useCallback(async () => {
    try {
      setLoading(true)
      const feedsData = await apiClient.getFeeds(debouncedSearchTerm)
      setFeeds(feedsData)
    } catch (err) {
      error("Failed to load feeds", "Please try again later")
      // Error loading feeds - logging disabled for cleaner console
    } finally {
      setLoading(false)
    }
  }, [debouncedSearchTerm, error])

  // Initial load
  useEffect(() => {
    loadFeeds()
  }, []) // Only run on mount

  // Search effect using debounced search term
  useEffect(() => {
    loadFeeds()
  }, [debouncedSearchTerm, loadFeeds])

  const handleWebSocketMessage = useCallback(async (message: any) => {
    try {
      switch (message.type) {
        case "import_started":
          setImportingFeeds((prev) => new Set(prev).add(message.data.feedId))
          info("Import Started", `Import started for ${message.data.feedName}`)
          break

        case "import_completed":
          setImportingFeeds((prev) => {
            const newSet = new Set(prev)
            newSet.delete(message.data.feedId)
            return newSet
          })
          // Mark as completed to stop polling
          setCompletedImports((prev) => new Set(prev).add(message.data.importId))
          success("Import Completed", `Successfully imported ${message.data.jobCount} jobs for ${message.data.feedName}`)
          // Force refresh with proper timing to ensure server has updated
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
          await loadFeeds() // Refresh to get updated stats
          onRefresh?.() // Refresh parent dashboard
          break

        case "import_failed":
          setImportingFeeds((prev) => {
            const newSet = new Set(prev)
            newSet.delete(message.data.feedId)
            return newSet
          })
          // Mark as completed to stop polling
          setCompletedImports((prev) => new Set(prev).add(message.data.importId))
          error("Import Failed", `Import failed for ${message.data.feedName}: ${message.data.error}`)
          // Still refresh to update status
          await new Promise(resolve => setTimeout(resolve, 1000))
          await loadFeeds()
          onRefresh?.()
          break

        case "import_progress":
          // Could show progress bar here in the future
          if (message.data.progress && message.data.progress % 25 === 0) { // Only show every 25%
            info("Import Progress", `Processing ${message.data.feedName}: ${message.data.progress}%`)
          }
          break

        case "connection_established":
          // WebSocket connection established
          break

        default:
          // Unknown WebSocket message type
          break
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err, message)
    }
  }, [info, success, error, loadFeeds, onRefresh])

  // Handle WebSocket messages (only if connected)
  useEffect(() => {
    if (lastMessage && isConnected) {
      handleWebSocketMessage(lastMessage)
    }
  }, [lastMessage, isConnected, handleWebSocketMessage])

  const handleAddFeed = async (feedData: Omit<JobFeed, "id" | "totalJobsImported" | "lastImport">) => {
    try {
      const newFeed = await apiClient.createFeed(feedData)
      setFeeds((prev) => [newFeed, ...prev])
      success("Feed Added", `Successfully added ${newFeed.name}`)
    } catch (err) {
      error("Failed to add feed", "Please check your input and try again")
      throw err
    }
  }

  const handleToggleFeed = async (feedId: string, currentStatus: boolean) => {
    const feed = feeds.find((f) => f.id === feedId)
    if (!feed) return

    // Optimistic update
    setFeeds((prev) => prev.map((f) => (f.id === feedId ? { ...f, isActive: !currentStatus } : f)))

    setUpdatingFeeds((prev) => new Set(prev).add(feedId))

    try {
      await apiClient.updateFeed(feedId, { isActive: !currentStatus })
      success(
        !currentStatus ? "Feed Activated" : "Feed Deactivated",
        `${feed.name} is now ${!currentStatus ? "active" : "inactive"}`,
      )
    } catch (err) {
      // Rollback optimistic update
      setFeeds((prev) => prev.map((f) => (f.id === feedId ? { ...f, isActive: currentStatus } : f)))
      error("Failed to update feed", "Please try again")
    } finally {
      setUpdatingFeeds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(feedId)
        return newSet
      })
    }
  }

  const handleImportFeed = async (feedId: string) => {
    const feed = feeds.find((f) => f.id === feedId)
    if (!feed) return

    setImportingFeeds((prev) => new Set(prev).add(feedId))

    try {
      const result = await apiClient.startImport(feedId)
      info("Import Started", result.message)
      
      // Always start polling as a fallback, regardless of WebSocket status
      // This ensures the UI updates even if WebSocket messages are missed
      pollImportStatus(result.importId, feedId, feed.name)
      
      // If WebSocket is connected, we'll get real-time updates too
      // The polling will stop early when WebSocket messages are received
    } catch (err) {
      setImportingFeeds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(feedId)
        return newSet
      })
      error("Failed to start import", "Please try again")
    }
  }

  // Improved polling mechanism when WebSocket is not available
  const pollImportStatus = async (importId: string, feedId: string, feedName: string) => {
    const maxAttempts = 60 // Poll for up to 10 minutes (60 * 10 seconds)
    let attempts = 0
    let consecutiveErrors = 0
    const maxConsecutiveErrors = 3

    const poll = async () => {
      try {
        // Check if import was already completed via WebSocket
        if (completedImports.has(importId)) {
          return
        }
        
        attempts++
        const status = await apiClient.getImportStatus(importId)
        consecutiveErrors = 0 // Reset error count on successful request
        
        if (status.status === 'completed') {
          setImportingFeeds((prev) => {
            const newSet = new Set(prev)
            newSet.delete(feedId)
            return newSet
          })
          // Clean up completed import tracking
          setCompletedImports((prev) => {
            const newSet = new Set(prev)
            newSet.delete(importId)
            return newSet
          })
          success("Import Completed", `Successfully completed import for ${feedName}`)
          // Force refresh both feeds and dashboard with proper timing
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second for server to update
          await loadFeeds() // Refresh feeds
          onRefresh?.() // Refresh parent dashboard
        } else if (status.status === 'failed') {
          setImportingFeeds((prev) => {
            const newSet = new Set(prev)
            newSet.delete(feedId)
            return newSet
          })
          // Clean up completed import tracking
          setCompletedImports((prev) => {
            const newSet = new Set(prev)
            newSet.delete(importId)
            return newSet
          })
          error("Import Failed", `Import failed for ${feedName}`)
          // Still refresh to update status
          await new Promise(resolve => setTimeout(resolve, 1000))
          await loadFeeds()
          onRefresh?.()
        } else if (status.status === 'in_progress' && attempts < maxAttempts) {
          // Continue polling with exponential backoff
          const delay = Math.min(5000 + (attempts * 1000), 15000) // Start at 5s, increase by 1s each attempt, max 15s
          setTimeout(poll, delay)
        } else if (attempts >= maxAttempts) {
          // Timeout
          setImportingFeeds((prev) => {
            const newSet = new Set(prev)
            newSet.delete(feedId)
            return newSet
          })
          error("Import Timeout", `Import for ${feedName} is taking too long. Please check manually.`)
          // Still refresh to get latest status
          await loadFeeds()
          onRefresh?.()
        }
      } catch (err) {
        consecutiveErrors++
        
        if (consecutiveErrors >= maxConsecutiveErrors) {
          setImportingFeeds((prev) => {
            const newSet = new Set(prev)
            newSet.delete(feedId)
            return newSet
          })
          error("Import Status Error", `Could not get status for ${feedName}. Please refresh manually.`)
          return
        }
        
        if (attempts < maxAttempts) {
          // Retry with exponential backoff
          const delay = Math.min(10000 * Math.pow(2, consecutiveErrors - 1), 30000) // Exponential backoff, max 30s
          setTimeout(poll, delay)
        } else {
          setImportingFeeds((prev) => {
            const newSet = new Set(prev)
            newSet.delete(feedId)
            return newSet
          })
          error("Import Status Error", `Could not get status for ${feedName} after multiple attempts`)
        }
      }
    }

    // Start polling immediately for faster feedback
    setTimeout(poll, 2000) // Start after 2 seconds
  }

  const handleDeleteFeed = async (feedId: string) => {
    const feed = feeds.find((f) => f.id === feedId)
    if (!feed) return

    if (!confirm(`Are you sure you want to delete "${feed.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      await apiClient.deleteFeed(feedId)
      setFeeds((prev) => prev.filter((f) => f.id !== feedId))
      success("Feed Deleted", `Successfully deleted ${feed.name}`)
    } catch (err) {
      error("Failed to delete feed", "Please try again")
    }
  }

  const formatLastImport = (timestamp?: string) => {
    if (!timestamp) return "Never"
    return new Date(timestamp).toLocaleString()
  }

  // Memoized filtered feeds to prevent recalculation on every render
  const filteredFeeds = useMemo(() => {
    if (!searchTerm.trim()) return feeds
    
    const lowerSearchTerm = searchTerm.toLowerCase()
    return feeds.filter(
      (feed) =>
        feed.name.toLowerCase().includes(lowerSearchTerm) ||
        feed.url.toLowerCase().includes(lowerSearchTerm),
    )
  }, [feeds, searchTerm])

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Job Feeds</h2>
        </div>
        <div className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-sm text-gray-600">Loading feeds...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-medium text-gray-900">Job Feeds</h2>
          {/* WebSocket Status Indicator */}
          {WS_URL && (
            <WebSocketStatus 
              isConnected={isConnected} 
              connectionError={connectionError} 
            />
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={loadFeeds} className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
          <AddFeedModal onAddFeed={handleAddFeed} />
        </div>
      </div>

      {filteredFeeds.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {searchTerm ? "No feeds match your search criteria." : "No feeds configured yet."}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Feed Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Jobs Imported</TableHead>
              <TableHead>Last Import</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFeeds.map((feed) => (
              <TableRow key={feed.id}>
                <TableCell>
                  <div>
                    <div className="font-medium text-gray-900">{feed.name}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">{feed.url}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {feed.category && (
                      <Badge variant="secondary" className="text-xs">
                        {feed.category}
                      </Badge>
                    )}
                    {feed.jobTypes && (
                      <Badge variant="outline" className="text-xs">
                        {feed.jobTypes}
                      </Badge>
                    )}
                    {feed.region && (
                      <Badge variant="outline" className="text-xs">
                        {feed.region}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={feed.isActive}
                      onCheckedChange={() => handleToggleFeed(feed.id, feed.isActive)}
                      disabled={updatingFeeds.has(feed.id)}
                    />
                    <Badge className={feed.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                      {updatingFeeds.has(feed.id) ? "Updating..." : feed.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-center font-medium">
                  {feed.totalJobsImported?.toLocaleString() || 0}
                </TableCell>
                <TableCell className="text-gray-500">{formatLastImport(feed.lastImport)}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleImportFeed(feed.id)}
                      disabled={!feed.isActive || importingFeeds.has(feed.id)}
                      className="flex items-center space-x-1"
                    >
                      {importingFeeds.has(feed.id) ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                      <span>{importingFeeds.has(feed.id) ? "Importing..." : "Import"}</span>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => window.open(feed.url, "_blank")}>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteFeed(feed.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
