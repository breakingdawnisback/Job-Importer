"use client"

import { useEffect, useState } from "react"
import { Plus, Play, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { JobFeed } from "@/types"
import { apiClient } from "@/lib/api-client"

interface FeedManagerProps {
  onImportFeed?: (feedId: string) => void
}

export function FeedManager({ onImportFeed }: FeedManagerProps) {
  const [feeds, setFeeds] = useState<JobFeed[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newFeed, setNewFeed] = useState({
    name: "",
    url: "",
    category: "",
    jobTypes: "",
    region: "",
  })

  // Fetch feeds from backend
  useEffect(() => {
    setLoading(true)
    apiClient.getFeeds()
      .then(setFeeds)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleToggleFeed = async (feedId: string) => {
    const feed = feeds.find(f => f.id === feedId)
    if (!feed) return
    try {
      const updated = await apiClient.updateFeed(feedId, { isActive: !feed.isActive })
      setFeeds(feeds.map(f => f.id === feedId ? updated : f))
    } catch (e) {
      console.error(e)
    }
  }

  const handleImportFeed = async (feedId: string) => {
    onImportFeed?.(feedId)
    // Optionally call backend to trigger import
    try {
      await apiClient.startImport(feedId)
      // Optionally refresh feeds to update lastImport
      const updatedFeeds = await apiClient.getFeeds()
      setFeeds(updatedFeeds)
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddFeed = async () => {
    if (newFeed.name && newFeed.url) {
      try {
        const feed = await apiClient.createFeed({
          name: newFeed.name,
          url: newFeed.url,
          category: newFeed.category || undefined,
          jobTypes: newFeed.jobTypes || undefined,
          region: newFeed.region || undefined,
          isActive: true,
        })
        setFeeds([...feeds, feed])
        setNewFeed({ name: "", url: "", category: "", jobTypes: "", region: "" })
        setIsAddDialogOpen(false)
      } catch (e) {
        console.error(e)
      }
    }
  }

  const formatLastImport = (timestamp?: string) => {
    if (!timestamp) return "Never"
    return new Date(timestamp).toLocaleString()
  }

  if (loading) return <div className="p-6">Loading feeds...</div>

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Job Feeds</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Feed</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Job Feed</DialogTitle>
              <DialogDescription>Configure a new job feed to import jobs from.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Feed Name</Label>
                <Input
                  id="name"
                  value={newFeed.name}
                  onChange={(e) => setNewFeed({ ...newFeed, name: e.target.value })}
                  placeholder="e.g., Jobicy - Tech Jobs"
                />
              </div>
              <div>
                <Label htmlFor="url">Feed URL</Label>
                <Input
                  id="url"
                  value={newFeed.url}
                  onChange={(e) => setNewFeed({ ...newFeed, url: e.target.value })}
                  placeholder="https://example.com/feed"
                />
              </div>
              <div>
                <Label htmlFor="category">Category (Optional)</Label>
                <Input
                  id="category"
                  value={newFeed.category}
                  onChange={(e) => setNewFeed({ ...newFeed, category: e.target.value })}
                  placeholder="e.g., Technology, Marketing"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="jobTypes">Job Types (Optional)</Label>
                  <Input
                    id="jobTypes"
                    value={newFeed.jobTypes}
                    onChange={(e) => setNewFeed({ ...newFeed, jobTypes: e.target.value })}
                    placeholder="e.g., Full-time, Part-time"
                  />
                </div>
                <div>
                  <Label htmlFor="region">Region (Optional)</Label>
                  <Input
                    id="region"
                    value={newFeed.region}
                    onChange={(e) => setNewFeed({ ...newFeed, region: e.target.value })}
                    placeholder="e.g., France, USA"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddFeed}>Add Feed</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
          {feeds.map((feed) => (
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
                  <Switch checked={feed.isActive} onCheckedChange={() => handleToggleFeed(feed.id)} />
                  <Badge className={feed.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                    {feed.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-center font-medium">{feed.totalJobsImported?.toLocaleString?.() ?? 0}</TableCell>
              <TableCell className="text-gray-500">{formatLastImport(feed.lastImport)}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleImportFeed(feed.id)}
                    disabled={!feed.isActive}
                    className="flex items-center space-x-1"
                  >
                    <Play className="h-3 w-3" />
                    <span>Import</span>
                  </Button>
                  <Button size="sm" variant="ghost">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}