"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components";
import {
  feedbackService,
  type AdminFeedbackListResponse,
  type FeedbackRecord,
  type FeedbackStatus,
} from "@/services";
import type { ApiError, User } from "@/types";

const STATUS_OPTIONS: Array<{ value: FeedbackStatus; label: string }> = [
  { value: "submitted", label: "Submitted" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

const STATUS_BADGES: Record<FeedbackStatus, string> = {
  submitted: "bg-blue-100 text-blue-700",
  pending: "bg-amber-100 text-amber-700",
  in_progress: "bg-violet-100 text-violet-700",
  resolved: "bg-emerald-100 text-emerald-700",
};

const getUserDisplay = (userValue: FeedbackRecord["userId"]) => {
  if (!userValue) return "Unknown user";
  if (typeof userValue === "string") return userValue;

  const typedUser = userValue as User;
  if (typedUser.fullName) return typedUser.fullName;
  return typedUser.email || typedUser._id || "Unknown user";
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackRecord[]>([]);
  const [stats, setStats] = useState<AdminFeedbackListResponse["stats"]>({
    total: 0,
    byStatus: {},
  });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"" | FeedbackStatus>("");
  const [searchFilter, setSearchFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const queryFilters = useMemo(
    () => ({
      page,
      limit: 10,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(searchFilter.trim() ? { search: searchFilter.trim() } : {}),
    }),
    [page, statusFilter, searchFilter],
  );

  const fetchFeedback = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await feedbackService.getAdminFeedback(queryFilters);
      const payload = response.data;

      setItems(payload?.feedback || []);
      setStats(payload?.stats || { total: 0, byStatus: {} });
      setPages(Math.max(payload?.pagination?.pages || 1, 1));
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError?.message || "Failed to load feedback queue.");
      setItems([]);
      setStats({ total: 0, byStatus: {} });
      setPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [queryFilters]);

  useEffect(() => {
    void fetchFeedback();
  }, [fetchFeedback]);

  const handleUpdateStatus = async (
    feedbackId: string,
    status: FeedbackStatus,
    currentStatus: FeedbackStatus,
  ) => {
    if (status === currentStatus || updatingId) {
      return;
    }

    const note = window.prompt("Optional admin note for this status update:", "") || "";

    setUpdatingId(feedbackId);
    setError(null);
    try {
      await feedbackService.updateFeedbackStatus(feedbackId, status, note);
      await fetchFeedback();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError?.message || "Failed to update feedback status.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Feedback Moderation</h1>
            <p className="text-sm text-gray-500">
              Review platform feedback, update statuses, and keep users informed.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchFeedback()}
            className="self-start rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-xl font-semibold text-gray-900">{stats.total || 0}</p>
          </div>
          {STATUS_OPTIONS.map((option) => (
            <div key={option.value} className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-xs text-gray-500">{option.label}</p>
              <p className="text-xl font-semibold text-gray-900">
                {stats.byStatus?.[option.value] || 0}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="status-filter">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as "" | FeedbackStatus);
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="search-filter">
              Search
            </label>
            <input
              id="search-filter"
              value={searchFilter}
              onChange={(event) => {
                setSearchFilter(event.target.value);
                setPage(1);
              }}
              placeholder="Search by title, description, or feedback ID"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {isLoading ? (
            <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
              Loading feedback queue...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
              No feedback found for the selected filters.
            </div>
          ) : (
            items.map((item) => (
              <article key={item._id} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500">{item.feedbackId}</p>
                    <h2 className="text-base font-semibold text-gray-900">{item.title}</h2>
                    <p className="text-xs text-gray-500">
                      {item.type.replace("_", " ")} • {formatDate(item.createdAt)}
                    </p>
                  </div>
                  <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGES[item.status]}`}>
                    {item.status.replace("_", " ")}
                  </span>
                </div>

                <p className="mt-3 text-sm text-gray-700 whitespace-pre-line">{item.description}</p>

                <div className="mt-3 flex flex-col gap-1 text-xs text-gray-500">
                  <p>Submitted by: {getUserDisplay(item.userId)}</p>
                  {item.screenshot?.url && (
                    <a
                      href={item.screenshot.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-600 hover:text-primary-700"
                    >
                      View attached screenshot
                    </a>
                  )}
                  {item.adminReview?.updatedAt && (
                    <p>
                      Last admin update: {formatDate(item.adminReview.updatedAt)}
                      {item.adminReview.note ? ` • ${item.adminReview.note}` : ""}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={updatingId === item._id || option.value === item.status}
                      onClick={() =>
                        void handleUpdateStatus(item._id, option.value, item.status)
                      }
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Mark {option.label}
                    </button>
                  ))}
                </div>
              </article>
            ))
          )}
        </div>

        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page <= 1 || isLoading}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <p className="text-sm text-gray-600">
            Page {page} of {pages}
          </p>
          <button
            type="button"
            onClick={() => setPage((value) => Math.min(pages, value + 1))}
            disabled={page >= pages || isLoading}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
