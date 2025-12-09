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
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">AI Todo Copilot</h1>
        <p className="text-slate-400">Smart tasks with Supabase & N8N</p>
      </div>
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 mb-8">
        <form onSubmit={handleAdd} className="flex gap-3">
          <input type="text" value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="New task..." className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" disabled={submitting} />
          <button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2">
            {submitting ? <Loader2 className="animate-spin"/> : <Bot/>} AI Create
          </button>
        </form>
      </div>
      <div className="space-y-3">
        {loading ? <div className="text-center text-slate-500"><Loader2 className="animate-spin inline"/> Loading...</div> : tasks.map(t => <TodoItem key={t.id} task={t} onUpdate={()=>{}} />)}
      </div>
    </div>
  );
}

