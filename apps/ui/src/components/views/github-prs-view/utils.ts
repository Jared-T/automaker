import type { GitHubPR } from '@/lib/electron';
import type { ReviewStatus } from './types';

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

export function getReviewStatus(pr: GitHubPR): ReviewStatus | null {
  if (pr.isDraft) {
    return { label: 'Draft', color: 'text-muted-foreground', bg: 'bg-muted' };
  }
  switch (pr.reviewDecision) {
    case 'APPROVED':
      return { label: 'Approved', color: 'text-green-500', bg: 'bg-green-500/10' };
    case 'CHANGES_REQUESTED':
      return { label: 'Changes requested', color: 'text-orange-500', bg: 'bg-orange-500/10' };
    case 'REVIEW_REQUIRED':
      return { label: 'Review required', color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
    default:
      return null;
  }
}

export function getShortSha(sha: string): string {
  return sha.substring(0, 7);
}

export function getFileChangeIcon(changeType: string): {
  icon: 'added' | 'modified' | 'deleted' | 'renamed';
  color: string;
} {
  switch (changeType.toUpperCase()) {
    case 'ADDED':
      return { icon: 'added', color: 'text-green-500' };
    case 'DELETED':
      return { icon: 'deleted', color: 'text-red-500' };
    case 'RENAMED':
    case 'COPIED':
      return { icon: 'renamed', color: 'text-blue-500' };
    case 'MODIFIED':
    default:
      return { icon: 'modified', color: 'text-amber-500' };
  }
}
