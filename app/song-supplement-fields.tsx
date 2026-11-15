"use client";
import {useState} from "react";
import {Field, type Song} from "./ui";
export const DEFAULT_INSTRUMENTS = ["钢琴","清音电吉他","木吉他","萨克斯","小提琴","大提琴","贝斯","竖笛","鼓组","失真电吉他"];

export function readSongSupplement(form: FormData) {
  const instruments = [...new Set(form.getAll("instruments").map(String))];
  if (!instruments.length) throw new Error("请选择至少一种乐器");
  const values = ["x","y","z"].map(key => String(form.get(`sale_${key}`) ?? "").trim());
  if (values.every(value => value === "")) return {instruments, saleCoordinates:null};
  if (values.some(value => value === "")) throw new Error("请填写完整的出售坐标，或将三项全部留空");
  const [x,y,z] = values.map(Number);
  if (![x,y,z].every(value => Number.isSafeInteger(value) && Math.abs(value)<=30000000)) throw new Error("出售坐标须为 -30000000 至 30000000 的整数");
  return {instruments, saleCoordinates:{x,y,z}};
}

export function SongSupplementFields({song,options,disabled=false}:{song:Song|null;options?:string[];disabled?:boolean}) {
  const selected = song?.instruments?.length ? song.instruments : ["钢琴"];
  const choices = [...new Set([...(options?.length ? options : DEFAULT_INSTRUMENTS),...selected])];
  const [position,setPosition] = useState<Record<"x"|"y"|"z",string>>({x: song?.saleCoordinates?.x?.toString() ?? "",y: song?.saleCoordinates?.y?.toString() ?? "",z: song?.saleCoordinates?.z?.toString() ?? ""});
  const hasCoordinate = Object.values(position).some(value=>value!=="");
  return <>
    <fieldset className="song-instruments" disabled={disabled}>
      <legend className="field-label">乐器 <span className="optional">可多选</span></legend>
      <div className="instrument-options">{choices.map(instrument=><label className="instrument-choice" key={instrument}><input type="checkbox" name="instruments" value={instrument} defaultChecked={selected.includes(instrument)}/><span>{instrument}</span></label>)}</div>
    </fieldset>
    <fieldset className="sale-coordinates" disabled={disabled}>
      <legend className="field-label">出售坐标 <span className="optional">可选</span></legend>
      <div className="form-grid coordinate-fields">{(["x","y","z"] as const).map(key=><Field key={key} label={`${key.toUpperCase()} 坐标`}><input className="input" name={`sale_${key}`} type="number" min="-30000000" max="30000000" step="1" value={position[key]} onChange={event=>setPosition(current=>({...current,[key]:event.target.value}))} required={hasCoordinate} placeholder={key.toUpperCase()}/></Field>)}</div>
    </fieldset>
  </>;
}
