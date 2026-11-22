import { firebaseConfigFromEnv, type FirebaseWebConfig } from '../src/utils/firebaseWebConfig.ts';

export type { FirebaseWebConfig };

// Served to the browser by GET /api/firebase-config. Accepts FIREBASE_* names, and falls back to
// the VITE_FIREBASE_* names used for build-time config, so one set of variables covers both.
export function readFirebaseConfig(env: NodeJS.ProcessEnv): FirebaseWebConfig | null {
  return firebaseConfigFromEnv(env, ['FIREBASE_', 'VITE_FIREBASE_']);
}
