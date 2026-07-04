/**
 * Broadcasts the tanpura's live playback state (playing?, current string,
 * string pattern) so other tabs can render the mini playback widget.
 */
import React, { createContext, useContext, useState } from 'react';

const TanpuraPlaybackContext = createContext(null);

export function TanpuraPlaybackProvider({ children }) {
  const [playbackState, setPlaybackState] = useState({
    isPlaying: false,
    currentString: 0,
    pattern: null,
  });

  const updatePlayback = (updates) => {
    setPlaybackState((prev) => ({ ...prev, ...updates }));
  };

  return (
    <TanpuraPlaybackContext.Provider value={{ playbackState, updatePlayback }}>
      {children}
    </TanpuraPlaybackContext.Provider>
  );
}

export function useTanpuraPlayback() {
  const ctx = useContext(TanpuraPlaybackContext);
  if (!ctx) throw new Error('useTanpuraPlayback must be used within TanpuraPlaybackProvider');
  return ctx;
}
