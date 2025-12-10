"use client";

import { useEffect, useState, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getTasks, createTask } from "@/lib/tasks";
import TodoItem from "./TodoItem";
import { Bot, Loader2 } from "lucide-react";

type Task = { id: string; title: string; completed: boolean; created_at: string; is_ai_processing?: boolean; };

export default function TodoList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    setLoading(true);
    const data = await getTasks();
    if (data) setTasks(data as Task[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
    const channel = supabase.channel("realtime:tasks").on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
      const { eventType, new: newRec, old: oldRec } = payload;
      setTasks(prev => {
        if (eventType === "INSERT") return prev.find(t => t.id === newRec.id) ? prev : [newRec as Task, ...prev];
        if (eventType === "DELETE") return prev.filter(t => t.id !== oldRec.id);
        if (eventType === "UPDATE") return prev.map(t => t.id === newRec.id ? { ...newRec as Task } : t);
        return prev;
      });
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    setSubmitting(true);
    try {
      const task = await createTask(newTask.trim());
      if (task) {
        setTasks(prev => [{ ...task as Task, is_ai_processing: true }, ...prev]);
        setNewTask("");
        fetch("/api/n8n-trigger", { method: "POST", body: JSON.stringify({ taskId: task.id, title: task.title }) }).catch(console.error);
      }
    } catch (e) { console.error(e); } finally { setSubmitting(false); }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-[#0B0F19] border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-slate-800/50">
        <h1 className="text-2xl font-semibold text-slate-200 mb-1">Tasks</h1>
        <p className="text-slate-400 text-sm">Manage your tasks with AI assistance</p>
      </div>

      {/* Input Container */}
      <div className="px-6 py-4 border-b border-slate-800/50">
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1 bg-transparent text-slate-200 placeholder-slate-500 focus:outline-none text-sm"
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={submitting || !newTask.trim()}
            className="bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all text-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Bot size={16} />
                <span>Create</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Tasks List */}
      <div className="flex flex-col divide-y divide-slate-800/50">
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="animate-spin inline text-slate-400 mb-2" size={24} />
            <p className="text-slate-500 text-sm mt-2">Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-sm">No tasks yet. Create your first task above!</p>
          </div>
        ) : (
          tasks.map(t => <TodoItem key={t.id} task={t} onUpdate={() => {}} />)
        )}
      </div>
    </div>
  );
}
