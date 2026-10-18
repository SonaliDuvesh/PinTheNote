import React, { useEffect } from 'react';
import LivingRunningCat from './LivingRunningCat';

/**
 * LivingTheme
 * 
 * Living environment coordinator for Living L and Living D themes.
 * Renders the natural running sanctuary cat and preserves celebration event handling.
 */
export default function LivingTheme({ activeTab, onCelebrationRef, activeTheme }) {
  const isLiving = activeTheme === 'living_light' || activeTheme === 'living_dark';

  // Workspace Event Reactivity (Pomodoro done, Note saved, Voice recording)
  useEffect(() => {
    if (!onCelebrationRef) return;

    onCelebrationRef.current = (type) => {
      // Event listener maintained for workspace activity compatibility
    };
  }, [onCelebrationRef]);

  return (
    <>
      {/* Living Sanctuary Running Cat (Living L & Living D only) */}
      {isLiving && (
        <LivingRunningCat
          activeTheme={activeTheme}
          isMochiVisible={false}
        />
      )}
    </>
  );
}
