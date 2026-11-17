"use client";

import { useState, type FormEvent } from "react";
import { Info, Pencil, Plus, Search, UsersRound, X } from "lucide-react";
import { Field, type User } from "./ui";
import { Pagination, usePagination } from "./pagination";
import { comparePlayerCategory } from "../lib/collection-order";
import type { Band } from "./community-types";
import "./band-activity.css";

export type BandDirectoryProps = {
  bands: Band[]; user: User | null;
  onCreate: () => void; onEdit: (band: Band) => void;
};

export function BandDirectory({ bands, user, onCreate, onEdit }: BandDirectoryProps) {
  const [query, setQuery] = useState("");
  const keyword = query.trim().toLowerCase();
  const ownBand = user ? bands.find(band => band.captainId === user.id) : undefined;
  const filtered = bands.filter(band => `${band.name} ${band.captainName} ${band.members.map(member => member.gameId).join(" ")}`.toLowerCase().includes(keyword))
    .sort((a, b) => b.createdAt - a.createdAt || comparePlayerCategory(a.captainName, b.captainName));
  const pagination = usePagination(filtered, keyword);
  return <>
    <div className="page-heading directory-heading">
      <h1 className="page-title">乐队 <span className="chip">{bands.length}</span></h1>
      <button className="btn primary" onClick={() => ownBand ? onEdit(ownBand) : onCreate()}>{ownBand ? <Pencil size={17} /> : <Plus size={18} />}{ownBand ? "编辑我的乐队" : "新建乐队"}</button>
    </div>
    <div className="toolbar"><div className="search-field"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索乐队、队长或成员" aria-label="搜索乐队" />{query && <button type="button" aria-label="清空乐队搜索" onClick={() => setQuery("")}><X size={15} /></button>}</div></div>
    <div ref={pagination.anchorRef} className="pagination-anchor" />
    {filtered.length ? <div className="directory-grid band-grid">{pagination.items.map(band => <article className="band-card" key={band.id}>
      <div className="band-card-heading"><span className="band-icon" aria-hidden="true"><UsersRound size={23} /></span>{band.isMember && <span className="genre-tag">已加入</span>}</div>
      <h2>{band.name}</h2>
      <div className="band-captain"><span>队长</span><strong>{band.captainName}</strong></div>
      <div className="band-members-heading">成员 <span>{band.members.length}</span></div>
      {band.members.length ? <ul className="band-members">{band.members.map(member => <li key={member.id}><span>{member.gameId}</span>{!member.registered && <small>未注册</small>}</li>)}</ul> : <p className="band-no-members">暂无成员</p>}
      {band.canManage && <div className="band-card-actions"><button className="btn secondary small" onClick={() => onEdit(band)} aria-label={`编辑乐队 ${band.name}`}><Pencil size={15} />编辑</button></div>}
    </article>)}</div> : <div className="empty-state">{keyword ? "未找到乐队" : "暂无乐队"}</div>}
    <Pagination {...pagination} label="乐队分页" />
  </>;
}

export type BandFormProps = {
  band?: Band | null; user: User; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  busy?: boolean; error?: string;
};

export function BandForm({ band, user, onSubmit, busy = false, error = "" }: BandFormProps) {
  return <form onSubmit={onSubmit} className="community-form">
    <Field label="乐队名称"><input className="input" name="name" required maxLength={80} defaultValue={band?.name || ""} disabled={busy} autoComplete="off" /></Field>
    <Field label="队长"><input className="input" value={band?.captainName || user.gameId} readOnly /></Field>
    <Field label="成员 ID" hint="可留空。每行一个，或用逗号分隔；未注册成员会在注册后自动加入。"><textarea className="textarea" name="memberGameIds" defaultValue={band?.members.map(member => member.gameId).join("\n") || ""} rows={5} maxLength={6400} disabled={busy} placeholder="输入成员的游戏 ID" /></Field>
    {error && <div className="error-message" role="alert"><Info size={16} />{error}</div>}
    <div className="modal-footer"><button className="btn primary" disabled={busy}>{busy ? "正在保存…" : band ? "保存修改" : "创建乐队"}</button></div>
  </form>;
}
