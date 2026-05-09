import { Domain, DomainSignal, Trend } from "@/types/domain";

interface SignalInput {
  domain: Domain;
  dataPoints: number[];
  scores: number[];
  recentTrend?: number[];
}

export function computeSignalStrength(input: SignalInput): number {
  const { scores, dataPoints } = input;
  if (scores.length === 0 || dataPoints.every((d) => d === 0)) return 0;

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const dataCompleteness = Math.min(
    dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length,
    100
  );

  return Math.round(avg * 0.7 + dataCompleteness * 0.3);
}

export function computeTrend(values: number[]): Trend {
  if (values.length < 2) return "insufficient_data";
  const recent = values.slice(-7);
  const older = values.slice(-14, -7);
  if (recent.length === 0 || older.length === 0) return "insufficient_data";

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  const delta = recentAvg - olderAvg;

  if (delta > 3) return "improving";
  if (delta < -3) return "declining";
  return "stable";
}

export function computeDataConfidence(
  logsInPeriod: number,
  expectedLogs: number
): number {
  if (expectedLogs === 0) return 0;
  return Math.min(Math.round((logsInPeriod / expectedLogs) * 100), 100);
}

export function computeCompoundProjection(
  currentValue: number,
  monthlyContribution: number,
  annualReturnPct: number,
  years: number
): number {
  const monthlyRate = annualReturnPct / 100 / 12;
  let value = currentValue;
  for (let m = 0; m < years * 12; m++) {
    value = value * (1 + monthlyRate) + monthlyContribution;
  }
  return Math.round(value);
}

export function buildMockSignal(domain: Domain): DomainSignal {
  const mockData: Record<Domain, DomainSignal> = {
    physical: {
      domain: "physical",
      strength: 78,
      confidence: 85,
      trend: "improving",
      keyMetric: "5/5 sessions this week",
    },
    mental: {
      domain: "mental",
      strength: 62,
      confidence: 70,
      trend: "stable",
      keyMetric: "14h deep work this week",
    },
    financial: {
      domain: "financial",
      strength: 88,
      confidence: 90,
      trend: "improving",
      keyMetric: "Savings rate 42%",
    },
    skills: {
      domain: "skills",
      strength: 45,
      confidence: 55,
      trend: "insufficient_data",
      keyMetric: "3 skills tracked",
    },
    discipline: {
      domain: "discipline",
      strength: 72,
      confidence: 80,
      trend: "stable",
      keyMetric: "Habit integrity 86%",
    },
    vision: {
      domain: "vision",
      strength: 55,
      confidence: 60,
      trend: "stable",
      keyMetric: "4 active goals",
    },
  };
  return mockData[domain];
}
