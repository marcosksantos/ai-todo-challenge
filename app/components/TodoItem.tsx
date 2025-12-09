"use client";

import { useState } from "react";
import { Check, X, Edit2, Trash2, Save, Loader2 } from "lucide-react";
import { toggleTask, editTask, deleteTask } from "@/lib/tasks";

type Task = { id: string; title: string; completed: boolean; created_at: string; is_ai_processing?: boolean; };

export default function TodoItem({ task, onUpdate }: { task: Task; onUpdate: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.title);
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: () => Promise<any>) => {
    setIsLoading(true);
    try { await action(); onUpdate(); } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${task.completed ? "bg-slate-900/30 border-slate-800 opacity-60" : "bg-slate-800/40 border-slate-700 hover:border-slate-600"}`}>
      <div className="flex items-center gap-4 flex-1">
        <button onClick={() => handleAction(() => toggleTask(task.id, !task.completed))} disabled={isLoading} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${task.completed ? "border-green-500 text-green-500" : "border-slate-500"}`}>
          {task.completed && <Check size={12} strokeWidth={4} />}
        </button>
        {isEditing ? (
          <div className="flex gap-2 flex-1">
            <input value={editText} onChange={(e) => setEditText(e.target.value)} className="flex-1 bg-slate-950 px-2 py-1 rounded border border-slate-600 text-white" autoFocus />
            <button onClick={() => { handleAction(() => editTask(task.id, editText)); setIsEditing(false); }} className="text-green-400"><Save size={16}/></button>
            <button onClick={() => setIsEditing(false)} className="text-red-400"><X size={16}/></button>
          </div>
        ) : (
          <span className={`text-lg flex-1 ${task.completed ? "line-through text-slate-500" : "text-slate-200"}`}>
            {task.title}
            {task.is_ai_processing && <span className="ml-2 text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full inline-flex items-center"><Loader2 size={10} className="animate-spin mr-1"/>AI</span>}
          </span>
        )}
      </div>
      {!isEditing && (
        <div className="flex gap-2">
          <button onClick={() => { setIsEditing(true); setEditText(task.title); }} className="p-2 text-slate-400 hover:text-blue-400"><Edit2 size={16}/></button>
          <button onClick={() => handleAction(() => deleteTask(task.id))} className="p-2 text-slate-400 hover:text-red-400"><Trash2 size={16}/></button>
        </div>
      )}
    </div>
  );
}

