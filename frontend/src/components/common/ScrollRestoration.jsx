// frontend/src/components/common/ScrollRestoration.jsx
import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const STORAGE_PREFIX = '__cc_scroll_';
const scrollCache = new Map();

/**
 * Robust Scroll Restoration Provider for Single Page Applications (React Router).
 * - Restores scroll position on browser Back/Forward (POP navigation) and internal back actions.
 * - Handles asynchronous data loading where DOM content/cards expand after fetch.
 * - Preserves scroll position on in-page button clicks, tabs, and query changes.
 * - Disables native browser scroll interference via history.scrollRestoration = 'manual'.
 * - Safely stops restoration if user manually scrolls with wheel or touch.
 */
export const ScrollRestoration = () => {
  const location = useLocation();
  const navigationType = useNavigationType();

  const prevKeyRef = useRef(null);
  const prevPathRef = useRef(null);
  const cleanupWatcherRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  // Formulate stable storage keys
  const fullKey = `${STORAGE_PREFIX}${location.pathname}${location.search}`;
  const pathKey = `${STORAGE_PREFIX}${location.pathname}`;

  // 1. Configure browser manual scroll restoration on mount
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Helper to save current scroll position for a specific route key
  const saveScrollFor = (key, pathOnlyKey) => {
    if (!key) return;
    const y = Math.round(window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0);
    scrollCache.set(key, y);
    if (pathOnlyKey) scrollCache.set(pathOnlyKey, y);

    try {
      sessionStorage.setItem(key, String(y));
      if (pathOnlyKey) sessionStorage.setItem(pathOnlyKey, String(y));
    } catch (e) {
      // Ignore quota errors in private browsing modes
    }
  };

  // Helper to retrieve saved scroll position
  const getSavedScroll = (key, pathOnlyKey) => {
    if (scrollCache.has(key)) return scrollCache.get(key);
    if (pathOnlyKey && scrollCache.has(pathOnlyKey)) return scrollCache.get(pathOnlyKey);

    try {
      const saved = sessionStorage.getItem(key) || (pathOnlyKey ? sessionStorage.getItem(pathOnlyKey) : null);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        return isNaN(parsed) ? 0 : parsed;
      }
    } catch (e) {
      return 0;
    }
    return 0;
  };

  // 2. Continuous & unmount scroll recording
  useEffect(() => {
    const onScroll = () => {
      if (scrollTimeoutRef.current) return;
      scrollTimeoutRef.current = setTimeout(() => {
        saveScrollFor(fullKey, pathKey);
        scrollTimeoutRef.current = null;
      }, 60);
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      // Synchronously flush scroll on route exit/unmount
      saveScrollFor(fullKey, pathKey);
      window.removeEventListener('scroll', onScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, [fullKey, pathKey]);

  // 3. Smart Scroll Restoration Controller on Location Change
  useEffect(() => {
    // Cancel any active watcher from previous transition
    if (cleanupWatcherRef.current) {
      cleanupWatcherRef.current();
      cleanupWatcherRef.current = null;
    }

    const isPop = navigationType === 'POP';
    const isSamePath = prevPathRef.current === location.pathname;

    // Check if we have a saved position for this route
    const targetY = getSavedScroll(fullKey, pathKey);

    if (isPop || (targetY > 0 && isSamePath)) {
      // Returning to previous view: restore position
      let attempts = 0;
      const maxAttempts = 35; // 35 * 60ms = ~2.1 seconds max polling for async data
      let userInterrupted = false;

      const stopWatcher = () => {
        userInterrupted = true;
        clearInterval(pollTimer);
        window.removeEventListener('wheel', onInteraction);
        window.removeEventListener('touchstart', onInteraction);
        window.removeEventListener('keydown', onInteraction);
      };

      const onInteraction = (e) => {
        // If user actively scrolls or presses navigation keys, yield control to user
        if (e.type === 'wheel' || e.type === 'touchstart' || (e.type === 'keydown' && ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '].includes(e.key))) {
          stopWatcher();
        }
      };

      window.addEventListener('wheel', onInteraction, { passive: true });
      window.addEventListener('touchstart', onInteraction, { passive: true });
      window.addEventListener('keydown', onInteraction, { passive: true });

      // Immediate attempt
      window.scrollTo({ top: targetY, left: 0, behavior: 'instant' });

      // Recurring check to handle asynchronous content loads (cards/events expanding DOM)
      const pollTimer = setInterval(() => {
        if (userInterrupted) return;
        attempts++;

        const currentY = window.scrollY || document.documentElement.scrollTop || 0;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = window.innerHeight;
        const maxScroll = Math.max(0, scrollHeight - clientHeight);
        const desiredY = Math.min(targetY, maxScroll);

        if (desiredY > 0) {
          window.scrollTo({ top: desiredY, left: 0, behavior: 'instant' });
        }

        // Successfully reached target or satisfied height threshold
        if (Math.abs(currentY - targetY) < 5 || (scrollHeight >= targetY + clientHeight && Math.abs(currentY - targetY) < 25)) {
          stopWatcher();
        } else if (attempts >= maxAttempts) {
          stopWatcher();
        }
      }, 60);

      cleanupWatcherRef.current = stopWatcher;
    } else if (navigationType === 'PUSH' && !isSamePath) {
      // Completely new page navigation (e.g. from Home to Login)
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }

    prevKeyRef.current = fullKey;
    prevPathRef.current = location.pathname;

    return () => {
      if (cleanupWatcherRef.current) {
        cleanupWatcherRef.current();
        cleanupWatcherRef.current = null;
      }
    };
  }, [location.pathname, location.search, navigationType, fullKey, pathKey]);

  return null;
};

export default ScrollRestoration;
