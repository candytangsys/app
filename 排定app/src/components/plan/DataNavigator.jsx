import React from "react";
import { format, parseISO, addDays, isToday } from "date-fns";
import { zhTW } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DateNavigator({ dates, selectedDate, onSelect }) {
  const selectedIdx = dates.indexOf(selectedDate);

  const canPrev = selectedIdx > 0;
  const canNext = selectedIdx < dates.length - 1;

  return (
    <div className="space-y-2">
      {/* Prev / Next */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs h-8 px-3"
          disabled={!canPrev}
          onClick={() => onSelect(dates[selectedIdx - 1])}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          前一天
        </Button>
        <span className="text-sm font-semibold">
          {selectedDate ? format(parseISO(selectedDate), "M月d日 EEEE", { locale: zhTW }) : ""}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs h-8 px-3"
          disabled={!canNext}
          onClick={() => onSelect(dates[selectedIdx + 1])}
        >
          下一天
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Scrollable date pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {dates.map((d, i) => {
          const isSelected = d === selectedDate;
          const isTodayDate = isToday(parseISO(d));
          return (
            <button
              key={d}
              onClick={() => onSelect(d)}
              className={cn(
                "flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-secondary"
              )}
            >
              <span className="text-[10px] opacity-70">
                {format(parseISO(d), "EEE", { locale: zhTW })}
              </span>
              <span className={cn("text-sm font-bold", isTodayDate && !isSelected && "text-primary")}>
                {format(parseISO(d), "d")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}