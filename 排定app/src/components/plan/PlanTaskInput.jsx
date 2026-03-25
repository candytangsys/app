import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Send } from "lucide-react";
import { motion } from "framer-motion";

export default function PlanTaskInput({ onAddTasks, isProcessing }) {
  const [input, setInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onAddTasks(input.trim());
    setInput("");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <form onSubmit={handleSubmit}>
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
          <div className="relative bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="輸入任務，例如：準備考試3小時、運動每天30分鐘、寫報告、讀書..."
              className="min-h-[72px] border-0 bg-transparent resize-none text-sm px-4 pt-3 pb-2 focus-visible:ring-0 placeholder:text-muted-foreground/50"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="w-3 h-3 text-primary" />
                <span>AI 自動估時 & 多天排程</span>
              </div>
              <Button type="submit" disabled={!input.trim() || isProcessing} size="sm" className="rounded-xl gap-1.5 h-8 text-xs px-4">
                {isProcessing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />分析中...</> : <><Send className="w-3.5 h-3.5" />加入</>}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}