// Simple API client for local development
// Replaces base44 SDK with mock data

// Mock data for development
const mockPlans = [
  {
    id: 'plan-1',
    title: '學習 React',
    description: '深入學習 React 和相關技術',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    day_start: '09:00',
    day_end: '22:00',
    created_date: new Date().toISOString(),
  },
];

const mockTasks = [
  {
    id: 'task-1',
    plan_id: 'plan-1',
    title: '學習 React Hooks',
    status: 'pending',
    priority: 'high',
    category: 'deep_work',
    estimated_duration: 120,
    remaining_duration: 120,
    assigned_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '11:00',
    sort_order: 0,
    created_date: new Date().toISOString(),
  },
];

// Simple in-memory storage for development
let plans = JSON.parse(JSON.stringify(mockPlans));
let tasks = JSON.parse(JSON.stringify(mockTasks));

// Entities API (simplified version of base44.entities)
export const entities = {
  Plan: {
    list: async (sort, limit) => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      return plans;
    },
    get: async (id) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return plans.find(p => p.id === id);
    },
    create: async (data) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      const newPlan = {
        id: `plan-${Date.now()}`,
        ...data,
        created_date: new Date().toISOString(),
      };
      plans.push(newPlan);
      return newPlan;
    },
    update: async (id, data) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      const index = plans.findIndex(p => p.id === id);
      if (index >= 0) {
        plans[index] = { ...plans[index], ...data };
        return plans[index];
      }
      throw new Error(`Plan ${id} not found`);
    },
    delete: async (id) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      const initialLength = plans.length;
      plans = plans.filter(p => p.id !== id);
      // Also delete associated tasks
      tasks = tasks.filter(t => t.plan_id !== id);
      if (plans.length === initialLength) {
        throw new Error(`Plan ${id} not found`);
      }
      return { success: true };
    },
  },
  Task: {
    list: async (sort, limit) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      return tasks;
    },
    filter: async (filter, sort, limit) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      let filtered = tasks;
      if (filter.plan_id) {
        filtered = filtered.filter(t => t.plan_id === filter.plan_id);
      }
      return filtered;
    },
    create: async (data) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      const newTask = {
        id: `task-${Date.now()}`,
        ...data,
        created_date: new Date().toISOString(),
      };
      tasks.push(newTask);
      return newTask;
    },
    bulkCreate: async (dataArray) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const created = dataArray.map((data, index) => ({
        id: `task-${Date.now()}-${index}`,
        ...data,
        created_date: new Date().toISOString(),
      }));
      tasks.push(...created);
      return created;
    },
    update: async (id, data) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      const index = tasks.findIndex(t => t.id === id);
      if (index >= 0) {
        tasks[index] = { ...tasks[index], ...data };
        return tasks[index];
      }
      throw new Error(`Task ${id} not found`);
    },
    delete: async (id) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      const initialLength = tasks.length;
      tasks = tasks.filter(t => t.id !== id);
      if (tasks.length === initialLength) {
        throw new Error(`Task ${id} not found`);
      }
      return { success: true };
    },
  },
};

// Auth API (simplified)
export const auth = {
  me: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    // Return mock user for development
    return {
      id: 'user-1',
      email: 'dev@example.com',
      role: 'admin',
      name: '開發用戶',
    };
  },
  logout: (redirectUrl) => {
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  },
  redirectToLogin: (redirectUrl) => {
    window.location.href = `/login?redirect=${encodeURIComponent(redirectUrl)}`;
  },
};

// Integrations API (for LLM - returns mock data)
export const integrations = {
  Core: {
    InvokeLLM: async (params) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      // Return mock task parsing result
      return {
        tasks: [
          {
            title: '範例任務',
            estimated_duration: 60,
            priority: 'medium',
            category: 'deep_work',
            daily_repeat: false,
          },
        ],
      };
    },
  },
};

// Export as a simple client object
export const apiService = {
  entities,
  auth,
  integrations,
};