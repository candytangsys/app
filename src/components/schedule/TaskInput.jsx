import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TaskInput({ onAddTasks, isProcessing }) {
  const [input, setInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onAddTasks(input.trim());
    setInput("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-accent/30 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
          <div className="relative bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="輸入你的任務，例如：寫報告、運動30分鐘、讀書..."
              className="min-h-[80px] border-0 bg-transparent resize-none text-base px-5 pt-4 pb-2 focus-visible:ring-0 placeholder:text-muted-foreground/50"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>AI 自動估時 & 排程</span>
              </div>
              <Button
                type="submit"
                disabled={!input.trim() || isProcessing}
                size="sm"
                className="rounded-xl gap-2 px-5"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    加入排程
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}