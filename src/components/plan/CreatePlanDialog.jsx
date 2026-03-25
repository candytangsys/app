import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { entities } from "@/api/apiClient";  // 改這行
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "lucide-react";

export default function CreatePlanDialog({ open, onOpenChange }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [days, setDays] = useState(7);

  const createMutation = useMutation({
    mutationFn: (data) => entities.Plan.create(data),  // 改這行
    onSuccess: (newPlan) => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      onOpenChange(false);
      navigate(`/plan/${newPlan.id}`);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const startDate = new Date();
    const endDate = addDays(startDate, parseInt(days));

    await createMutation.mutateAsync({
      title,
      description,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      day_start: "09:00",
      day_end: "22:00",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>建立新計畫</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">計畫名稱</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="輸入���畫名稱"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">描述</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="輸入計畫描述（可選）"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">計畫天數</label>
            <Input
              type="number"
              min="1"
              max="365"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !title.trim()}
            >
              {createMutation.isPending ? "建立中..." : "建立計畫"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}