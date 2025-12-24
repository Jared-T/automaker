import { GitPullRequest, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PRsListHeaderProps } from '../types';

export function PRsListHeader({
  openCount,
  mergedCount,
  refreshing,
  onRefresh,
}: PRsListHeaderProps) {
  const totalPRs = openCount + mergedCount;

  return (
    <div className="flex items-center justify-between p-4 border-b border-border">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-500/10">
          <GitPullRequest className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <h1 className="text-lg font-bold">Pull Requests</h1>
          <p className="text-xs text-muted-foreground">
            {totalPRs === 0 ? 'No pull requests found' : `${openCount} open, ${mergedCount} merged`}
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
        <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
      </Button>
    </div>
  );
}
