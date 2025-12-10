"use client";

import { useState } from "react";
import { Check, Edit2, Trash2, Save, X, Sparkles } from "lucide-react";
import { toggleTask, editTask, deleteTask } from "@/lib/tasks";
import type { Task } from "@/lib/types";

interface TodoItemProps {
  task: Task;
  onUpdate: () => void;
  userId: string;
}

export default function TodoItem({ task, onUpdate, userId }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.title);
  const [isLoading, setIsLoading] = useState(false);
  const [optimisticCompleted, setOptimisticCompleted] = useState(task.completed);

  // Optimistic UI: Toggle visual state immediately, then sync with Supabase
  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading) return;

    const newCompleted = !optimisticCompleted;
    setOptimisticCompleted(newCompleted); // Optimistic update

    try {
      await toggleTask(task.id, newCompleted, userId);
      onUpdate(); // Sync with parent
    } catch (error) {
      console.error("Error toggling task:", error);
      setOptimisticCompleted(!newCompleted); // Revert on error
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this task?")) return;
    setIsLoading(true);
    try {
      await deleteTask(task.id, userId);
      onUpdate();
    } catch (error) {
      console.error("Error deleting task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (editText.trim() === task.title) {
      setIsEditing(false);
      return;
    }
    setIsLoading(true);
    try {
      await editTask(task.id, editText.trim(), userId);
      onUpdate();
      setIsEditing(false);
    } catch (error) {
      console.error("Error editing task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const displayCompleted = optimisticCompleted;

  return (
    <div
      className={`group flex items-center gap-3 p-4 border-b border-slate-800/50 transition-all duration-200 hover:bg-slate-800/20 ${
        displayCompleted ? "opacity-60 bg-slate-900/20" : ""
      }`}
    >
      {/* Entire left side clickable area (checkbox + text) */}
      <div
        onClick={handleToggle}
        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
      >
        {/* Checkbox with rounded-full border-2 */}
        <div className="flex-shrink-0">
          <div
            className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
              displayCompleted
                ? "bg-green-500 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]"
                : "border-slate-500 group-hover:border-blue-400"
            }`}
          >
            {displayCompleted && (
              <Check className="w-3.5 h-3.5 text-[#020617]" strokeWidth={4} />
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") setIsEditing(false);
                }}
                className="flex-1 bg-slate-950 border border-blue-500/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                autoFocus
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave();
                }}
                className="p-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors"
                aria-label="Save"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(false);
                  setEditText(task.title);
                }}
                className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  if (!displayCompleted) setIsEditing(true);
                }}
                className={`text-sm md:text-base select-none transition-colors ${
                  displayCompleted
                    ? "text-slate-500 line-through decoration-slate-600"
                    : "text-slate-200 cursor-text"
                }`}
              >
                {task.title}
              </span>

              {/* AI Badge with pulsing animation */}
              {task.is_ai_processing && (
                <div className="flex items-center gap-1.5 w-fit animate-pulse">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-purple-400">
                    AI Optimizing...
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Action buttons (hidden on mobile until hover, visible on desktop hover) */}
      {!isEditing && (
        <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
            aria-label="Edit task"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            aria-label="Delete task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
