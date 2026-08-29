import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { BACKEND_URL } from '../services/api';
import { User, SlackStatus } from '../types/auth';

/**
 * Hook to manage authentication state and Google OAuth flows.
 */
export function useAuth() {
  const queryClient = useQueryClient();

  // 1. Get authenticated user profile
  const {
    data: user,
    isLoading: isUserLoading,
    error: userError,
    refetch: refetchUser,
  } = useQuery<User | null>({
    queryKey: ['auth-me'],
    queryFn: async () => {
      console.log('🔍 [Debug] useAuth: Fetching current authenticated user profile...');
      if (localStorage.getItem('demo_logged_in') === 'true') {
        console.log('🔍 [Debug] useAuth: Resolving in-memory Demo User');
        return {
          id: 'demo-user-id',
          name: 'Demo User',
          email: 'demo@reachinbox.ai',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
        };
      }
      try {
        const res = await api.get('/auth/me');
        console.log('🔍 [Debug] useAuth: Current user API success:', res.data.data);
        return res.data.data;
      } catch (err: any) {
        console.warn('🔍 [Debug] useAuth: Current user API failed:', err.response?.data || err.message);
        return null;
      }
    },
    retry: false, // Don't retry on 401s
    staleTime: 5 * 60 * 1000, // 5 minutes stale time
  });

  // 2. Get Slack connection status
  const {
    data: slackStatus,
    isLoading: isSlackLoading,
    refetch: refetchSlack,
  } = useQuery<SlackStatus>({
    queryKey: ['slack-status'],
    queryFn: async () => {
      if (localStorage.getItem('demo_logged_in') === 'true') {
        const connected = localStorage.getItem('demo_slack_connected') === 'true';
        return {
          connected,
          teamName: connected ? (localStorage.getItem('demo_slack_team') || 'ReachInbox Demo Team') : null,
          connectedAt: connected ? new Date().toISOString() : null,
        };
      }
      try {
        const res = await api.get('/slack/status');
        return res.data.data;
      } catch (err) {
        return { connected: false, teamName: null, connectedAt: null };
      }
    },
    enabled: !!user, // Only fetch Slack status if user is authenticated
    staleTime: 1 * 60 * 1000,
  });

  // 3. Trigger Google OAuth login redirect
  const login = () => {
    window.location.href = `${BACKEND_URL}/api/auth/google`;
  };

  const loginDemo = () => {
    localStorage.setItem('demo_logged_in', 'true');
    window.location.href = '/';
  };

  // 4. Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      localStorage.removeItem('demo_logged_in');
      try {
        await api.post('/auth/logout');
      } catch (err) {
        // Ignore backend errors when down
      }
    },
    onSuccess: () => {
      queryClient.clear(); // Reset all queries
      window.location.href = '/login';
    },
  });

  // 5. Disconnect Slack mutation
  const disconnectSlackMutation = useMutation({
    mutationFn: async () => {
      localStorage.removeItem('demo_slack_connected');
      localStorage.removeItem('demo_slack_team');
      try {
        await api.delete('/slack/disconnect');
      } catch (err) {
        // Ignore backend errors
      }
    },
    onSuccess: () => {
      refetchSlack();
    },
  });

  return {
    user: user || null,
    isAuthenticated: !!user,
    isLoading: isUserLoading,
    error: userError,
    refetchUser,
    login,
    loginDemo,
    logout: () => logoutMutation.mutate(),
    isLoggingOut: logoutMutation.isPending,
    
    slackStatus: slackStatus || null,
    isSlackLoading,
    connectSlack: () => {
      if (localStorage.getItem('demo_logged_in') === 'true') {
        localStorage.setItem('demo_slack_connected', 'true');
        localStorage.setItem('demo_slack_team', 'ReachInbox Demo Team');
        refetchSlack();
      } else {
        window.location.href = `${BACKEND_URL}/api/slack/connect`;
      }
    },
    disconnectSlack: () => disconnectSlackMutation.mutate(),
    isDisconnectingSlack: disconnectSlackMutation.isPending,
  };
}
