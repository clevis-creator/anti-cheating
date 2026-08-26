import { useCallback, useEffect, useRef } from 'react';
import { responsesAPI } from '../services/api';

const FOCUS_GROUP = new Set(['tab_switch', 'focus_loss']);
const DEFAULT_COOLDOWN_MS = 10_000;

/**
 * Browser-based exam security hooks.
 * Respects per-exam antiCheat settings from the exam builder.
 */
export function useAntiCheat({
  enabled,
  responseId,
  requireFullscreen,
  antiCheat = {},
  onWarning,
  onAutoSubmit,
}) {
  const reportingRef = useRef(false);
  const lastWarningRef = useRef({});

  const reportWarning = useCallback(
    async (type, message) => {
      if (!enabled || !responseId || reportingRef.current) return;

      const now = Date.now();
      const last = lastWarningRef.current[type] || 0;
      const lastFocus = Math.max(
        lastWarningRef.current.tab_switch || 0,
        lastWarningRef.current.focus_loss || 0
      );
      if (FOCUS_GROUP.has(type) && now - lastFocus < DEFAULT_COOLDOWN_MS) return;
      if (!FOCUS_GROUP.has(type) && now - last < DEFAULT_COOLDOWN_MS) return;

      reportingRef.current = true;
      try {
        const { data } = await responsesAPI.warning(responseId, { type, message });
        if (data.data.skipped) return;

        lastWarningRef.current[type] = now;
        if (FOCUS_GROUP.has(type)) {
          lastWarningRef.current.tab_switch = now;
          lastWarningRef.current.focus_loss = now;
        }

        onWarning?.(data.data.warnings, type, message);
        if (data.data.autoSubmitted) {
          onAutoSubmit?.();
        }
      } catch (err) {
        console.error('Warning report failed', err);
      } finally {
        reportingRef.current = false;
      }
    },
    [enabled, responseId, onWarning, onAutoSubmit]
  );

  useEffect(() => {
    if (!enabled) return undefined;

    const prevent = (e) => {
      e.preventDefault();
      return false;
    };

    const onCopy = (e) => {
      prevent(e);
      reportWarning('copy_paste', 'Copy/paste attempted');
    };
    const onContext = (e) => {
      prevent(e);
      reportWarning('right_click', 'Right-click attempted');
    };
    const onKeyDown = (e) => {
      const key = e.key?.toLowerCase();
      const blocked =
        (e.ctrlKey || e.metaKey) &&
        ['c', 'v', 'x', 'a', 'p', 's', 'u'].includes(key);
      const devtools =
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(key));
      if (blocked || devtools || e.key === 'PrintScreen') {
        e.preventDefault();
        reportWarning(
          devtools ? 'devtools' : 'shortcut',
          `Blocked shortcut: ${e.key}`
        );
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        reportWarning('tab_switch', 'Tab switch or window hidden detected');
      }
    };

    const onBlur = () => {
      if (document.hidden) return;
      reportWarning('focus_loss', 'Browser focus lost');
    };

    const onFullscreenChange = () => {
      if (requireFullscreen && !document.fullscreenElement) {
        reportWarning('fullscreen_exit', 'Exited fullscreen mode');
      }
    };

    const cleanups = [];

    if (antiCheat.disableCopyPaste !== false) {
      document.addEventListener('copy', onCopy);
      document.addEventListener('cut', onCopy);
      document.addEventListener('paste', onCopy);
      cleanups.push(() => {
        document.removeEventListener('copy', onCopy);
        document.removeEventListener('cut', onCopy);
        document.removeEventListener('paste', onCopy);
      });
    }

    if (antiCheat.disableRightClick !== false) {
      document.addEventListener('contextmenu', onContext);
      cleanups.push(() => document.removeEventListener('contextmenu', onContext));
    }

    const onSelectStart = (e) => {
      prevent(e);
      reportWarning('shortcut', 'Text selection attempted');
    };

    if (antiCheat.disableSelection !== false) {
      document.addEventListener('selectstart', onSelectStart);
      cleanups.push(() => document.removeEventListener('selectstart', onSelectStart));
    }

    if (antiCheat.disableCopyPaste !== false || antiCheat.blockDevTools !== false) {
      document.addEventListener('keydown', onKeyDown);
      cleanups.push(() => document.removeEventListener('keydown', onKeyDown));
    }

    if (antiCheat.detectTabSwitch !== false) {
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('blur', onBlur);
      cleanups.push(() => {
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('blur', onBlur);
      });
    }

    if (requireFullscreen) {
      document.addEventListener('fullscreenchange', onFullscreenChange);
      cleanups.push(() => document.removeEventListener('fullscreenchange', onFullscreenChange));
    }

    let dtInterval;
    if (antiCheat.blockDevTools !== false) {
      dtInterval = setInterval(() => {
        const widthDiff = window.outerWidth - window.innerWidth > 160;
        const heightDiff = window.outerHeight - window.innerHeight > 160;
        if (widthDiff || heightDiff) {
          reportWarning('devtools', 'Possible developer tools open');
        }
      }, 4000);
      cleanups.push(() => clearInterval(dtInterval));
    }

    return () => cleanups.forEach((fn) => fn());
  }, [enabled, requireFullscreen, antiCheat, reportWarning]);

  const enterFullscreen = useCallback(async () => {
    try {
      if (requireFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Browsers may block without user gesture
    }
  }, [requireFullscreen]);

  return { enterFullscreen, reportWarning };
}

export default useAntiCheat;
