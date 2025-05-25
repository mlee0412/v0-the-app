"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CircleOff, Send, Loader2, Bot, Brain, XCircle, AlertTriangle } from "lucide-react"
import { useAiAssistant } from "@/hooks/use-ai-assistant"
import type { Table, Server as ServerType, LogEntry } from "@/components/system/billiards-timer-dashboard"
import menuDataService, { type MenuItem, type MenuRecommendation } from "@/services/menu-data-service"

interface AiAssistantDialogProps {
  open: boolean
  onClose: () => void
  tables: Table[]
  logs: LogEntry[]
  servers: ServerType[]
}

export function AiAssistantDialog({ open, onClose, tables, logs, servers }: AiAssistantDialogProps) {
  const [query, setQuery] = useState("")
  const [conversation, setConversation] = useState<Array<{ role: "user" | "assistant"; content: string }>>([])
  const [offlineMode, setOfflineMode] = useState(false)
  const { response, askAi, resetResponse } = useAiAssistant()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const scrollViewportRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuRecommendations, setMenuRecommendations] = useState<MenuRecommendation[]>([])

  // Sample quick prompts for users to try
  const quickPrompts = [
    "Which tables have been active the longest?",
    "Which servers have the most tables?",
    "Recommend menu items for table 3",
    "What food pairs well with billiards?",
    "What are our most popular menu items?",
    "Suggest drinks for a group of 6",
  ]

  // Fetch menu data when dialog opens
  useEffect(() => {
    if (open) {
      const fetchMenuData = async () => {
        try {
          const items = await menuDataService.getMenuItems()
          setMenuItems(items)

          // Get recommendations for all active tables
          const activeTablesRecommendations: Record<number, MenuRecommendation[]> = {}

          for (const table of tables.filter((t) => t.isActive && t.guestCount > 0)) {
            const sessionDuration = table.initialTime - table.remainingTime
            const tableRecs = await menuDataService.getMenuRecommendations(table.id, table.guestCount, sessionDuration)
            activeTablesRecommendations[table.id] = tableRecs
          }

          // Use the first active table's recommendations as default
          const firstActiveTable = tables.find((t) => t.isActive && t.guestCount > 0)
          if (firstActiveTable && activeTablesRecommendations[firstActiveTable.id]) {
            setMenuRecommendations(activeTablesRecommendations[firstActiveTable.id])
          }
        } catch (error) {
          console.error("Error fetching menu data:", error)
        }
      }

      fetchMenuData()
    }
  }, [open, tables])

  // Reset conversation when dialog opens
  useEffect(() => {
    if (open) {
      resetResponse()

      // Always start with a welcome message regardless of API key status
      if (conversation.length === 0) {
        const welcomeMessage =
          "Wubba lubba dub dub! *burp* Listen up, you primitive billiards monkeys! I'm Rick-AI, the smartest AI in the multiverse! Got questions about your little ball-hitting business? *burp* I guess I can help, but don't expect me to be impressed by your primitive table management skills. Ask me something before I get bored and decide to turn this place into a quantum carburetor!"

        setConversation([
          {
            role: "assistant",
            content: welcomeMessage,
          },
        ])
      }

      // Focus input field
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }

        // Initial scroll to bottom
        scrollToBottom()
      }, 100)
    }
  }, [open, resetResponse, conversation.length])

  // Improved scroll to bottom function
  const scrollToBottom = () => {
    // Try multiple methods to ensure scrolling works across different devices
    if (scrollViewportRef.current) {
      const scrollElement = scrollViewportRef.current
      scrollElement.scrollTop = scrollElement.scrollHeight
    } else if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    } else {
      const scrollableParent = findScrollableParent(scrollViewportRef.current || scrollAreaRef.current)
      if (scrollableParent) {
        scrollableParent.scrollTop = scrollableParent.scrollHeight
      }
    }
  }

  // Helper function to find scrollable parent
  const findScrollableParent = (element: HTMLElement | null): HTMLElement | null => {
    if (!element) return null

    // Check if element is scrollable
    if (
      element.scrollHeight > element.clientHeight ||
      window.getComputedStyle(element).overflowY === "scroll" ||
      window.getComputedStyle(element).overflowY === "auto"
    ) {
      return element
    }

    // Check parent
    return element.parentElement ? findScrollableParent(element.parentElement) : null
  }

  // Scroll to bottom when conversation updates or loading state changes
  useEffect(() => {
    // Use a small timeout to ensure the DOM has updated
    const timeoutId = setTimeout(() => {
      scrollToBottom()
    }, 50)

    return () => clearTimeout(timeoutId)
  }, [conversation, response.loading])

  // Handle submitting a query
  const handleSubmit = async () => {
    if (!query.trim()) return

    const userQuery = query.trim()
    setQuery("") // Clear input field immediately

    // Add user message to conversation
    setConversation((prev) => [...prev, { role: "user", content: userQuery }])

    // Scroll to bottom after adding user message
    setTimeout(scrollToBottom, 50)

    try {
      // Check if query is about menu recommendations for a specific table
      const tableMatch = userQuery.match(/table\s+(\d+)/i)
      let tableSpecificRecommendations: MenuRecommendation[] | undefined = undefined

      if (tableMatch && tableMatch[1]) {
        const tableId = Number.parseInt(tableMatch[1])
        const table = tables.find((t) => t.id === tableId)

        if (table && table.isActive) {
          const sessionDuration = table.initialTime - table.remainingTime
          tableSpecificRecommendations = await menuDataService.getMenuRecommendations(
            table.id,
            table.guestCount,
            sessionDuration,
          )
        }
      }

      // Call the AI service with menu data
      const aiResponse = await askAi(userQuery, {
        tables,
        logs,
        servers,
        menuItems,
        menuRecommendations: tableSpecificRecommendations || menuRecommendations,
      })

      // Add AI response to conversation
      if (aiResponse) {
        setConversation((prev) => [...prev, { role: "assistant", content: aiResponse }])
        // Scroll to bottom after adding AI response
        setTimeout(scrollToBottom, 50)
      }
    } catch (error) {
      console.error("Error getting AI response:", error)

      // Add a fallback response to conversation
      const fallbackResponse =
        "I can help you analyze your billiards hall operations even without a connection. What would you like to know about table management, server assignments, or customer patterns?"
      setConversation((prev) => [...prev, { role: "assistant", content: fallbackResponse }])
      // Scroll to bottom after adding fallback response
      setTimeout(scrollToBottom, 50)
    }
  }

  // Handle clicking a quick prompt
  const handleQuickPrompt = (prompt: string) => {
    setQuery(prompt)
    // Focus the input
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  // Handle key press in textarea
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[550px] bg-black text-white border-[#00FFFF] max-h-[85vh] overflow-hidden flex flex-col space-theme font-mono"
        style={{
          backgroundImage: "linear-gradient(to bottom, #000033, #000011)",
          backgroundSize: "cover",
          boxShadow: "0 0 20px rgba(0, 255, 255, 0.5)",
        }}
      >
        <DialogHeader className="pb-0">
          <DialogTitle className="text-lg text-[#00FFFF] flex items-center gap-2">
            <Brain className="h-5 w-5 text-[#FF00FF]" />
            <span>Space AI Assistant</span>
            {response.loading && <Loader2 className="h-4 w-4 animate-spin text-[#00FFFF]" />}
            {offlineMode && (
              <div className="flex items-center text-xs text-amber-400 gap-1 ml-auto">
                <AlertTriangle className="h-3 w-3" />
                <span>Offline Mode</span>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Conversation Area - Using native scrolling for better mobile support */}
        <div
          className="flex-1 pr-4 my-4 overflow-y-auto dialog-scroll-area"
          ref={scrollAreaRef}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="space-y-4" ref={scrollViewportRef}>
            {conversation.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === "user"
                      ? "bg-[#330066] text-white rounded-tr-none"
                      : "bg-[#003333] text-[#00FFFF] rounded-tl-none"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex items-center gap-1 mb-1 text-[#FF00FF] text-xs">
                      <Bot className="h-3 w-3" />
                      <span>SpaceAI</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}

            {response.error && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-3 bg-[#330000] text-[#FF0000] rounded-lg rounded-tl-none">
                  <div className="flex items-center gap-1 mb-1 text-[#FF0000] text-xs">
                    <CircleOff className="h-3 w-3" />
                    <span>Error</span>
                  </div>
                  <p className="text-sm">{response.error}</p>
                </div>
              </div>
            )}

            {response.loading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-3 bg-[#003333] text-[#00FFFF] rounded-lg rounded-tl-none flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <p className="text-sm">Processing your request...</p>
                </div>
              </div>
            )}

            {/* Invisible element to help with scrolling to bottom */}
            <div id="chat-bottom" style={{ height: "1px" }}></div>
          </div>
        </div>

        {/* Quick Prompts */}
        <div className="mb-3">
          <p className="text-xs text-gray-400 mb-1">Try asking:</p>
          <div className="flex flex-wrap gap-1">
            {quickPrompts.map((prompt, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleQuickPrompt(prompt)}
                className="h-6 text-xs px-2 py-0 text-[#00FFFF] border-[#00FFFF] bg-[#000033] hover:bg-[#000066]"
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="mt-auto">
          <div className="relative">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask me about your billiards hall..."
              className="resize-none min-h-[80px] bg-[#000033] border-[#00FFFF] text-white focus:border-[#FF00FF] pr-10"
              onKeyDown={handleKeyDown}
              ref={inputRef}
              disabled={response.loading}
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              {query && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setQuery("")}
                  className="h-6 w-6 text-gray-400 hover:text-white hover:bg-transparent"
                  disabled={response.loading}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="button"
                size="icon"
                onClick={handleSubmit}
                disabled={!query.trim() || response.loading}
                className="h-8 w-8 rounded-full bg-[#FF00FF] hover:bg-[#CC00CC] text-white"
              >
                {response.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              className="text-[#00FFFF] border-[#00FFFF] bg-transparent hover:bg-[#000066]"
              onClick={() => setConversation([])}
              disabled={response.loading}
            >
              Clear Chat
            </Button>
            <Button
              variant="outline"
              className="text-[#00FFFF] border-[#00FFFF] bg-transparent hover:bg-[#000066]"
              onClick={onClose}
              disabled={response.loading}
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
