"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeatherWidget } from "@/components/system/weather-widget";

export function WeatherCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weather</CardTitle>
      </CardHeader>
      <CardContent>
        <WeatherWidget />
      </CardContent>
    </Card>
  );
}

export default WeatherCard;
