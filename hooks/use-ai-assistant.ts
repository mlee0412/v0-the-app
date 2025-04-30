"use client"

import { useState, useCallback } from "react"
import aiService, { type AiResponse } from "@/services/ai-service"
import type { Table, Server, LogEntry } from "@/components/billiards-timer-dashboard"

type AiContext = {
  tables?: Table[]
  logs?: LogEntry[]
  servers?: Server[]
  context?: string
}

// Interface for using AI assistant
export function useAiAssistant() {
  const [response, setResponse] = useState<AiResponse>({
    text: "",
    loading: false,
    error: null,
  })

  // Ask AI a question with context
  const askAi = useCallback(async (query: string, context?: any) => {
    setResponse({
      text: "",
      loading: true,
      error: null,
    })

    try {
      // Add a small delay to prevent too rapid requests
      await new Promise((resolve) => setTimeout(resolve, 100))

      const text = await aiService.processRequest({
        query,
        ...context,
      })

      setResponse({
        text,
        loading: false,
        error: null,
      })

      return text
    } catch (error) {
      console.error("Error asking AI:", error)

      // Create a friendly error message
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

      const fallbackText = "I'm currently experiencing technical difficulties. Please try again later."

      setResponse({
        text: fallbackText,
        loading: false,
        error: errorMessage,
      })

      // Return fallback text instead of throwing
      return fallbackText
    }
  }, [])

  return {
    ...response,
    askAi,
  }
}
