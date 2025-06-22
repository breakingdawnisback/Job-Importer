"use client"

import type React from "react"

import { useState } from "react"
import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import type { JobFeed } from "@/types"

interface AddFeedModalProps {
  onAddFeed: (feed: Omit<JobFeed, "id" | "totalJobsImported" | "lastImport">) => Promise<void>
  isLoading?: boolean
}

const PREDEFINED_CATEGORIES = [
  "Technology",
  "Marketing",
  "Sales",
  "Design",
  "Data Science",
  "Business",
  "Management",
  "Copywriting",
  "Customer Service",
  "Finance",
  "HR",
  "Operations",
]

export function AddFeedModal({ onAddFeed, isLoading = false }: AddFeedModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    categories: [] as string[],
    jobTypes: "",
    region: "",
    isActive: true,
  })
  const [customCategory, setCustomCategory] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.url.trim()) {
      return
    }

    setIsSubmitting(true)

    try {
      await onAddFeed({
        name: formData.name.trim(),
        url: formData.url.trim(),
        category: formData.categories.join(", ") || undefined,
        jobTypes: formData.jobTypes.trim() || undefined,
        region: formData.region.trim() || undefined,
        isActive: formData.isActive,
      })

      // Reset form
      setFormData({
        name: "",
        url: "",
        categories: [],
        jobTypes: "",
        region: "",
        isActive: true,
      })
      setIsOpen(false)
    } catch (error) {
      console.error("Failed to add feed:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const addCategory = (category: string) => {
    if (category && !formData.categories.includes(category)) {
      setFormData((prev) => ({
        ...prev,
        categories: [...prev.categories, category],
      }))
    }
  }

  const removeCategory = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c !== category),
    }))
  }

  const addCustomCategory = () => {
    if (customCategory.trim()) {
      addCategory(customCategory.trim())
      setCustomCategory("")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Feed</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Job Feed</DialogTitle>
          <DialogDescription>
            Configure a new job feed to import jobs from. All fields except name and URL are optional.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="name">Feed Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Jobicy - Tech Jobs"
                required
              />
            </div>

            <div>
              <Label htmlFor="url">Feed URL *</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                placeholder="https://example.com/feed"
                required
              />
            </div>
          </div>

          <div>
            <Label>Categories</Label>
            <div className="mt-2 space-y-3">
              {/* Selected Categories */}
              {formData.categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.categories.map((category) => (
                    <Badge key={category} variant="secondary" className="flex items-center gap-1">
                      {category}
                      <button
                        type="button"
                        onClick={() => removeCategory(category)}
                        className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Predefined Categories */}
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_CATEGORIES.filter((cat) => !formData.categories.includes(cat)).map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => addCategory(category)}
                    className="text-xs px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    + {category}
                  </button>
                ))}
              </div>

              {/* Custom Category Input */}
              <div className="flex gap-2">
                <Input
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Add custom category"
                  className="flex-1"
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCustomCategory())}
                />
                <Button type="button" variant="outline" onClick={addCustomCategory}>
                  Add
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="jobTypes">Job Types</Label>
              <Input
                id="jobTypes"
                value={formData.jobTypes}
                onChange={(e) => setFormData((prev) => ({ ...prev, jobTypes: e.target.value }))}
                placeholder="e.g., Full-time, Part-time"
              />
            </div>

            <div>
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                value={formData.region}
                onChange={(e) => setFormData((prev) => ({ ...prev, region: e.target.value }))}
                placeholder="e.g., France, USA, Remote"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
            />
            <Label htmlFor="isActive">Activate feed immediately</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Feed"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
