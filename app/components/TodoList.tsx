"use client";

import { useEffect, useState, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getTasks, createTask } from "@/lib/tasks";
import TodoItem from "./TodoItem";
import { Bot, Loader2, Plus } from "lucide-react";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
  is_ai_processing?: boolean;
};

export default function TodoList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Carregar tarefas
  const fetchTasks = async () => {
    setLoading(true);
    const data = await getTasks();
    if (data) setTasks(data as Task[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
    // Realtime
    const channel = supabase
      .channel("realtime:tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        setTasks((current) => {
          if (eventType === "INSERT") return [newRecord as Task, ...current];
          if (eventType === "DELETE") return current.filter((t) => t.id !== oldRecord.id);
          if (eventType === "UPDATE") return current.map((t) => (t.id === newRecord.id ? { ...newRecord } as Task : t));
          return current;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAddTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    setSubmitting(true);

    try {
      const task = await createTask(newTask.trim());
      if (task) {
        setTasks((prev) => [{ ...task, is_ai_processing: true } as Task, ...prev]);
        setNewTask("");
        // Chama o N8N sem esperar (Fire & Forget)
        fetch("/api/n8n-trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId: task.id, title: task.title }),
        }).catch(console.error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-[#0B1120] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden mt-10">
      {/* Header Bonito */}
      <div className="p-6 border-b border-slate-800/60 bg-slate-900/30">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-500" />
          AI Tasks
        </h2>
        <p className="text-sm text-slate-400 mt-1">Automated by N8N & Supabase</p>
      </div>

      {/* Input Moderno */}
      <div className="p-4 bg-slate-900/20">
        <form onSubmit={handleAddTask} className="flex gap-2 items-center bg-[#030712] border border-slate-700 rounded-xl p-1 focus-within:ring-2 focus-within:ring-blue-600/50 transition-all">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add a new task (e.g. 'buy coffee')..."
            className="flex-1 bg-transparent border-none text-white px-4 py-2 focus:outline-none text-sm placeholder:text-slate-600"
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          </button>
        </form>
      </div>

      {/* Lista Limpa */}
      <div className="divide-y divide-slate-800/50 max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-500 flex justify-center"><Loader2 className="animate-spin" /></div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center text-slate-600">
            <p>No tasks yet.</p>
          </div>
        ) : (
          tasks.map((task) => (
            <TodoItem key={task.id} task={task} onUpdate={() => {}} />
          ))
        )}
      </div>
    </div>
  );
}