"use client";

import { useState, type FormEvent, type RefObject } from "react";
import { X } from "lucide-react";
import { Field, type Shop } from "./ui";
import { ImagePicker } from "./image-picker";

type ShopDialogProps = {
  shop: Shop | null;
  name: string;
  fromSong: boolean;
  dialogRef: RefObject<HTMLElement | null>;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>, image?: string | null) => void;
};

export function ShopDialog({ shop, name, fromSong, dialogRef, busy, error, onClose, onSubmit }: ShopDialogProps) {
  const [image, setImage] = useState<string | null>(shop?.imageUrl ?? null);
  const [imageDirty, setImageDirty] = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || imageProcessing) return;
    onSubmit(event, imageDirty ? image : undefined);
  }

  return <div className="modal-backdrop shop-modal-layer" onMouseDown={event => {
    if (event.target === event.currentTarget && !busy) onClose();
  }}>
    <section ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="shop-modal-title">
      <div className="modal-header">
        <h2 className="modal-title" id="shop-modal-title">{shop ? "编辑商店" : "新建商店"}</h2>
        <button type="button" className="icon-btn close-btn" aria-label="关闭商店窗口" disabled={busy} onClick={onClose}><X size={20} /></button>
      </div>
      <div className="modal-body">
        <form onSubmit={submit}>
          <Field label="商店名称">
            <input className="input" name="name" required maxLength={80} defaultValue={shop?.name || name} placeholder="商店名称" disabled={busy} />
          </Field>
          <div className="form-grid coordinate-fields">
            {(["x", "y", "z"] as const).map(key => <Field label={`${key.toUpperCase()} 坐标`} key={key}>
              <input className="input" name={key} type="number" step="1" required min="-30000000" max="30000000" defaultValue={shop?.[key]} placeholder={key.toUpperCase()} disabled={busy} />
            </Field>)}
          </div>
          <Field label="附近港口（可选）">
            <input className="input" name="port" maxLength={100} defaultValue={shop?.port || ""} placeholder="附近港口" disabled={busy} />
          </Field>
          <ImagePicker value={image} label="商店封面" disabled={busy} onBusyChange={setImageProcessing} onChange={value => {
            setImage(value);
            setImageDirty(true);
          }} />
          {error && <div className="error-message" role="alert">{error}</div>}
          <div className="modal-footer">
            <button type="button" className="btn secondary" disabled={busy} onClick={onClose}>取消</button>
            <button className="btn primary" disabled={busy || imageProcessing}>
              {imageProcessing ? "正在压缩…" : busy ? "保存中…" : shop ? "保存修改" : fromSong ? "创建并选择" : "创建商店"}
            </button>
          </div>
        </form>
      </div>
    </section>
  </div>;
}
