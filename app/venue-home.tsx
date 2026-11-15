"use client";

import { CalendarDays, Camera, ChevronLeft, ChevronRight, Clock3, MapPin, Plus, Trash2, UserRound, Waves } from "lucide-react";
import { coords, samePlayer, dateKey, today, todayKey, type Show, type User, type Venue } from "./ui";
import { CoverImage } from "./cover-image";
import "./directory-images.css";

type VenueHomeProps = {
  venue: Venue;
  events: Show[];
  user: User | null;
  selectedDate: string;
  month: Date;
  onDateChange: (date: string) => void;
  onMonthChange: (month: Date) => void;
  onAddEvent: () => void;
  onDeleteVenue: () => void;
  onDeleteEvent: (show: Show) => void;
  onEditImage: () => void;
};

export function VenueHome({ venue, events, user, selectedDate, month, onDateChange, onMonthChange, onAddEvent, onDeleteVenue, onDeleteEvent, onEditImage }: VenueHomeProps) {
  const canManage = !!user && (user.role === "admin" || samePlayer(user.gameId,venue.owner));
  const venueEvents = events.filter((event) => event.livehouseId === venue.id);
  const dailyEvents = venueEvents.filter((event) => event.date === selectedDate).sort((a, b) => a.hour - b.hour || Number(a.id) - Number(b.id));
  const dayCounts = new Map<string, number>();
  for (const event of venueEvents) dayCounts.set(event.date, (dayCounts.get(event.date) || 0) + 1);
  const firstWeekday = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const totalDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: Math.ceil((firstWeekday + totalDays) / 7) * 7 }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index - firstWeekday + 1));
  const dateLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" });

  function selectDay(day: Date) {
    onDateChange(dateKey(day));
    if (day.getMonth() !== month.getMonth() || day.getFullYear() !== month.getFullYear()) onMonthChange(new Date(day.getFullYear(), day.getMonth(), 1));
  }

  return <div className="venue-home">
    <div className="venue-home-top">
      <section className="venue-summary" aria-labelledby="venue-name">
        <div className="venue-cover">
          <CoverImage src={venue.imageUrl} name={venue.name} identity={venue.id} kind="venue" className="venue-home-image" loading="eager" />
          {canManage && <button className="venue-cover-edit" onClick={onEditImage}><Camera size={15} />{venue.imageUrl ? "更换图片" : "上传图片"}</button>}
        </div>
        <div className="venue-summary-body">
          <h1 id="venue-name">{venue.name}</h1>
          <dl className="venue-facts">
            <div><dt><MapPin size={17} />坐标</dt><dd className="venue-coordinates">{coords(venue)}</dd></div>
            {venue.port && <div><dt><Waves size={17} />附近港口</dt><dd>{venue.port}</dd></div>}
            <div><dt><UserRound size={17} />所有者</dt><dd>{venue.owner}</dd></div>
          </dl>
          {canManage && !venue.protected && <div className="venue-summary-actions"><button className="btn ghost danger small" onClick={onDeleteVenue}><Trash2 size={14} />删除场地</button></div>}
        </div>
      </section>

      <section className="calendar-panel" aria-labelledby="venue-calendar-title">
        <div className="calendar-header">
          <div><h2 className="section-title" id="venue-calendar-title">演出日历</h2><p className="calendar-month">{month.getFullYear()} 年 {month.getMonth() + 1} 月</p></div>
          <div className="calendar-controls">
            <button className="btn ghost small" onClick={() => { onMonthChange(today()); onDateChange(todayKey()); }}>今天</button>
            <button className="icon-btn" aria-label="上个月" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={18} /></button>
            <button className="icon-btn" aria-label="下个月" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="calendar-grid">
          {["一", "二", "三", "四", "五", "六", "日"].map((weekday) => <div className="weekday" key={weekday}>周{weekday}</div>)}
          {days.map((day) => {
            const key = dateKey(day), count = dayCounts.get(key) || 0;
            return <button key={key} className={`calendar-day ${day.getMonth() !== month.getMonth() ? "outside" : ""} ${key === todayKey() ? "today" : ""} ${key === selectedDate ? "selected" : ""} ${count ? "has-events" : ""}`} onClick={() => selectDay(day)} aria-label={`${key}，${count ? `${count} 个节目` : "暂无节目"}`} aria-pressed={key === selectedDate}>
              <span className="day-number">{day.getDate()}</span>{count > 0 && <span className="day-count">{count} 节目</span>}
            </button>;
          })}
        </div>
        <div className="calendar-legend"><span className="legend-blue" />已有演出<span className="legend-outline" />今天<span className="calendar-timezone">北京时间（UTC+8）</span></div>
      </section>
    </div>

    <section className="agenda-panel" aria-labelledby="venue-agenda-title">
      <div className="agenda-heading"><div><h2 className="section-title" id="venue-agenda-title">演出排班</h2><p className="agenda-date"><CalendarDays size={14} />{dateLabel}<span>·</span>{dailyEvents.length} 个节目</p></div><button className="btn primary" onClick={onAddEvent}><Plus size={17} />添加演出</button></div>
      {!dailyEvents.length ? <div className="agenda-empty"><CalendarDays size={26} strokeWidth={1.3} /><span>暂无演出</span></div> : Array.from(new Set(dailyEvents.map((event) => event.hour))).map((hour) => <div className="time-group" key={hour}>
        <div className="time-label"><Clock3 size={16} /><strong>{String(hour).padStart(2, "0")}:00</strong></div>
        {dailyEvents.filter((event) => event.hour === hour).map((show, index) => <article className="event-card" key={show.id}><span className="event-order">{String(index + 1).padStart(2, "0")}</span><div><h3 className="event-title">{show.title}</h3><span className="event-player"><UserRound size={14} />{show.playerId}</span></div>{show.canDelete && <button className="icon-btn danger event-actions" aria-label={`删除节目 ${show.title}`} onClick={() => onDeleteEvent(show)}><Trash2 size={16} /></button>}</article>)}
      </div>)}
    </section>
  </div>;
}
