/**
 * Metro configuration.
 *
 * react-native-audio-api's source entry (its `react-native`/`source` field
 * points at src/, so Metro bundles from TypeScript source) statically
 * re-exports an <AudioControls> media-player UI component. That component pulls
 * in react-native-gesture-handler and react-native-reanimated — UI-only peer
 * deps the library doesn't declare. We use only the audio graph and never
 * render that UI, so we redirect the AudioControls module to a no-op stub,
 * keeping those native UI libraries (and reanimated's Babel plugin) out of the
 * app. See src/audio/audioControlsStub.js.
 */
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const audioControlsStub = path.resolve(__dirname, 'src/audio/audioControlsStub.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Matches both importers: './controls/AudioControls' (Audio.tsx) and
  // './Audio/controls/AudioControls' (api.ts).
  if (/controls\/AudioControls$/.test(moduleName)) {
    return { type: 'sourceFile', filePath: audioControlsStub };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
