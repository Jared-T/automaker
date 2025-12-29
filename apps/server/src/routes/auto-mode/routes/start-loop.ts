/**
 * POST /start-loop endpoint - Start the continuous auto mode loop
 * Runs until the backlog is empty or explicitly stopped
 */

import type { Request, Response } from 'express';
import type { AutoModeService } from '../../../services/auto-mode-service.js';
import { getErrorMessage, logError } from '../common.js';

export function createStartLoopHandler(autoModeService: AutoModeService) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, maxConcurrency } = req.body as {
        projectPath: string;
        maxConcurrency?: number;
      };

      if (!projectPath) {
        res.status(400).json({ success: false, error: 'projectPath is required' });
        return;
      }

      await autoModeService.startAutoLoop(projectPath, maxConcurrency || 3);
      res.json({
        success: true,
        message: `Auto loop started with max ${maxConcurrency || 3} concurrent features`,
      });
    } catch (error) {
      logError(error, 'Start auto loop failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
