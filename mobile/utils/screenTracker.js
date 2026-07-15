/**
 * useScreenTracking — best-effort screen-view instrumentation for the behavior
 * heatmap. Times each screen, batches views, and flushes to
 * POST /api/analytics/screens. Marks the screen the app is backgrounded on as
 * an "exit" (a drop-off signal). Fully non-fatal: every path swallows errors so
 * analytics can never affect the user experience.
 */
import { useEffect, useRef } from 'react';
import { usePathname } from 'expo-router';
import { AppState } from 'react-native';
import { logScreenViews } from '../services/api';

function cleanName(path) {
  try {
    if (!path) return 'unknown';
    var p = String(path).split('?')[0].replace(/^\/+/, '');
    p = p.replace(/\((?:tabs|auth|modals|onboarding)\)\/?/g, ''); // drop route groups
    p = p.replace(/\/+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    if (!p || p === 'index') return 'home';
    return p.slice(0, 40);
  } catch (e) { return 'unknown'; }
}

export function useScreenTracking() {
  var pathname = usePathname();
  var current = useRef(null);
  var enteredAt = useRef(Date.now());
  var buffer = useRef([]);

  function flush(extra) {
    try {
      if (extra) buffer.current.push(extra);
      if (!buffer.current.length) return;
      var batch = buffer.current.splice(0, buffer.current.length);
      logScreenViews(batch);
    } catch (e) { /* never throw */ }
  }

  // On navigation: record time spent on the screen we're leaving.
  useEffect(function () {
    try {
      var now = Date.now();
      if (current.current != null) {
        buffer.current.push({ screen: current.current, ms: now - enteredAt.current });
        if (buffer.current.length >= 6) flush();
      }
      current.current = cleanName(pathname);
      enteredAt.current = now;
    } catch (e) { /* non-fatal */ }
  }, [pathname]);

  // On background: flush and mark the current screen as an exit (drop-off).
  useEffect(function () {
    var sub = AppState.addEventListener('change', function (state) {
      if (state === 'background' || state === 'inactive') {
        flush({ screen: current.current || 'unknown', ms: Date.now() - enteredAt.current, exit: true });
        enteredAt.current = Date.now();
      }
    });
    return function () { try { sub && sub.remove && sub.remove(); } catch (e) {} };
  }, []);
}
