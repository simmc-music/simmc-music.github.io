"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, CalendarDays, Info, MapPin, Pencil, Plus, Search, Trash2, UsersRound, X } from "lucide-react";
import { Field, samePlayer, todayKey, type User, type Venue } from "./ui";
import { Pagination, usePagination } from "./pagination";
import { PAGE_SIZE, comparePlayerCategory } from "../lib/collection-order";
import type { Activity, ActivitySignup, Band, SignupPayload } from "./community-types";
import "./band-activity.css";

const activityDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });

export type ActivityDirectoryProps = {
  activities: Activity[]; user: User | null; onCreate: () => void;
  onOpen: (activity: Activity) => void; onEdit: (activity: Activity) => void; onDelete: (activity: Activity) => void;
};

export function ActivityDirectory({ activities, user, onCreate, onOpen, onEdit, onDelete }: ActivityDirectoryProps) {
  const [query, setQuery] = useState("");
  const keyword = query.trim().toLowerCase();
  const today = todayKey();
  const filtered = activities.filter(activity => `${activity.name} ${activity.location} ${activity.description}`.toLowerCase().includes(keyword))
    .sort((a, b) => Number(a.date < today) - Number(b.date < today) || (a.date < today ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)) || comparePlayerCategory(a.ownerName, b.ownerName));
  const pagination = usePagination(filtered, keyword);
  return <>
    <div className="page-heading directory-heading"><h1 className="page-title">活动 <span className="chip">{activities.length}</span></h1><button className="btn primary" onClick={onCreate}><Plus size={18} />新建活动</button></div>
    <div className="toolbar"><div className="search-field"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索活动或地点" aria-label="搜索活动" />{query && <button type="button" aria-label="清空活动搜索" onClick={() => setQuery("")}><X size={15} /></button>}</div></div>
    <div ref={pagination.anchorRef} className="pagination-anchor" />
    {filtered.length ? <div className="directory-grid activity-grid">{pagination.items.map(activity => <article className="activity-card" key={activity.id}>
      <button type="button" className="activity-card-open" onClick={() => onOpen(activity)} aria-label={`查看活动 ${activity.name}`}>
        <span className="activity-date"><CalendarDays size={16} />{activityDate(activity.date)}</span>
        <h2>{activity.name}</h2>
        <span className="activity-location"><MapPin size={16} />{activity.location}</span>
        {activity.description && <p className="activity-intro-preview">{activity.description}</p>}
        <span className="activity-card-bottom"><span><UsersRound size={15} />{activity.signupCount} 组报名</span><ArrowRight size={17} /></span>
      </button>
      {user && activity.canManage && <div className="activity-card-actions"><button className="btn secondary small" onClick={() => onEdit(activity)} aria-label={`编辑活动 ${activity.name}`}><Pencil size={15} />编辑</button><button className="btn ghost danger small" onClick={() => onDelete(activity)} aria-label={`删除活动 ${activity.name}`}><Trash2 size={15} />删除</button></div>}
    </article>)}</div> : <div className="empty-state">{keyword ? "未找到活动" : "暂无活动"}</div>}
    <Pagination {...pagination} label="活动分页" />
  </>;
}

export type ActivityFormProps = {
  activity?: Activity | null; user: User; venues: Venue[]; initialDate?: string; initialLivehouseId?: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void; busy?: boolean; error?: string;
};

