"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LogEntry } from "@/components/system/billiards-timer-dashboard";
import { isToday } from "date-fns";

interface TodaysReservationsCardProps {
  logs: LogEntry[];
}

export function TodaysReservationsCard({ logs }: TodaysReservationsCardProps) {
  const count = useMemo(
    () => logs.filter((log) => log.action === "reservation" && isToday(log.timestamp)).length,
    [logs]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Reservations</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{count}</p>
      </CardContent>
    </Card>
  );
}

export default TodaysReservationsCard;
