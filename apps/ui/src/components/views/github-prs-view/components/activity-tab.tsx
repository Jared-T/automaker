import { useState, useEffect, useRef } from 'react';
import {
  Loader2,
  AlertCircle,
  MessageSquare,
  GitCommit,
  Tag,
  GitMerge,
  UserPlus,
  GitBranch,
  CheckCircle2,
  XCircle,
  MessageCircle,
} from 'lucide-react';
import { getElectronAPI, type PRActivityEvent } from '@/lib/electron';
import { useAppStore } from '@/store/app-store';
import { Markdown } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';
import { formatRelativeDate, getShortSha } from '../utils';

interface ActivityTabProps {
  prNumber: number;
}

export function ActivityTab({ prNumber }: ActivityTabProps) {
  const [events, setEvents] = useState<PRActivityEvent[]>([]);
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
    const fetchActivity = async () => {
      if (!currentProject?.path) return;

      setLoading(true);
      setError(null);

      try {
        const api = getElectronAPI();
        if (api.github?.getPRActivity) {
          const result = await api.github.getPRActivity(currentProject.path, prNumber);
          if (isMountedRef.current) {
            if (result.success) {
              setEvents(result.events || []);
            } else {
              setError(result.error || 'Failed to fetch activity');
            }
          }
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to fetch activity');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchActivity();
  }, [prNumber, currentProject?.path]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading activity...</span>
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

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No activity found</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

        {/* Events */}
        <div className="space-y-4">
          {events.map((event) => (
            <ActivityEventRow key={event.id} event={event} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ActivityEventRowProps {
  event: PRActivityEvent;
}

function ActivityEventRow({ event }: ActivityEventRowProps) {
  const { icon, iconBg, title, content } = getEventDisplay(event);

  return (
    <div className="relative flex gap-4 pl-8">
      {/* Icon */}
      <div
        className={cn(
          'absolute left-0 w-8 h-8 rounded-full flex items-center justify-center',
          iconBg
        )}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{event.actor.login}</span>
          <span className="text-muted-foreground">{title}</span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeDate(event.createdAt)}
          </span>
        </div>

        {content && <div className="mt-2">{content}</div>}
      </div>
    </div>
  );
}

function getEventDisplay(event: PRActivityEvent): {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  content: React.ReactNode;
} {
  switch (event.type) {
    case 'comment':
      return {
        icon: <MessageSquare className="w-4 h-4 text-blue-500" />,
        iconBg: 'bg-blue-500/20',
        title: 'commented',
        content: event.body ? (
          <div className="p-3 rounded-lg border border-border bg-card">
            <Markdown className="text-sm">{event.body}</Markdown>
          </div>
        ) : null,
      };

    case 'review':
      const reviewIcon =
        event.reviewState === 'APPROVED' ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : event.reviewState === 'CHANGES_REQUESTED' ? (
          <XCircle className="w-4 h-4 text-orange-500" />
        ) : (
          <MessageCircle className="w-4 h-4 text-purple-500" />
        );

      const reviewBg =
        event.reviewState === 'APPROVED'
          ? 'bg-green-500/20'
          : event.reviewState === 'CHANGES_REQUESTED'
            ? 'bg-orange-500/20'
            : 'bg-purple-500/20';

      const reviewTitle =
        event.reviewState === 'APPROVED'
          ? 'approved'
          : event.reviewState === 'CHANGES_REQUESTED'
            ? 'requested changes'
            : 'reviewed';

      return {
        icon: reviewIcon,
        iconBg: reviewBg,
        title: reviewTitle,
        content: event.body ? (
          <div className="p-3 rounded-lg border border-border bg-card">
            <Markdown className="text-sm">{event.body}</Markdown>
          </div>
        ) : null,
      };

    case 'commit':
      return {
        icon: <GitCommit className="w-4 h-4 text-muted-foreground" />,
        iconBg: 'bg-muted',
        title: 'added a commit',
        content: event.commitSha ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
              {getShortSha(event.commitSha)}
            </span>
            {event.commitMessage && (
              <span className="text-muted-foreground truncate">{event.commitMessage}</span>
            )}
          </div>
        ) : null,
      };

    case 'labeled':
      return {
        icon: <Tag className="w-4 h-4 text-muted-foreground" />,
        iconBg: 'bg-muted',
        title: 'added label',
        content: event.labelName ? (
          <span
            className="inline-block px-2 py-0.5 text-xs font-medium rounded-full"
            style={{
              backgroundColor: event.labelColor ? `#${event.labelColor}20` : undefined,
              color: event.labelColor ? `#${event.labelColor}` : undefined,
              border: event.labelColor ? `1px solid #${event.labelColor}40` : undefined,
            }}
          >
            {event.labelName}
          </span>
        ) : null,
      };

    case 'unlabeled':
      return {
        icon: <Tag className="w-4 h-4 text-muted-foreground" />,
        iconBg: 'bg-muted',
        title: 'removed label',
        content: event.labelName ? (
          <span className="text-xs text-muted-foreground line-through">{event.labelName}</span>
        ) : null,
      };

    case 'merged':
      return {
        icon: <GitMerge className="w-4 h-4 text-purple-500" />,
        iconBg: 'bg-purple-500/20',
        title: 'merged this pull request',
        content: event.commitSha ? (
          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
            {getShortSha(event.commitSha)}
          </span>
        ) : null,
      };

    case 'review_requested':
      return {
        icon: <UserPlus className="w-4 h-4 text-muted-foreground" />,
        iconBg: 'bg-muted',
        title: 'requested a review',
        content: null,
      };

    case 'head_ref_force_pushed':
      return {
        icon: <GitBranch className="w-4 h-4 text-amber-500" />,
        iconBg: 'bg-amber-500/20',
        title: 'force-pushed the branch',
        content: null,
      };

    default:
      return {
        icon: <MessageSquare className="w-4 h-4 text-muted-foreground" />,
        iconBg: 'bg-muted',
        title: event.type,
        content: null,
      };
  }
}
