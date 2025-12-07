// ============================================
// TASK ROUTES
// ============================================

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getTodayTasks,
  getUpcomingTasks,
  getUserTasks,
  completeTask,
  dismissTask,
} from '../controllers/task/task.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', getUserTasks);
router.get('/today', getTodayTasks);
router.get('/upcoming', getUpcomingTasks);
router.patch('/:taskId/complete', completeTask);
router.patch('/:taskId/dismiss', dismissTask);

export default router;
