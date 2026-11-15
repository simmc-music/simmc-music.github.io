import type { Artist, Shop, Song, Venue } from "../app/ui";

export const PAGE_SIZE = 20;

/** Ordinary Minecraft IDs may also contain digits and underscores. */
export function comparePlayerCategory(a: string | null, b: string | null) {
  return Number(!/^[A-Za-z0-9_]+$/.test(a ?? "")) - Number(!/^[A-Za-z0-9_]+$/.test(b ?? ""));
}

export function createRandomSeed() {
  return globalThis.crypto?.getRandomValues
    ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0]
    : Math.floor(Math.random() * 0x100000000);
}

/** One seed assigns each song a repeatable rank, independent of filtering or pages. */
export function randomSongRank(id: string, seed: number) {
  let hash = (2166136261 ^ seed) >>> 0;
  for (let index = 0; index < id.length; index++) {
    hash = Math.imul(hash ^ id.charCodeAt(index), 16777619);
  }
  // Avalanche the hash so nearby IDs/seeds do not produce nearby positions.
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  return (hash ^ (hash >>> 16)) >>> 0;
}

export function compareSongs(a: Song, b: Song, order = "newest", randomSeed = 0) {
  if (order === "random") {
    return randomSongRank(a.id, randomSeed) - randomSongRank(b.id, randomSeed)
      || comparePlayerCategory(a.owner, b.owner)
      || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  }
  const primary = order === "newest"
    ? (b.createdAt ?? 0) - (a.createdAt ?? 0)
    : Number(a.customPrice) - Number(b.customPrice)
      || (a.customPrice ? 0 : (Number(a.price) - Number(b.price)) * (order === "desc" ? -1 : 1));
  // Stable Array.sort preserves the existing order inside each equal category.
  return primary || comparePlayerCategory(a.owner, b.owner);
}

export function compareArtists(a: Artist, b: Artist) {
  return b.songCount - a.songCount || comparePlayerCategory(a.gameId, b.gameId)
    || a.gameId.toLowerCase().localeCompare(b.gameId.toLowerCase());
}

export function compareShops(a: Shop, b: Shop) {
  return a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || comparePlayerCategory(a.owner, b.owner);
}

export function compareVenues(a: Venue, b: Venue) {
  return (a.createdAt ?? 0) - (b.createdAt ?? 0) || comparePlayerCategory(a.owner, b.owner);
}

export function paginate<T>(items: T[], requestedPage: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.min(pageCount, Math.max(1, Math.trunc(requestedPage) || 1));
  const start = (page - 1) * PAGE_SIZE;
  return { items: items.slice(start, start + PAGE_SIZE), page, pageCount, total: items.length };
}
