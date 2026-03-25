import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Pause, Trash2, Clock, Brain, Zap, Dumbbell, Users, User, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const priorityConfig = {
  high: { label: "高", className: "bg-red-100 text-red-700 border-red-200" },
  medium: { label: "中", className: "bg-amber-100 text-amber-700 border-amber-200" },
  low: { label: "低", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const categoryIcons = {
  deep_work: Brain,
  light_task: Zap,
  exercise: Dumbbell,
  meeting: Users,
  personal: User,
};

const categoryLabels = {
  deep_work: "深度工作",
  light_task: "輕任務",
  exercise: "運動",
  meeting: "會議",
  personal: "個人",
};

function TaskCard({ task, onComplete, onDefer, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = task.status === "completed";
  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const CategoryIcon = categoryIcons[task.category] || Zap;
  const duration = task.session_duration || task.remaining_duration || task.estimated_duration || 30;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12, height: 0 }}
    >
      <div className="flex items-start gap-3">
        {/* Time */}
        <div className="w-14 flex-shrink-0 text-right pt-3">
          {task.start_time && (
            <span className={cn("text-xs font-semibold tabular-nums", isCompleted && "text-muted-foreground line-through")}>
              {task.start_time}
            </span>
          )}
        </div>

        {/* Dot & line */}
        <div className="flex flex-col items-center">
          <div className={cn(
            "w-3 h-3 rounded-full border-2 mt-3.5 z-10 flex-shrink-0",
            isCompleted ? "bg-accent border-accent" : "bg-background border-primary"
          )} />
          <div className="w-px flex-1 bg-border min-h-[2rem]" />
        </div>

        {/* Card */}
        <div
          className={cn(
            "flex-1 rounded-xl border p-3.5 mb-2 transition-all",
            isCompleted ? "bg-muted/40 opacity-60" : "bg-card hover:shadow-sm cursor-pointer"
          )}
          onClick={() => !isCompleted && setExpanded(!expanded)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CategoryIcon className={cn("w-3.5 h-3.5 flex-shrink-0", isCompleted ? "text-muted-foreground" : "text-primary")} />
                <p className={cn("text-sm font-semibold truncate", isCompleted && "line-through text-muted-foreground")}>
                  {task.title}
                  {task.is_split && <span className="ml-1 text-[10px] text-muted-foreground font-normal">(部分)</span>}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className={cn("text-[10px] px-1 py-0 h-4", priority.className)}>
                  {priority.label}
                </Badge>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {duration}分
                </span>
                {task.start_time && task.end_time && (
                  <span className="text-[10px] text-muted-foreground">{task.start_time}–{task.end_time}</span>
                )}
                {isCompleted && task.actual_duration != null && (
                  <span className="text-[10px] text-accent font-medium">實際{task.actual_duration}分</span>
                )}
              </div>
            </div>
            {!isCompleted && (
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5 transition-transform", expanded && "rotate-180")} />
            )}
          </div>

          <AnimatePresence>
            {expanded && !isCompleted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-2 mt-3 pt-3 border-t border-border overflow-hidden"
              >
                <Button size="sm" className="gap-1 h-7 text-xs rounded-lg" onClick={e => { e.stopPropagation(); onComplete(task); }}>
                  <Check className="w-3 h-3" />完成
                </Button>
                <Button size="sm" variant="outline" className="gap-1 h-7 text-xs rounded-lg" onClick={e => { e.stopPropagation(); onDefer(task); }}>
                  <Pause className="w-3 h-3" />延後
                </Button>
                <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs rounded-lg text-destructive hover:bg-destructive/10 ml-auto" onClick={e => { e.stopPropagation(); onDelete(task); }}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default function DayTimeline({ tasks, onComplete, onDefer, onDelete }) {
  const sorted = [...tasks].sort((a, b) => {
    const aCompleted = a.status === "completed" ? 1 : 0;
    const bCompleted = b.status === "completed" ? 1 : 0;
    if (aCompleted !== bCompleted) return aCompleted - bCompleted;
    if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time);
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  if (sorted.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        這天還沒有任務，在上方輸入框加入吧
      </div>
    );
  }

  return (
    <div className="relative">
      <AnimatePresence mode="popLayout">
        {sorted.map((task, i) => (
          <TaskCard
            key={task.id}
            task={task}
            onComplete={onComplete}
            onDefer={onDefer}
            onDelete={onDelete}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}