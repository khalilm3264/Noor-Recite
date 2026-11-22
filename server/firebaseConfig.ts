// Firebase web config for Google Drive sign-in, read from server environment variables so it
// is not committed to the repository. These values are sent to the browser (Firebase web keys
// are public by design), so restrict the key in Google Cloud Console: HTTP referrers limited to
// your site, and API restrictions limited to the Identity Toolkit / Firebase Auth APIs.
export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

export function readFirebaseConfig(env: NodeJS.ProcessEnv): FirebaseWebConfig | null {
  const value = (name: string) => {
    const raw = env[name]?.trim();
    return raw ? raw : undefined;
  };
  const apiKey = value('FIREBASE_API_KEY');
  const authDomain = value('FIREBASE_AUTH_DOMAIN');
  const projectId = value('FIREBASE_PROJECT_ID');
  const appId = value('FIREBASE_APP_ID');
  if (!apiKey || !authDomain || !projectId || !appId) return null;
  const storageBucket = value('FIREBASE_STORAGE_BUCKET');
  const messagingSenderId = value('FIREBASE_MESSAGING_SENDER_ID');
  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    ...(storageBucket ? { storageBucket } : {}),
    ...(messagingSenderId ? { messagingSenderId } : {}),
  };
}
