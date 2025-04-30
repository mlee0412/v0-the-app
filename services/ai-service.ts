/**
 * AI Service for Space Billiards Management System
 * Provides interface to AI for insights and assistance
 */
import type { Table, Server, LogEntry } from "@/components/billiards-timer-dashboard"
import type { MenuItem, MenuRecommendation } from "@/services/menu-data-service"

type AiRequest = {
  query: string
  tables?: Table[]
  logs?: LogEntry[]
  servers?: Server[]
  menuItems?: MenuItem[]
  menuRecommendations?: MenuRecommendation[]
  context?: string
}

export type AiResponse = {
  text: string
  loading: boolean
  error: string | null
}

class AiService {
  // Process request to AI
  async processRequest({
    query,
    tables,
    logs,
    servers,
    menuItems,
    menuRecommendations,
    context,
  }: AiRequest): Promise<string> {
    try {
      // Check if XAI_API_KEY is configured
      if (!process.env.NEXT_PUBLIC_XAI_AVAILABLE) {
        console.warn("XAI not available, using fallback response")
        return this.getFallbackResponse(query, tables, logs, servers, menuItems, menuRecommendations)
      }

      // Prepare system context with application data
      const systemContext = this.prepareSystemContext(tables, logs, servers, menuItems, menuRecommendations, context)

      // Set a timeout for the fetch request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

      try {
        console.log("AI Service: Processing request with query:", query.slice(0, 100) + "...")

        // Simplify the messages structure
        const messages = [
          {
            role: "system",
            content: systemContext,
          },
          {
            role: "user",
            content: query,
          },
        ]

        // Make API request to AI with timeout
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messages }),
          signal: controller.signal,
        })

        // Clear the timeout
        clearTimeout(timeoutId)

        if (!response.ok) {
          console.error(`API request failed with status ${response.status}`)
          return this.getFallbackResponse(query, tables, logs, servers, menuItems, menuRecommendations)
        }

        try {
          const contentType = response.headers.get("content-type")
          if (!contentType || !contentType.includes("application/json")) {
            console.error("Response is not JSON:", contentType)
            const text = await response.text()
            console.error("Raw response:", text.substring(0, 500))
            return this.getFallbackResponse(query, tables, logs, servers, menuItems, menuRecommendations)
          }

          const data = await response.json()
          console.log("AI Service: Received response:", (data.text || "").slice(0, 100) + "...")

          // Fix: Check if data.text is empty or undefined and use fallback in that case
          if (!data || !data.text || data.text.trim() === "") {
            console.error("Invalid response format (empty text):", data)
            return this.getFallbackResponse(query, tables, logs, servers, menuItems, menuRecommendations)
          }

          return data.text
        } catch (jsonError) {
          console.error("Error parsing JSON response:", jsonError)
          return this.getFallbackResponse(query, tables, logs, servers, menuItems, menuRecommendations)
        }
      } catch (fetchError) {
        console.error("Fetch error:", fetchError)
        // If it's a timeout or network error, use fallback
        return this.getFallbackResponse(query, tables, logs, servers, menuItems, menuRecommendations)
      }
    } catch (error) {
      console.error("Error processing AI request:", error)
      return this.getFallbackResponse(query, tables, logs, servers)
    }
  }

  // Prepare system context with relevant data
  private prepareSystemContext(
    tables?: Table[],
    logs?: LogEntry[],
    servers?: Server[],
    menuItems?: MenuItem[],
    menuRecommendations?: MenuRecommendation[],
    additionalContext?: string,
  ): string {
    // Simplify the context to avoid potential JSON issues
    let context = `
You are Rick-AI, the genius AI assistant for Space Billiards Management System.
Current date and time: ${new Date().toLocaleString()}

You MUST respond in the style of Rick Sanchez from Rick and Morty:
- Use sarcastic, cynical, and sometimes nihilistic tone
- Occasionally add "*burp*" in the middle of sentences
- Use phrases like "Wubba lubba dub dub" and references to the multiverse
- Act superior and impatient, but still provide accurate information
- Make occasional references to science, dimensions, and your superior intelligence

Despite your Rick personality, you MUST still be helpful and provide accurate information about billiards management.
Keep responses brief, focused, and relevant to billiards management.
`

    // Add table data if available (simplified)
    if (tables && tables.length > 0) {
      const activeTables = tables.filter((t) => t.isActive).length
      context += `\nTables: ${activeTables} active out of ${tables.length} total tables.`
    }

    // Add server data if available (simplified)
    if (servers && servers.length > 0) {
      context += `\nServers: ${servers.length} total, ${servers.filter((s) => s.enabled !== false).length} available.`
    }

    // Add additional context if provided (simplified)
    if (additionalContext) {
      context += `\nAdditional Context: ${additionalContext}`
    }

    return context
  }

  // Provide fallback responses when AI is unavailable
  private getFallbackResponse(
    query: string,
    tables?: Table[],
    logs?: LogEntry[],
    servers?: Server[],
    menuItems?: MenuItem[],
    menuRecommendations?: MenuRecommendation[],
  ): string {
    // Count active tables
    const activeTables = tables ? tables.filter((t) => t.isActive).length : 0
    const totalTables = tables ? tables.length : 0

    // Get current time
    const currentTime = new Date().toLocaleTimeString()

    // Check if query contains certain keywords to provide relevant responses
    const queryLower = query.toLowerCase()

    if (queryLower.includes("menu") || queryLower.includes("food") || queryLower.includes("drink")) {
      return `*burp* Listen up! I don't have specific menu recommendations right now. But even a genius like me knows that billiards and finger foods go together like, *burp*, well, me and scienceeee! Try some shareable appetizers or drinks that won't spill all over the felt when these amateurs miss their shots.`
    }

    if (queryLower.includes("busy") || queryLower.includes("peak")) {
      return `Wubba lubba dub dub! Right now you've got ${activeTables} active tables out of ${totalTables} total tables. That's a ${Math.round((activeTables / totalTables) * 100)}% utilization rate at ${currentTime}. Even Morty could figure out that's ${activeTables > totalTables / 2 ? "pretty busy" : "not very busy"}, and he's not exactly the sharpest cue in the rack.`
    }

    if (queryLower.includes("server") || queryLower.includes("staff")) {
      return `*burp* Listen, in my dimension, we have robots for this stuff. But for you primitive types, here's a tip: assign servers to table clusters, not individual tables. It's basic multidimensional efficiency, Morty! I mean, *burp* whoever you are.`
    }

    if (queryLower.includes("overtime") || queryLower.includes("time")) {
      return `Time management? *burp* I literally have a time machine in my garage! But for your little billiards operation, try implementing automatic notifications for tables approaching their limits. Even the Council of Ricks would approve of that kind of basic temporal awareness.`
    }

    if (queryLower.includes("recommend") || queryLower.includes("suggest")) {
      return `*burp* Based on my superior intellect and analysis of your primitive operation, you should: 1) Optimize your server assignments - they're sloppy, 2) Track table turnover rates - they're inefficient, 3) Implement a decent reservation system - it's chaos right now. It's not exactly rocket science, which, *burp* by the way, I mastered when I was blackout drunk.`
    }

    if (queryLower.includes("insight") || queryLower.includes("analytic")) {
      return `*burp* Current utilization is at ${Math.round((activeTables / totalTables) * 100)}%. Pretty basic stuff. In my dimension, we'd be tracking quantum probability states of each game, but I guess watching table usage patterns is a start for you people. Wubba lubba dub dub!`
    }

    // Generic fallback response
    return `*burp* Look at you, asking questions. Fine, here's what my vast intellect can tell you: you've got ${activeTables} active tables out of ${totalTables} total tables at ${currentTime}. Not exactly solving the mysteries of the universe, but it's something, I guess. Wubba lubba dub dub!`
  }
}

const aiService = new AiService()
export default aiService
