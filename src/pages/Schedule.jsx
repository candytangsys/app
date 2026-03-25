import React, { useState, useCallback } from "react";
import { entities, integrations } from "@/api/apiClient";
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
import { getNextAvailableTime } from "@/lib/scheduleEngine";

const today = format(new Date(), "yyyy-MM-dd");

export default function Schedule() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [completeTask, setCompleteTask] = useState(null);
  const [deferTask, setDeferTask] = useState(null);
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", today],
    queryFn: async () => {
      const allTasks = await entities.Task.list();
      return allTasks.filter(t => t.scheduled_date === today).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => entities.Task.bulkCreate(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.Task.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  // AI parse tasks
  const handleAddTasks = useCallback(async (input) => {
    setIsProcessing(true);
    try {
      const result = await integrations.Core.InvokeLLM({
        prompt: `你是一個任務排程助手。解析以下自然語言任務輸入，將每個任務轉成JSON。
為每個任務估計合理的時間（分鐘），並分類。
輸入可能包含多個任務（用逗號、頓號、換行分隔）。

分類選項：deep_work（需要專注的工作）、light_task（輕任務）、exercise（運動）、meeting（會議）、personal���個人事務）
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
        const newTasks = result.tasks.map((t, index) => ({
          title: t.title,
          estimated_duration: t.estimated_duration,
          remaining_duration: t.estimated_duration,
          priority: t.priority,
          category: t.category,
          status: "pending",
          scheduled_date: today,
          sort_order: tasks.length + index,
          start_time: null,
          end_time: null,
        }));

        await createMutation.mutateAsync(newTasks);
        toast({
          title: "排程完成",
          description: `已加入 ${result.tasks.length} 個任務`,
        });
      }
    } catch (error) {
      console.error('Error adding tasks:', error);
      toast({
        title: "錯誤",
        description: "添加任務失敗",
        variant: "destructive",
      });
    }
    setIsProcessing(false);
  }, [tasks, createMutation]);

  // Complete a task
  const handleComplete = useCallback(async (task, actualMinutes) => {
    try {
      await updateMutation.mutateAsync({
        id: task.id,
        data: {
          status: "completed",
          actual_duration: actualMinutes,
        },
      });

      setCompleteTask(null);
      toast({
        title: "任務完成 ✅",
        description: "任務已標記為完成",
      });
    } catch (error) {
      console.error('Error completing task:', error);
      toast({
        title: "錯誤",
        description: "完成任務失敗",
        variant: "destructive",
      });
    }
  }, [updateMutation]);

  // Defer a task
  const handleDefer = useCallback(async (task, timeSpent) => {
    try {
      await updateMutation.mutateAsync({
        id: task.id,
        data: {
          status: "pending",
          actual_duration: timeSpent,
          remaining_duration: (task.estimated_duration || 0) - timeSpent,
        },
      });

      setDeferTask(null);
      toast({
        title: "已延後",
        description: "任務已延後到明天",
      });
    } catch (error) {
      console.error('Error deferring task:', error);
      toast({
        title: "錯誤",
        description: "延後任務失敗",
        variant: "destructive",
      });
    }
  }, [updateMutation]);

  // Full reschedule
  const handleReschedule = useCallback(async () => {
    const pending = tasks.filter((t) => t.status === "pending" || t.status === "in_progress");
    if (pending.length === 0) return;

    try {
      // Simple reschedule: sort by priority
      const rescheduled = pending.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      });

      for (let i = 0; i < rescheduled.length; i++) {
        await updateMutation.mutateAsync({
          id: rescheduled[i].id,
          data: { sort_order: i },
        });
      }

      toast({ title: "重新排程完成", description: "所有任務已根據優先順序重新排列" });
    } catch (error) {
      console.error('Error rescheduling:', error);
      toast({
        title: "錯誤",
        description: "重新排程失敗",
        variant: "destructive",
      });
    }
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