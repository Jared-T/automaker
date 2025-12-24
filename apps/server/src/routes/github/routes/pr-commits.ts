/**
 * POST /pr-commits endpoint - Get commits for a GitHub pull request
 */

import type { Request, Response } from 'express';
import { execAsync, execEnv, getErrorMessage, logError } from './common.js';
import { checkGitHubRemote } from './check-github-remote.js';

export interface PRCommitAuthor {
  name: string;
  email: string;
  date: string;
  user?: {
    login: string;
    avatarUrl?: string;
  };
}

export interface PRCommit {
  oid: string;
  messageHeadline: string;
  messageBody: string;
  committedDate: string;
  authoredDate: string;
  author: PRCommitAuthor;
  statusCheckRollup?: {
    state: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'ERROR';
  };
}

export interface PRCommitsResult {
  success: boolean;
  commits?: PRCommit[];
  error?: string;
}

export function createPRCommitsHandler() {
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

      // Fetch commits using gh pr view
      const { stdout } = await execAsync(`gh pr view ${prNumber} --json commits`, {
        cwd: projectPath,
        env: execEnv,
      });

      const data = JSON.parse(stdout || '{}');
      const commits: PRCommit[] = data.commits || [];

      res.json({
        success: true,
        commits,
      });
    } catch (error) {
      logError(error, 'Get PR commits failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
