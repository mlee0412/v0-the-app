"use client"

const API_KEY = process.env.NEXT_PUBLIC_OPEN_WEATHER_API_KEY || ""
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
  async getCurrentWeather(lat: number = DEFAULT_LAT, lon: number = DEFAULT_LON): Promise<CurrentWeather | null> {
    if (!API_KEY) {
      console.warn("OpenWeather API key not configured")
      return null
    }
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to fetch weather")
      const data = await res.json()
      return {
        temp: data.main.temp,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
      }
    } catch (err) {
      console.error("WeatherService:getCurrentWeather", err)
      return null
    }
  }

  async getHourlyForecast(lat: number = DEFAULT_LAT, lon: number = DEFAULT_LON): Promise<HourlyForecast[]> {
    if (!API_KEY) return []
    try {
      const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&cnt=6&appid=${API_KEY}`
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to fetch forecast")
      const data = await res.json()
      const list = (data.list || []) as any[]
      return list.slice(0, 5).map((item) => ({
        time: item.dt,
        temp: item.main.temp,
        icon: item.weather[0].icon,
      }))
    } catch (err) {
      console.error("WeatherService:getHourlyForecast", err)
      return []
    }
  }
}

const weatherService = new WeatherService()
export default weatherService
