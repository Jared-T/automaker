import type { GitHubPR } from '@/lib/electron';

export interface PRRowProps {
  pr: GitHubPR;
  isSelected: boolean;
  onClick: () => void;
  onOpenExternal: () => void;
}

export interface PRDetailPanelProps {
  pr: GitHubPR;
  onClose: () => void;
  onOpenInGitHub: (url: string) => void;
}

export interface PRsListHeaderProps {
  openCount: number;
  mergedCount: number;
  refreshing: boolean;
  onRefresh: () => void;
}

export interface ReviewStatus {
  label: string;
  color: string;
  bg: string;
}
