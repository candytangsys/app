import { format, parse, addMinutes, isToday, startOfDay } from "date-fns";

const DAY_START = "08:00";
const DAY_END = "23:00";

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Reschedule all pending/in_progress tasks starting from a given time.
 * Returns updated task objects with new start_time, end_time, sort_order.
 */
export function rescheduleFrom(tasks, fromTime = DAY_START) {
  // Sort by priority weight then by existing sort_order
  const priorityWeight = { high: 0, medium: 1, low: 2 };

  const pendingTasks = tasks
    .filter((t) => t.status === "pending" || t.status === "in_progress")
    .sort((a, b) => {
      // Deadline tasks first
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;
      // Then by priority
      const pa = priorityWeight[a.priority] ?? 1;
      const pb = priorityWeight[b.priority] ?? 1;
      if (pa !== pb) return pa - pb;
      // Then by existing order
      return (a.sort_order ?? 999) - (b.sort_order ?? 999);
    });

  let currentMinutes = timeToMinutes(fromTime);
  const dayEnd = timeToMinutes(DAY_END);
  const scheduled = [];

  for (let i = 0; i < pendingTasks.length; i++) {
    const task = pendingTasks[i];
    const duration = task.remaining_duration || task.estimated_duration || 30;

    if (currentMinutes + duration > dayEnd) {
      // Won't fit today - mark as deferred or schedule tomorrow
      scheduled.push({
        ...task,
        start_time: null,
        end_time: null,
        sort_order: i,
      });
      continue;
    }

    scheduled.push({
      ...task,
      start_time: minutesToTime(currentMinutes),
      end_time: minutesToTime(currentMinutes + duration),
      sort_order: i,
      remaining_duration: duration,
    });

    currentMinutes += duration;
  }

  return scheduled;
}

/**
 * Forward shift: when a task completes early, move all subsequent tasks forward.
 */
export function forwardShift(tasks, completedTaskId, actualDuration) {
  const completed = tasks.find((t) => t.id === completedTaskId);
  if (!completed) return tasks;

  const savedTime = (completed.remaining_duration || completed.estimated_duration) - actualDuration;
  
  // Mark as completed
  const updatedCompleted = {
    ...completed,
    status: "completed",
    actual_duration: (completed.actual_duration || 0) + actualDuration,
    remaining_duration: 0,
    end_time: completed.start_time
      ? minutesToTime(timeToMinutes(completed.start_time) + actualDuration)
      : completed.end_time,
  };

  // Get remaining pending tasks
  const otherTasks = tasks.filter(
    (t) => t.id !== completedTaskId && (t.status === "pending" || t.status === "in_progress")
  );
  const completedTasks = tasks.filter(
    (t) => t.id !== completedTaskId && t.status === "completed"
  );

  // Reschedule pending tasks from the new end time
  const newStartTime = updatedCompleted.end_time || DAY_START;
  const rescheduled = rescheduleFrom(otherTasks, newStartTime);

  return [...completedTasks, updatedCompleted, ...rescheduled];
}

/**
 * Handle incomplete task: split remaining into a new slot.
 */
export function handleIncomplete(tasks, taskId, timeSpent) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return tasks;

  const remaining = (task.remaining_duration || task.estimated_duration) - timeSpent;

  const updated = {
    ...task,
    remaining_duration: remaining > 0 ? remaining : 0,
    actual_duration: (task.actual_duration || 0) + timeSpent,
    status: remaining > 0 ? "pending" : "completed",
  };

  const otherTasks = tasks.filter(
    (t) => t.id !== taskId && (t.status === "pending" || t.status === "in_progress")
  );
  const completedTasks = tasks.filter(
    (t) => t.id !== taskId && t.status === "completed"
  );

  if (updated.status === "completed") {
    return [...completedTasks, updated, ...rescheduleFrom(otherTasks, updated.end_time || DAY_START)];
  }

  // Re-add the partial task back to pending pool and reschedule
  const allPending = [updated, ...otherTasks];
  const lastCompleted = completedTasks.sort((a, b) => 
    timeToMinutes(b.end_time || "08:00") - timeToMinutes(a.end_time || "08:00")
  )[0];
  
  const startFrom = lastCompleted?.end_time || DAY_START;
  return [...completedTasks, ...rescheduleFrom(allPending, startFrom)];
}

export function getNextAvailableTime(tasks) {
  const completedTasks = tasks
    .filter((t) => t.status === "completed" && t.end_time)
    .sort((a, b) => timeToMinutes(b.end_time) - timeToMinutes(a.end_time));

  if (completedTasks.length > 0) {
    return completedTasks[0].end_time;
  }

  // Check current time
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const dayStartMinutes = timeToMinutes(DAY_START);

  if (currentMinutes > dayStartMinutes) {
    return minutesToTime(currentMinutes);
  }

  return DAY_START;
}

export { timeToMinutes, minutesToTime, DAY_START, DAY_END };