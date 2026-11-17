"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, CalendarDays, Info, MapPin, Pencil, Plus, Search, Trash2, UserRound, UsersRound, X } from "lucide-react";
import { Field, samePlayer, todayKey, type User, type Venue } from "./ui";
import { Pagination, usePagination } from "./pagination";
import { PAGE_SIZE, comparePlayerCategory } from "../lib/collection-order";
import type { Activity, ActivitySignup, Band, SignupPayload } from "./community-types";
import { CoverImage } from "./cover-image";
import { ImagePicker } from "./image-picker";
import "./band-activity.css";
import "./activity-home.css";

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
        <CoverImage src={activity.imageUrl} name={activity.name} identity={`activity:${activity.id}`} kind="venue" className="activity-card-image" />
        <span className="activity-card-body">
        <span className="activity-date"><CalendarDays size={16} />{activityDate(activity.date)}</span>
        <h2>{activity.name}</h2>
        <span className="activity-location"><MapPin size={16} />{activity.location}</span>
        {activity.description && <p className="activity-intro-preview">{activity.description}</p>}
        <span className="activity-card-bottom"><span><UsersRound size={15} />{activity.signupCount} 个节目</span><ArrowRight size={17} /></span>
        </span>
      </button>
      {user && activity.canManage && <div className="activity-card-actions"><button className="btn secondary small" onClick={() => onEdit(activity)} aria-label={`编辑活动 ${activity.name}`}><Pencil size={15} />编辑</button><button className="btn ghost danger small" onClick={() => onDelete(activity)} aria-label={`删除活动 ${activity.name}`}><Trash2 size={15} />删除</button></div>}
    </article>)}</div> : <div className="empty-state">{keyword ? "未找到活动" : "暂无活动"}</div>}
    <Pagination {...pagination} label="活动分页" />
  </>;
}

export type ActivityFormProps = {
  activity?: Activity | null; user: User; venues: Venue[]; initialDate?: string; initialLivehouseId?: string;
  imageDraft: string | null; onImageChange: (value: string | null) => void;
  onImageBusyChange: (busy: boolean) => void; imageBusy?: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void; busy?: boolean; error?: string;
};

