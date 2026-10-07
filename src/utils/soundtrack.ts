export interface MusicTrack {
  title: string

  src: string
}

const TRACK_FILES = [
  "Cachorrão.mp3",

  "CHASING.mp3",

  "Cuando la ciudad duerme.mp3",

  "D-A-Y-D-R-E-A-M.mp3",

  "Dog's Play.wav",

  "Don't wanna go home.mp3",

  "FAIRY TALE DEATH.wav",

  "MA VEUVE.mp3",

  "Nowhere in the world.wav",

  "One More Night.mp3",

  "POCO SER.mp3",

  "procrastiNATION.wav",

  "Shouldn't be here.mp3",
] as const

export const MUSIC_TRACKS: MusicTrack[] = TRACK_FILES.map((file) => ({
  title: file.replace(/\.(mp3|wav)$/i, ""),

  src: `${import.meta.env.BASE_URL}music/${encodeURIComponent(file)}`,
}))

export function getEnabledMusicTracks(mutedTrackSources: string[] = []) {
  const mutedSources = new Set(mutedTrackSources)
  return MUSIC_TRACKS.filter((track) => !mutedSources.has(track.src))
}
