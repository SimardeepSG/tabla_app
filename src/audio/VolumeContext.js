import React, { createContext, useContext, useState, useRef } from 'react';

const VolumeContext = createContext(null);

export function VolumeProvider({ children }) {
  const [masterVolume, setMasterVolume] = useState(1.0);
  const [tanpuraVolume, setTanpuraVolume] = useState(1.0);
  const [tablaVolume, setTablaVolume] = useState(1.0);

  // Engine refs so volume changes can be applied from any screen
  const tanpuraEngineRef = useRef(null);
  const tablaEngineRef = useRef(null);

  const applyVolumes = (master, tanpura, tabla, tEngine, tabEngine) => {
    const tEng = tEngine || tanpuraEngineRef.current;
    const tabEng = tabEngine || tablaEngineRef.current;
    if (tEng) tEng.setVolume(master * tanpura);
    if (tabEng) tabEng.setVolume(master * tabla);
  };

  const updateMasterVolume = (vol) => {
    setMasterVolume(vol);
    applyVolumes(vol, tanpuraVolume, tablaVolume);
  };

  const updateTanpuraVolume = (vol) => {
    setTanpuraVolume(vol);
    applyVolumes(masterVolume, vol, tablaVolume);
  };

  const updateTablaVolume = (vol) => {
    setTablaVolume(vol);
    applyVolumes(masterVolume, tanpuraVolume, vol);
  };

  const registerTanpuraEngine = (engine) => {
    tanpuraEngineRef.current = engine;
    if (engine) engine.setVolume(masterVolume * tanpuraVolume);
  };

  const registerTablaEngine = (engine) => {
    tablaEngineRef.current = engine;
    if (engine) engine.setVolume(masterVolume * tablaVolume);
  };

  return (
    <VolumeContext.Provider
      value={{
        masterVolume,
        tanpuraVolume,
        tablaVolume,
        updateMasterVolume,
        updateTanpuraVolume,
        updateTablaVolume,
        registerTanpuraEngine,
        registerTablaEngine,
      }}
    >
      {children}
    </VolumeContext.Provider>
  );
}

export function useVolume() {
  const ctx = useContext(VolumeContext);
  if (!ctx) throw new Error('useVolume must be used within VolumeProvider');
  return ctx;
}
