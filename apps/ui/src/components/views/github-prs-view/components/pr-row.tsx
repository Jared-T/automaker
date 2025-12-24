import { GitPullRequest, GitMerge, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PRRowProps } from '../types';
import { formatDate, getReviewStatus } from '../utils';

export function PRRow({ pr, isSelected, onClick, onOpenExternal }: PRRowProps) {
  const reviewStatus = getReviewStatus(pr);

  return (
    <div
      className={cn(
        'group flex items-start gap-3 p-3 cursor-pointer hover:bg-accent/50 transition-colors',
        isSelected && 'bg-accent'
      )}
      onClick={onClick}
    >
      {pr.state === 'MERGED' ? (
        <GitMerge className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
      ) : (
        <GitPullRequest className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{pr.title}</span>
          {pr.isDraft && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-muted text-muted-foreground flex-shrink-0">
              Draft
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-muted-foreground">
            #{pr.number} opened {formatDate(pr.createdAt)} by {pr.author.login}
          </span>
          {pr.headRefName && (
            <span className="text-xs text-muted-foreground font-mono bg-muted px-1 rounded">
              {pr.headRefName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {/* Review Status */}
          {reviewStatus && (
            <span
              className={cn(
                'px-1.5 py-0.5 text-[10px] font-medium rounded',
                reviewStatus.bg,
                reviewStatus.color
              )}
            >
              {reviewStatus.label}
            </span>
          )}

          {/* Labels */}
          {pr.labels.map((label) => (
            <span
              key={label.name}
              className="px-1.5 py-0.5 text-[10px] font-medium rounded-full"
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
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="flex-shrink-0 opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onOpenExternal();
        }}
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
