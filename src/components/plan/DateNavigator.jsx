import React from 'react';
import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function DateNavigator({ dates, selectedDate, onSelect }) {
  if (!dates || dates.length === 0) return null;

  const currentIndex = dates.indexOf(selectedDate);
  const visibleDates = dates.slice(Math.max(0, currentIndex - 2), currentIndex + 3);

  const handlePrev = () => {
    const prevIndex = Math.max(0, currentIndex - 1);
    onSelect(dates[prevIndex]);
  };

  const handleNext = () => {
    const nextIndex = Math.min(dates.length - 1, currentIndex + 1);
    onSelect(dates[nextIndex]);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handlePrev}
        disabled={currentIndex === 0}
        className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-50"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex gap-2 flex-1 overflow-x-auto pb-2">
        {visibleDates.map(date => (
          <button
            key={date}
            onClick={() => onSelect(date)}
            className={`px-3 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors ${
              date === selectedDate
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {format(parseISO(date), 'MMM d', { locale: zhTW })}
          </button>
        ))}
      </div>

      <button
        onClick={handleNext}
        disabled={currentIndex === dates.length - 1}
        className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-50"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}