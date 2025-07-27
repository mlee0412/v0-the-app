import { NextResponse } from "next/server"

const API_KEY = process.env.OPEN_WEATHER_API_KEY || process.env.NEXT_PUBLIC_OPEN_WEATHER_API_KEY
const DEFAULT_LAT = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT || "40.7128")
const DEFAULT_LON = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LON || "-74.0060")

export async function GET(req: Request) {
  if (!API_KEY) {
    return NextResponse.json({ error: "API key missing" }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get("lat") || DEFAULT_LAT.toString())
  const lon = parseFloat(searchParams.get("lon") || DEFAULT_LON.toString())

  try {
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
    const currentRes = await fetch(currentUrl)
    if (!currentRes.ok) throw new Error("Failed to fetch current weather")
    const currentData = await currentRes.json()
    const current = {
      temp: currentData.main.temp,
      description: currentData.weather[0].description,
      icon: currentData.weather[0].icon,
    }

    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&cnt=6&appid=${API_KEY}`
    const forecastRes = await fetch(forecastUrl)
    if (!forecastRes.ok) throw new Error("Failed to fetch forecast")
    const forecastData = await forecastRes.json()
    const forecast = (forecastData.list || []).slice(0, 5).map((item: any) => ({
      time: item.dt,
      temp: item.main.temp,
      icon: item.weather[0].icon,
    }))

    return NextResponse.json({ current, forecast })
  } catch (err) {
    console.error("Weather API error", err)
    return NextResponse.json({ error: "Failed to fetch weather" }, { status: 500 })
  }
}
