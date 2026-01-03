// ============================================
// TASK CONTROLLER
// ============================================

import { ApiResponse, asyncHandler } from '../../utils/apiResponse.js';
import taskService from '../../services/task.service.js';

export const getTodayTasks = asyncHandler(async (req, res) => {
  const tasks = await taskService.getTodayTasks(req.user._id);
  res.json(new ApiResponse(200, { tasks }, "Today's tasks fetched"));
});

export const getUpcomingTasks = asyncHandler(async (req, res) => {
  const data = await taskService.getUpcomingTasks(req.user._id);
  res.json(new ApiResponse(200, data, 'Upcoming tasks and schedule fetched'));
});

export const getUserTasks = asyncHandler(async (req, res) => {
  const result = await taskService.getUserTasks(req.user._id, req.query);
  res.json(new ApiResponse(200, result, 'Tasks fetched'));
});

export const completeTask = asyncHandler(async (req, res) => {
  const task = await taskService.completeTask(req.params.taskId, req.user._id);
  res.json(new ApiResponse(200, { task }, 'Task marked as completed'));
});

export const dismissTask = asyncHandler(async (req, res) => {
  const task = await taskService.dismissTask(req.params.taskId, req.user._id);
  res.json(new ApiResponse(200, { task }, 'Task dismissed'));
});
