"use client";

import { MapPin, UserRound, Waves } from "lucide-react";
import { amount, shopCoords, type Shop, type Song } from "./ui";
import { CoverImage } from "./cover-image";
import { Pagination, usePagination } from "./pagination";
import { compareSongs } from "../lib/collection-order";
import { songArtist } from "../lib/song-display";
import "./shop-detail.css";

type ShopDetailProps = {
  shop: Shop;
  songs: Song[];
  onSong: (song: Song) => void;
};

export function ShopDetail({ shop, songs, onSong }: ShopDetailProps) {
  const works = songs.filter(song => song.shopIds.includes(shop.id)).sort(compareSongs);
  const pagination = usePagination(works, shop.id);

  return <section className="shop-home">
    <div className="shop-home-header">
      <CoverImage src={shop.imageUrl} name={shop.name} identity={shop.id} kind="shop" className="shop-home-cover" />
      <div className="shop-home-info">
        <h1 className="page-title">{shop.name}</h1>
        <div className="info-list">
          <div className="info-row"><MapPin size={17} /><span>{shopCoords(shop)}</span></div>
          {shop.port && <div className="info-row"><Waves size={17} /><span>{shop.port}</span></div>}
          {shop.owner && <div className="info-row"><UserRound size={17} /><span>所有者：{shop.owner}</span></div>}
        </div>
      </div>
    </div>
    <div ref={pagination.anchorRef} className="pagination-anchor" />
    <div className="section-heading"><h2 className="section-title">店内乐曲 <span className="chip">{works.length}</span></h2></div>
    {works.length ? <div className="song-grid">
      {pagination.items.map(song => <article key={song.id} className="song-card">
        <button type="button" className="song-card-link" onClick={() => onSong(song)} aria-label={`查看乐曲 ${song.title}`}>
          <CoverImage className="song-art" kind="song" src={song.imageUrl} name={song.title} identity={song.id} />
          <div className="song-body">
            <span className="genre-tag song-kind">类型：{song.genre}</span>
            <h3 className="song-title">{song.title}</h3>
            <p className="song-artist">{songArtist(song)}</p>
            <div className="song-meta"><span>{song.bars ? `${song.bars} 小节` : ""}</span><strong className="price">{amount(song)}{!song.customPrice && <small> 云币</small>}</strong></div>
          </div>
        </button>

      </article>)}
    </div> : <div className="empty-state">这家商店暂无乐曲</div>}
    <Pagination {...pagination} label="商店乐曲分页" />
  </section>;
}
