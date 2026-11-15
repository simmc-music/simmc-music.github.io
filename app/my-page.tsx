"use client";

import { useState } from "react";
import { ArrowRight, CalendarDays, Heart, MapPin, Music2, Pencil, Store, Trash2, UserRound, Waves } from "lucide-react";
import { songArtist } from "../lib/song-display";
import { CoverImage } from "./cover-image";
import { Pagination, usePagination } from "./pagination";
import { compareSongs, compareShops, compareVenues } from "../lib/collection-order";
import { amount, coords, shopCoords, samePlayer, type Data, type Shop, type Song, type Venue } from "./ui";
import "./my-page.css";

type MyPageProps = {
  data: Data;
  onProfile: () => void;
  onLogin: () => void;
  onSong: (song: Song) => void;
  onEditSong: (song: Song) => void;
  onDeleteSong: (song: Song) => void;
  onShop: (shop: Shop) => void;
  onEditShop: (shop: Shop) => void;
  onDeleteShop: (shop: Shop) => void;
  onVenue: (venue: Venue) => void;
  onEditVenue: (venue: Venue) => void;
  onDeleteVenue: (venue: Venue) => void;
  onFavorite: (song: Song) => void;
  favoriteBusyId?: string | null;
  busy?: boolean;
};

type Collection = "songs" | "favorites" | "shops" | "venues";

