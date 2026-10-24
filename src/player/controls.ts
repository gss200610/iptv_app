import type { AudioTrack, SubtitleTrack, VideoPlayer } from 'expo-video';

export function seekPlayer(player: VideoPlayer, seconds: number) {
  player.currentTime = seconds;
}

export function selectAudioTrack(player: VideoPlayer, track: AudioTrack) {
  player.audioTrack = track;
}

export function selectSubtitleTrack(player: VideoPlayer, track: SubtitleTrack | null) {
  player.subtitleTrack = track;
}
