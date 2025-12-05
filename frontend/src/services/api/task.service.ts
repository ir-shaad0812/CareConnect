// ============================================
// TASK API SERVICE
// ============================================

import { apiClient } from "./client";
import type { ApiResponse } from "@/types";

export interface Task {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  type: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in_progress" | "completed" | "dismissed";
  dueDate?: string;
  actionUrl?: string;
  linkedEntityId?: string;
  linkedEntityType?: string;
  completedAt?: string;
  dismissedAt?: string;
  createdAt: string;
}

export interface ScheduleEntry {
  _id: string;
  type: "schedule_upcoming";
  title: string;
  startDate?: string;
  startTime?: string;
  endTime?: string;
  bookingNumber?: string;
  status?: string;
  actionUrl?: string;
  participants?: {
    caregiver?: { _id: string; fullName: string; avatar?: string };
    careseeker?: { _id: string; fullName: string; avatar?: string };
  };
}

export interface UpcomingData {
  tasks: Task[];
  schedule: ScheduleEntry[];
}

class TaskService {
  async getTodayTasks(): Promise<ApiResponse<{ tasks: Task[] }>> {
    return apiClient.get<{ tasks: Task[] }>("/tasks/today");
  }

  async getUpcomingTasks(): Promise<ApiResponse<UpcomingData>> {
    return apiClient.get<UpcomingData>("/tasks/upcoming");
  }

  async getAllTasks(params: { page?: number; limit?: number; status?: string; type?: string } = {}): Promise<ApiResponse<{ tasks: Task[]; pagination: unknown }>> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) qs.set(k, String(v)); });
    return apiClient.get<{ tasks: Task[]; pagination: unknown }>(`/tasks?${qs}`);
  }

  async completeTask(taskId: string): Promise<ApiResponse<{ task: Task }>> {
    return apiClient.patch<{ task: Task }>(`/tasks/${taskId}/complete`);
  }

  async dismissTask(taskId: string): Promise<ApiResponse<{ task: Task }>> {
    return apiClient.patch<{ task: Task }>(`/tasks/${taskId}/dismiss`);
  }
}

export const taskService = new TaskService();
export default taskService;
