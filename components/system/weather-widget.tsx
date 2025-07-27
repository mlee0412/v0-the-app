"use client"

import { useEffect, useState } from "react"
import { Sun, CloudRain, Cloud } from "lucide-react"
import weatherService, { type CurrentWeather, type HourlyForecast } from "@/services/weather-service"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"

function getIconComponent(icon: string) {
  const code = icon.slice(0, 2)
  if (["09", "10", "11"].includes(code)) return CloudRain
  if (["02", "03", "04"].includes(code)) return Cloud
  return Sun
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<CurrentWeather | null>(null)
  const [forecast, setForecast] = useState<HourlyForecast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const data = await weatherService.getWeather()
      if ('error' in data) {
        setError(data.error)
        setWeather(null)
        setForecast([])
      } else {
        setError(null)
        setWeather(data.current)
        setForecast(data.forecast)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const Icon = weather ? getIconComponent(weather.icon) : Sun

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="bg-black border border-cyan-500 rounded-md px-2 py-1 shadow-lg shadow-cyan-500/20 flex items-center space-x-1 cursor-pointer">
          {loading ? (
            <Spinner className="h-4 w-4 text-cyan-400" />
          ) : weather ? (
            <>
              <Icon className="h-4 w-4 text-yellow-400" />
              <span className="text-sm text-cyan-400">{Math.round(weather.temp)}°C</span>
            </>
          ) : (
            <span className="text-xs text-gray-400">{error ?? 'Weather unavailable'}</span>
          )}
        </div>
      </PopoverTrigger>
      {(weather || forecast.length > 0) && (
        <PopoverContent side="bottom" className="w-56">
          <div className="text-xs space-y-1">
            {weather && (
              <>
                <div className="font-medium capitalize flex items-center space-x-1">
                  <Icon className="h-3 w-3 text-yellow-400" />
                  <span>{weather.description}</span>
                </div>
                <div>Feels like {Math.round(weather.feels_like)}°C</div>
                <div>Humidity {weather.humidity}% | Wind {Math.round(weather.wind_speed)} m/s</div>
                {forecast.length > 0 && <hr className="border-t border-cyan-700" />}
              </>
            )}
            {forecast.map((f, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span>{new Date(f.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="capitalize">{Math.round(f.temp)}°C {f.description}</span>
              </div>
            ))}
          </div>
        </PopoverContent>
      )}
    </Popover>
  )
}
