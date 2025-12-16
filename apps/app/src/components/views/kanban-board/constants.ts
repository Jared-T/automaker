import { AgentModel } from "@/store/app-store";
import {
  Brain,
  Zap,
  Scale,
  Cpu,
  Rocket,
  Sparkles,
} from "lucide-react";

export type ColumnId = "backlog" | "in_progress" | "waiting_approval" | "verified" | "completed";

export const COLUMNS: { id: ColumnId; title: string; colorClass: string }[] = [
  { id: "backlog", title: "Backlog", colorClass: "bg-[var(--status-backlog)]" },
  {
    id: "in_progress",
    title: "In Progress",
    colorClass: "bg-[var(--status-in-progress)]",
  },
  {
    id: "waiting_approval",
    title: "Waiting Approval",
    colorClass: "bg-[var(--status-waiting)]",
  },
  {
    id: "verified",
    title: "Verified",
    colorClass: "bg-[var(--status-success)]",
  },
];

export type ModelOption = {
  id: AgentModel;
  label: string;
  description: string;
  badge?: string;
  provider: "claude";
};

export const CLAUDE_MODELS: ModelOption[] = [
  {
    id: "haiku",
    label: "Claude Haiku",
    description: "Fast and efficient for simple tasks.",
    badge: "Speed",
    provider: "claude",
  },
  {
    id: "sonnet",
    label: "Claude Sonnet",
    description: "Balanced performance with strong reasoning.",
    badge: "Balanced",
    provider: "claude",
  },
  {
    id: "opus",
    label: "Claude Opus",
    description: "Most capable model for complex work.",
    badge: "Premium",
    provider: "claude",
  },
];

// Profile icon mapping
export const PROFILE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  Brain,
  Zap,
  Scale,
  Cpu,
  Rocket,
  Sparkles,
};
