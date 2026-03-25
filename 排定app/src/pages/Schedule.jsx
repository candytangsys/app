import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { RefreshCw, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

import TaskInput from "@/components/schedule/TaskInput";
import Timeline from "@/components/schedule/Timeline";
import ScheduleStats from "@/components/schedule/ScheduleStats";
import CompleteDialog from "@/components/schedule/CompleteDialog";
import DeferDialog from "@/components/schedule/DeferDialog";
import { rescheduleFrom, forwardShift, handleIncomplete, getNextAvailableTime } from "@/lib/scheduleEngine";

const today = format(new Date(), "yyyy-MM-dd");

export default function Schedule() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [completeTask, setCompleteTask] = useState(null);
  const [deferTask, setDeferTask] = useState(null);
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", today],
    queryFn: () => base44.entities.Task.filter({ scheduled_date: today }, "sort_order", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.bulkCreate(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  // AI parse tasks
  const handleAddTasks = useCallback(async (input) => {
    setIsProcessing(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `你是一個任務排程助手。解析以下自然語言任務輸入，將每個任務轉成JSON。
為每個任務估計合理的時間（分鐘），並分類。
輸入可能包含多個任務（用逗號、頓號、換行分隔）。

分類選項：deep_work（需要專注的工作）、light_task（輕任務）、exercise（運動）、meeting（會議）、personal（個人事務）
優先順序：根據任務性質判斷 high/medium/low

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
                estimated_duration: { type: "number", description: "分鐘" },
                priority: { type: "string", enum: ["high", "medium", "low"] },
                category: { type: "string", enum: ["deep_work", "light_task", "exercise", "meeting", "personal"] },
              },
            },
          },
        },
      },
    });

    if (result?.tasks?.length > 0) {
      const startTime = getNextAvailableTime(tasks);
      const newTasks = result.tasks.map((t) => ({
        ...t,
        remaining_duration: t.estimated_duration,
        status: "pending",
        scheduled_date: today,
        sort_order: tasks.length + result.tasks.indexOf(t),
      }));

      // Combine existing pending tasks with new ones, then reschedule
      const allPending = [
        ...tasks.filter((t) => t.status === "pending" || t.status === "in_progress"),
        ...newTasks,
      ];
      const completedTasks = tasks.filter((t) => t.status === "completed");
      const lastCompletedEnd = completedTasks.length > 0
        ? completedTasks.reduce((latest, t) => {
            if (!t.end_time) return latest;
            return t.end_time > latest ? t.end_time : latest;
          }, "08:00")
        : getNextAvailableTime([]);

      const rescheduled = rescheduleFrom(allPending, lastCompletedEnd);

      // Create new tasks with schedule info
      const toCreate = rescheduled
        .filter((t) => !t.id)
        .map((t) => ({
          title: t.title,
          estimated_duration: t.estimated_duration,
          remaining_duration: t.remaining_duration,
          priority: t.priority,
          category: t.category,
          status: t.status,
          scheduled_date: today,
          start_time: t.start_time,
          end_time: t.end_time,
          sort_order: t.sort_order,
        }));

      // Update existing tasks that got rescheduled
      const toUpdate = rescheduled.filter((t) => t.id);
      
      if (toCreate.length > 0) {
        await createMutation.mutateAsync(toCreate);
      }
      for (const t of toUpdate) {
        await updateMutation.mutateAsync({
          id: t.id,
          data: { start_time: t.start_time, end_time: t.end_time, sort_order: t.sort_order },
        });
      }

      toast({
        title: "排程完成",
        description: `已加入 ${toCreate.length} 個任務並自動排程`,
      });
    }
    setIsProcessing(false);
  }, [tasks, createMutation, updateMutation]);

  // Complete a task -> forward shift
  const handleComplete = useCallback(async (task, actualMinutes) => {
    const updated = forwardShift(tasks, task.id, actualMinutes);
    
    for (const t of updated) {
      if (!t.id) continue;
      const original = tasks.find((o) => o.id === t.id);
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
    toast({
      title: "任務完成 ✅",
      description: "後續任務已自動調整",
    });
  }, [tasks, updateMutation]);

  // Defer a task -> handle incomplete
  const handleDefer = useCallback(async (task, timeSpent) => {
    const updated = handleIncomplete(tasks, task.id, timeSpent);

    for (const t of updated) {
      if (!t.id) continue;
      const original = tasks.find((o) => o.id === t.id);
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

    setDeferTask(null);
    toast({
      title: "已延後",
      description: "剩餘時間已重新排入行程",
    });
  }, [tasks, updateMutation]);

  // Full reschedule
  const handleReschedule = useCallback(async () => {
    const pending = tasks.filter((t) => t.status === "pending" || t.status === "in_progress");
    const completedTasks = tasks.filter((t) => t.status === "completed");
    
    const lastCompletedEnd = completedTasks.reduce((latest, t) => {
      if (!t.end_time) return latest;
      return t.end_time > latest ? t.end_time : latest;
    }, getNextAvailableTime([]));

    const rescheduled = rescheduleFrom(pending, lastCompletedEnd);

    for (const t of rescheduled) {
      if (!t.id) continue;
      await updateMutation.mutateAsync({
        id: t.id,
        data: {
          start_time: t.start_time,
          end_time: t.end_time,
          sort_order: t.sort_order,
        },
      });
    }

    toast({ title: "重新排程完成", description: "所有任務已根據優先順序重新排列" });
  }, [tasks, updateMutation]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">今日排程</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(), "M月d日 EEEE", { locale: zhTW })}
            </p>
          </div>
          {tasks.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl text-xs"
              onClick={handleReschedule}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              重新排程
            </Button>
          )}
        </div>

        {/* Stats */}
        {tasks.length > 0 && (
          <div className="mb-6">
            <ScheduleStats tasks={tasks} />
          </div>
        )}

        {/* Task Input */}
        <div className="mb-8">
          <TaskInput onAddTasks={handleAddTasks} isProcessing={isProcessing} />
        </div>

        {/* Timeline */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <Timeline
            tasks={tasks}
            onComplete={(task) => setCompleteTask(task)}
            onDefer={(task) => setDeferTask(task)}
          />
        )}
      </div>

      {/* Dialogs */}
      <CompleteDialog
        task={completeTask}
        open={!!completeTask}
        onOpenChange={(open) => !open && setCompleteTask(null)}
        onConfirm={handleComplete}
      />
      <DeferDialog
        task={deferTask}
        open={!!deferTask}
        onOpenChange={(open) => !open && setDeferTask(null)}
        onConfirm={handleDefer}
      />
    </div>
  );
}