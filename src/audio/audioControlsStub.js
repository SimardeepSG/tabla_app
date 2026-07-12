/**
 * No-op stand-in for react-native-audio-api's <AudioControls> media-player UI.
 *
 * That component (and its audioControlUtils helper) are the only things in the
 * library that import react-native-gesture-handler and react-native-reanimated
 * — both undeclared, UI-only peer dependencies. We use only the audio graph
 * (AudioContext / buffers / sample-accurate scheduling) and never render the
 * built-in player UI, so metro.config.js redirects every AudioControls import
 * here. That keeps gesture-handler, reanimated, and reanimated's Babel plugin
 * out of the app entirely.
 */
const AudioControlsStub = () => null;

export default AudioControlsStub;
