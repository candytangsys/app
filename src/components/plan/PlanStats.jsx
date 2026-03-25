import React from "react";
import { CheckCircle2, Clock, CalendarDays, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function PlanStats({ tasks }) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === "completed").length;
  const pending = total - completed;
  const totalMins = tasks.filter(t => t.status !== "completed")
    .reduce((s, t) => s + (t.remaining_duration || t.estimated_duration || 0), 0);
  const totalHours = (totalMins / 60).toFixed(1);
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const stats = [
    { icon: CalendarDays, label: "總任務", value: total, color: "text-primary" },
    { icon: CheckCircle2, label: "已完成", value: completed, color: "text-accent" },
    { icon: Clock, label: "剩餘時數", value: `${totalHours}h`, color: "text-amber-500" },
    { icon: Zap, label: "完成度", value: `${progress}%`, color: "text-violet-500" },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-card rounded-xl border border-border p-2.5 text-center"
          >
            <s.icon className={`w-3.5 h-3.5 mx-auto mb-1 ${s.color}`} />
            <div className="text-base font-bold">{s.value}</div>
            <div className="text-[9px] text-muted-foreground leading-tight">{s.label}</div>
          </motion.div>
        ))}
      </div>
      {total > 0 && (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      )}
    </div>
  );
}