export function ActivityForm({ activity, user, venues, initialDate, initialLivehouseId, onSubmit, busy = false, error = "" }: ActivityFormProps) {
  const isAdmin = user.role === "admin";
  const linked = activity?.livehouseId || initialLivehouseId || "";
  const dateLocked = !!linked && !isAdmin;
  return <form onSubmit={onSubmit} className="community-form">
    <Field label="活动名称"><input className="input" name="name" required maxLength={100} defaultValue={activity?.name || ""} disabled={busy} /></Field>
    <Field label="日期" hint={dateLocked ? "Livehouse 活动日期由管理员设置。" : undefined}><input className="input" name="date" type="date" required defaultValue={activity?.date || initialDate || todayKey()} readOnly={dateLocked} disabled={busy} /></Field>
    <Field label="地点"><input className="input" name="location" required maxLength={200} defaultValue={activity?.location || venues.find(venue => venue.id === linked)?.name || ""} disabled={busy} placeholder="场地名称或坐标" /></Field>
    {isAdmin && <Field label="安排到 Livehouse"><select className="select" name="livehouseId" defaultValue={linked} disabled={busy}><option value="">不关联 Livehouse</option>{venues.map(venue => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</select></Field>}
    <Field label="介绍"><textarea className="textarea" name="description" required defaultValue={activity?.description || ""} rows={5} maxLength={5000} disabled={busy} /></Field>
    {error && <div className="error-message" role="alert"><Info size={16} />{error}</div>}
    <div className="modal-footer"><button className="btn primary" disabled={busy}>{busy ? "正在保存…" : activity ? "保存修改" : "创建活动"}</button></div>
  </form>;
}

export type ActivityDetailProps = {
  activity: Activity; signups: ActivitySignup[]; user: User | null; bands: Band[];
  onSignup: (payload: SignupPayload) => void; onDeleteSignup: (signup: ActivitySignup) => void;
  busy?: boolean; error?: string;
};

export function ActivityDetail({ activity, signups, user, bands, onSignup, onDeleteSignup, busy = false, error = "" }: ActivityDetailProps) {
  const [kind, setKind] = useState<"individual" | "band">("individual");
  const [guestId, setGuestId] = useState("");
  const [chosenBandId, setChosenBandId] = useState("");
  const ownBands = user ? bands.filter(band => band.isMember || band.captainId === user.id) : [];
  const selectedBand = ownBands.find(band => band.id === chosenBandId) || ownBands[0];
  const activeKind = user ? kind : "individual";
  const entries = signups.filter(signup => signup.activityId === activity.id).sort((a, b) => Number(a.id) - Number(b.id) || a.createdAt - b.createdAt);
  const pagination = usePagination(entries, activity.id);
  const playerId = user?.gameId || guestId.trim();
  const alreadySignedUp = entries.some(signup => activeKind === "band" ? signup.kind === "band" && signup.bandId === selectedBand?.id : signup.kind === "individual" && samePlayer(signup.playerId, playerId));
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || alreadySignedUp) return;
    if (activeKind === "band") { if (selectedBand) onSignup({ kind: "band", bandId: selectedBand.id }); }
    else if (playerId) onSignup({ kind: "individual", playerId });
  }
  return <div className="activity-detail">
    <div className="activity-detail-heading"><span className="activity-date"><CalendarDays size={16} />{activityDate(activity.date)}</span><h3>{activity.name}</h3><p className="activity-location"><MapPin size={17} />{activity.location}</p></div>
    {activity.description && <p className="activity-description">{activity.description}</p>}
    <form className="activity-signup-form" onSubmit={submit}>
      <h4>报名</h4>
      <div className="signup-kind" role="group" aria-label="报名方式"><label><input type="radio" name="signupKind" value="individual" checked={activeKind === "individual"} onChange={() => setKind("individual")} disabled={busy} />个人</label><label title={!user ? "登录后可选择所属乐队" : undefined}><input type="radio" name="signupKind" value="band" checked={activeKind === "band"} onChange={() => setKind("band")} disabled={busy || !user} />乐队</label></div>
      <div className="signup-input-row">{activeKind === "band" ? <Field label="所属乐队"><select className="select" value={selectedBand?.id || ""} onChange={event => setChosenBandId(event.target.value)} disabled={busy || !ownBands.length} required>{!ownBands.length && <option value="">暂无所属乐队</option>}{ownBands.map(band => <option value={band.id} key={band.id}>{band.name}</option>)}</select></Field> : <Field label="游戏 ID"><input className="input" value={user?.gameId || guestId} onChange={event => setGuestId(event.target.value)} readOnly={!!user} disabled={busy} required maxLength={40} placeholder="输入游戏 ID" autoComplete="username" /></Field>}<button className="btn primary" disabled={busy || alreadySignedUp || (activeKind === "band" && !selectedBand)}>{busy ? "处理中…" : alreadySignedUp ? "已报名" : "确认报名"}</button></div>
      {error && <div className="error-message" role="alert"><Info size={16} />{error}</div>}
    </form>
    <div ref={pagination.anchorRef} className="pagination-anchor" />
    <div className="section-heading signup-list-heading"><h4>报名名单 <span className="chip">{entries.length}</span></h4></div>
    {entries.length ? <ol className="activity-signups" start={(pagination.page - 1) * PAGE_SIZE + 1}>{pagination.items.map((signup, index) => <li key={signup.id}><span className="signup-order">{String((pagination.page - 1) * PAGE_SIZE + index + 1).padStart(2, "0")}</span><div className="signup-person"><strong>{signup.displayName || signup.playerId}</strong><span>{signup.kind === "band" ? "乐队" : "个人"}</span></div>{signup.canDelete && <button type="button" className="icon-btn danger" disabled={busy} aria-label={`取消 ${signup.displayName || signup.playerId} 的报名`} onClick={() => onDeleteSignup(signup)}><Trash2 size={16} /></button>}</li>)}</ol> : <div className="empty-state compact">暂无报名</div>}
    <Pagination {...pagination} label="活动报名分页" />
  </div>;
}
