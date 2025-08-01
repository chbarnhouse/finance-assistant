import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "../constants";

interface UseYnabSyncOptions {
  autoSyncOnMount?: boolean;
  autoSyncInterval?: number; // in milliseconds, 0 to disable
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

interface SyncStatus {
  lastSynced: string | null;
  isPending: boolean;
  error: string | null;
}

export const useYnabSync = (options: UseYnabSyncOptions = {}) => {
  const {
    autoSyncOnMount = false,
    autoSyncInterval = 0,
    onSuccess,
    onError,
  } = options;

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSynced: null,
    isPending: false,
    error: null,
  });

  const queryClient = useQueryClient();

  // Get YNAB configuration to check last sync time
  const getYnabConfig = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/ynab/config/`);
      return response.data;
    } catch (error) {
      console.error("Failed to get YNAB configuration:", error);
      return null;
    }
  };

  // Update sync status from configuration
  const updateSyncStatus = async () => {
    const config = await getYnabConfig();
    if (config?.last_synced) {
      setSyncStatus((prev) => ({
        ...prev,
        lastSynced: config.last_synced,
      }));
    }
  };

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      setSyncStatus((prev) => ({ ...prev, isPending: true, error: null }));
      const response = await axios.post(`${API_BASE_URL}/ynab/sync/`);
      return response.data;
    },
    onSuccess: (data) => {
      // Update last synced timestamp
      const now = new Date().toISOString();
      setSyncStatus({
        lastSynced: now,
        isPending: false,
        error: null,
      });

      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();

      // Call custom success handler
      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || "Sync failed";
      setSyncStatus((prev) => ({
        ...prev,
        isPending: false,
        error: errorMessage,
      }));

      // Call custom error handler
      if (onError) {
        onError(error);
      }
    },
  });

  // Auto-sync on mount
  useEffect(() => {
    if (autoSyncOnMount) {
      updateSyncStatus();
      syncMutation.mutate();
    } else {
      updateSyncStatus();
    }
  }, [autoSyncOnMount]);

  // Auto-sync interval
  useEffect(() => {
    if (autoSyncInterval > 0) {
      const interval = setInterval(() => {
        syncMutation.mutate();
      }, autoSyncInterval);

      return () => clearInterval(interval);
    }
  }, [autoSyncInterval]);

  // Manual sync function
  const syncNow = () => {
    syncMutation.mutate();
  };

  // Format timestamp for display
  const formatLastSynced = () => {
    if (!syncStatus.lastSynced) return null;

    const date = new Date(syncStatus.lastSynced);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return {
    syncNow,
    syncStatus,
    formatLastSynced,
    isPending: syncMutation.isPending,
    error: syncMutation.error,
  };
};
