/**
 * POST /pr-files endpoint - Get files changed in a GitHub pull request with diff
 */

import type { Request, Response } from 'express';
import { execAsync, execEnv, getErrorMessage, logError } from './common.js';
import { checkGitHubRemote } from './check-github-remote.js';

export interface PRFileChange {
  path: string;
  additions: number;
  deletions: number;
  changeType: 'ADDED' | 'MODIFIED' | 'DELETED' | 'RENAMED' | 'COPIED';
}

export interface PRFilesResult {
  success: boolean;
  files?: PRFileChange[];
  additions?: number;
  deletions?: number;
  changedFiles?: number;
  diff?: string;
  error?: string;
}

export function createPRFilesHandler() {
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

      // Fetch files and stats using gh pr view
      const [filesResult, diffResult] = await Promise.all([
        execAsync(`gh pr view ${prNumber} --json files,additions,deletions,changedFiles`, {
          cwd: projectPath,
          env: execEnv,
        }),
        execAsync(`gh pr diff ${prNumber}`, {
          cwd: projectPath,
          env: execEnv,
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large diffs
        }).catch(() => ({ stdout: '' })), // Don't fail if diff fetch fails
      ]);

      const data = JSON.parse(filesResult.stdout || '{}');
      const files: PRFileChange[] = data.files || [];

      res.json({
        success: true,
        files,
        additions: data.additions || 0,
        deletions: data.deletions || 0,
        changedFiles: data.changedFiles || files.length,
        diff: diffResult.stdout || '',
      });
    } catch (error) {
      logError(error, 'Get PR files failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
