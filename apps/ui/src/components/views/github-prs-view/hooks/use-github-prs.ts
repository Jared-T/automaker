import { useState, useEffect, useCallback, useRef } from 'react';
import { getElectronAPI, type GitHubPR } from '@/lib/electron';
import { useAppStore } from '@/store/app-store';

export function useGithubPRs() {
  const [openPRs, setOpenPRs] = useState<GitHubPR[]>([]);
  const [mergedPRs, setMergedPRs] = useState<GitHubPR[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentProject } = useAppStore();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchPRs = useCallback(async () => {
    if (!currentProject?.path) {
      setError('No project selected');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const api = getElectronAPI();
      if (api.github) {
        const result = await api.github.listPRs(currentProject.path);
        if (isMountedRef.current) {
          if (result.success) {
            setOpenPRs(result.openPRs || []);
            setMergedPRs(result.mergedPRs || []);
          } else {
            setError(result.error || 'Failed to fetch pull requests');
          }
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error('[useGithubPRs] Error fetching PRs:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch pull requests');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [currentProject?.path]);

  useEffect(() => {
    fetchPRs();
  }, [fetchPRs]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchPRs();
  }, [fetchPRs]);

  return {
    openPRs,
    mergedPRs,
    loading,
    refreshing,
    error,
    refresh,
  };
}
