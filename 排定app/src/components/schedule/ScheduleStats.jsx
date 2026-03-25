import React from "react";
import { CheckCircle2, Clock, Zap, ListTodo } from "lucide-react";
import { motion } from "framer-motion";

export default function ScheduleStats({ tasks }) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const pending = tasks.filter((t) => t.status === "pending" || t.status === "in_progress").length;
  const totalMinutes = tasks
    .filter((t) => t.status !== "completed")
    .reduce((sum, t) => sum + (t.remaining_duration || t.estimated_duration || 0), 0);
  const completedMinutes = tasks
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + (t.actual_duration || t.estimated_duration || 0), 0);

  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const stats = [
    { icon: ListTodo, label: "總任務", value: total, color: "text-primary" },
    { icon: CheckCircle2, label: "已完成", value: completed, color: "text-accent" },
    { icon: Clock, label: "剩餘", value: `${totalMinutes}分`, color: "text-amber-500" },
    { icon: Zap, label: "完成度", value: `${progress}%`, color: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-card rounded-xl border border-border p-3 text-center"
        >
          <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
          <div className="text-lg font-bold">{stat.value}</div>
          <div className="text-[10px] text-muted-foreground">{stat.label}</div>
        </motion.div>
      ))}
    </div>
  );
}