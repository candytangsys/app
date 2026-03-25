import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";

const today = format(new Date(), "yyyy-MM-dd");

export default function CreatePlanDialog({ open, onOpenChange }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    description: "",
    start_date: today,
    end_date: format(addDays(new Date(), 7), "yyyy-MM-dd"),
    day_start: "09:00",
    day_end: "22:00",
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Plan.create(data),
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      onOpenChange(false);
      navigate(`/plan/${plan.id}`);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    createMutation.mutate({ ...form, status: "active" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            新增計畫
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>計畫名稱 *</Label>
            <Input
              placeholder="例如：期末考準備、健身計畫..."
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>說明（選填）</Label>
            <Input
              placeholder="簡短描述這個計畫..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>開始日期</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>結束日期</Label>
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>每日開始</Label>
              <Input type="time" value={form.day_start} onChange={e => setForm(f => ({ ...f, day_start: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>每日結束</Label>
              <Input type="time" value={form.day_end} onChange={e => setForm(f => ({ ...f, day_end: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={!form.title.trim() || createMutation.isPending} className="gap-2">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              建立計畫
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}