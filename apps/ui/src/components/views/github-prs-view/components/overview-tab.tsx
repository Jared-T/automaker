import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';
import type { GitHubPR } from '@/lib/electron';
import { formatDate, getReviewStatus } from '../utils';

interface OverviewTabProps {
  pr: GitHubPR;
  onOpenInGitHub: (url: string) => void;
}

export function OverviewTab({ pr, onOpenInGitHub }: OverviewTabProps) {
  const reviewStatus = getReviewStatus(pr);

  return (
    <div className="p-6 space-y-6">
      {/* Title */}
      <h1 className="text-xl font-bold">{pr.title}</h1>

      {/* Meta info */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            pr.state === 'MERGED'
              ? 'bg-purple-500/10 text-purple-500'
              : pr.isDraft
                ? 'bg-muted text-muted-foreground'
                : 'bg-green-500/10 text-green-500'
          )}
        >
          {pr.state === 'MERGED' ? 'Merged' : pr.isDraft ? 'Draft' : 'Open'}
        </span>
        {reviewStatus && (
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              reviewStatus.bg,
              reviewStatus.color
            )}
          >
            {reviewStatus.label}
          </span>
        )}
        <span>
          #{pr.number} opened {formatDate(pr.createdAt)} by{' '}
          <span className="font-medium text-foreground">{pr.author.login}</span>
        </span>
      </div>

      {/* Branch info */}
      {pr.headRefName && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Branch:</span>
          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{pr.headRefName}</span>
        </div>
      )}

      {/* Labels */}
      {pr.labels.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {pr.labels.map((label) => (
            <span
              key={label.name}
              className="px-2 py-0.5 text-xs font-medium rounded-full"
              style={{
                backgroundColor: `#${label.color}20`,
                color: `#${label.color}`,
                border: `1px solid #${label.color}40`,
              }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Body */}
      {pr.body ? (
        <Markdown className="text-sm">{pr.body}</Markdown>
      ) : (
        <p className="text-sm text-muted-foreground italic">No description provided.</p>
      )}

      {/* Open in GitHub CTA */}
      <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-sm text-muted-foreground mb-3">
          View code changes, comments, and reviews on GitHub.
        </p>
        <Button onClick={() => onOpenInGitHub(pr.url)}>
          <ExternalLink className="h-4 w-4 mr-2" />
          View Full PR on GitHub
        </Button>
      </div>
    </div>
  );
}
