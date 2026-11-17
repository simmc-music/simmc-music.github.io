"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Info, Pencil, Plus, Search, UsersRound, X } from "lucide-react";
import { Field, type User } from "./ui";
import { Pagination, usePagination } from "./pagination";
import { comparePlayerCategory } from "../lib/collection-order";
import type { Band } from "./community-types";
import "./band-activity.css";
import "./band-members-input.css";

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
  const captain = band?.captainName || user.gameId;
  const captainKey = captain.trim().toLowerCase();
  const [members, setMembers] = useState<string[]>(() => {
    const unique = new Map<string, string>();
    for (const member of band?.members || []) {
      const name = member.gameId.trim(), key = name.toLowerCase();
      if (key && key !== captainKey && !unique.has(key)) unique.set(key, name);
    }
    return [...unique.values()];
  });
  const [draft, setDraft] = useState("");
  const [memberError, setMemberError] = useState("");
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const draftName = draft.trim(), draftKey = draftName.toLowerCase();
  const isNewMember = !!draftName && draftKey !== captainKey && !members.some(name => name.toLowerCase() === draftKey);

  function validateDraft() {
    if (!draftName) return "";
    if (draftName.length > 40) return "游戏 ID 最多 40 个字符";
    if (/[\s\u0000-\u001f\u007f]/.test(draftName)) return "游戏 ID 不能包含空白或控制字符";
    if (isNewMember && members.length >= 200) return "最多添加 200 位成员";
    return "";
  }
  function addMember() {
    if (busy || composing.current || !draftName) return;
    const issue = validateDraft();
    if (issue) { setMemberError(issue); inputRef.current?.focus(); return; }
    if (isNewMember) setMembers(current => [...current, draftName]);
    setMemberError(draftKey === captainKey ? "队长已包含在乐队中，无需重复添加" : !isNewMember ? "该成员已添加" : "");
    setDraft("");
    inputRef.current?.focus();
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    if (busy || composing.current) { event.preventDefault(); return; }
    const issue = validateDraft();
    if (issue) { event.preventDefault(); setMemberError(issue); inputRef.current?.focus(); return; }
    setMemberError("");
    // The parent reads this draft alongside getAll("memberGameIds"). Do not rely on a pending state update at submit time.
    onSubmit(event);
  }

  return <form onSubmit={submit} className="community-form">
    <Field label="乐队名称"><input className="input" name="name" required maxLength={80} defaultValue={band?.name || ""} disabled={busy} autoComplete="off" /></Field>
    <Field label="队长"><input className="input" value={captain} readOnly /></Field>
    <div className="field band-members-field">
      <div className="band-members-label"><label className="field-label" htmlFor={inputId}>成员 ID</label><span className="band-members-count" aria-live="polite">{members.length} / 200</span></div>
      <div className={`band-member-editor${busy ? " is-disabled" : ""}${memberError ? " has-error" : ""}`}>
        {members.length > 0 && <ul className="band-member-tags" aria-label="已添加的成员">{members.map(name => <li key={name.toLowerCase()}><span>{name}</span><input type="hidden" name="memberGameIds" value={name} /><button type="button" disabled={busy} aria-label={`移除成员 ${name}`} onClick={() => { setMembers(current => current.filter(member => member.toLowerCase() !== name.toLowerCase())); setMemberError(""); }}><X size={14} /></button></li>)}</ul>}
        <div className="band-member-input-row"><input id={inputId} ref={inputRef} className="band-member-draft" value={draft} maxLength={40} disabled={busy} placeholder="输入游戏 ID，按 Enter 添加" autoComplete="off" autoCapitalize="none" spellCheck={false} aria-describedby={`${inputId}-hint${memberError ? ` ${inputId}-error` : ""}`} aria-invalid={!!memberError} onChange={event => { setDraft(event.target.value); setMemberError(""); }} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} onKeyDown={event => { if (event.key !== "Enter" || composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return; event.preventDefault(); addMember(); }} /><button type="button" className="btn secondary small" disabled={busy || !draftName} onClick={addMember}><Plus size={15} />添加</button></div>
      </div>
      <input type="hidden" name="memberGameIdDraft" value={isNewMember ? draftName : ""} />
      <span className="field-hint" id={`${inputId}-hint`}>可留空；每个 ID 最多 40 字符。未注册成员将在注册后自动加入。</span>
      {memberError && <span className="band-members-error" id={`${inputId}-error`} role="alert">{memberError}</span>}
    </div>
    {error && <div className="error-message" role="alert"><Info size={16} />{error}</div>}
    <div className="modal-footer"><button className="btn primary" disabled={busy}>{busy ? "正在保存…" : band ? "保存修改" : "创建乐队"}</button></div>
  </form>;
}
