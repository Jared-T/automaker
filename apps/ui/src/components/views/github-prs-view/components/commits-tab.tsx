import { useState, useEffect, useRef } from 'react';
import { GitCommit, Loader2, AlertCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { getElectronAPI, type PRCommit } from '@/lib/electron';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';
import { formatRelativeDate, getShortSha } from '../utils';

interface CommitsTabProps {
  prNumber: number;
}

export function CommitsTab({ prNumber }: CommitsTabProps) {
  const [commits, setCommits] = useState<PRCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentProject } = useAppStore();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchCommits = async () => {
      if (!currentProject?.path) return;

      setLoading(true);
      setError(null);

      try {
        const api = getElectronAPI();
        if (api.github?.getPRCommits) {
          const result = await api.github.getPRCommits(currentProject.path, prNumber);
          if (isMountedRef.current) {
            if (result.success) {
              setCommits(result.commits || []);
            } else {
              setError(result.error || 'Failed to fetch commits');
            }
          }
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to fetch commits');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchCommits();
  }, [prNumber, currentProject?.path]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading commits...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <GitCommit className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No commits found</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="text-sm text-muted-foreground mb-4">
        {commits.length} {commits.length === 1 ? 'commit' : 'commits'}
      </div>
      <div className="space-y-2">
        {commits.map((commit) => (
          <CommitRow key={commit.oid} commit={commit} />
        ))}
      </div>
    </div>
  );
}

interface CommitRowProps {
  commit: PRCommit;
}

function CommitRow({ commit }: CommitRowProps) {
  const statusIcon = commit.statusCheckRollup ? (
    commit.statusCheckRollup.state === 'SUCCESS' ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : commit.statusCheckRollup.state === 'FAILURE' ? (
      <XCircle className="h-4 w-4 text-red-500" />
    ) : commit.statusCheckRollup.state === 'PENDING' ? (
      <Clock className="h-4 w-4 text-yellow-500" />
    ) : (
      <AlertCircle className="h-4 w-4 text-muted-foreground" />
    )
  ) : null;

  // Handle various author structures from GitHub API
  const authorName = commit.author?.user?.login || commit.author?.name || 'Unknown';

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors">
      <GitCommit className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{commit.messageHeadline}</span>
          {statusIcon}
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
            {getShortSha(commit.oid)}
          </span>
          <span>{authorName}</span>
          <span>committed {formatRelativeDate(commit.committedDate)}</span>
        </div>
        {commit.messageBody && (
          <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
            {commit.messageBody}
          </p>
        )}
      </div>
    </div>
  );
}
