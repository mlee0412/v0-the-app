"use client";

import { TodaysReservationsCard } from "@/components/dashboard/todays-reservations-card";
import { WeatherCard } from "@/components/dashboard/weather-card";
import { AverageSessionCard } from "@/components/dashboard/average-session-card";
import { useSupabaseData } from "@/hooks/use-supabase-data";

export function DashboardView() {
  const { logs, tables } = useSupabaseData();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <TodaysReservationsCard logs={logs} />
      <WeatherCard />
      <AverageSessionCard tables={tables} />
    </div>
  );
}

export default DashboardView;
