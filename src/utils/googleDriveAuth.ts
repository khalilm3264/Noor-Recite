import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  User,
} from 'firebase/auth';
import { firebaseConfigFromEnv, parseFirebaseConfig, type FirebaseWebConfig } from './firebaseWebConfig';

export const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts',
] as const;

// The Firebase web config is never committed. It comes from VITE_FIREBASE_* variables baked in at
// build time (works on static hosts), or else from the Express route /api/firebase-config. It is
// resolved once, when the app first sets up Drive sign-in.
let firebasePromise: Promise<{ auth: Auth; provider: GoogleAuthProvider }> | null = null;

const NOT_CONFIGURED = 'Google sign-in is not configured for this site.';

async function loadFirebaseConfig(): Promise<FirebaseWebConfig> {
  const buildTime = firebaseConfigFromEnv(import.meta.env, ['VITE_FIREBASE_']);
  if (buildTime) return buildTime;
  const res = await fetch('/api/firebase-config', { headers: { Accept: 'application/json' } });
  // A static host may answer unknown paths with index.html (200, text/html), so check the type.
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || !type.includes('application/json')) {
    throw new Error(NOT_CONFIGURED);
  }
  const config = parseFirebaseConfig(await res.json().catch(() => null));
  if (!config) throw new Error(NOT_CONFIGURED);
  return config;
}

function getFirebase(): Promise<{ auth: Auth; provider: GoogleAuthProvider }> {
  if (!firebasePromise) {
    firebasePromise = (async () => {
      const config = await loadFirebaseConfig();
      const app = getApps().length > 0 ? getApp() : initializeApp(config);
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      for (const scope of SCOPES) {
        provider.addScope(scope);
      }
      provider.setCustomParameters({
        prompt: 'select_account',
      });
      return { auth, provider };
    })().catch((err) => {
      firebasePromise = null;
      throw err;
    });
  }
  return firebasePromise;
}

// Flag indicating active popup sign-in flow so onAuthStateChanged does not reset state mid-flight.
let isSigningIn = false;
// Strictly in-memory OAuth access token cache (never written to localStorage or sessionStorage).
let cachedAccessToken: string | null = null;

export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: (existingUser: User | null) => void
) => {
  let cancelled = false;
  let unsubscribe: (() => void) | undefined;
  getFirebase()
    .then(({ auth }) => {
      if (cancelled) return;
      unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
        if (user) {
          if (cachedAccessToken) {
            onAuthSuccess?.(user, cachedAccessToken);
          } else if (!isSigningIn) {
            cachedAccessToken = null;
            onAuthFailure?.(user);
          }
        } else {
          cachedAccessToken = null;
          onAuthFailure?.(null);
        }
      });
    })
    .catch(() => {
      // Sign-in not configured or offline: Drive stays signed out.
      if (!cancelled) onAuthFailure?.(null);
    });
  return () => {
    cancelled = true;
    unsubscribe?.();
  };
};

export const googleDriveSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const { auth, provider } = await getFirebase();
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not obtain a Google Drive access token. Please try again.');
    }
    cachedAccessToken = credential.accessToken;
    return {
      user: result.user,
      accessToken: cachedAccessToken,
    };
  } finally {
    isSigningIn = false;
  }
};

export const getDriveAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const clearDriveAccessToken = (): void => {
  cachedAccessToken = null;
};

export const googleDriveSignOut = async (): Promise<void> => {
  cachedAccessToken = null;
  const { auth } = await getFirebase();
  await auth.signOut();
};
