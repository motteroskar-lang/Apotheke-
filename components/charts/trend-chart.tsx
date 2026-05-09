"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";

interface DataPoint {
  date: string;
  value: number;
  label?: string;
}

interface TrendChartProps {
  data: DataPoint[];
  color?: string;
  height?: number;
  unit?: string;
  referenceValue?: number;
  referenceLabel?: string;
  movingAverage?: boolean;
}

function movingAvg(data: DataPoint[], window: number): DataPoint[] {
  return data.map((d, i) => {
    const slice = data.slice(Math.max(0, i - window + 1), i + 1);
    const avg = slice.reduce((a, b) => a + b.value, 0) / slice.length;
    return { ...d, value: Math.round(avg * 10) / 10 };
  });
}

export function TrendChart({
  data,
  color = "#3B82F6",
  height = 180,
  unit = "",
  referenceValue,
  referenceLabel,
  movingAverage: showMA = false,
}: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-apex-text-disabled text-xs" style={{ height }}>
        No data yet
      </div>
    );
  }

  const maData = showMA ? movingAvg(data, 7) : null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="#27272A" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => {
            try { return format(parseISO(v), "MMM d"); } catch { return v; }
          }}
          tick={{ fontSize: 10, fill: "#52525B" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#52525B" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}${unit}`}
        />
        <Tooltip
          content={({ payload, label }) => {
            if (!payload?.[0]) return null;
            let dateLabel = label;
            try { dateLabel = format(parseISO(label), "MMM d, yyyy"); } catch {}
            return (
              <div className="bg-zinc-900 border border-apex-border rounded-md px-3 py-2 shadow-xl">
                <p className="text-2xs text-apex-text-muted mb-1">{dateLabel}</p>
                <p className="font-mono text-sm text-apex-text-primary">
                  {payload[0].value}{unit}
                </p>
              </div>
            );
          }}
        />
        {referenceValue !== undefined && (
          <ReferenceLine
            y={referenceValue}
            stroke="#52525B"
            strokeDasharray="3 3"
            label={{ value: referenceLabel, fill: "#52525B", fontSize: 10 }}
          />
        )}
        {showMA && maData && (
          <Line
            data={maData}
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1}
            strokeOpacity={0.3}
            dot={false}
            isAnimationActive={false}
          />
        )}
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: color, stroke: "transparent" }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
