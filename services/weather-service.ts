"use client"

const DEFAULT_LAT = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT || "40.7128")
const DEFAULT_LON = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LON || "-74.0060")

export interface CurrentWeather {
  temp: number
  description: string
  icon: string
}

export interface HourlyForecast {
  time: number
  temp: number
  icon: string
}

class WeatherService {
  private async fetchWeather(lat: number, lon: number) {
    try {
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      if (!res.ok) throw new Error("Failed to fetch weather")
      return (await res.json()) as { current: CurrentWeather; forecast: HourlyForecast[] }
    } catch (err) {
      console.error("weatherService:fetchWeather", err)
      return null
    }
  }

  async getCurrentWeather(lat: number = DEFAULT_LAT, lon: number = DEFAULT_LON): Promise<CurrentWeather | null> {
    const data = await this.fetchWeather(lat, lon)
    return data ? data.current : null
  }

  async getHourlyForecast(lat: number = DEFAULT_LAT, lon: number = DEFAULT_LON): Promise<HourlyForecast[]> {
    const data = await this.fetchWeather(lat, lon)
    return data ? data.forecast : []
  }
}

const weatherService = new WeatherService()
export default weatherService
