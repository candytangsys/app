import React from 'react';
import { Trash2, CheckCircle2, Clock } from 'lucide-react';

export default function DayTimeline({ tasks, onComplete, onDefer, onDelete }) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">今天沒有任務</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task, index) => (
        <div
          key={task.id}
          className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm truncate">{task.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  task.priority === 'high'
                    ? 'bg-red-100 text-red-700'
                    : task.priority === 'medium'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {task.priority}
                </span>
              </div>
              {task.start_time && task.end_time && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {task.start_time} - {task.end_time}
                </div>
              )}
              {task.estimated_duration && (
                <div className="text-xs text-muted-foreground mt-1">
                  預計時長: {task.estimated_duration} 分鐘
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onComplete(task)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 transition-colors"
                title="完成任務"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(task)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                title="刪除任務"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}