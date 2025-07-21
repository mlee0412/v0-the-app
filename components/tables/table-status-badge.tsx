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
  drinks: <Beer className="h-5 w-5 text-orange-400 drop-shadow" />,
  food: <Utensils className="h-5 w-5 text-yellow-400 drop-shadow" />,
  service: <Bell className="h-5 w-5 text-blue-400 drop-shadow" />,
  clean: <SprayCan className="h-5 w-5 text-green-400 drop-shadow" />,
  reservation: <CalendarCheck className="h-5 w-5 text-purple-400 drop-shadow" />,
  paid: <DollarSign className="h-5 w-5 text-green-300 drop-shadow" />,
  under21: <Baby className="h-5 w-5 text-pink-300 drop-shadow" />,
  noExtension: <Ban className="h-5 w-5 text-red-500 drop-shadow" />,
  sensitive: <Angry className="h-5 w-5 text-red-400 drop-shadow" />,
  vip: <Star className="h-5 w-5 text-yellow-400 drop-shadow" />,
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
