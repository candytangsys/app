import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pause, Clock } from "lucide-react";

export default function DeferTaskDialog({ task, open, onOpenChange, onConfirm }) {
  const [timeSpent, setTimeSpent] = useState(0);
  const estimatedDuration = task?.remaining_duration || task?.estimated_duration || 30;

  useEffect(() => {
    if (task) setTimeSpent(0);
  }, [task]);

  if (!task) return null;
  const remaining = estimatedDuration - timeSpent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pause className="w-5 h-5 text-amber-500" />延後任務
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-muted rounded-xl p-3.5">
            <p className="font-semibold text-sm">{task.title}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />剩餘 {estimatedDuration} 分鐘
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">已花了多少分鐘？（0 = 還沒開始）</Label>
            <Input
              type="number" min={0} max={estimatedDuration} value={timeSpent}
              onChange={e => setTimeSpent(Math.max(0, Math.min(estimatedDuration, parseInt(e.target.value) || 0)))}
              className="text-center text-xl font-bold"
            />
          </div>
          {remaining > 0 && (
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-sm font-semibold text-amber-600">剩餘 {remaining} 分鐘將重新排入行程（可能跨天）</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button variant="secondary" onClick={() => onConfirm(task, timeSpent)} className="gap-2">
            <Pause className="w-4 h-4" />確認延後
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}