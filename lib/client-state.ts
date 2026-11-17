import { applyCommunityMutation, communityPermissions } from "./community-state";
const samePlayer=(a:string|null|undefined,b:string|null|undefined)=>!!a&&!!b&&a.trim().toLowerCase()===b.trim().toLowerCase();
import type { Artist, Data, Shop, Show, Song, User, Venue } from "../app/ui";

function upsert<T extends { id: string }>(items: T[], item: T, prepend = false): T[] {
  const found = items.some(existing => existing.id === item.id);
  return found ? items.map(existing => existing.id === item.id ? item : existing)
    : prepend ? [item, ...items] : [...items, item];
}

function recountArtists(data: Data): Data {
  const counts = new Map<string, number>();
  for (const song of data.songs) counts.set(song.owner.toLowerCase(), (counts.get(song.owner.toLowerCase()) || 0) + 1);
  const artists: Artist[] = data.artists.flatMap(artist => {
    const songCount = counts.get(artist.gameId.toLowerCase()) || 0;
    return songCount ? [{ ...artist, songCount, ...(artist.id === data.user?.id ? {bio:data.user.bio,avatarUrl:data.user.avatarUrl,contact:data.user.contact,registered:true} : {}) }] : [];
  });
  const user = data.user;
  if (user && counts.has(user.gameId.toLowerCase()) && !artists.some(artist => artist.id === user.id)) {
    artists.push({ id: user.id, gameId: user.gameId, bio: user.bio, avatarUrl:user.avatarUrl, contact:user.contact, registered:true, songCount: counts.get(user.gameId.toLowerCase())! });
  }
  artists.sort((a, b) => b.songCount - a.songCount || a.gameId.toLowerCase().localeCompare(b.gameId.toLowerCase()));
  return { ...data, artists };
}

/** Apply only a server-confirmed change; drafts and failed requests never enter shared state. */
export function applyConfirmedMutation(data: Data, path: string, method: string, response: Record<string, unknown>): Data {
  const parts = path.split("/").filter(Boolean);
  const kind = parts[1], id = parts[2];
  const community=applyCommunityMutation(data,path,method,response);if(community)return community;
  if (kind === "auth") {
    const user = response.user as User | null;
    // Ownership of a previous player's events is not exposed in state. Hide unproven
    // permissions until the authoritative refresh rather than reusing the old session's.
    const ownedVenues = new Set(data.livehouses.filter(venue => samePlayer(venue.owner,user?.gameId)).map(venue => venue.id));
    return { ...data, ...communityPermissions(data,user), user, songs:data.songs.map(song=>({...song,isFavorited:false,canEdit:!!user&&(user.role==='admin'||samePlayer(song.owner,user.gameId))})), events: data.events.map(event => ({ ...event, canDelete: !!user && (user.role === "admin" || samePlayer(user.gameId,event.playerId) || ownedVenues.has(event.livehouseId)) })),
      shops: data.shops.map(shop => ({ ...shop, canManage: !!user && (user.role === "admin" || shop.ownerId === user.id || shop.creatorId === user.id) })) };
  }
  if (kind === "profile") return recountArtists({ ...data, user: response.user as User });
  if (kind === "genres") return { ...data, genres: [...new Set([...data.genres, String(response.name)])] };
  if (parts[3] === "image" && method === "PATCH") {
    const imageUrl = response.imageUrl as string | null;
    if (kind === "livehouses") return { ...data, livehouses: data.livehouses.map(venue => venue.id === id ? { ...venue, imageUrl } : venue) };
    if (kind === "songs") return { ...data, songs: data.songs.map(song => song.id === id ? { ...song, imageUrl } : song) };
  }
  if (kind === "songs" && parts[3] === "favorite" && (method === "PUT" || method === "DELETE")) {
    return {...data,songs:data.songs.map(song=>song.id===id?{...song,favoriteCount:Number(response.favoriteCount),isFavorited:response.isFavorited===true}:song)};
  }
  if (method === "DELETE") {
    if (kind === "livehouses") return { ...data, livehouses: data.livehouses.filter(venue => venue.id !== id), events: data.events.filter(event => event.livehouseId !== id), activities:(data.activities??[]).map(activity=>activity.livehouseId===id?{...activity,livehouseId:null}:activity) };
    if (kind === "events") return { ...data, events: data.events.filter(event => event.id !== id) };
    if (kind === "songs") return recountArtists({ ...data, songs: data.songs.filter(song => song.id !== id) });
    if (kind === "shops") return { ...data, shops: data.shops.filter(shop => shop.id !== id), songs: data.songs.map(song => ({ ...song, shopIds: song.shopIds.filter(shopId => shopId !== id) })) };
  }
  if (kind === "livehouses" && (method === "POST" || method === "PATCH")) return { ...data, livehouses: upsert(data.livehouses, response as Venue) };
  if (kind === "songs" && (method === "POST" || method === "PATCH")) return recountArtists({ ...data, songs: upsert(data.songs, response as Song, true) });
  if (kind === "events" && method === "POST") return { ...data, events: upsert(data.events, { ...response, id: String(response.id), createdAt: String(response.createdAt), canDelete: response.canDelete === true } as Show) };
  if (kind === "shops" && (method === "POST" || method === "PATCH")) return { ...data, shops: upsert(data.shops, response as Shop).sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())) };
  return data;
}

type ReadTask = { controller: AbortController; revision: number; promise: Promise<boolean> };

/** One deduplicated read at a time, invalidated at the START of every mutation. */
export class SnapshotLoader<T> {
  private revision = 0;
  private blocked = false;
  private disposed = false;
  private active: ReadTask | null = null;

  constructor(private fetchSnapshot: (signal: AbortSignal) => Promise<T>, private onSnapshot: (value: T) => void, private onLoadingChange?: (loading: boolean) => void) {}

  private invalidate() {
    this.revision++;
    const previous = this.active;
    this.active = null;
    previous?.controller.abort();
    if (previous) this.onLoadingChange?.(false);
  }
  beginMutation() { this.blocked = true; this.invalidate(); }
  endMutation() { if (!this.disposed) this.blocked = false; }
  dispose() { this.disposed = true; this.blocked = true; this.invalidate(); }

  load(): Promise<boolean> {
    if (this.blocked || this.disposed) return Promise.resolve(false);
    if (this.active) return this.active.promise;
    const task: ReadTask = { controller: new AbortController(), revision: this.revision, promise: Promise.resolve(false) };
    this.active = task;
    this.onLoadingChange?.(true);
    const current = () => !this.disposed && !this.blocked && this.active === task && this.revision === task.revision;
    task.promise = Promise.resolve().then(() => this.fetchSnapshot(task.controller.signal)).then(value => {
      if (!current()) return false;
      this.onSnapshot(value);
      return true;
    }).catch(error => {
      if (!current()) return false;
      throw error;
    }).finally(() => {
      if (this.active === task) { this.active = null; this.onLoadingChange?.(false); }
    });
    return task.promise;
  }
}