export function MyPage({ data, onProfile, onLogin, onSong, onEditSong, onDeleteSong, onShop, onEditShop, onDeleteShop, onVenue, onEditVenue, onDeleteVenue, onFavorite, favoriteBusyId, busy = false }: MyPageProps) {
  const [collection, setCollection] = useState<Collection>("songs");
  const user = data.user;
  const ownSongs = data.songs.filter(song => samePlayer(song.owner,user?.gameId)).sort(compareSongs);
  const favorites = data.songs.filter(song => song.isFavorited).sort(compareSongs);
  const ownShops = data.shops.filter(shop => !!user && (shop.ownerId === user.id || shop.creatorId === user.id)).sort(compareShops);
  const ownVenues = data.livehouses.filter(venue => samePlayer(venue.owner,user?.gameId)).sort(compareVenues);
  const songsPage = usePagination(ownSongs, user?.id ?? "");
  const favoritesPage = usePagination(favorites, user?.id ?? "");
  const shopsPage = usePagination(ownShops, user?.id ?? "");
  const venuesPage = usePagination(ownVenues, user?.id ?? "");
  const pagination = collection === "songs" ? songsPage : collection === "favorites" ? favoritesPage : collection === "shops" ? shopsPage : venuesPage;


  if (!user) return <section className="my-page">
    <div className="page-heading"><h1 className="page-title">我的</h1></div>
    <div className="mine-signin">
      <UserRound size={34} strokeWidth={1.4} />
      <button className="btn primary" onClick={onLogin}>登录 / 注册</button>
    </div>
  </section>;

  const tabs = [
    { id: "songs" as const, label: "我的音乐", count: ownSongs.length, icon: Music2 },
    { id: "favorites" as const, label: "红心收藏", count: favorites.length, icon: Heart },
    { id: "shops" as const, label: "我的商店", count: ownShops.length, icon: Store },
    { id: "venues" as const, label: "我的 Livehouse", count: ownVenues.length, icon: CalendarDays },
  ];
  const selected = tabs.find(tab => tab.id === collection)!;
  const songs = collection === "favorites" ? favoritesPage.items : songsPage.items;

  return <section className="my-page">
    <div className="page-heading"><h1 className="page-title">我的</h1></div>
    <div className="mine-profile">
      <CoverImage src={user.avatarUrl} name={user.gameId} identity={user.gameId} kind="avatar" className="mine-avatar" />
      <div className="mine-profile-copy">
        <h2>{user.gameId}</h2>
        <p>{user.bio || "暂无简介"}</p>
        {user.contact && <p className="contact-text">{user.contact}</p>}
      </div>
      <button className="btn secondary" onClick={onProfile}><Pencil size={15} />个人主页</button>
    </div>

    <nav className="mine-tabs" aria-label="我的内容">
      {tabs.map(({ id, label, count, icon: Icon }) => <button key={id} className={collection === id ? "active" : ""} aria-pressed={collection === id} onClick={() => setCollection(id)}>
        <Icon size={17} /><span>{label}</span><span className="mine-tab-count">{count}</span>
      </button>)}
    </nav>

    <section className="mine-collection" aria-label={selected.label}>
      <div ref={pagination.anchorRef} className="pagination-anchor" />
      <h2 className="mine-collection-title">{selected.label}<span className="chip">{selected.count}</span></h2>
      {(collection === "songs" || collection === "favorites") && (songs.length ? <div className="song-grid mine-song-grid">
        {songs.map(song => <article className="mine-song-card" key={song.id}>
          <button className="mine-song-open" onClick={() => onSong(song)} aria-label={`查看乐曲 ${song.title}`}>
            <CoverImage src={song.imageUrl} name={song.title} identity={song.id} kind="song" className="mine-song-cover" />
            <span className="mine-song-copy">
              <span className="genre-tag song-kind">类型：{song.genre}</span>
              <strong className="mine-item-title">{song.title}</strong>
              <span className="mine-song-artist">{songArtist(song)}</span>
              <span className="mine-song-meta"><span>{song.bars ? `${song.bars} 小节` : ""}</span><strong>{amount(song)}{!song.customPrice && " 云币"}</strong></span>
            </span>
          </button>
          <div className="mine-card-actions">
            <button className={`mine-heart ${song.isFavorited ? "active" : ""}`} onClick={() => onFavorite(song)} disabled={busy || favoriteBusyId === song.id} aria-pressed={song.isFavorited} aria-label={`${song.isFavorited ? "取消收藏" : "收藏"} ${song.title}`}>
              <Heart size={17} fill={song.isFavorited ? "currentColor" : "none"} /><span>{song.favoriteCount ?? 0}</span>
            </button>
            {song.canEdit && <div className="mine-manage-actions">
              <button className="icon-btn" onClick={() => onEditSong(song)} aria-label={`编辑乐曲 ${song.title}`} title="编辑乐曲"><Pencil size={15} /></button>
              <button className="icon-btn danger" onClick={() => onDeleteSong(song)} aria-label={`删除乐曲 ${song.title}`} title="删除乐曲"><Trash2 size={15} /></button>
            </div>}
          </div>
        </article>)}
      </div> : <div className="empty-state">{collection === "favorites" ? "暂无收藏" : "暂无乐曲"}</div>)}

      {collection === "shops" && (ownShops.length ? <div className="directory-grid mine-place-grid">
        {shopsPage.items.map(shop => <article className="mine-place-card" key={shop.id}>
          <button className="mine-venue-open" onClick={() => onShop(shop)} aria-label={`查看商店 ${shop.name} 的乐曲`}>
          <CoverImage src={shop.imageUrl} name={shop.name} identity={shop.id} kind="shop" className="mine-place-cover" />
          <div className="mine-place-copy">
            <h3 className="mine-item-title">{shop.name}</h3>
            {shop.owner && <p className="mine-place-owner">所有者：{shop.owner}</p>}
            <div className="info-list">
              <div className="info-row"><MapPin size={16} /><span>{shopCoords(shop)}</span></div>
              {shop.port && <div className="info-row"><Waves size={16} /><span>{shop.port}</span></div>}
            </div>
          </div>
          </button>
          {shop.canManage && <div className="mine-card-actions mine-place-actions">
            <button className="btn secondary small" onClick={() => onEditShop(shop)} aria-label={`编辑商店 ${shop.name}`}><Pencil size={15} />编辑</button>
            <button className="btn ghost danger small" onClick={() => onDeleteShop(shop)} aria-label={`删除商店 ${shop.name}`}><Trash2 size={15} />删除</button>
          </div>}
        </article>)}
      </div> : <div className="empty-state">暂无商店</div>)}

      {collection === "venues" && (ownVenues.length ? <div className="directory-grid mine-place-grid">
        {venuesPage.items.map(venue => <article className="mine-place-card" key={venue.id}>
          <button className="mine-venue-open" onClick={() => onVenue(venue)} aria-label={`查看 ${venue.name} 主页`}>
            <CoverImage src={venue.imageUrl} name={venue.name} identity={venue.id} kind="venue" className="mine-place-cover" />
            <span className="mine-place-copy">
              <strong className="mine-item-title">{venue.name}</strong>
              <span className="info-list">
                <span className="info-row"><MapPin size={16} /><span>{coords(venue)}</span></span>
                {venue.port && <span className="info-row"><Waves size={16} /><span>{venue.port}</span></span>}
              </span>
            </span>
          </button>
          <div className="mine-card-actions mine-place-actions">
            <button className="text-link" onClick={() => onVenue(venue)}>查看排班<ArrowRight size={14} /></button>
            {!venue.protected && <div className="mine-manage-actions">
              <button className="icon-btn" onClick={() => onEditVenue(venue)} aria-label={`编辑 Livehouse ${venue.name}`} title="编辑 Livehouse"><Pencil size={15} /></button>
              <button className="icon-btn danger" onClick={() => onDeleteVenue(venue)} aria-label={`删除 Livehouse ${venue.name}`} title="删除 Livehouse"><Trash2 size={15} /></button>
            </div>}
          </div>
        </article>)}
      </div> : <div className="empty-state">暂无 Livehouse</div>)}
      <Pagination {...pagination} label={`${selected.label}分页`} />
    </section>
  </section>;
}
