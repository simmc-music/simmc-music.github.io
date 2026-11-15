"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { compressImage } from "@/lib/image-compression";

type ImagePickerProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
  label?: string;
  showPreview?: boolean;
};

export function ImagePicker({ value, onChange, onBusyChange, disabled = false, label = "封面图片", showPreview = true }: ImagePickerProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const active = useRef<AbortController | null>(null);
  const busyCallback = useRef(onBusyChange);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState<{ value: string; size: number; width: number; height: number } | null>(null);
  busyCallback.current = onBusyChange;
  useEffect(() => () => { active.current?.abort(); active.current = null; busyCallback.current?.(false); }, []);

  async function choose(file?: File) {
    if (!file || disabled) return;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setError("");
    setProcessing(true);
    busyCallback.current?.(true);
    try {
      const result = await compressImage(file, controller.signal);
      if (active.current !== controller || controller.signal.aborted) return;
      setInfo({ value: result.dataUrl, size: result.blob.size, width: result.width, height: result.height });
      onChange(result.dataUrl);
    } catch (cause) {
      if (active.current !== controller || controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : "图片处理失败，请重试");
    } finally {
      if (active.current === controller) {
        active.current = null;
        setProcessing(false);
        busyCallback.current?.(false);
      }
    }
  }
  function remove() {
    active.current?.abort();
    active.current = null;
    setProcessing(false);
    busyCallback.current?.(false);
    setError("");
    if (!processing) {
      setInfo(null);
      onChange(null);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  return <div className="image-picker field" aria-busy={processing}>
    <span className="field-label" id={`${id}-label`}>{label}<span className="optional">可选</span></span>
    <input ref={inputRef} id={id} type="file" accept="image/*" aria-labelledby={`${id}-label`} disabled={disabled} hidden onChange={e => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ""; void choose(file); }}/>
    {showPreview && value && <div className="image-picker-preview"><img src={value} alt={`${label}预览`}/></div>}
    <div className="image-picker-controls">
      <button type="button" className="btn secondary small" disabled={disabled} onClick={() => inputRef.current?.click()}>
        {processing ? <LoaderCircle size={16} className="image-picker-spinner"/> : <ImagePlus size={16}/>}
        {processing ? "重新选择图片" : value ? "更换图片" : "选择图片"}
      </button>
      {(value || processing) && <button type="button" className="btn ghost small" disabled={disabled} onClick={remove}><X size={15}/>{processing ? "取消处理" : "移除图片"}</button>}
    </div>
    <div className="image-picker-note" id={`${id}-note`} role="status">{processing ? "正在压缩…" : info?.value === value ? <span className="image-picker-info">{Math.ceil(info.size / 1000)} KB · {info.width} × {info.height}</span> : "自动压缩至 100 KB 内"}</div>
    {error && <div className="image-picker-error" role="alert">{error}</div>}
  </div>;
}
