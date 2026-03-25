import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Clock } from "lucide-react";

export default function CompleteDialog({ task, open, onOpenChange, onConfirm }) {
  const estimatedDuration = task?.remaining_duration || task?.estimated_duration || 30;
  const [actualMinutes, setActualMinutes] = useState(estimatedDuration);

  React.useEffect(() => {
    if (task) {
      setActualMinutes(task.remaining_duration || task.estimated_duration || 30);
    }
  }, [task]);

  if (!task) return null;

  const savedTime = estimatedDuration - actualMinutes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="w-5 h-5 text-accent" />
            完成任務
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-muted rounded-xl p-4">
            <p className="font-semibold text-sm">{task.title}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              預估 {estimatedDuration} 分鐘
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="actual" className="text-sm">實際花了多少分鐘？</Label>
            <Input
              id="actual"
              type="number"
              min={1}
              value={actualMinutes}
              onChange={(e) => setActualMinutes(Math.max(1, parseInt(e.target.value) || 1))}
              className="text-center text-lg font-bold"
            />
          </div>
          {savedTime > 0 && (
            <div className="bg-accent/10 rounded-xl p-3 text-center">
              <p className="text-sm font-semibold text-accent">
                🎉 省了 {savedTime} 分鐘！後面的任務會自動前推
              </p>
            </div>
          )}
          {savedTime < 0 && (
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-sm font-semibold text-amber-600">
                超時 {Math.abs(savedTime)} 分鐘，後面的任務會自動調整
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={() => onConfirm(task, actualMinutes)}
            className="gap-2"
          >
            <Check className="w-4 h-4" />
            確認完成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}