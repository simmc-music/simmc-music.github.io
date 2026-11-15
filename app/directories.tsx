"use client";

import { useState } from "react";
import { ArrowRight, MapPin, Pencil, Plus, Search, Trash2, UserRound, Waves, X } from "lucide-react";
import { amount, coords, type Artist, type Shop, type Song, type User } from "./ui";
import { CoverImage } from "./cover-image";
import "./directory-images.css";

type ArtistDirectoryProps = {
  artists: Artist[];
  songs: Song[];
  onSelectArtist: (artist: Artist) => void;
};

export function ArtistDirectory({ artists, onSelectArtist }: ArtistDirectoryProps) {
  const [query, setQuery] = useState("");
  const keyword = query.trim().toLocaleLowerCase();
  const filtered = artists.filter((artist) =>
    `${artist.gameId} ${artist.bio}`.toLocaleLowerCase().includes(keyword),
  );

  return <>
    <div className="page-heading directory-heading">
      <h1 className="page-title">艺术家 <span className="chip">{artists.length}</span></h1>
    </div>
    <div className="toolbar">
      <div className="search-field">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索游戏 ID 或简介" aria-label="搜索艺术家" />
        {query && <button type="button" aria-label="清空艺术家搜索" onClick={() => setQuery("")}><X size={15} /></button>}
      </div>
    </div>
    {filtered.length ? <div className="directory-grid">
      {filtered.map((artist) => <button className="artist-card" key={artist.id} onClick={() => onSelectArtist(artist)} aria-label={`查看艺术家 ${artist.gameId}`}>
        <CoverImage src={artist.avatarUrl} name={artist.gameId} identity={artist.gameId} kind="avatar" className="artist-avatar directory-avatar" />
        <h3>{artist.gameId}</h3>
        <span className="artist-count">{artist.songCount} 首作品</span>
        <p className="artist-bio">{artist.bio || "暂无简介"}</p>
      </button>)}
    </div> : <div className="empty-state">{keyword ? "未找到艺术家" : "暂无艺术家"}</div>}
  </>;
}

type ShopDirectoryProps = {
  shops: Shop[];
  user: User | null;
  onCreate: () => void;
  onEdit: (shop: Shop) => void;
  onDelete: (shop: Shop) => void;
};

export function ShopDirectory({ shops, user, onCreate, onEdit, onDelete }: ShopDirectoryProps) {
  const [query, setQuery] = useState("");
  const keyword = query.trim().toLocaleLowerCase();
  const filtered = shops.filter((shop) =>
    `${shop.name} ${shop.port}`.toLocaleLowerCase().includes(keyword),
  );

  return <>
    <div className="page-heading directory-heading">
      <h1 className="page-title">商店 <span className="chip">{shops.length}</span></h1>
      <button className="btn primary" onClick={onCreate}><Plus size={18} />新建商店</button>
    </div>
    <div className="toolbar">
      <div className="search-field">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索商店或港口" aria-label="搜索商店列表" />
        {query && <button type="button" aria-label="清空商店搜索" onClick={() => setQuery("")}><X size={15} /></button>}
      </div>
    </div>
    {filtered.length ? <div className="directory-grid">
      {filtered.map((shop) => <article className="shop-card has-cover" key={shop.id}>
        <CoverImage src={shop.imageUrl} name={shop.name} identity={shop.id} kind="shop" className="shop-card-cover" />
        <div className="shop-card-body">
        <h3>{shop.name}</h3>
        <div className="info-list">
          <div className="info-row"><MapPin size={17} /><span>{coords(shop)}</span></div>
          {shop.port && <div className="info-row"><Waves size={17} /><span>{shop.port}</span></div>}
          {shop.owner && <div className="info-row"><UserRound size={17} /><span>创建者：{shop.owner}</span></div>}
        </div>
        {user && shop.canManage && <div className="shop-actions">
          <button className="btn secondary small" onClick={() => onEdit(shop)} aria-label={`编辑商店 ${shop.name}`}><Pencil size={15} />编辑</button>
          <button className="btn ghost danger small" onClick={() => onDelete(shop)} aria-label={`删除商店 ${shop.name}`}><Trash2 size={15} />删除</button>
        </div>}
        </div>
      </article>)}
    </div> : <div className="empty-state">{keyword ? "未找到商店" : "暂无商店"}</div>}
  </>;
}

type ArtistDetailProps = {
  artist: Artist;
  songs: Song[];
  onSong: (song: Song) => void;
};

export function ArtistDetail({ artist, songs, onSong }: ArtistDetailProps) {
  const works = songs.filter((song) => song.owner === artist.gameId);
  return <>
    <div className="artist-profile">
      <CoverImage src={artist.avatarUrl} name={artist.gameId} identity={artist.gameId} kind="avatar" className="artist-avatar directory-avatar" />
      <div><h3>{artist.gameId}</h3><span className="artist-count">{artist.songCount} 首作品</span></div>
    </div>
    <p className="artist-bio artist-full-bio">{artist.bio || "暂无简介"}</p>
    <div className="artist-works">
      {works.map((song) => <button key={song.id} onClick={() => onSong(song)} className="artist-work">
        <CoverImage src={song.imageUrl} name={song.title} identity={song.id} kind="song" className="artist-work-cover" />
        <span className="artist-work-copy"><strong>{song.title}</strong><small>{song.artist} · {song.genre} · {song.bars} 小节</small></span>
        <span className="artist-work-price">{amount(song)}{!song.customPrice && " 云币"}<ArrowRight size={16} /></span>
      </button>)}
      {!works.length && <div className="empty-state compact">暂无作品</div>}
    </div>
  </>;
}
