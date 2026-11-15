import type { Song } from "../app/ui";

const unknownArtists = new Set(["", "未知", "未知作者", "原作者未知", "未知原作者", "未注明", "未填写", "不详", "unknown", "unknown artist"]);

/** Keep imported metadata intact; only replace missing author labels in the UI. */
export function songArtist(song: Pick<Song, "artist" | "owner">) {
  const artist = song.artist?.trim() ?? "";
  return unknownArtists.has(artist.toLowerCase()) ? song.owner : artist;
}
