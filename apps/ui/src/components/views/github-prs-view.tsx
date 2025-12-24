import { useState, useCallback } from 'react';
import { GitPullRequest, Loader2, RefreshCw } from 'lucide-react';
import { getElectronAPI, type GitHubPR } from '@/lib/electron';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useGithubPRs } from './github-prs-view/hooks';
import { PRRow, PRsListHeader, PRDetailPanel } from './github-prs-view/components';

export function GitHubPRsView() {
  const { openPRs, mergedPRs, loading, refreshing, error, refresh } = useGithubPRs();
  const [selectedPR, setSelectedPR] = useState<GitHubPR | null>(null);

  const handleOpenInGitHub = useCallback((url: string) => {
    const api = getElectronAPI();
    api.openExternalLink(url);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
        <div className="p-4 rounded-full bg-destructive/10 mb-4">
          <GitPullRequest className="h-12 w-12 text-destructive" />
        </div>
        <h2 className="text-lg font-medium mb-2">Failed to Load Pull Requests</h2>
        <p className="text-muted-foreground max-w-md mb-4">{error}</p>
        <Button variant="outline" onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  const totalPRs = openPRs.length + mergedPRs.length;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* PR List */}
      <div
        className={cn(
          'flex flex-col overflow-hidden border-r border-border',
          selectedPR ? 'w-80' : 'flex-1'
        )}
      >
        <PRsListHeader
          openCount={openPRs.length}
          mergedCount={mergedPRs.length}
          refreshing={refreshing}
          onRefresh={refresh}
        />

        {/* PR List */}
        <div className="flex-1 overflow-auto">
          {totalPRs === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <GitPullRequest className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-base font-medium mb-2">No Pull Requests</h2>
              <p className="text-sm text-muted-foreground">
                This repository has no pull requests yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Open PRs */}
              {openPRs.map((pr) => (
                <PRRow
                  key={pr.number}
                  pr={pr}
                  isSelected={selectedPR?.number === pr.number}
                  onClick={() => setSelectedPR(pr)}
                  onOpenExternal={() => handleOpenInGitHub(pr.url)}
                />
              ))}

              {/* Merged PRs Section */}
              {mergedPRs.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-muted/30 text-xs font-medium text-muted-foreground">
                    Merged ({mergedPRs.length})
                  </div>
                  {mergedPRs.map((pr) => (
                    <PRRow
                      key={pr.number}
                      pr={pr}
                      isSelected={selectedPR?.number === pr.number}
                      onClick={() => setSelectedPR(pr)}
                      onOpenExternal={() => handleOpenInGitHub(pr.url)}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PR Detail Panel */}
      {selectedPR && (
        <PRDetailPanel
          pr={selectedPR}
          onClose={() => setSelectedPR(null)}
          onOpenInGitHub={handleOpenInGitHub}
        />
      )}
    </div>
  );
}
