"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { paginate } from "../lib/collection-order";
import "./pagination.css";

export function usePagination<T>(items: T[], resetKey: string) {
  const [position, setPosition] = useState({ key: resetKey, page: 1 });
  const anchorRef = useRef<HTMLDivElement>(null);
  const result = paginate(items, position.key === resetKey ? position.page : 1);
  // Render the corrected page immediately, then retain it if the collection grows.
  useEffect(() => {
    if (position.key !== resetKey || position.page !== result.page) {
      setPosition({ key: resetKey, page: result.page });
    }
  }, [position.key, position.page, resetKey, result.page]);
  function onPageChange(page: number) {
    setPosition({ key: resetKey, page });
    requestAnimationFrame(() => anchorRef.current?.scrollIntoView({
      block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    }));
  }
  return { ...result, anchorRef, onPageChange };
}

export function Pagination({ page, pageCount, total, onPageChange, label = "列表分页" }: {
  page: number; pageCount: number; total: number; onPageChange: (page: number) => void; label?: string;
}) {
  if (pageCount <= 1) return null;
  return <nav className="list-pagination" aria-label={label}>
    <span className="pagination-total">共 {total} 条</span>
    <div className="pagination-controls">
      <button type="button" className="btn secondary small" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label={`${label}：上一页`}><ChevronLeft size={16} /><span>上一页</span></button>
      <span className="pagination-position" aria-live="polite" aria-atomic="true">{page} / {pageCount}</span>
      <button type="button" className="btn secondary small" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} aria-label={`${label}：下一页`}><span>下一页</span><ChevronRight size={16} /></button>
    </div>
  </nav>;
}
