import { format, addDays, parseISO, isAfter, isBefore, differenceInDays } from "date-fns";

const DEFAULT_DAY_START = "09:00";
const DEFAULT_DAY_END = "22:00";

export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins) {
  const h = Math.floor(Math.max(0, mins) / 60);
  const m = Math.max(0, mins) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Multi-day scheduler.
 * Distributes tasks across days from startDate, respecting day bounds.
 * Supports cross-day splitting of large tasks.
 * Returns array of task-slot objects (each with assigned_date, start_time, end_time).
 */
export function multiDaySchedule(tasks, startDate, dayStart = DEFAULT_DAY_START, dayEnd = DEFAULT_DAY_END) {
  const priorityWeight = { high: 0, medium: 1, low: 2 };
  const dayStartMins = timeToMinutes(dayStart);
  const dayEndMins = timeToMinutes(dayEnd);
  const slotDuration = dayEndMins - dayStartMins; // available mins per day

  // Sort: deadline first, then priority, then original order
  const sorted = [...tasks].sort((a, b) => {
    if (a.deadline && !b.deadline) return -1;
    if (!a.deadline && b.deadline) return 1;
    if (a.deadline && b.deadline) {
      const diff = new Date(a.deadline) - new Date(b.deadline);
      if (diff !== 0) return diff;
    }
    const pa = priorityWeight[a.priority] ?? 1;
    const pb = priorityWeight[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    return (a.sort_order ?? 999) - (b.sort_order ?? 999);
  });

  const result = []; // array of {task, assigned_date, start_time, end_time, sort_order, is_split, remaining_duration}
  let currentDate = startDate;
  let currentMins = dayStartMins;
  let dayIndex = 0;
  const MAX_DAYS = 60;

  for (const task of sorted) {
    let remainingMins = task.remaining_duration || task.estimated_duration || 30;
    let splitCount = 0;

    while (remainingMins > 0 && dayIndex < MAX_DAYS) {
      const availableInDay = dayEndMins - currentMins;

      if (availableInDay <= 0) {
        // Move to next day
        dayIndex++;
        currentDate = format(addDays(parseISO(startDate), dayIndex), "yyyy-MM-dd");
        currentMins = dayStartMins;
        continue;
      }

      const chunk = Math.min(remainingMins, availableInDay);
      const dateStr = format(addDays(parseISO(startDate), dayIndex), "yyyy-MM-dd");

      result.push({
        ...task,
        id: task.id,
        assigned_date: dateStr,
        start_time: minutesToTime(currentMins),
        end_time: minutesToTime(currentMins + chunk),
        sort_order: result.filter(r => r.assigned_date === dateStr).length,
        is_split: splitCount > 0 || remainingMins > chunk,
        session_duration: chunk,
      });

      currentMins += chunk;
      remainingMins -= chunk;
      splitCount++;

      if (currentMins >= dayEndMins && remainingMins > 0) {
        dayIndex++;
        currentDate = format(addDays(parseISO(startDate), dayIndex), "yyyy-MM-dd");
        currentMins = dayStartMins;
      }
    }
  }

  return result;
}

/**
 * Forward shift for a single day's tasks (same as before but for one day).
 */
export function forwardShiftDay(allTasks, completedTaskId, actualDuration, assignedDate) {
  const dayTasks = allTasks.filter(t => t.assigned_date === assignedDate);
  const otherDayTasks = allTasks.filter(t => t.assigned_date !== assignedDate);

  const completed = dayTasks.find(t => t.id === completedTaskId);
  if (!completed) return allTasks;

  const updatedCompleted = {
    ...completed,
    status: "completed",
    actual_duration: (completed.actual_duration || 0) + actualDuration,
    remaining_duration: 0,
    end_time: completed.start_time
      ? minutesToTime(timeToMinutes(completed.start_time) + actualDuration)
      : completed.end_time,
  };

  const pendingDayTasks = dayTasks
    .filter(t => t.id !== completedTaskId && (t.status === "pending" || t.status === "in_progress"))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const completedDayTasks = dayTasks.filter(t => t.id !== completedTaskId && t.status === "completed");

  // Shift pending tasks forward
  let currentMins = timeToMinutes(updatedCompleted.end_time);
  const rescheduled = pendingDayTasks.map((t, i) => {
    const duration = t.remaining_duration || t.estimated_duration || 30;
    const slot = {
      ...t,
      start_time: minutesToTime(currentMins),
      end_time: minutesToTime(currentMins + duration),
      sort_order: i,
    };
    currentMins += duration;
    return slot;
  });

  return [...otherDayTasks, ...completedDayTasks, updatedCompleted, ...rescheduled];
}

/**
 * Handle incomplete task on a given day.
 * Shifts remaining time to later in the same day, or next available day.
 */
export function handleIncompleteTask(allTasks, taskId, timeSpent, assignedDate, dayStart = DEFAULT_DAY_START, dayEnd = DEFAULT_DAY_END) {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return allTasks;

  const remaining = Math.max(0, (task.remaining_duration || task.estimated_duration || 30) - timeSpent);
  const isNowComplete = remaining === 0;

  const updatedTask = {
    ...task,
    actual_duration: (task.actual_duration || 0) + timeSpent,
    remaining_duration: remaining,
    status: isNowComplete ? "completed" : "pending",
    end_time: task.start_time
      ? minutesToTime(timeToMinutes(task.start_time) + timeSpent)
      : task.end_time,
  };

  if (isNowComplete) {
    return forwardShiftDay(
      allTasks.map(t => t.id === taskId ? updatedTask : t),
      taskId,
      timeSpent,
      assignedDate
    );
  }

  // Not complete — move to end of day's queue or next day
  const dayEndMins = timeToMinutes(dayEnd);
  const dayTasks = allTasks.filter(t => t.assigned_date === assignedDate && t.id !== taskId);
  const lastEndInDay = dayTasks
    .filter(t => t.end_time)
    .reduce((max, t) => Math.max(max, timeToMinutes(t.end_time)), timeToMinutes(dayStart));

  if (lastEndInDay + remaining <= dayEndMins) {
    updatedTask.start_time = minutesToTime(lastEndInDay);
    updatedTask.end_time = minutesToTime(lastEndInDay + remaining);
    updatedTask.sort_order = dayTasks.length;
  } else {
    // Push to next day
    const sortedDates = [...new Set(allTasks.map(t => t.assigned_date))].sort();
    const currentIdx = sortedDates.indexOf(assignedDate);
    const nextDate = currentIdx >= 0 && currentIdx < sortedDates.length - 1
      ? sortedDates[currentIdx + 1]
      : format(addDays(new Date(assignedDate), 1), "yyyy-MM-dd");

    const nextDayTasks = allTasks.filter(t => t.assigned_date === nextDate && t.id !== taskId);
    const nextDayEnd = nextDayTasks
      .filter(t => t.end_time)
      .reduce((max, t) => Math.max(max, timeToMinutes(t.end_time)), timeToMinutes(dayStart));

    updatedTask.assigned_date = nextDate;
    updatedTask.start_time = minutesToTime(nextDayEnd);
    updatedTask.end_time = minutesToTime(nextDayEnd + remaining);
    updatedTask.sort_order = nextDayTasks.length;
  }

  return allTasks.map(t => t.id === taskId ? updatedTask : t);
}

export { DEFAULT_DAY_START, DEFAULT_DAY_END };