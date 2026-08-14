import { createAudioPlayer, AudioPlayer } from "expo-audio";

let successPlayer: AudioPlayer | null = null;
let wrongPlayer: AudioPlayer | null = null;

function ensurePlayers() {
  try {
    if (!successPlayer) successPlayer = createAudioPlayer(require("../assets/sounds/success.wav"));
    if (!wrongPlayer) wrongPlayer = createAudioPlayer(require("../assets/sounds/wrong.wav"));
  } catch {
    // audio not available (e.g. web) — silently ignore
  }
}

export function playSuccess() {
  try {
    ensurePlayers();
    if (successPlayer) {
      successPlayer.seekTo(0);
      successPlayer.play();
    }
  } catch {
    // ignore
  }
}

export function playWrong() {
  try {
    ensurePlayers();
    if (wrongPlayer) {
      wrongPlayer.seekTo(0);
      wrongPlayer.play();
    }
  } catch {
    // ignore
  }
}
