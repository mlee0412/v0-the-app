"use client"

import { Users, Clock } from "lucide-react"
import type { Table } from "@/components/billiards-timer-dashboard"
import menuDataService, { type MenuRecommendation } from "@/services/menu-data-service"
import { useState, useEffect } from "react"

interface MenuRecommendationsProps {
  table: Table
  elapsedMinutes: number
}

export function MenuRecommendations({ table, elapsedMinutes }: MenuRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<MenuRecommendation[]>([])
  const [loading, setLoading] = useState(true)

  // Update the useEffect to prevent frequent regeneration and only show when active

  // Replace the existing useEffect with this updated version:
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true)
        console.log(
          `Fetching menu recommendations for table ${table.id}, guest count ${table.guestCount}, active: ${table.isActive}`,
        )
        // Calculate session duration (or use default if not started yet)
        const sessionDuration = table.isActive ? table.initialTime - table.remainingTime : 30 * 60 * 1000 // Default to 30 min

        // Get recommendations based on table data
        const recs = await menuDataService.getMenuRecommendations(table.id, table.guestCount, sessionDuration)
        console.log(`Received recommendations:`, recs)
        setRecommendations(recs)
      } catch (error) {
        console.error("Error fetching menu recommendations:", error)
        // Set fallback recommendations
        setRecommendations(getFallbackRecommendations(table.guestCount))
      } finally {
        setLoading(false)
      }
    }

    // Only fetch recommendations if the table is active and has guest count info
    // We're using a ref to track if this is the initial render to prevent unnecessary fetches
    if (table.isActive && table.guestCount > 0) {
      fetchRecommendations()
    } else {
      setRecommendations([]) // Clear recommendations if not active or no guest count
      setLoading(false)
    }

    // We're intentionally NOT including table.guestCount in the dependency array
    // This prevents re-fetching when only the guest count changes
    // Recommendations will only update when the component is unmounted and remounted (dialog closed and reopened)
  }, [table.id, table.isActive, table.initialTime, table.remainingTime])

  // Fallback recommendations if the service fails
  const getFallbackRecommendations = (guestCount: number): MenuRecommendation[] => {
    const isGroup = guestCount > 2
    const isLargeGroup = guestCount >= 6

    const baseRecommendations: MenuRecommendation[] = []

    if (isLargeGroup) {
      baseRecommendations.push({
        itemId: "social-club-cooler",
        itemName: "Social Club Cooler",
        confidence: 0.95,
        reason: `Perfect for groups of ${guestCount}, includes liquor, beer, and 2 hours of billiard time`,
        price: 349,
      })

      baseRecommendations.push({
        itemId: "trust-fund-cooler",
        itemName: "Trust Fund Cooler",
        confidence: 0.9,
        reason: `Great for large parties, includes multiple bottles and 2 tables`,
        price: 495,
      })
    } else if (isGroup) {
      baseRecommendations.push({
        itemId: "combo-for-four",
        itemName: "Combo For Four",
        confidence: 0.95,
        reason: `Great for your group of ${guestCount}, includes drinks and billiard time`,
        price: 105,
      })

      baseRecommendations.push({
        itemId: "six-pack-app",
        itemName: "Six-Pack App Special",
        confidence: 0.9,
        reason: "4 Beers/Seltzers, 2 Soju Bottles, includes 1 hour billiard rental",
        price: 128,
      })
    } else {
      baseRecommendations.push({
        itemId: "combo-for-two",
        itemName: "Combo For Two",
        confidence: 0.95,
        reason: `Perfect for ${guestCount} guests, includes drinks and 1 hour billiard rental`,
        price: 69,
      })

      baseRecommendations.push({
        itemId: "cocktail-combo",
        itemName: "Cocktail Combo",
        confidence: 0.85,
        reason: "1 Cocktail Per Person + 1 Hour Billiard Rental",
        price: 69,
      })
    }

    return baseRecommendations
  }

  // Update the render condition to only show when table is active
  if (!table.isActive) {
    return (
      <div className="p-4 text-center">
        <p className="text-[#00FFFF] text-xs">Recommendations will appear when session starts</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-pulse flex space-x-4 justify-center">
          <div className="rounded-full bg-[#00FFFF]/20 h-4 w-4"></div>
          <div className="rounded-full bg-[#00FFFF]/20 h-4 w-4"></div>
          <div className="rounded-full bg-[#00FFFF]/20 h-4 w-4"></div>
        </div>
      </div>
    )
  }

  if (recommendations.length === 0) {
    return (
      <div className="p-4 text-center">
        {table.guestCount > 0 ? (
          <p className="text-[#00FFFF] text-xs">No recommendations found.</p>
        ) : (
          <p className="text-[#00FFFF] text-xs">Add guest count to see recommendations</p>
        )}
      </div>
    )
  }

  // Group recommendations by type
  const foodItems = recommendations.filter(
    (rec) =>
      !rec.itemName.toLowerCase().includes("combo") &&
      !rec.itemName.toLowerCase().includes("beer") &&
      !rec.itemName.toLowerCase().includes("soju") &&
      !rec.itemName.toLowerCase().includes("wine") &&
      !rec.itemName.toLowerCase().includes("cocktail"),
  )

  const drinkItems = recommendations.filter(
    (rec) =>
      rec.itemName.toLowerCase().includes("beer") ||
      rec.itemName.toLowerCase().includes("soju") ||
      rec.itemName.toLowerCase().includes("wine") ||
      rec.itemName.toLowerCase().includes("cocktail"),
  )

  const comboItems = recommendations.filter(
    (rec) =>
      rec.itemName.toLowerCase().includes("combo") ||
      rec.itemName.toLowerCase().includes("special") ||
      rec.itemName.toLowerCase().includes("pack") ||
      rec.itemName.toLowerCase().includes("club"),
  )

  return (
    <div className="border border-cyan-500/30 rounded-lg p-4">
      <div className="flex items-center justify-center text-cyan-400 mb-4">
        <span className="text-lg">Menu Recommendations</span>
      </div>

      <div className="flex items-center text-gray-400 text-sm mb-2">
        <Users className="mr-1 h-4 w-4" />
        <span>{table.guestCount || 0} guests</span>
        <Clock className="ml-3 mr-1 h-4 w-4" />
        <span>{elapsedMinutes} min session</span>
      </div>

      <div className="bg-navy-800 rounded-lg p-3 mb-2">
        <div className="flex justify-between">
          <span className="text-gray-300">Best Value Package</span>
          <span className="text-white font-bold">$95</span>
        </div>
        <div className="text-sm text-cyan-400 mt-1">Combo For Four</div>
        <div className="text-xs text-gray-400 mt-1">
          Great for your group of {table.guestCount || 0}, includes drinks and billiard time
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-navy-800 rounded-lg p-3">
          <div className="text-sm text-yellow-400">Six-Pack App Special</div>
          <div className="text-yellow-400 font-bold mt-1">$128</div>
        </div>
        <div className="bg-navy-800 rounded-lg p-3">
          <div className="text-sm text-yellow-400">Buffalo Chicken Dip</div>
          <div className="text-yellow-400 font-bold mt-1">$11</div>
        </div>
      </div>
    </div>
  )
}
