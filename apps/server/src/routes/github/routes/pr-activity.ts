/**
 * POST /pr-activity endpoint - Get activity timeline for a GitHub pull request
 */

import type { Request, Response } from 'express';
import { execAsync, execEnv, getErrorMessage, logError } from './common.js';
import { checkGitHubRemote } from './check-github-remote.js';

export type PRActivityEventType =
  | 'comment'
  | 'review'
  | 'commit'
  | 'labeled'
  | 'unlabeled'
  | 'merged'
  | 'review_requested'
  | 'head_ref_force_pushed';

export interface PRActivityActor {
  login: string;
  avatarUrl?: string;
}

export interface PRActivityEvent {
  id: string;
  type: PRActivityEventType;
  createdAt: string;
  actor: PRActivityActor;
  // Event-specific fields
  body?: string;
  reviewState?: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'PENDING' | 'DISMISSED';
  labelName?: string;
  labelColor?: string;
  commitSha?: string;
  commitMessage?: string;
  commitsCount?: number;
}

export interface PRActivityResult {
  success: boolean;
  events?: PRActivityEvent[];
  error?: string;
}

interface GitHubComment {
  id: number;
  author: { login: string };
  body: string;
  createdAt: string;
}

interface GitHubReview {
  id: number;
  author: { login: string; avatarUrl?: string };
  body: string;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'PENDING' | 'DISMISSED';
  submittedAt: string;
}

interface GitHubTimelineEvent {
  id?: number;
  event?: string;
  created_at?: string;
  actor?: { login: string; avatar_url?: string };
  label?: { name: string; color: string };
  commit_id?: string;
  message?: string;
  author?: { login: string; avatar_url?: string };
  state?: string;
  body?: string;
}

export function createPRActivityHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, prNumber } = req.body;

      if (!projectPath) {
        res.status(400).json({ success: false, error: 'projectPath is required' });
        return;
      }

      if (!prNumber) {
        res.status(400).json({ success: false, error: 'prNumber is required' });
        return;
      }

      // First check if this is a GitHub repo
      const remoteStatus = await checkGitHubRemote(projectPath);
      if (!remoteStatus.hasGitHubRemote) {
        res.status(400).json({
          success: false,
          error: 'Project does not have a GitHub remote',
        });
        return;
      }

      const events: PRActivityEvent[] = [];

      // Fetch comments and reviews using gh pr view
      const [commentsResult, reviewsResult] = await Promise.all([
        execAsync(`gh pr view ${prNumber} --json comments`, {
          cwd: projectPath,
          env: execEnv,
        }).catch(() => ({ stdout: '{}' })),
        execAsync(`gh pr view ${prNumber} --json reviews`, {
          cwd: projectPath,
          env: execEnv,
        }).catch(() => ({ stdout: '{}' })),
      ]);

      // Parse comments
      try {
        const commentsData = JSON.parse(commentsResult.stdout || '{}');
        const comments: GitHubComment[] = commentsData.comments || [];
        for (const comment of comments) {
          events.push({
            id: `comment-${comment.id}`,
            type: 'comment',
            createdAt: comment.createdAt,
            actor: {
              login: comment.author?.login || 'unknown',
            },
            body: comment.body,
          });
        }
      } catch {
        // Ignore comment parsing errors
      }

      // Parse reviews
      try {
        const reviewsData = JSON.parse(reviewsResult.stdout || '{}');
        const reviews: GitHubReview[] = reviewsData.reviews || [];
        for (const review of reviews) {
          events.push({
            id: `review-${review.id}`,
            type: 'review',
            createdAt: review.submittedAt,
            actor: {
              login: review.author?.login || 'unknown',
              avatarUrl: review.author?.avatarUrl,
            },
            body: review.body,
            reviewState: review.state,
          });
        }
      } catch {
        // Ignore review parsing errors
      }

      // Try to fetch timeline events from GitHub API
      const repoInfo =
        remoteStatus.owner && remoteStatus.repo
          ? `${remoteStatus.owner}/${remoteStatus.repo}`
          : null;

      if (repoInfo) {
        try {
          const { stdout: timelineOutput } = await execAsync(
            `gh api repos/${repoInfo}/issues/${prNumber}/timeline --paginate`,
            { cwd: projectPath, env: execEnv, maxBuffer: 5 * 1024 * 1024 }
          );

          const timelineEvents: GitHubTimelineEvent[] = JSON.parse(timelineOutput || '[]');

          for (const event of timelineEvents) {
            const eventType = event.event;

            // Skip events we already have from comments/reviews
            if (eventType === 'commented' || eventType === 'reviewed') {
              continue;
            }

            if (eventType === 'labeled' && event.label) {
              events.push({
                id: `labeled-${event.id || Date.now()}`,
                type: 'labeled',
                createdAt: event.created_at || new Date().toISOString(),
                actor: {
                  login: event.actor?.login || 'unknown',
                  avatarUrl: event.actor?.avatar_url,
                },
                labelName: event.label.name,
                labelColor: event.label.color,
              });
            } else if (eventType === 'unlabeled' && event.label) {
              events.push({
                id: `unlabeled-${event.id || Date.now()}`,
                type: 'unlabeled',
                createdAt: event.created_at || new Date().toISOString(),
                actor: {
                  login: event.actor?.login || 'unknown',
                  avatarUrl: event.actor?.avatar_url,
                },
                labelName: event.label.name,
                labelColor: event.label.color,
              });
            } else if (eventType === 'merged') {
              events.push({
                id: `merged-${event.id || Date.now()}`,
                type: 'merged',
                createdAt: event.created_at || new Date().toISOString(),
                actor: {
                  login: event.actor?.login || 'unknown',
                  avatarUrl: event.actor?.avatar_url,
                },
                commitSha: event.commit_id,
              });
            } else if (eventType === 'committed') {
              events.push({
                id: `commit-${event.commit_id || Date.now()}`,
                type: 'commit',
                createdAt: event.created_at || new Date().toISOString(),
                actor: {
                  login: event.author?.login || event.actor?.login || 'unknown',
                  avatarUrl: event.author?.avatar_url || event.actor?.avatar_url,
                },
                commitSha: event.commit_id,
                commitMessage: event.message,
              });
            } else if (eventType === 'head_ref_force_pushed') {
              events.push({
                id: `force-push-${event.id || Date.now()}`,
                type: 'head_ref_force_pushed',
                createdAt: event.created_at || new Date().toISOString(),
                actor: {
                  login: event.actor?.login || 'unknown',
                  avatarUrl: event.actor?.avatar_url,
                },
              });
            } else if (eventType === 'review_requested') {
              events.push({
                id: `review-requested-${event.id || Date.now()}`,
                type: 'review_requested',
                createdAt: event.created_at || new Date().toISOString(),
                actor: {
                  login: event.actor?.login || 'unknown',
                  avatarUrl: event.actor?.avatar_url,
                },
              });
            }
          }
        } catch (error) {
          // Timeline API might fail, continue with what we have
          console.warn('[PRActivity] Failed to fetch timeline:', error);
        }
      }

      // Sort events by date (oldest first)
      events.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      res.json({
        success: true,
        events,
      });
    } catch (error) {
      logError(error, 'Get PR activity failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
