import { useState, useEffect } from 'react';

export const PORTAL_ORDER = ['little-moments', 'little-magic', 'something-ahead'] as const;
export type PortalId = (typeof PORTAL_ORDER)[number];

const STORAGE_KEY = 'lovehb:portals:completed:v1';
export const PORTAL_PROGRESS_EVENT = 'lovehb:portal-progress-change';

/**
 * Returns the set of completed portal IDs from localStorage,
 * additionally checking any existing native game save states.
 */
export function getCompletedPortals(): Set<string> {
  const completed = new Set<string>();
  if (typeof localStorage === 'undefined') return completed;

  if (typeof window !== 'undefined' && window.location.search.includes('reset=1')) {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('lovehb:match3:v2:sweet-v1');
      localStorage.removeItem('lovehb.avocado.v3');
    } catch { /* ignore */ }
    return completed;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach(id => { if (typeof id === 'string') completed.add(id); });
      }
    }
  } catch { /* storage fallback */ }

  // Check Match-3 game save
  try {
    const m3Raw = localStorage.getItem('lovehb:match3:v2:sweet-v1');
    if (m3Raw) {
      const m3 = JSON.parse(m3Raw);
      if (m3?.collected && (m3.collected.wafer ?? 0) >= 16 && (m3.collected.fondant ?? 0) >= 12) {
        completed.add('little-moments');
      }
    }
  } catch { /* ignore */ }

  // Check Avocado Quiz game save
  try {
    const qRaw = localStorage.getItem('lovehb.avocado.v3');
    if (qRaw) {
      const q = JSON.parse(qRaw);
      if (Array.isArray(q?.answers) && q.answers.length >= 10) {
        completed.add('little-magic');
      }
    }
  } catch { /* ignore */ }

  return completed;
}

/**
 * Checks if a specific portal is unlocked.
 * Portal 0 (first in order) is ALWAYS unlocked.
 * Subsequent portals are unlocked only if all preceding portals have been completed.
 */
export function isPortalUnlocked(portalId: string, completedSet?: Set<string>): boolean {
  const completed = completedSet ?? getCompletedPortals();
  const index = PORTAL_ORDER.indexOf(portalId as PortalId);
  if (index <= 0) return true; // first portal or unknown is always accessible
  for (let i = 0; i < index; i++) {
    if (!completed.has(PORTAL_ORDER[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Mark a portal as completed and broadcast the update.
 */
export function markPortalCompleted(portalId: string): void {
  const current = getCompletedPortals();
  if (!current.has(portalId)) {
    current.add(portalId);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...current]));
      }
    } catch { /* ignore */ }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(PORTAL_PROGRESS_EVENT, { detail: { completed: [...current], portalId } }));
    }
  }
}

/**
 * Reset portal progression (for testing or replaying from start).
 */
export function resetPortalProgress(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('lovehb:match3:v2:sweet-v1');
      localStorage.removeItem('lovehb.avocado.v3');
    }
  } catch { /* ignore */ }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PORTAL_PROGRESS_EVENT, { detail: { completed: [] } }));
  }
}

/**
 * Unlock all portals (for developer/tester convenience).
 */
export function unlockAllPortals(): void {
  const all = new Set(PORTAL_ORDER);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...all]));
    }
  } catch { /* ignore */ }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PORTAL_PROGRESS_EVENT, { detail: { completed: [...all] } }));
  }
}

/**
 * React hook for reactive portal progression state.
 */
export function usePortalProgress() {
  const [completed, setCompleted] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    return getCompletedPortals();
  });

  useEffect(() => {
    const handler = (event: Event) => {
      if (event instanceof CustomEvent && Array.isArray(event.detail?.completed)) {
        setCompleted(new Set(event.detail.completed));
      } else {
        setCompleted(getCompletedPortals());
      }
    };
    window.addEventListener(PORTAL_PROGRESS_EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(PORTAL_PROGRESS_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  return {
    completed,
    isUnlocked: (id: string) => isPortalUnlocked(id, completed),
    isCompleted: (id: string) => completed.has(id),
    markCompleted: markPortalCompleted,
    reset: resetPortalProgress,
    unlockAll: unlockAllPortals,
  };
}
