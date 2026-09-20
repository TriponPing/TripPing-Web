import { useEffect, useRef, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { ko } from "date-fns/locale";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function formatDate(date: Date) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function formatRange(range: DateRange) {
  if (!range.from) return "기간 선택";
  if (!range.to || range.to.getTime() === range.from.getTime()) return formatDate(range.from);
  return `${formatDate(range.from)} — ${formatDate(range.to)}`;
}

// 시작일 클릭 → 종료일 클릭까지 두 번 눌러서 구간을 고르는 달력. 버튼을 누르면 달력이
// 뜨고, 두 날짜를 다 고르면(또는 바깥을 클릭하면) 자동으로 닫힌다. 미래 날짜는
// react-day-picker의 disabled로 막아서 애초에 선택이 안 된다.
export default function DateRangePicker({
  value,
  onChange,
  maxDate,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  maxDate: Date;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(value);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocPointerDown);
    return () => document.removeEventListener("mousedown", onDocPointerDown);
  }, [open]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  // react-day-picker의 기본 range 선택 알고리즘은 "이미 완성된 구간이 있는 상태에서 또
  // 클릭"하면 새로 두 번 클릭하는 게 아니라 기존 시작일은 그대로 두고 끝나는 날짜만
  // 옮겨버린다 — 사용자가 기대하는 "처음 클릭 = 시작일, 두 번째 클릭 = 종료일" 동작이
  // 아니어서, onSelect 대신 각 날짜 클릭을 직접 받아서 두 번 클릭 로직을 여기서 만든다.
  function handleDayClick(day: Date) {
    setDraft((prev) => {
      const startFresh = !prev?.from || (prev.from && prev.to);
      const next: DateRange = startFresh
        ? { from: day, to: undefined }
        : day < prev!.from!
          ? { from: day, to: prev!.from }
          : { from: prev!.from, to: day };
      if (next.from && next.to) {
        onChange(next);
        setOpen(false);
      }
      return next;
    });
  }

  return (
    <div className="date-range-picker" ref={wrapRef}>
      <style>{PICKER_CSS}</style>
      <button
        type="button"
        className="date-range-trigger"
        onClick={() =>
          setOpen((prev) => {
            const next = !prev;
            // 다시 열 때는 이전에 골랐던 구간이 미리 칠해져 있지 않도록 비운 상태에서
            // 새로 두 번 클릭하게 한다.
            if (next) setDraft(undefined);
            return next;
          })
        }
      >
        {formatRange(value)}
      </button>
      {open && (
        <div className="date-range-panel">
          <DayPicker
            mode="range"
            locale={ko}
            selected={draft}
            onDayClick={(day, modifiers) => {
              if (modifiers.disabled) return;
              handleDayClick(day);
            }}
            disabled={{ after: maxDate }}
            defaultMonth={value.to ?? maxDate}
            showOutsideDays
            weekStartsOn={0}
            formatters={{
              formatCaption: (date) => `${date.getFullYear()}년 ${date.getMonth() + 1}월`,
              formatWeekdayName: (date) => WEEKDAY_LABELS[date.getDay()],
            }}
            classNames={{
              months: "drp-months",
              month: "drp-month",
              month_caption: "drp-caption",
              nav: "drp-nav",
              button_previous: "drp-nav-btn",
              button_next: "drp-nav-btn",
              weekdays: "drp-weekdays",
              weekday: "drp-weekday",
              week: "drp-week",
              day: "drp-day",
              range_start: "drp-range-start",
              range_end: "drp-range-end",
              range_middle: "drp-range-middle",
              today: "drp-today",
              outside: "drp-outside",
              disabled: "drp-disabled",
              selected: "drp-selected",
            }}
          />
        </div>
      )}
    </div>
  );
}

// index.css(공통 파일)를 건드리지 않으려고 이 컴포넌트 안에서만 쓰는 스타일을 스코프해서 넣는다.
// 색상은 index.css에 이미 있는 --brand-blue, --line, --muted, --ink 변수를 그대로 재사용.
const PICKER_CSS = `
.date-range-picker { position: relative; display: inline-block; }
.date-range-trigger {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 14px; border-radius: 10px; border: 1px solid var(--line);
  background: #fff; color: var(--ink); font-size: 13px; font-weight: 500;
  cursor: pointer; white-space: nowrap;
}
.date-range-trigger:hover { border-color: var(--brand-blue); }
.date-range-panel {
  position: absolute; top: calc(100% + 8px); right: 0; z-index: 40;
  background: #fff; border: 1px solid var(--line); border-radius: 14px;
  box-shadow: 0 12px 32px rgba(15, 30, 45, 0.14); padding: 14px 16px;
}
.drp-months { position: relative; }
.drp-month { display: flex; flex-direction: column; gap: 10px; }
.drp-nav {
  position: absolute; top: 0; left: 0; right: 0; height: 28px;
  display: flex; align-items: center; justify-content: space-between;
  pointer-events: none;
}
.drp-caption {
  height: 28px; display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; color: var(--ink);
}
.drp-nav-btn {
  pointer-events: auto;
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 8px; border: none; background: transparent;
  color: var(--muted); cursor: pointer;
}
.drp-nav-btn svg { width: 16px; height: 16px; fill: currentColor; }
.drp-nav-btn:hover { background: #f1f4f7; color: var(--ink); }
.drp-nav-btn[disabled] { visibility: hidden; }
.drp-weekdays { display: flex; }
.drp-weekday {
  flex: 1; text-align: center; font-size: 12px; font-weight: 600; color: var(--muted);
  padding-bottom: 4px;
}
.drp-weekday:first-child, .drp-weekday:last-child { color: #e2574c; }
.drp-week { display: flex; }
.drp-day { flex: 1; text-align: center; padding: 2px 0; }
.drp-day button {
  width: 32px; height: 32px; border-radius: 999px; border: none; background: transparent;
  color: var(--ink); font-size: 13px; cursor: pointer;
}
.drp-day button:hover { background: #eef2f6; }
.drp-outside button { color: #c7cfd6; }
.drp-disabled button { color: #d7dde2; cursor: not-allowed; }
.drp-disabled button:hover { background: transparent; }
.drp-today button { position: relative; font-weight: 700; }
.drp-today button::after {
  content: ""; position: absolute; bottom: 3px; left: 50%; transform: translateX(-50%);
  width: 4px; height: 4px; border-radius: 999px; background: var(--brand-blue);
}
.drp-range-start button, .drp-range-end button {
  background: var(--brand-blue) !important; color: #fff !important; font-weight: 700;
}
.drp-range-middle { background: rgba(0, 116, 206, 0.12); }
.drp-range-middle button { color: var(--brand-blue) !important; }
.drp-range-start { border-radius: 999px 0 0 999px; }
.drp-range-end { border-radius: 0 999px 999px 0; }
`;
