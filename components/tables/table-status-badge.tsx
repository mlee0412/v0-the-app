"use client"

import React from "react"
import {
  Beer,
  Utensils,
  Bell,
  SprayCan,
  CalendarCheck,
  DollarSign,
  Baby,
  Ban,
  Angry,
  Star,
} from "lucide-react"

interface TableStatusBadgeProps {
  statuses?: string[]
}

const statusIconMap: Record<string, React.ReactNode> = {
  drinks: <Beer className="h-4 w-4 text-orange-400" />,
  food: <Utensils className="h-4 w-4 text-yellow-400" />,
  service: <Bell className="h-4 w-4 text-blue-400" />,
  clean: <SprayCan className="h-4 w-4 text-green-400" />,
  reservation: <CalendarCheck className="h-4 w-4 text-purple-400" />,
  paid: <DollarSign className="h-4 w-4 text-green-300" />,
  under21: <Baby className="h-4 w-4 text-pink-300" />,
  noExtension: <Ban className="h-4 w-4 text-red-500" />,
  sensitive: <Angry className="h-4 w-4 text-red-400" />,
  vip: <Star className="h-4 w-4 text-yellow-400" />,
}

export function TableStatusBadge({ statuses = [] }: TableStatusBadgeProps) {
  const active = statuses.filter((s) => statusIconMap[s])
  if (active.length === 0) return null
  return (
    <div className="flex gap-1">
      {active.map((s) => (
        <span key={s}>{statusIconMap[s]}</span>
      ))}
    </div>
  )
}
