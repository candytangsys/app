import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format, parseISO, differenceInDays } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Plus, Calendar, ChevronRight, Layers, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import CreatePlanDialog from "@/components/plan/CreatePlanDialog";

const planColors = ["bg-violet-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-indigo-500"];

export default function Home() {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: () => base44.entities.Plan.list("-created_date", 50),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Plan.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plans"] }),
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ["tasks-all"],
    queryFn: () => base44.entities.Task.list("-created_date", 500),
  });

  const getTaskStats = (planId) => {
    const tasks = allTasks.filter(t => t.plan_id === planId);
    const completed = tasks.filter(t => t.status === "completed").length;
    return { total: tasks.length, completed };
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-1">我的計畫</h1>
          <p className="text-muted-foreground text-sm">AI 動態排程・完成即調整</p>
        </div>

        {/* New Plan Button */}
        <button
          onClick={() => setShowCreate(true)}
          className="w-full mb-6 flex items-center gap-4 p-5 rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-foreground">新增計畫</p>
            <p className="text-xs text-muted-foreground">自然語言輸入，AI 自動排程</p>
          </div>
        </button>

        {/* Plan List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-semibold text-muted-foreground">還沒有計畫</p>
            <p className="text-sm text-muted-foreground mt-1">點擊上方按鈕建立第一個計畫</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {plans.map((plan, i) => {
                const stats = getTaskStats(plan.id);
                const colorClass = planColors[i % planColors.length];
                const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                const daysLeft = plan.end_date
                  ? differenceInDays(parseISO(plan.end_date), new Date())
                  : null;

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link to={`/plan/${plan.id}`} className="block">
                      <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:border-primary/20 transition-all group">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center flex-shrink-0`}>
                              <Calendar className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate">{plan.title}</h3>
                              {plan.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{plan.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {stats.completed}/{stats.total} 完成
                                </span>
                                {plan.end_date && (
                                  <span className={`text-xs font-medium ${daysLeft !== null && daysLeft < 3 ? "text-red-500" : "text-muted-foreground"}`}>
                                    {daysLeft !== null && daysLeft >= 0 ? `還有 ${daysLeft} 天` : "已過期"}
                                  </span>
                                )}
                              </div>
                              {stats.total > 0 && (
                                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${colorClass} rounded-full transition-all`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                deleteMutation.mutate(plan.id);
                              }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <CreatePlanDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
}