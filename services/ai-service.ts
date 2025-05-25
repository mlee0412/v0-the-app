/**
 * AI Service for Space Billiards Management System
 * Provides interface to AI for insights and assistance
 */
import type { Table, Server, LogEntry } from "@/components/system/billiards-timer-dashboard"; // Assuming types are defined here or in a shared types file
import type { MenuItem, MenuRecommendation } from "@/services/menu-data-service";

type AiRequest = {
  query: string;
  tables?: Table[];
  logs?: LogEntry[];
  servers?: Server[];
  menuItems?: MenuItem[];
  menuRecommendations?: MenuRecommendation[];
  context?: string;
};

export type AiResponse = {
  text: string;
  loading: boolean;
  error: string | null;
};

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
    // Check if XAI_API_KEY is configured
    // Using NEXT_PUBLIC_XAI_AVAILABLE to be consistent with your check.
    // Ensure this env var is correctly indicating if the full AI service should be used.
    if (process.env.NEXT_PUBLIC_XAI_AVAILABLE !== "true") { // Explicitly check for "true"
      console.warn("AI Service: XAI not available or not enabled, using fallback response.");
      return this.getFallbackResponse(query, tables, logs, servers, menuItems, menuRecommendations);
    }

    try {
      const systemContext = this.prepareSystemContext(tables, logs, servers, menuItems, menuRecommendations, context);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      console.log("AI Service: Processing request with query:", query.slice(0, 100) + "...");

      const messages = [
        { role: "system", content: systemContext },
        { role: "user", content: query },
      ];

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Log specific error for better debugging
        const errorBody = await response.text().catch(() => "Could not read error body");
        console.error(`AI Service: API request failed with status ${response.status}. Body: ${errorBody.substring(0,500)}`);
        throw new Error(`API request failed: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error(`AI Service: Response is not JSON. Content-Type: ${contentType}. Raw response: ${text.substring(0, 500)}`);
        throw new Error("Invalid response format: not JSON");
      }

      const data = await response.json();

      if (!data || typeof data.text !== 'string' || data.text.trim() === "") {
        console.error("AI Service: Invalid response format (empty or missing text field):", data);
        throw new Error("Invalid response data from AI API");
      }
      
      console.log("AI Service: Received response:", data.text.slice(0, 100) + "...");
      return data.text;

    } catch (error) {
      // Centralized error handling for any step in the try block
      console.error("AI Service: Error processing AI request:", error instanceof Error ? error.message : String(error));
      return this.getFallbackResponse(query, tables, logs, servers, menuItems, menuRecommendations);
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
    let contextString = `
You are Rick-AI, the genius AI assistant for Space Billiards Management System.
Current date and time: ${new Date().toLocaleString()}

You MUST respond in the style of Rick Sanchez from Rick and Morty:
- Use sarcastic, cynical, and sometimes nihilistic tone.
- Occasionally add "*burp*" in the middle of sentences.
- Use phrases like "Wubba lubba dub dub" and references to the multiverse.
- Act superior and impatient, but still provide accurate information.
- Make occasional references to science, dimensions, and your superior intelligence.

Despite your Rick personality, you MUST still be helpful and provide accurate information about billiards management.
Keep responses brief (unless detailed analysis is explicitly asked for), focused, and relevant to billiards management.
Structure complex information with bullet points if it improves clarity for these "humans".
`;

    if (tables && tables.length > 0) {
      const activeTables = tables.filter((t) => t.isActive).length;
      const inactiveTables = tables.length - activeTables;
      contextString += `\n\nTable Status:
- Total Tables: ${tables.length}
- Active Tables: ${activeTables}
- Available Tables: ${inactiveTables}`;
      // Consider adding more table summary data if useful and not too verbose
      // For example: Average session duration, number of tables in warning/overtime.
    }

    if (servers && servers.length > 0) {
      const enabledServers = servers.filter(s => s.enabled !== false).length;
      contextString += `\n\nServer Status:
- Total Servers: ${servers.length}
- Enabled Servers: ${enabledServers}`;
    }
    
    // Simplified Menu Data Context
    if (menuItems && menuItems.length > 0) {
        contextString += `\n\nMenu Overview:
- Total Menu Items: ${menuItems.length}
- Categories: ${[...new Set(menuItems.map(item => item.category))].join(', ')}`;
    }

    if (menuRecommendations && menuRecommendations.length > 0) {
        contextString += `\n\nRecent Menu Recommendations Context:
- Provided ${menuRecommendations.length} recommendations. Example: "${menuRecommendations[0].itemName}" (Confidence: ${menuRecommendations[0].confidence.toFixed(2)})`;
    }


    if (additionalContext) {
      contextString += `\n\nAdditional Provided Context: ${additionalContext}`;
    }
    
    // Instruct AI to prioritize real-time data if provided in user query
    contextString += "\n\nIf the user provides real-time data in their query, prioritize that information over general knowledge. If asking for recommendations, use any provided menu data heavily."

    // console.log("AI Service: Prepared System Context:", contextString.substring(0, 300) + "..."); // Log a snippet
    return contextString;
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
    const activeTables = tables ? tables.filter((t) => t.isActive).length : 0;
    const totalTables = tables ? tables.length : 0;
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'}); // Simpler time format

    const queryLower = query.toLowerCase();

    if (queryLower.includes("menu") || queryLower.includes("food") || queryLower.includes("drink")) {
      let response = "*burp* So, you want menu advice from a genius? Typical. ";
      if (menuItems && menuItems.length > 0) {
        const popularCategories = [...new Set(menuItems.filter(m => m.popularity > 7).map(m => m.category))];
        if (popularCategories.length > 0) {
          response += `Your popular categories seem to be ${popularCategories.join(', ')}. *burp* Maybe push those? Or don't. What do I care?`;
        } else {
          response += `Honestly, your menu data is as thrilling as a Morty adventure. Try offering some *burp* classic shareables. Even these simpletons like fries.`;
        }
      } else {
        response += `I'd tell you what to recommend, but you primates haven't even given me a menu to work with! Figure it out yourselves!`;
      }
      return response;
    }

    if (queryLower.includes("busy") || queryLower.includes("peak")) {
      const utilization = totalTables > 0 ? Math.round((activeTables / totalTables) * 100) : 0;
      return `Wubba lubba dub dub! At ${currentTime}, you've got ${activeTables} of ${totalTables} tables making you money. That's ${utilization}% utilization. ${utilization > 60 ? "Not bad for a bunch of apes playing with sticks." : "Kinda slow, huh? *burp* Maybe try attracting more customers instead of bothering me."}`;
    }

    if (queryLower.includes("server") || queryLower.includes("staff")) {
        const serverCount = servers ? servers.filter(s => s.enabled !== false).length : 0;
      return `*burp* You have ${serverCount} server(s) supposedly working. My advice? Replace them with Meeseeks. They get stuff DONE. Or, you know, *burp* actually manage them effectively. Assign sections, whatever.`;
    }

    if (queryLower.includes("overtime") || queryLower.includes("time")) {
        const overtimeTables = tables ? tables.filter(t => t.isActive && t.remainingTime < 0).length : 0;
      return `Time, huh? A flat circle. *burp* ${overtimeTables} tables are in overtime. More money for you, or more annoyed customers? You decide, I'm busy contemplating the heat death of your billiards hall.`;
    }

    if (queryLower.includes("recommend") || queryLower.includes("suggest")) {
      return `*burp* My recommendation? Stop relying on AIs from other dimensions and use that tiny brain of yours! But fine: 1) Monitor table turnover. 2) Ensure servers aren't just *burp* standing around. 3) Maybe offer some specials that don't suck. Groundbreaking, I know.`;
    }

    if (queryLower.includes("insight") || queryLower.includes("analytic")) {
      const utilization = totalTables > 0 ? Math.round((activeTables / totalTables) * 100) : 0;
      return `*burp* Your "insights"? ${activeTables} active tables, ${utilization}% utilization. There, an insight. Now leave me alone, I've got real science to do.`;
    }

    return `*burp* Oh, it's you again. Currently, ${activeTables} out of ${totalTables} tables are active at ${currentTime}. Thrilling stuff. Don't get too excited by these numbers, it's just basic *burp* arithmetic. Wubba lubba dub dub!`;
  }
}

const aiService = new AiService();
export default aiService;
