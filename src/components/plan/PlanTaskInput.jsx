import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

export default function PlanTaskInput({ onAddTasks, isProcessing }) {
  const [input, setInput] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    await onAddTasks(input);
    setInput('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="輸入任務描述... (例如: 學習 React 2小時)"
        disabled={isProcessing}
        className="flex-1 px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={isProcessing || !input.trim()}
        className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            處理中
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            新增
          </>
        )}
      </button>
    </form>
  );
}