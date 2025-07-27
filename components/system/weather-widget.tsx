"use client"

import { useEffect, useState } from "react"
import { Sun, CloudRain, Cloud } from "lucide-react"
import weatherService, { type CurrentWeather, type HourlyForecast } from "@/services/weather-service"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Spinner } from "@/components/ui/spinner"

function getIconComponent(icon: string) {
  if (icon.includes("rain")) return CloudRain
  if (icon.includes("cloud")) return Cloud
  return Sun
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<CurrentWeather | null>(null)
  const [forecast, setForecast] = useState<HourlyForecast[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const current = await weatherService.getCurrentWeather()
      const hourly = await weatherService.getHourlyForecast()
      setWeather(current)
      setForecast(hourly)
      setLoading(false)
    }
    fetchData()
  }, [])

  const Icon = weather ? getIconComponent(weather.icon) : Sun

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="bg-black border border-cyan-500 rounded-md px-2 py-1 shadow-lg shadow-cyan-500/20 flex items-center space-x-1 cursor-default">
            {loading ? (
              <Spinner className="h-4 w-4 text-cyan-400" />
            ) : weather ? (
              <>
                <Icon className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-cyan-400">{Math.round(weather.temp)}°C</span>
              </>
            ) : (
              <span className="text-xs text-gray-400">N/A</span>
            )}
          </div>
        </TooltipTrigger>
        {forecast.length > 0 && (
          <TooltipContent side="bottom">
            <div className="text-xs space-y-1">
              {forecast.map((f, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span>{new Date(f.time * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <span>{Math.round(f.temp)}°C</span>
                </div>
              ))}
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}
