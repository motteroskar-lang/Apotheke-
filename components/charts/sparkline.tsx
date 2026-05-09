"use client";

import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

export function Sparkline({ data, color = "#3B82F6", height = 32 }: SparklineProps) {
  const chartData = data.map((v, i) => ({ value: v, index: i }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip
          content={({ payload }) => {
            if (!payload?.[0]) return null;
            return (
              <div className="bg-zinc-800 border border-apex-border rounded px-2 py-1 text-xs font-mono text-apex-text-primary">
                {payload[0].value}
              </div>
            );
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
