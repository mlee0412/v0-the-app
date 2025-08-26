"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Table } from "@/components/system/billiards-timer-dashboard";

interface AverageSessionCardProps {
  tables: Table[];
}

export function AverageSessionCard({ tables }: AverageSessionCardProps) {
  const averageMinutes = useMemo(() => {
    const active = tables.filter((t) => t.isActive && t.startTime);
    if (active.length === 0) return 0;
    const total = active.reduce((sum, t) => sum + (Date.now() - (t.startTime || 0)), 0);
    return Math.round(total / active.length / 60000);
  }, [tables]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Avg. Session</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{averageMinutes} min</p>
      </CardContent>
    </Card>
  );
}

export default AverageSessionCard;
