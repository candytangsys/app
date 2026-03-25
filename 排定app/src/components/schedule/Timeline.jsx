import React from "react";
import { AnimatePresence } from "framer-motion";
import { CalendarClock, Inbox } from "lucide-react";
import TimelineTask from "./TimelineTask";

export default function Timeline({ tasks, onComplete, onDefer }) {
  const scheduledTasks = tasks
    .filter((t) => t.start_time || t.status === "completed")
    .sort((a, b) => {
      // Completed first (by end_time), then pending by start_time
      if (a.status === "completed" && b.status !== "completed") return -1;
      if (a.status !== "completed" && b.status === "completed") return 1;
      if (a.status === "completed" && b.status === "completed") {
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      }
      return (a.sort_order ?? 999) - (b.sort_order ?? 999);
    });

  const deferredTasks = tasks.filter((t) => !t.start_time && t.status !== "completed");

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-semibold text-lg mb-1">還沒有任務</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          在上方輸入你今天要做的事，AI 會自動幫你排程
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Main scheduled timeline */}
      <div className="relative">
        <AnimatePresence mode="popLayout">
          {scheduledTasks.map((task, i) => (
            <TimelineTask
              key={task.id}
              task={task}
              index={i}
              onComplete={onComplete}
              onDefer={onDefer}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Deferred / overflow tasks */}
      {deferredTasks.length > 0 && (
        <div className="mt-6 pt-6 border-t border-dashed border-border">
          <div className="flex items-center gap-2 mb-3 px-2">
            <CalendarClock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              排不進今天（{deferredTasks.length} 個任務）
            </span>
          </div>
          <AnimatePresence>
            {deferredTasks.map((task, i) => (
              <TimelineTask
                key={task.id}
                task={task}
                index={i}
                onComplete={onComplete}
                onDefer={onDefer}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}