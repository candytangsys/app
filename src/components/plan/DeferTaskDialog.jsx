import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function DeferTaskDialog({ task, open, onOpenChange, onConfirm }) {
  const [timeSpent, setTimeSpent] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open || !task) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await onConfirm(task, timeSpent);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-sm w-full p-6">
        <h2 className="text-lg font-semibold mb-4">延後任務</h2>
        
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">任務: {task.title}</p>
          
          <label className="block text-sm font-medium mb-2">
            已花費時間 (分鐘)
          </label>
          <input
            type="number"
            min="0"
            value={timeSpent}
            onChange={(e) => setTimeSpent(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                處理中
              </>
            ) : (
              '延後任務'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}