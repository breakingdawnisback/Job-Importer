"use client"

import { useEffect, useRef, useState } from "react"

interface WebSocketMessage {
  type: string
  data: any
}

export function useWebSocket(url: string) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const connect = () => {
    // Don't attempt to connect if we've exceeded max attempts
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      setConnectionError(`Failed to connect after ${maxReconnectAttempts} attempts`)
      return
    }

    // Don't create a new connection if one is already connecting or connected
    if (ws.current && (ws.current.readyState === WebSocket.CONNECTING || ws.current.readyState === WebSocket.OPEN)) {
      return
    }

    try {
      // Clear any previous connection error
      setConnectionError(null)
      
      ws.current = new WebSocket(url)

      ws.current.onopen = () => {
        setIsConnected(true)
        setConnectionError(null)
        reconnectAttempts.current = 0 // Reset attempts on successful connection
        // Only log connection in development
        if (process.env.NODE_ENV === 'development') {
          console.log("WebSocket connected")
        }
      }

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          // Only log non-connection messages in development
          if (process.env.NODE_ENV === 'development' && message.type !== 'connection_established') {
            console.log('WebSocket message:', message.type, message.data)
          }
          setLastMessage(message)
        } catch (error) {
          console.warn("Failed to parse WebSocket message:", error, event.data)
        }
      }

      ws.current.onclose = (event) => {
        setIsConnected(false)
        
        // Only log if it's not a normal closure
        if (event.code !== 1000) {
          console.log(`WebSocket disconnected (code: ${event.code}, reason: ${event.reason})`)
        }

        // Only attempt to reconnect if we haven't exceeded max attempts
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000) // Exponential backoff, max 30s
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`)
            connect()
          }, delay)
        } else {
          setConnectionError("WebSocket connection failed - server may be unavailable")
        }
      }

      ws.current.onerror = (error) => {
        // WebSocket error events don't provide much detail, so we'll handle this gracefully
        console.warn("WebSocket connection error - this is normal if the server is not running")
        setConnectionError("WebSocket server unavailable")
      }
    } catch (error) {
      console.warn("Failed to initialize WebSocket connection:", error)
      setConnectionError("Failed to initialize WebSocket")
    }
  }

  useEffect(() => {
    // Only attempt connection if URL is provided and not empty
    if (url && url.trim() !== "") {
      connect()
    } else {
      // If no URL provided, set connection as unavailable but not an error
      setConnectionError(null)
      setIsConnected(false)
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
        ws.current.close(1000, "Component unmounting") // Normal closure
        ws.current = null
      }
    }
  }, [url])

  const sendMessage = (message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message))
      return true
    }
    return false
  }

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connectionError,
  }
}
