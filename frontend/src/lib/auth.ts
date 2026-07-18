import { InteractionRequiredAuthError, PublicClientApplication } from '@azure/msal-browser';

const enabled = import.meta.env.VITE_ENTRA_ENABLED === 'true';
const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID;
const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID;
const fallbackScope = clientId ? `api://${clientId}/access_as_user` : '';
const scope = import.meta.env.VITE_ENTRA_SCOPE || fallbackScope;

const canInitialize = enabled && Boolean(tenantId) && Boolean(clientId) && Boolean(scope);

const app = canInitialize
  ? new PublicClientApplication({
      auth: {
        clientId: clientId!,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        redirectUri: window.location.origin,
      },
      cache: {
        cacheLocation: 'sessionStorage',
      },
    })
  : null;

function getActiveAccount() {
  if (!app) return null;
  return app.getActiveAccount() ?? app.getAllAccounts()[0] ?? null;
}

export function isAuthEnabled(): boolean {
  return enabled;
}

export function authConfigError(): string | null {
  if (!enabled) return null;
  if (!tenantId) return 'Missing VITE_ENTRA_TENANT_ID';
  if (!clientId) return 'Missing VITE_ENTRA_CLIENT_ID';
  if (!scope) return 'Missing VITE_ENTRA_SCOPE';
  return null;
}

export async function initializeAuth(): Promise<boolean> {
  if (!app) return false;

  await app.initialize();
  const response = await app.handleRedirectPromise();
  if (response?.account) {
    app.setActiveAccount(response.account);
  } else {
    const current = getActiveAccount();
    if (current) app.setActiveAccount(current);
  }

  return Boolean(getActiveAccount());
}

export async function login(): Promise<void> {
  if (!app) throw new Error('Entra auth is not configured');
  await app.loginRedirect({ scopes: [scope] });
}

export async function logout(): Promise<void> {
  if (!app) return;
  await app.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
}

export function getActiveUsername(): string | null {
  return getActiveAccount()?.username ?? null;
}

export async function getAccessToken(): Promise<string | null> {
  if (!app) return null;

  const account = getActiveAccount();
  if (!account) return null;

  try {
    const response = await app.acquireTokenSilent({ account, scopes: [scope] });
    return response.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      await app.acquireTokenRedirect({ scopes: [scope] });
      return null;
    }
    throw error;
  }
}
