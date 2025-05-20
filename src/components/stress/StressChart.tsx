"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, LabelList } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { ChartConfig } from "@/components/ui/chart" // Assuming ChartConfig is exported from chart.tsx

interface StressChartProps {
  stressLevel: number; // 0-100
}

export function StressChart({ stressLevel }: StressChartProps) {
  const chartData = [{ name: "Current Stress", level: stressLevel }];

  let barColor = "hsl(var(--chart-1))"; // Default blue
  let stressCategory = "Moderate";

  if (stressLevel < 30) {
    barColor = "hsl(var(--chart-2))"; // Green for low stress
    stressCategory = "Low";
  } else if (stressLevel > 70) {
    barColor = "hsl(var(--chart-3))"; // Red for high stress
    stressCategory = "High";
  } else if (stressLevel > 50) {
    barColor = "hsl(var(--chart-4))"; // Yellow for medium-high stress
    stressCategory = "Medium-High";
  }


  const chartConfig = {
    level: {
      label: "Stress Level",
      color: barColor,
    },
  } satisfies ChartConfig;


  return (
    <Card className="shadow-lg w-full">
      <CardHeader>
        <CardTitle>Stress Level Visualization</CardTitle>
        <CardDescription>Current estimated stress level: <span style={{ color: barColor, fontWeight: 'bold' }}>{stressCategory} ({stressLevel}%)</span></CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ height: '200px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <YAxis type="category" dataKey="name" hide />
              <Bar dataKey="level" radius={[0, 4, 4, 0]} barSize={40}>
                <LabelList dataKey="level" position="right" formatter={(value: number) => `${value}%`} offset={10} style={{ fill: 'hsl(var(--foreground))' }}/>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
