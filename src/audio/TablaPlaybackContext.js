import React, { createContext, useContext, useState } from 'react';

const TablaPlaybackContext = createContext(null);

export function TablaPlaybackProvider({ children }) {
  const [playbackState, setPlaybackState] = useState({
    isPlaying: false,
    currentMatra: 0,
    taal: null,
    bpm: 80,
  });

  const updatePlayback = (updates) => {
    setPlaybackState((prev) => ({ ...prev, ...updates }));
  };

  return (
    <TablaPlaybackContext.Provider value={{ playbackState, updatePlayback }}>
      {children}
    </TablaPlaybackContext.Provider>
  );
}

export function useTablaPlayback() {
  const ctx = useContext(TablaPlaybackContext);
  if (!ctx) throw new Error('useTablaPlayback must be used within TablaPlaybackProvider');
  return ctx;
}
