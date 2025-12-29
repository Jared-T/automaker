/**
 * POST /stop-loop endpoint - Stop the continuous auto mode loop
 * Running features will complete, but no new features will be started
 */

import type { Request, Response } from 'express';
import type { AutoModeService } from '../../../services/auto-mode-service.js';
import { getErrorMessage, logError } from '../common.js';

export function createStopLoopHandler(autoModeService: AutoModeService) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const runningFeatures = await autoModeService.stopAutoLoop();
      res.json({
        success: true,
        message: 'Auto loop stopped',
        runningFeatures,
      });
    } catch (error) {
      logError(error, 'Stop auto loop failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
