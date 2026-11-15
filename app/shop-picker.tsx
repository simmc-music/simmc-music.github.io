"use client";
import {useEffect,useState} from "react";
import {Check,Search,Store,X} from "lucide-react";
import type {Shop} from "./ui";

export function ShopPicker({shops,selected,onChange,onCreate}:{shops:Shop[];selected:string[];onChange:(ids:string[])=>void;onCreate:(name:string)=>void}) {
 const [query,setQuery]=useState("");
 const [expanded,setExpanded]=useState(false);
 const [active,setActive]=useState(-1);
 const key=query.trim().toLocaleLowerCase();
 const options=shops.filter(s=>s.name.toLocaleLowerCase().includes(key));
 const exact=shops.find(s=>s.name.toLocaleLowerCase()===key);
 const selectionKey=selected.join("|");
 useEffect(()=>{setQuery("");setExpanded(false);setActive(-1);},[selectionKey]);
 function confirm(){if(!key)return;if(exact){onChange([...new Set([...selected,exact.id])]);setQuery("");setExpanded(false);}else{setExpanded(false);onCreate(query.trim());}}
 return <div className="field"><span className="field-label">商店 <span className="optional">可选 · 多选</span></span><div className="shop-picker" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setExpanded(false);}}><div className="shop-input-row"><div className="search-field"><Search size={17}/><input role="combobox" aria-label="商店名称" aria-autocomplete="list" aria-controls="shop-suggestions" aria-expanded={expanded} aria-activedescendant={active>=0?`shop-option-${active}`:undefined} value={query} maxLength={80} placeholder="输入商店名称" onFocus={()=>setExpanded(true)} onChange={e=>{setQuery(e.target.value);setExpanded(true);setActive(-1);}} onKeyDown={e=>{if(e.key==="ArrowDown"){e.preventDefault();setExpanded(true);setActive(i=>options.length?Math.min(i+1,options.length-1):-1);}else if(e.key==="ArrowUp"){e.preventDefault();setActive(i=>Math.max(i-1,0));}else if(e.key==="Enter"){e.preventDefault();if(expanded&&active>=0&&options[active]){setQuery(options[active].name);setExpanded(false);setActive(-1);}else confirm();}else if(e.key==="Escape"&&expanded){e.preventDefault();e.stopPropagation();setExpanded(false);}}}/>{query&&<button type="button" aria-label="清空商店名称" onClick={()=>{setQuery("");setActive(-1);}}><X size={15}/></button>}</div><button type="button" className="btn secondary confirm-shop" disabled={!key} onClick={confirm}>{exact?"确认选择":"创建商店"}</button></div>{expanded&&<div className="shop-options" id="shop-suggestions" role="listbox" aria-label="商店建议">{options.map((s,i)=><button id={`shop-option-${i}`} type="button" role="option" aria-selected={i===active} className={`shop-option ${i===active?"active":""}`} key={s.id} onMouseDown={e=>e.preventDefault()} onClick={()=>{setQuery(s.name);setExpanded(false);setActive(-1);}}><span>{s.name}</span>{selected.includes(s.id)&&<Check size={16}/>}</button>)}{options.length===0&&<p className="shop-empty">未找到商店，可点击右侧创建</p>}</div>}</div><div className="selected-shops">{selected.map(id=>{const shop=shops.find(s=>s.id===id);return shop&&<span className="shop-tag" key={id}><Store size={14}/>{shop.name}<button type="button" aria-label={`移除商店 ${shop.name}`} onClick={()=>onChange(selected.filter(x=>x!==id))}><X size={14}/></button></span>;})}</div></div>;
}
