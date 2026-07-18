import { useEffect, useMemo, useState } from 'react';
import {
  authConfigError,
  getAccessToken,
  getActiveUsername,
  initializeAuth,
  isAuthEnabled,
  login,
  logout,
} from './auth';

interface AuthState {
  ready: boolean;
  enabled: boolean;
  isAuthenticated: boolean;
  username: string | null;
  error: string | null;
}

export function useEntraAuth() {
  const enabled = useMemo(() => isAuthEnabled(), []);
  const [state, setState] = useState<AuthState>({
    ready: !enabled,
    enabled,
    isAuthenticated: false,
    username: null,
    error: authConfigError(),
  });

  useEffect(() => {
    if (!enabled) return;

    initializeAuth()
      .then((isAuthenticated) => {
        setState({
          ready: true,
          enabled,
          isAuthenticated,
          username: getActiveUsername(),
          error: authConfigError(),
        });
      })
      .catch((error: unknown) => {
        setState({
          ready: true,
          enabled,
          isAuthenticated: false,
          username: null,
          error: error instanceof Error ? error.message : String(error),
        });
      });
  }, [enabled]);

  return {
    ...state,
    signIn: () => login(),
    signOut: () => logout(),
    getAccessToken,
  };
}
