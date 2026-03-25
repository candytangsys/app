import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, ChevronRight, Pause, Zap, Brain, Dumbbell, Users, User } from "lucide-react";
import { motion } from "framer-motion";
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

export default function TimelineTask({ task, index, onComplete, onDefer }) {
  const [showActions, setShowActions] = useState(false);
  const isCompleted = task.status === "completed";
  const isDeferred = task.status === "deferred";
  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const CategoryIcon = categoryIcons[task.category] || Zap;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ delay: index * 0.05 }}
      layout
      className="group"
    >
      <div className="flex items-start gap-4">
        {/* Time column */}
        <div className="w-16 flex-shrink-0 pt-3 text-right">
          {task.start_time && (
            <span className={cn(
              "text-sm font-semibold tabular-nums",
              isCompleted ? "text-muted-foreground line-through" : "text-foreground"
            )}>
              {task.start_time}
            </span>
          )}
        </div>

        {/* Timeline dot & line */}
        <div className="relative flex flex-col items-center">
          <div className={cn(
            "w-3.5 h-3.5 rounded-full border-2 mt-3.5 z-10 transition-colors",
            isCompleted
              ? "bg-accent border-accent"
              : "bg-card border-primary"
          )}>
            {isCompleted && <Check className="w-2 h-2 text-white ml-[1px] mt-[1px]" />}
          </div>
          <div className="w-0.5 flex-1 bg-border -mt-0.5" />
        </div>

        {/* Task card */}
        <div
          className={cn(
            "flex-1 rounded-xl border p-4 mb-3 transition-all cursor-pointer",
            isCompleted
              ? "bg-muted/50 border-border opacity-60"
              : "bg-card border-border hover:border-primary/30 hover:shadow-md shadow-sm"
          )}
          onClick={() => !isCompleted && setShowActions(!showActions)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CategoryIcon className={cn(
                  "w-4 h-4 flex-shrink-0",
                  isCompleted ? "text-muted-foreground" : "text-primary"
                )} />
                <h3 className={cn(
                  "font-semibold text-sm truncate",
                  isCompleted && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", priority.className)}>
                  {priority.label}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {task.remaining_duration || task.estimated_duration}分鐘
                </span>
                {task.start_time && task.end_time && (
                  <span className="text-xs text-muted-foreground">
                    {task.start_time} - {task.end_time}
                  </span>
                )}
                {isCompleted && task.actual_duration != null && (
                  <span className="text-xs text-accent font-medium">
                    實際 {task.actual_duration}分鐘
                  </span>
                )}
              </div>
            </div>
            {!isCompleted && !isDeferred && (
              <ChevronRight className={cn(
                "w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 mt-1",
                showActions && "rotate-90"
              )} />
            )}
          </div>

          {/* Action buttons */}
          {showActions && !isCompleted && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 mt-3 pt-3 border-t border-border"
            >
              <Button
                size="sm"
                className="gap-1.5 rounded-lg text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete(task);
                }}
              >
                <Check className="w-3.5 h-3.5" />
                完成
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 rounded-lg text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onDefer(task);
                }}
              >
                <Pause className="w-3.5 h-3.5" />
                延後
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}