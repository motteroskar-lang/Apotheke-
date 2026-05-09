export type Domain =
  | "physical"
  | "mental"
  | "financial"
  | "skills"
  | "discipline"
  | "vision";

export type Trend = "improving" | "stable" | "declining" | "insufficient_data";
export type Horizon = "life" | "decade" | "annual" | "quarterly" | "monthly";
export type GoalStatus = "active" | "achieved" | "abandoned" | "deferred";

export interface DomainSignal {
  domain: Domain;
  strength: number;        // 0–100
  confidence: number;      // 0–100 (data completeness)
  trend: Trend;
  keyMetric: string;       // e.g. "18h deep work this week"
  alert?: string;          // e.g. "Sleep avg 5.8h — recovery compromised"
}

export interface DomainMeta {
  id: Domain;
  label: string;
  color: string;
  href: string;
  icon: string;
}

export const DOMAIN_META: DomainMeta[] = [
  { id: "physical",   label: "Physical",   color: "#3B82F6", href: "/physical",   icon: "activity" },
  { id: "mental",     label: "Mental",     color: "#A855F7", href: "/mental",     icon: "brain" },
  { id: "financial",  label: "Financial",  color: "#22C55E", href: "/financial",  icon: "trending-up" },
  { id: "skills",     label: "Skills",     color: "#F59E0B", href: "/skills",     icon: "layers" },
  { id: "discipline", label: "Discipline", color: "#EF4444", href: "/discipline", icon: "shield" },
  { id: "vision",     label: "Vision",     color: "#06B6D4", href: "/vision",     icon: "target" },
];