export function ActivityForm({ activity, user, venues, initialDate, initialLivehouseId, imageDraft, onImageChange, onImageBusyChange, imageBusy = false, onSubmit, busy = false, error = "" }: ActivityFormProps) {
  const availableVenues = venues.filter(venue => user.role === "admin" || samePlayer(venue.owner, user.gameId));
  const linked = activity?.livehouseId || (availableVenues.some(venue => venue.id === initialLivehouseId) ? initialLivehouseId : "") || "";
  const dateLocked = !!activity?.livehouseId && user.role !== "admin" && !availableVenues.some(venue => venue.id === activity.livehouseId);
  const lockedVenue = dateLocked ? venues.find(venue => venue.id === linked) : undefined;
  return <form onSubmit={onSubmit} className="community-form">
    <ImagePicker value={imageDraft} onChange={onImageChange} onBusyChange={onImageBusyChange} disabled={busy} label="活动图片" />
    <Field label="活动名称"><input className="input" name="name" required maxLength={100} defaultValue={activity?.name || ""} disabled={busy} /></Field>
    <Field label="日期" hint={dateLocked ? "场地与日期由该场地负责人或管理员调整。" : undefined}>{dateLocked ? <input className="input" name="date" type="date" value={activity?.date || ""} readOnly disabled={busy} /> : <input className="input" name="date" type="date" required defaultValue={activity?.date || initialDate || todayKey()} disabled={busy} />}</Field>
    <Field label="地点"><input className="input" name="location" required maxLength={200} defaultValue={activity?.location || venues.find(venue => venue.id === linked)?.name || ""} disabled={busy} placeholder="场地名称或坐标" /></Field>
    <Field label="演出场地"><select className="select" name={dateLocked ? undefined : "livehouseId"} defaultValue={linked} disabled={busy || dateLocked}><option value="">不关联演出场地</option>{dateLocked && <option value={linked}>{lockedVenue?.name || "原关联场地"}</option>}{availableVenues.map(venue => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</select>{dateLocked && <input type="hidden" name="livehouseId" value={linked} />}</Field>
    <Field label="介绍"><textarea className="textarea" name="description" required defaultValue={activity?.description || ""} rows={5} maxLength={5000} disabled={busy} /></Field>
    {error && <div className="error-message" role="alert"><Info size={16} />{error}</div>}
    <div className="modal-footer"><button className="btn primary" disabled={busy || imageBusy}>{imageBusy ? "正在处理图片…" : busy ? "正在保存…" : activity ? "保存修改" : "创建活动"}</button></div>
  </form>;
}

export type ActivitySignupFormProps = {
  activity: Activity; signups: ActivitySignup[]; user: User | null; bands: Band[];
  initialKind?: "individual" | "band"; initialProgramName?: string;
  onSignup: (payload: SignupPayload) => void; onCreateBand: (programName: string) => void;
  busy?: boolean; error?: string;
};

export function ActivitySignupForm({ activity, signups, user, bands, initialKind = "individual", initialProgramName = "", onSignup, onCreateBand, busy = false, error = "" }: ActivitySignupFormProps) {
  const [kind, setKind] = useState<"individual" | "band">(initialKind);
  const [guestId, setGuestId] = useState("");
  const [chosenBandId, setChosenBandId] = useState("");
  const [programName, setProgramName] = useState(initialProgramName);
  const ownBands = user ? bands.filter(band => band.isMember || band.captainId === user.id) : [];
  const selectedBand = ownBands.find(band => band.id === chosenBandId) || ownBands[0];
  const activeKind = user ? kind : "individual";
  const entries = signups.filter(signup => signup.activityId === activity.id);
  const playerId = user?.gameId || guestId.trim();
  const needsBand = activeKind === "band" && !ownBands.length;
  const alreadySignedUp = entries.some(signup => activeKind === "band" ? signup.kind === "band" && signup.bandId === selectedBand?.id : signup.kind === "individual" && samePlayer(signup.playerId, playerId));
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = programName.trim();
    if (busy || alreadySignedUp || !title || needsBand) return;
    if (activeKind === "band") { if (selectedBand) onSignup({ kind: "band", bandId: selectedBand.id, programName: title }); }
    else if (playerId) onSignup({ kind: "individual", playerId, programName: title });
  }
  return <form className="community-form activity-signup-form" onSubmit={submit}>
      <Field label="节目名"><input className="input" name="programName" value={programName} onChange={event => setProgramName(event.target.value)} required maxLength={120} disabled={busy} placeholder="填写演出节目" /></Field>
      <div className="signup-kind" role="group" aria-label="报名方式"><label><input type="radio" name="signupKind" value="individual" checked={activeKind === "individual"} onChange={() => setKind("individual")} disabled={busy} />个人</label><label title={!user ? "登录后可选择所属乐队" : undefined}><input type="radio" name="signupKind" value="band" checked={activeKind === "band"} onChange={() => setKind("band")} disabled={busy || !user} />乐队</label></div>
      {activeKind === "band" ? <Field label="所属乐队"><select className="select" name="bandId" value={selectedBand?.id || ""} onChange={event => setChosenBandId(event.target.value)} disabled={busy || needsBand} required>{needsBand && <option value="">暂无所属乐队</option>}{ownBands.map(band => <option value={band.id} key={band.id}>{band.name}</option>)}</select></Field> : <Field label="游戏 ID"><input className="input" name="playerId" value={user?.gameId || guestId} onChange={event => setGuestId(event.target.value)} readOnly={!!user} disabled={busy} required maxLength={40} placeholder="输入游戏 ID" autoComplete="username" /></Field>}
      {error && <div className="error-message" role="alert"><Info size={16} />{error}</div>}
      <div className="modal-footer">{needsBand ? <button type="button" className="btn primary" disabled={busy} onClick={() => onCreateBand(programName)}><Plus size={17} />创建乐队</button> : <button type="submit" className="btn primary" disabled={busy || alreadySignedUp}>{busy ? "处理中…" : alreadySignedUp ? "已报名" : "确认报名"}</button>}</div>
  </form>;
}

export type ActivityHomeProps = {
  activity: Activity; signups: ActivitySignup[]; user: User | null; busy?: boolean; venueName?: string;
  onSignup: () => void; onEdit: (activity: Activity) => void; onDelete: (activity: Activity) => void;
  onDeleteSignup: (signup: ActivitySignup) => void;
};

export function ActivityHome({ activity, signups, user, busy = false, venueName, onSignup, onEdit, onDelete, onDeleteSignup }: ActivityHomeProps) {
  const entries = signups.filter(signup => signup.activityId === activity.id)
    .sort((a, b) => Number(a.id) - Number(b.id) || a.createdAt - b.createdAt);
  const pagination = usePagination(entries, activity.id);
  return <div className="activity-home">
    <section className="activity-home-summary" aria-labelledby="activity-home-title">
      <CoverImage src={activity.imageUrl} name={activity.name} identity={`activity:${activity.id}`} kind="venue" className="activity-home-image" loading="eager" />
      <div className="activity-home-content">
        <span className="activity-date"><CalendarDays size={16} />{activityDate(activity.date)}</span>
        <h1 id="activity-home-title">{activity.name}</h1>
        <div className="activity-home-location"><MapPin size={17} /><span>{activity.location}{venueName && venueName !== activity.location && <span className="activity-home-venue">演出场地 · {venueName}</span>}</span></div>
        {activity.description && <p className="activity-description">{activity.description}</p>}
        {user && activity.canManage && <div className="activity-home-actions"><button className="btn secondary small" disabled={busy} onClick={() => onEdit(activity)}><Pencil size={15} />编辑活动</button><button className="btn ghost danger small" disabled={busy} onClick={() => onDelete(activity)}><Trash2 size={15} />删除活动</button></div>}
      </div>
    </section>
    <section className="activity-programs-panel" aria-labelledby="activity-programs-title">
      <div ref={pagination.anchorRef} className="pagination-anchor" />
      <div className="activity-programs-heading"><h2 id="activity-programs-title">演出节目 <span className="chip">{entries.length}</span></h2><button type="button" className="btn primary" disabled={busy} onClick={onSignup}><Plus size={17} />报名演出</button></div>
      {entries.length ? <ol className="activity-signups" start={(pagination.page - 1) * PAGE_SIZE + 1}>{pagination.items.map((signup, index) => <li key={signup.id}>
        <span className="signup-order" aria-hidden="true">{String((pagination.page - 1) * PAGE_SIZE + index + 1).padStart(2, "0")}</span>
        <div className="signup-person"><strong>{signup.programName?.trim() || "未填写节目名"}</strong><span className="signup-performer">{signup.kind === "band" ? <UsersRound size={14} /> : <UserRound size={14} />}<span>{signup.displayName || signup.playerId}</span><span className="signup-kind-label">{signup.kind === "band" ? "乐队" : "个人"}</span></span></div>
        {signup.canDelete && <button type="button" className="icon-btn danger" disabled={busy} aria-label={`取消 ${signup.displayName || signup.playerId} 的报名`} onClick={() => onDeleteSignup(signup)}><Trash2 size={16} /></button>}
      </li>)}</ol> : <div className="empty-state compact">暂无演出节目</div>}
      <Pagination {...pagination} label="演出节目分页" />
    </section>
  </div>;
}
