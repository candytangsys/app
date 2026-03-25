// filepath: c:\Users\USER\Desktop\排定app\src\models\Task.js
export class Task {
  constructor(title, estimatedDuration, priority, deadline = null, type = 'light') {
    this.id = Date.now().toString();
    this.title = title;
    this.estimatedDuration = estimatedDuration; // 分鐘
    this.remainingDuration = estimatedDuration;
    this.priority = priority; // 'high', 'medium', 'low'
    this.deadline = deadline; // Date物件
    this.type = type; // 'deep' 或 'light'
    this.status = 'pending'; // 'pending', 'in_progress', 'completed'
    this.startTime = null;
    this.endTime = null;
    this.assignedDate = null; // Date物件
  }
}