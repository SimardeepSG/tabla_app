/**
 * Resolve a require()'d audio asset to a playable local file URI.
 *
 * In a dev build, require()'d assets are served by Metro over HTTP at an
 * extension-less URL (/assets/?unstable_path=...). iOS AVFoundation cannot
 * infer the format from that URL and its player stalls forever (isLoaded
 * stays false, "evaluatingBufferingRate") — so nothing plays. Downloading the
 * asset to the local cache yields a real file:// .wav/.mp3 that loads
 * reliably. In a production build the asset is already local, so this is a
 * fast no-op. Results are cached so each asset downloads at most once.
 */
import { Asset } from 'expo-asset';

const cache = new Map();

export async function localAudioUri(moduleRef) {
  if (cache.has(moduleRef)) return cache.get(moduleRef);
  const asset = Asset.fromModule(moduleRef);
  await asset.downloadAsync();
  const uri = asset.localUri || asset.uri;
  cache.set(moduleRef, uri);
  return uri;
}
