# Tabla App

A mobile-first Tanpura and Tabla practice companion built for Gurmat Sangeet (Sikh devotional music) practitioners. Play a tanpura drone alongside tabla rhythmic patterns with full customization of taals, scales, and string tunings.

## Features

### Tanpura
- 4-string tanpura drone with configurable swar and saptak per string
  (defaults to the traditional Pa · Sa · Sa · Sa-mandra tuning)
- Scale selector (C through B) with interactive harmonium keyboard —
  wired to the engine, persisted across launches
- Speed control for pluck interval
- Real pluck recordings at four pitches; the engine picks the nearest
  recording per string and pitch-shifts only the remainder

### Tabla
- 8 built-in taals: Teentaal, Ektaal, Jhaptaal, Rupak, Dadra, Keherwa, Chautaal, and Addha (Gurmat Sangeet)
- Theka display with vibhag markers (sam, khali, tali) — auto-hides on narrow screens
- Live bol and beat display in a tappable info box
- Tap tempo for BPM detection
- BPM slider (1–400) with nudge buttons
- Partaal support: queue a taal change that takes effect on the next sam

### Taal Editor
- Create custom taals from scratch using a bol palette
- Edit any built-in or custom taal (built-ins save as copies)
- Define vibhag breaks and khali markers
- Add named variations (alternate thekas) to any taal
- Responsive 2-column grid layout on wider screens with theka previews
- Custom taals persist in SQLite

### Volume & Mixing
- Independent volume sliders for tanpura and tabla
- Master volume control
- Shared volume context — adjust from the tanpura screen, applies across both engines

### Mini Playback Widgets
- When tabla or tanpura is playing, a small overlay widget appears on other tabs showing the current bol/beat or swar/string in real time

### Themes
- 4 color themes: Saffron, Ocean, Light, Royal
- Theme selection in Settings with color preview cards
- Persisted via AsyncStorage

### Custom Tab Icons
- Hand-drawn SVG icons for each tab: tanpura (with gourd, neck, strings), tabla (dayan + bayan pair), editor (note + pencil), settings (gear)

## Tech Stack

- **React Native** with **Expo SDK 55**
- **expo-router** for tab-based navigation
- **expo-audio** for sample playback (`createAudioPlayer`)
- **expo-sqlite** for offline storage of custom taals and preferences
- **react-native-svg** for custom tab icons and harmonium keyboard
- **AsyncStorage** for theme persistence
- Plain JavaScript (`.js` / `.jsx`) — no TypeScript

## Project Structure

```
app/
  _layout.jsx          # Root layout: providers + tab navigation
  index.jsx            # Tanpura tab
  tabla.jsx            # Tabla tab
  editor.jsx           # Taal editor tab
  settings.jsx         # Settings tab

src/
  audio/
    TanpuraEngine.js         # Tanpura playback engine
    TablaEngine.js           # Tabla sequencer engine
    VolumeContext.js          # Shared volume state
    TablaPlaybackContext.js   # Tabla state for mini widget
    TanpuraPlaybackContext.js # Tanpura state for mini widget
  components/
    TabIcons.jsx             # Custom SVG tab icons
    MiniTablaWidget.jsx      # Playback overlay widgets
  db/
    database.js              # SQLite CRUD for taals and preferences
  models/
    taals.js                 # Built-in taal definitions
  screens/
    TanpuraScreen.jsx        # Tanpura UI
    TablaScreen.jsx          # Tabla UI
    TaalEditorScreen.jsx     # Taal editor UI
    SettingsScreen.jsx       # Theme picker UI
  utils/
    ThemeContext.js           # Theme provider with 4 themes

  components/ui/
    Card.jsx                 # Surface card with section label
    PlayButton.jsx           # Circular play/stop with breathing glow
    Slider.jsx               # Shared touch slider (BPM, speed, mixer)
  audio/
    bolMap.js                # Bol -> stroke sub-hit mapping + fallbacks
    tablaSamples.js          # Tabla stroke sample sources
    tanpuraSamples.js        # Tanpura pluck sample set + root pitch

assets/
  samples/tabla/*.wav        # 11 tabla strokes (CC BY 4.0, see ATTRIBUTIONS.md)
  samples/tanpura/*.mp3      # Matched 4-string tanpura pluck set (CC0)
```

## Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npx expo start
```

Then open in Expo Go on your device, or press `w` for web.

## Audio Samples

The app ships with real, openly-licensed recordings (see [ATTRIBUTIONS.md](ATTRIBUTIONS.md)):

- **Tabla:** 11 individual stroke samples (dha, dhin, tin, ta, na, ge, ke, kat, ti, te, tun)
  from the CC-BY-4.0 "Tabla strokes dataset" by Subodh Deolekar, tuned to C#.
  Compound bols (Tete, Tirakita, Kda, Gadi, Dhere) are voiced by scheduling
  multiple sub-hits inside a matra via `src/audio/bolMap.js`; missing strokes
  degrade gracefully through a fallback chain.
- **Tanpura:** a matched CC0 4-string pluck set (Pa G#2, Dha A#2, Sa C#3, Sa C#2)
  by luckylittleraven. The engine picks the nearest recording per string and
  pitch-shifts only the remainder, so the default C# tuning plays unshifted.

## License

MIT
