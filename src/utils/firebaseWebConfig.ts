// Firebase web config for Google Drive sign-in. None of these values are committed to the
// repository. They reach the browser in one of two ways:
//   1. At build time, from VITE_FIREBASE_* environment variables (works on static hosts).
//   2. At run time, from the Express route GET /api/firebase-config, which reads FIREBASE_*
//      (or VITE_FIREBASE_*) from the server environment.
// Firebase web keys are public by design once the site loads, so restrict the key in Google
// Cloud Console: HTTP referrers limited to your site, and API restrictions limited to the
// Identity Toolkit / Firebase Auth APIs.
export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

const FIELDS = {
  apiKey: 'API_KEY',
  authDomain: 'AUTH_DOMAIN',
  projectId: 'PROJECT_ID',
  appId: 'APP_ID',
  storageBucket: 'STORAGE_BUCKET',
  messagingSenderId: 'MESSAGING_SENDER_ID',
} as const;

type EnvLike = Record<string, unknown>;

function clean(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed ? trimmed : undefined;
}

function build(pick: (field: keyof typeof FIELDS) => string | undefined): FirebaseWebConfig | null {
  const apiKey = pick('apiKey');
  const authDomain = pick('authDomain');
  const projectId = pick('projectId');
  const appId = pick('appId');
  if (!apiKey || !authDomain || !projectId || !appId) return null;
  const storageBucket = pick('storageBucket');
  const messagingSenderId = pick('messagingSenderId');
  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    ...(storageBucket ? { storageBucket } : {}),
    ...(messagingSenderId ? { messagingSenderId } : {}),
  };
}

/**
 * Reads the config from environment variables, trying each prefix in order per field
 * (e.g. FIREBASE_API_KEY, then VITE_FIREBASE_API_KEY). Returns null unless the four core
 * values (API key, auth domain, project ID, app ID) are all present.
 */
export function firebaseConfigFromEnv(env: EnvLike, prefixes: readonly string[]): FirebaseWebConfig | null {
  return build((field) => {
    for (const prefix of prefixes) {
      const value = clean(env[`${prefix}${FIELDS[field]}`]);
      if (value) return value;
    }
    return undefined;
  });
}

/** Validates a config object received over the network (same rules as the env readers). */
export function parseFirebaseConfig(value: unknown): FirebaseWebConfig | null {
  if (!value || typeof value !== 'object') return null;
  const obj = value as EnvLike;
  return build((field) => clean(obj[field]));
}
