"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface HiringAttritionChartProps {
  data: { month: string; hired: number; left: number }[];
}

const config: ChartConfig = {
  hired: { label: "Hired", color: "hsl(142 71% 45%)" },
  left: { label: "Left", color: "hsl(0 84% 60%)" },
};

export function HiringAttritionChart({ data }: HiringAttritionChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Hiring vs Attrition</CardTitle>
        <p className="text-xs text-muted-foreground">Last 6 months</p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="fillHired" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-hired)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-hired)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="fillLeft" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-left)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-left)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="hired"
                stroke="var(--color-hired)"
                strokeWidth={2}
                fill="url(#fillHired)"
              />
              <Area
                type="monotone"
                dataKey="left"
                stroke="var(--color-left)"
                strokeWidth={2}
                fill="url(#fillLeft)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
