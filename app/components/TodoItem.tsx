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
    <div className="group flex items-center justify-between p-4 hover:bg-slate-800/20 transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <button
          onClick={() => handleAction(() => toggleTask(task.id, !task.completed))}
          disabled={isLoading}
          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
            task.completed
              ? "border-green-500 bg-green-500/10 text-green-400"
              : "border-slate-600 hover:border-slate-500 text-transparent"
          }`}
        >
          {task.completed && <Check size={12} strokeWidth={3} />}
        </button>
        {isEditing ? (
          <div className="flex gap-2 flex-1 min-w-0">
            <input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="flex-1 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700 text-white text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none"
              autoFocus
            />
            <button
              onClick={() => { handleAction(() => editTask(task.id, editText)); setIsEditing(false); }}
              className="text-green-400 hover:text-green-300 transition-colors p-1.5"
            >
              <Save size={16} />
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="text-red-400 hover:text-red-300 transition-colors p-1.5"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={`text-sm flex-1 truncate ${
              task.completed ? "line-through text-slate-500" : "text-slate-200"
            }`}>
              {task.title}
            </span>
            {task.is_ai_processing && (
              <span className="flex-shrink-0 ml-2 text-xs text-purple-400 bg-purple-400/10 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 border border-purple-400/20">
                <span className="animate-sparkle inline-block">✨</span>
                <span>AI Optimizing...</span>
              </span>
            )}
          </div>
        )}
      </div>
      {!isEditing && (
        <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => { setIsEditing(true); setEditText(task.title); }}
            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800/50 rounded-lg transition-all"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => handleAction(() => deleteTask(task.id))}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/50 rounded-lg transition-all"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
