"use client";
import {Heart} from "lucide-react";
import type {Song} from "./ui";
export function FavoriteButton({song,busy=false,onClick,showLabel=false}:{song:Song;busy?:boolean;onClick:()=>void;showLabel?:boolean}) {
  return <button type="button" className={`favorite-button ${song.isFavorited?"is-favorite":""}`} aria-label={`${song.isFavorited?"取消收藏":"收藏"} ${song.title}`} aria-pressed={!!song.isFavorited} disabled={busy} onClick={onClick}>
    <Heart size={17} fill={song.isFavorited?"currentColor":"none"}/>{showLabel&&<span>{song.isFavorited?"已收藏":"收藏"}</span>}<span>{song.favoriteCount||0}</span>
  </button>;
}
