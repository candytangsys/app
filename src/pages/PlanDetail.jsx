import React, { useState, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { entities, integrations } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, addDays, eachDayOfInterval, isToday } from "date-fns";
import { zhTW } from "date-fns/locale";
import { ArrowLeft, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

import PlanTaskInput from "@/components/plan/PlanTaskInput";
import DateNavigator from "@/components/plan/DateNavigator";
import DayTimeline from "@/components/plan/DayTimeline";
import PlanStats from "@/components/plan/PlanStats";
import CompleteTaskDialog from "@/components/plan/CompleteTaskDialog";
import DeferTaskDialog from "@/components/plan/DeferTaskDialog";
import { multiDaySchedule, forwardShiftDay, handleIncompleteTask, timeToMinutes, minutesToTime } from "@/lib/multiDayScheduleEngine";

export default function PlanDetail() {
  const { planId } = useParams();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [completeTask, setCompleteTask] = useState(null);
  const [deferTask, setDeferTask] = useState(null);

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ["plan", planId],
    queryFn: () => entities.Plan.list().then(plans => plans.find(p => p.id === planId)),
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", planId],
    queryFn: () => entities.Task.filter({ plan_id: planId }, "assigned_date", 500),
  });

  // Determine available dates for this plan
  const availableDates = useMemo(() => {
    if (!plan) return [];
    const start = plan.start_date ? parseISO(plan.start_date) : new Date();
    const end = plan.end_date ? parseISO(plan.end_date) : addDays(new Date(), 30);
    return eachDayOfInterval({ start, end }).map(d => format(d, "yyyy-MM-dd"));
  }, [plan]);

  // Default to today or first available date
  const defaultDate = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return availableDates.includes(todayStr) ? todayStr : (availableDates[0] ?? todayStr);
  }, [availableDates]);

  const [selectedDate, setSelectedDate] = useState(null);
  const currentDate = selectedDate ?? defaultDate;

  const dayTasks = useMemo(
    () => tasks.filter(t => t.assigned_date === currentDate),
    [tasks, currentDate]
  );

  const createMutation = useMutation({
    mutationFn: (data) => entities.Task.bulkCreate(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", planId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.Task.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", planId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.Task.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", planId] }),
  });

  // AI parse + multi-day schedule
  const handleAddTasks = useCallback(async (input) => {
    if (!plan) return;
    setIsProcessing(true);

    const result = await integrations.Core.InvokeLLM({
      prompt: `你是任務排程助手。解析以下輸入，轉成任務JSON列表。
為每個任務估計合理的時間（分鐘）。如果用戶說「每天X分鐘/小時」，estimated_duration 設為每天的量。
如果說「共X小時」，estimated_duration 設為總量（分鐘）。
分類：deep_work（需要高度專注）、light_task（輕鬆任務）、exercise（運動）、meeting（會議）、personal（個人事務）
優先順序：根據任務性質自動判斷 high/medium/low

使用者輸入：「${input}」`,
      response_json_schema: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                estimated_duration: { type: "number", description: "分鐘，如每天重複則為每日分鐘數" },
                priority: { type: "string", enum: ["high", "medium", "low"] },
                category: { type: "string", enum: ["deep_work", "light_task", "exercise", "meeting", "personal"] },
                daily_repeat: { type: "boolean", description: "是否每天重複（例如每天運動）" },
              },
            },
          },
        },
      },
    });

    if (result?.tasks?.length > 0) {
      // Expand daily repeat tasks across all days
      const expandedTasks = [];
      for (const t of result.tasks) {
        if (t.daily_repeat && availableDates.length > 1) {
          for (const d of availableDates) {
            expandedTasks.push({ ...t, daily_repeat: false, _targetDate: d });
          }
        } else {
          expandedTasks.push({ ...t });
        }
      }

      // Existing pending tasks
      const existingPending = tasks.filter(t => t.status === "pending" || t.status === "in_progress");

      // Group existing by date
      const existingByDate = {};
      for (const t of existingPending) {
        if (!existingByDate[t.assigned_date]) existingByDate[t.assigned_date] = [];
        existingByDate[t.assigned_date].push(t);
      }

      // New tasks to schedule (non-daily-repeat go through multi-day engine)
      const newBulkTasks = expandedTasks.filter(t => !t._targetDate);
      const newDailyTasks = expandedTasks.filter(t => t._targetDate);

      const toCreate = [];

      // Multi-day schedule for non-daily tasks
      if (newBulkTasks.length > 0) {
        const tempTasks = newBulkTasks.map((t, i) => ({
          ...t,
          id: `temp_${i}`,
          remaining_duration: t.estimated_duration,
          status: "pending",
        }));

        const scheduled = multiDaySchedule(
          tempTasks,
          currentDate,
          plan.day_start || "09:00",
          plan.day_end || "22:00"
        );

        for (const s of scheduled) {
          toCreate.push({
            plan_id: planId,
            title: s.title,
            estimated_duration: s.estimated_duration,
            remaining_duration: s.session_duration || s.remaining_duration,
            priority: s.priority,
            category: s.category,
            status: "pending",
            assigned_date: s.assigned_date,
            start_time: s.start_time,
            end_time: s.end_time,
            sort_order: s.sort_order,
            is_split: s.is_split || false,
          });
        }
      }

      // Daily repeat tasks: schedule directly on their target date
      for (const t of newDailyTasks) {
        const dateTaskCount = toCreate.filter(c => c.assigned_date === t._targetDate).length +
          (existingByDate[t._targetDate]?.length || 0);
        const dayStart = plan.day_start || "09:00";
        const dayEnd = plan.day_end || "22:00";

        const dayExistingEnd = (existingByDate[t._targetDate] || [])
          .filter(x => x.end_time)
          .reduce((max, x) => Math.max(max, timeToMinutes(x.end_time)), timeToMinutes(dayStart));
        const dayNewEnd = toCreate
          .filter(c => c.assigned_date === t._targetDate && c.end_time)
          .reduce((max, c) => Math.max(max, timeToMinutes(c.end_time)), dayExistingEnd);

        const duration = t.estimated_duration || 30;
        if (dayNewEnd + duration <= timeToMinutes(dayEnd)) {
          toCreate.push({
            plan_id: planId,
            title: t.title,
            estimated_duration: duration,
            remaining_duration: duration,
            priority: t.priority,
            category: t.category,
            status: "pending",
            assigned_date: t._targetDate,
            start_time: minutesToTime(dayNewEnd),
            end_time: minutesToTime(dayNewEnd + duration),
            sort_order: dateTaskCount,
            is_split: false,
          });
        }
      }

      if (toCreate.length > 0) {
        await createMutation.mutateAsync(toCreate);
        toast({ title: "排程完成 ✨", description: `已加入 ${result.tasks.length} 個任務，分配到 ${[...new Set(toCreate.map(t => t.assigned_date))].length} 天` });
      }
    }
    setIsProcessing(false);
  }, [plan, tasks, planId, currentDate, availableDates, createMutation]);

  // Complete task → forward shift
  const handleComplete = useCallback(async (task, actualMinutes) => {
    const updated = forwardShiftDay(tasks, task.id, actualMinutes, task.assigned_date);

    for (const t of updated) {
      if (!t.id) continue;
      const original = tasks.find(o => o.id === t.id);
      if (!original) continue;

      const changes = {};
      if (t.status !== original.status) changes.status = t.status;
      if (t.start_time !== original.start_time) changes.start_time = t.start_time;
      if (t.end_time !== original.end_time) changes.end_time = t.end_time;
      if (t.remaining_duration !== original.remaining_duration) changes.remaining_duration = t.remaining_duration;
      if (t.actual_duration !== original.actual_duration) changes.actual_duration = t.actual_duration;
      if (t.sort_order !== original.sort_order) changes.sort_order = t.sort_order;

      if (Object.keys(changes).length > 0) {
        await updateMutation.mutateAsync({ id: t.id, data: changes });
      }
    }

    setCompleteTask(null);
    toast({ title: "任務完成 ✅", description: "後續任務已自動前移" });
  }, [tasks, updateMutation]);

  // Defer task → handle incomplete
  const handleDefer = useCallback(async (task, timeSpent) => {
    const updated = handleIncompleteTask(tasks, task.id, timeSpent, task.assigned_date, plan?.day_start, plan?.day_end);

    for (const t of updated) {
      if (!t.id) continue;
      const original = tasks.find(o => o.id === t.id);
      if (!original) continue;

      const changes = {};
      if (t.status !== original.status) changes.status = t.status;
      if (t.assigned_date !== original.assigned_date) changes.assigned_date = t.assigned_date;
      if (t.start_time !== original.start_time) changes.start_time = t.start_time;
      if (t.end_time !== original.end_time) changes.end_time = t.end_time;
      if (t.remaining_duration !== original.remaining_duration) changes.remaining_duration = t.remaining_duration;
      if (t.actual_duration !== original.actual_duration) changes.actual_duration = t.actual_duration;
      if (t.sort_order !== original.sort_order) changes.sort_order = t.sort_order;

      if (Object.keys(changes).length > 0) {
        await updateMutation.mutateAsync({ id: t.id, data: changes });
      }
    }

    setDeferTask(null);
    toast({ title: "已延後", description: "剩餘時間已重新分配" });
  }, [tasks, updateMutation, plan]);

  // Full reschedule for entire plan
  const handleReschedule = useCallback(async () => {
    const pending = tasks.filter(t => t.status === "pending" || t.status === "in_progress");
    if (pending.length === 0) return;

    const scheduled = multiDaySchedule(
      pending,
      currentDate,
      plan?.day_start || "09:00",
      plan?.day_end || "22:00"
    );

    for (const s of scheduled) {
      if (!s.id) continue;
      await updateMutation.mutateAsync({
        id: s.id,
        data: {
          assigned_date: s.assigned_date,
          start_time: s.start_time,
          end_time: s.end_time,
          sort_order: s.sort_order,
        },
      });
    }

    toast({ title: "重新排程完成", description: "所有任務已重新分配" });
  }, [tasks, currentDate, plan, updateMutation]);

  if (planLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{plan?.title || "計畫"}</h1>
            {plan?.description && (
              <p className="text-xs text-muted-foreground truncate">{plan.description}</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl text-xs flex-shrink-0"
            onClick={handleReschedule}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />
            }
            重新排程
          </Button>
        </div>

        {/* Stats */}
        {tasks.length > 0 && (
          <div className="mb-5">
            <PlanStats tasks={tasks} />
          </div>
        )}

        {/* Task Input */}
        <div className="mb-5">
          <PlanTaskInput onAddTasks={handleAddTasks} isProcessing={isProcessing} />
        </div>

        {/* Date Navigator */}
        {availableDates.length > 0 && (
          <div className="mb-5">
            <DateNavigator
              dates={availableDates}
              selectedDate={currentDate}
              onSelect={setSelectedDate}
            />
          </div>
        )}

        {/* Day Timeline */}
        {tasksLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <DayTimeline
            tasks={dayTasks}
            onComplete={task => setCompleteTask(task)}
            onDefer={task => setDeferTask(task)}
            onDelete={task => deleteMutation.mutate(task.id)}
          />
        )}
      </div>

      <CompleteTaskDialog
        task={completeTask}
        open={!!completeTask}
        onOpenChange={open => !open && setCompleteTask(null)}
        onConfirm={handleComplete}
      />
      <DeferTaskDialog
        task={deferTask}
        open={!!deferTask}
        onOpenChange={open => !open && setDeferTask(null)}
        onConfirm={handleDefer}
      />
    </div>
  );
}