"use client"

import { Wifi, WifiOff, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface WebSocketStatusProps {
  isConnected: boolean
  connectionError: string | null
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
}

export function WebSocketStatus({ 
  isConnected, 
  connectionError, 
  showLabel = true, 
  size = "md" 
}: WebSocketStatusProps) {
  const iconSize = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"
  const badgeSize = size === "sm" ? "text-xs" : "text-xs"

  const getStatusContent = () => {
    if (isConnected) {
      return {
        icon: <Wifi className={`${iconSize} text-green-600`} />,
        badge: showLabel ? (
          <Badge variant="outline" className={`${badgeSize} bg-green-50 text-green-700 border-green-200`}>
            Live Updates
          </Badge>
        ) : null,
        tooltip: {
          title: "WebSocket Connected",
          description: "Real-time updates are active"
        }
      }
    } else if (connectionError) {
      return {
        icon: <WifiOff className={`${iconSize} text-red-600`} />,
        badge: showLabel ? (
          <Badge variant="outline" className={`${badgeSize} bg-red-50 text-red-700 border-red-200`}>
            Offline
          </Badge>
        ) : null,
        tooltip: {
          title: "WebSocket Offline",
          description: "Real-time updates unavailable",
          error: connectionError
        }
      }
    } else {
      return {
        icon: <Loader2 className={`${iconSize} text-yellow-600 animate-spin`} />,
        badge: showLabel ? (
          <Badge variant="outline" className={`${badgeSize} bg-yellow-50 text-yellow-700 border-yellow-200`}>
            Connecting...
          </Badge>
        ) : null,
        tooltip: {
          title: "Connecting...",
          description: "Establishing WebSocket connection"
        }
      }
    }
  }

  const status = getStatusContent()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center space-x-1 cursor-help">
            {status.icon}
            {status.badge}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className={`font-medium ${
              isConnected ? 'text-green-700' : 
              connectionError ? 'text-red-700' : 
              'text-yellow-700'
            }`}>
              {status.tooltip.title}
            </p>
            <p className="text-gray-600">{status.tooltip.description}</p>
            {status.tooltip.error && (
              <p className="text-xs text-gray-500 mt-1">{status.tooltip.error}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}