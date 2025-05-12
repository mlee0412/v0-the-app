import { NextResponse } from "next/server"
import { generateText } from "ai"
import { xai } from "@ai-sdk/xai"

export async function POST(request: Request) {
  try {
    // Parse the request body with error handling
    const body = await request.json().catch((error) => {
      console.error("Failed to parse request JSON:", error)
      return {}
    })

    const { messages } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        {
          text: "I need messages to respond to. What would you like to know about your billiards hall?",
        },
        { status: 200 },
      )
    }

    // Check if xAI API key is available
    if (!process.env.XAI_API_KEY) {
      console.warn("XAI_API_KEY is not set. Using fallback response.")
      return NextResponse.json({
        text: "I'm currently operating with limited capabilities. Please ensure the AI service is properly configured.",
      })
    }

    try {
      // Log the request for debugging
      console.log("Sending request to Grok with messages:", JSON.stringify(messages).slice(0, 200) + "...")

      // Use the AI SDK to generate a response with Grok
      const response = await generateText({
        model: xai("grok-3-mini"),
        messages: messages,
        maxTokens: 500,
      }).catch((error) => {
        console.error("AI SDK error:", error)
        throw error // Re-throw to be caught by the outer catch
      })

      // Check if the response is empty and provide a fallback if needed
      const responseText = response.text && response.text.trim() ? response.text : generateFallbackResponse("general")

      console.log("Received response from Grok:", responseText.slice(0, 200) + "...")

      return NextResponse.json({ text: responseText })
    } catch (aiError) {
      console.error("Error using AI SDK:", aiError)

      // Extract user query from messages for fallback response
      const userQuery = messages.find((m) => m.role === "user")?.content || ""

      // Generate a helpful fallback response
      const fallbackResponse = generateFallbackResponse(userQuery)

      // Return the fallback response
      return NextResponse.json({
        text: fallbackResponse,
      })
    }
  } catch (error) {
    console.error("Error in AI chat route:", error)
    return NextResponse.json(
      {
        text: "I'm here to help with your billiards management. What would you like to know about your tables or operations?",
      },
      { status: 200 }, // Return 200 with friendly message instead of error
    )
  }
}

// Function to generate fallback responses based on query content
function generateFallbackResponse(query: string): string {
  const queryLower = query.toLowerCase()

  if (queryLower.includes("busy") || queryLower.includes("peak")) {
    return "*burp* Based on typical patterns, billiards halls are usually busiest in the evenings and on weekends. Monitoring your table usage during these times can help with staffing decisions. Not that you primates could figure that out on your own!"
  }

  if (queryLower.includes("server") || queryLower.includes("staff")) {
    return "*burp* Effective server management is key to customer satisfaction. Consider assigning specific sections to each server and rotating responsibilities to maintain service quality. It's not rocket science, which *burp* I mastered when I was twelve!"
  }

  if (queryLower.includes("overtime") || queryLower.includes("time")) {
    return "Monitoring tables in overtime helps maximize revenue. *burp* Consider offering discounted rates during slow periods to encourage more play time. Even Morty could figure that out, and he's not exactly a genius."
  }

  if (queryLower.includes("recommend") || queryLower.includes("suggest")) {
    return "*burp* For optimal billiards hall management: 1) Monitor table turnover rates, 2) Train servers on efficient service, 3) Implement a fair reservation system, and 4) Consider loyalty programs for regular customers. Wubba lubba dub dub!"
  }

  if (queryLower === "general") {
    return "*burp* I've analyzed your billiards operation, and let me tell you, it's functioning at what you humans would call 'acceptable parameters'. Not impressive by my standards, but hey, what is? Try monitoring table utilization rates during different time slots for some basic optimization."
  }

  // Default response with a bit of humor
  return "*burp* I'm your cosmic billiards assistant! 🎱✨ I can help with table usage, server assignments, and operational recommendations. What's your burning billiards question? (And no, I can't help you with that trick shot - I'm all AI, no arms! Not in this dimension anyway...)"
}
