import { db } from '@/db/schema';
import type { Store, User } from '@/types';

// ─── App startup states ─────────────────────────────────────────

export type AppScreen =
  | 'setup_welcome'     // no data at all → create or restore
  | 'setup_google'      // Google OAuth for workspace
  | 'setup_store'       // pick businessType + create store
  | 'setup_owner'       // create first user with PIN
  | 'select_user'       // returning user → pick user + PIN
  | 'store_selector'    // super_admin with multiple stores
  | 'pos'               // main POS screen
  | 'error';            // unrecoverable state

export interface StartupResult {
  screen: AppScreen;
  stores: Store[];
  users: User[];
  activeStoreId: string | null;
  error?: string;
}

// ─── Session keys in localStorage ───────────────────────────────

const KEY_ACTIVE_STORE = 'xpos_active_store_id';
const KEY_ACTIVE_USER = 'xpos_active_user_id';
const KEY_DEVICE_ID = 'xpos_device_id';
const KEY_GOOGLE_TOKEN = 'xpos_google_refresh_token';

// ─── Ensure device has a persistent ID ──────────────────────────

export function ensureDeviceId(): string {
  let id = localStorage.getItem(KEY_DEVICE_ID);
  if (!id) {
    id = 'dev-' + crypto.randomUUID();
    localStorage.setItem(KEY_DEVICE_ID, id);
  }
  return id;
}

// ─── Determine startup screen ───────────────────────────────────
//
// Called once on app mount. Returns which screen to render.
//
// Decision table (evaluated top-down, first match wins):
//
//  # | Condition                              | Screen
// ---|----------------------------------------|-----------------
//  1 | No stores in DB                        | setup_welcome
//  2 | Store exists, no users                 | setup_owner
//  3 | Multiple stores + saved user is SA     | store_selector
//  4 | Store + users exist, no saved session  | select_user
//  5 | Saved session valid                    | pos
//  6 | Saved session invalid (user deleted)   | select_user

export async function resolveStartupScreen(): Promise<StartupResult> {
  ensureDeviceId();

  // Load all stores
  const stores = await db.stores.toArray();

  // S1: No stores → first-time setup
  if (stores.length === 0) {
    return { screen: 'setup_welcome', stores: [], users: [], activeStoreId: null };
  }

  // Determine active store
  const savedStoreId = localStorage.getItem(KEY_ACTIVE_STORE);
  const activeStore = savedStoreId
    ? stores.find(s => s.id === savedStoreId) || stores[0]
    : stores[0];

  // Persist active store
  localStorage.setItem(KEY_ACTIVE_STORE, activeStore.id);

  // Load users for active store
  const users = await db.users
    .where('storeId').equals(activeStore.id)
    .filter(u => u.isActive)
    .toArray();

  // S2: Store exists but no users → create first user
  if (users.length === 0) {
    return { screen: 'setup_owner', stores, users: [], activeStoreId: activeStore.id };
  }

  // Check for saved session
  const savedUserId = localStorage.getItem(KEY_ACTIVE_USER);
  if (savedUserId) {
    const user = users.find(u => u.id === savedUserId);

    if (user) {
      // S3: Super admin with multiple stores → store selector
      if (user.role === 'super_admin' && stores.length > 1) {
        return { screen: 'store_selector', stores, users, activeStoreId: activeStore.id };
      }

      // S5: Valid session → go straight to POS
      return { screen: 'pos', stores, users, activeStoreId: activeStore.id };
    }

    // S6: Saved user no longer valid → clear and show login
    localStorage.removeItem(KEY_ACTIVE_USER);
  }

  // S4: No saved session → show user selection
  return { screen: 'select_user', stores, users, activeStoreId: activeStore.id };
}

// ─── Login ──────────────────────────────────────────────────────

export function loginUser(userId: string): void {
  localStorage.setItem(KEY_ACTIVE_USER, userId);
}

// ─── Logout ─────────────────────────────────────────────────────

export function logoutUser(): void {
  localStorage.removeItem(KEY_ACTIVE_USER);
}

// ─── Switch store (super_admin only) ────────────────────────────
// Switching store = change active store + force re-login

export function switchStore(storeId: string): void {
  localStorage.setItem(KEY_ACTIVE_STORE, storeId);
  localStorage.removeItem(KEY_ACTIVE_USER); // force re-login
}

// ─── Google token helpers ───────────────────────────────────────

export function getGoogleToken(): string | null {
  return localStorage.getItem(KEY_GOOGLE_TOKEN);
}

export function setGoogleToken(token: string): void {
  localStorage.setItem(KEY_GOOGLE_TOKEN, token);
}

export function clearGoogleToken(): void {
  localStorage.removeItem(KEY_GOOGLE_TOKEN);
}

export function isGoogleConnected(): boolean {
  return !!localStorage.getItem(KEY_GOOGLE_TOKEN);
}

// ─── Drive token expired handling ───────────────────────────────
// Not a blocking error. POS continues offline.
// UI shows a non-blocking banner: "Google Drive ไม่ได้เชื่อมต่อ"
// Backup operations enqueue to syncQueue instead of failing hard.

export function isDriveTokenExpired(): boolean {
  // In MVP, we check this by attempting a Drive API call.
  // If it fails with 401, we set a flag.
  // For now, this is a placeholder — actual implementation depends on
  // the Google Drive client (GAPI or REST).
  return !isGoogleConnected();
}

// ─── Role-based redirect ────────────────────────────────────────
//
// All roles land on POS. Sidebar visibility handles access control.
//
//  Role         | Landing | Sidebar access
// --------------|---------|--------------------------------------
//  super_admin  | POS     | All items + store switcher
//  manager      | POS     | All items except store switcher
//  staff        | POS     | POS + basic stock view only
