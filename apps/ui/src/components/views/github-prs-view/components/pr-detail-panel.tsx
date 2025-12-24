import { useState } from 'react';
import { GitPullRequest, GitMerge, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { PRDetailPanelProps } from '../types';
import { OverviewTab } from './overview-tab';
import { CommitsTab } from './commits-tab';
import { FilesTab } from './files-tab';
import { ActivityTab } from './activity-tab';

export function PRDetailPanel({ pr, onClose, onOpenInGitHub }: PRDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Detail Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          {pr.state === 'MERGED' ? (
            <GitMerge className="h-4 w-4 text-purple-500 flex-shrink-0" />
          ) : (
            <GitPullRequest className="h-4 w-4 text-green-500 flex-shrink-0" />
          )}
          <span className="text-sm font-medium truncate">
            #{pr.number} {pr.title}
          </span>
          {pr.isDraft && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-muted text-muted-foreground">
              Draft
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenInGitHub(pr.url)}>
            <ExternalLink className="h-4 w-4 mr-1" />
            Open in GitHub
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start px-4 pt-2 bg-transparent border-b border-border rounded-none h-auto gap-0">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2 px-3"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="commits"
            className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2 px-3"
          >
            Commits
          </TabsTrigger>
          <TabsTrigger
            value="files"
            className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2 px-3"
          >
            Files Changed
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2 px-3"
          >
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex-1 overflow-auto mt-0">
          <OverviewTab pr={pr} onOpenInGitHub={onOpenInGitHub} />
        </TabsContent>

        <TabsContent value="commits" className="flex-1 overflow-auto mt-0">
          <CommitsTab prNumber={pr.number} />
        </TabsContent>

        <TabsContent value="files" className="flex-1 overflow-auto mt-0">
          <FilesTab prNumber={pr.number} />
        </TabsContent>

        <TabsContent value="activity" className="flex-1 overflow-auto mt-0">
          <ActivityTab prNumber={pr.number} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
