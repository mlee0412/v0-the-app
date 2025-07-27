"use client"

const DEFAULT_LAT = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT || "40.7128")
const DEFAULT_LON = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LON || "-74.0060")

export interface CurrentWeather {
  temp: number
  feels_like: number
  description: string
  humidity: number
  wind_speed: number
  icon: string
}

export interface HourlyForecast {
  time: number
  temp: number
  description: string
  icon: string
}

class WeatherService {
  async getWeather(
    lat: number = DEFAULT_LAT,
    lon: number = DEFAULT_LON,
  ): Promise<{ current: CurrentWeather; forecast: HourlyForecast[] } | { error: string }> {
    try {
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || res.statusText)
      return data as { current: CurrentWeather; forecast: HourlyForecast[] }
    } catch (err) {
      console.error("weatherService:getWeather", err)
      const msg = err instanceof Error ? err.message : "fetch failed"
      return { error: msg }
    }
  }
}

const weatherService = new WeatherService()
export default weatherService

