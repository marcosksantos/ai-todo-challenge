// AI Todo Copilot - TodoItem Component
// Individual task item with expandable card interface and inline editing

"use client";

import { useState, useEffect, useRef } from "react"
import { Check, Save, Sparkles, ChevronDown, Trash2 } from "lucide-react"
import type { Task } from "@/lib/types"

interface TodoItemProps {
  task: Task;
  onToggle: (id: string, completed: boolean) => void;
  onEdit: (id: string, newTitle: string) => void;
  onEditDescription: (id: string, description: string) => void;
  onDelete: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

/**
 * TodoItem component that renders a single task with expandable card interface.
 * Supports inline editing of title and description, optimistic UI updates, and AI processing indicators.
 * 
 * @param task - The task object to display
 * @param onToggle - Callback to toggle task completion status
 * @param onEdit - Callback to update task title
 * @param onEditDescription - Callback to update task description
 * @param onDelete - Callback to delete the task
 * @param isExpanded - Whether the task card is currently expanded
 * @param onToggleExpand - Callback to toggle expansion state
 */
export default function TodoItem({ 
  task, 
  onToggle, 
  onEdit, 
  onEditDescription,
  onDelete,
  isExpanded,
  onToggleExpand
}: TodoItemProps) {
  const [editText, setEditText] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');
  const [isLoading, setIsLoading] = useState(false);
  const [optimisticCompleted, setOptimisticCompleted] = useState(task.completed);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync description when task updates from Realtime subscription
  useEffect(() => {
    setEditDescription(task.description || '');
  }, [task.description]);

  // Sync title when task updates from Realtime subscription
  useEffect(() => {
    setEditText(task.title);
  }, [task.title]);

  // Auto-resize textarea to fit content
  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isExpanded, editDescription]);

  // Optimistic UI: Toggle visual state immediately, then sync with Supabase
  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading) return;

    const newCompleted = !optimisticCompleted;
    setOptimisticCompleted(newCompleted); // Optimistic update
    onToggle(task.id, newCompleted);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this task?")) return
    setIsLoading(true)
    try {
      onDelete(task.id)
    } catch (error) {
      console.error("Error deleting task:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (editText.trim() === task.title && editDescription.trim() === (task.description || '')) {
      onToggleExpand();
      return;
    }
    setIsLoading(true);
    try {
      if (editText.trim() !== task.title) {
        await onEdit(task.id, editText.trim());
      }
      if (editDescription.trim() !== (task.description || '')) {
        await onEditDescription(task.id, editDescription.trim());
      }
      onToggleExpand()
    } catch (error) {
      console.error("Error saving task:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setEditText(task.title);
    setEditDescription(task.description || '');
    onToggleExpand();
  };

  const displayCompleted = optimisticCompleted;

  return (
    <div
      className={`group border border-slate-800/50 rounded-lg transition-all duration-300 overflow-hidden ${
        displayCompleted ? "opacity-60" : ""
      } ${
        isExpanded 
          ? "bg-slate-800/40 shadow-lg" 
          : "bg-slate-900/30 hover:bg-slate-800/20"
      }`}
    >
      {/* Collapsed State: Single line with checkbox, title, expand icon */}
      {!isExpanded ? (
        <div 
          className="flex items-center gap-3 px-4 py-3 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget || (e.target as HTMLElement).closest('button')?.ariaLabel === 'Expand') {
              onToggleExpand();
            }
          }}
        >
          {/* Checkbox */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleToggle(e);
            }}
            className="flex-shrink-0 cursor-pointer"
          >
            <div
              className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                displayCompleted
                  ? "bg-green-500 border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]"
                  : "border-slate-500 group-hover:border-blue-400"
              }`}
            >
              {displayCompleted && (
                <Check className="w-3 h-3 text-[#020617]" strokeWidth={4} />
              )}
            </div>
          </div>

          {/* Title */}
          <div 
            className="flex-1 min-w-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            <span
              className={`text-sm md:text-base select-none transition-colors ${
                displayCompleted
                  ? "text-slate-500 line-through decoration-slate-600"
                  : "text-slate-200"
              }`}
            >
              {task.title}
            </span>
            {/* AI Badge */}
            {task.is_ai_processing && (
              <div className="flex items-center gap-1.5 mt-1 animate-pulse">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-purple-400">
                  AI Optimizing...
                </span>
              </div>
            )}
          </div>

          {/* Expand Icon - Always visible */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors flex-shrink-0"
            aria-label="Expand"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      ) : (
        // Expanded State: Full card with editable title, notes, and actions
        <div className="flex flex-col p-5 space-y-4">
          {/* Header with collapse button */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              {/* Checkbox in expanded state */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle(e);
                }}
                className="flex-shrink-0 cursor-pointer"
              >
                <div
                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    displayCompleted
                      ? "bg-green-500 border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]"
                      : "border-slate-500 hover:border-blue-400"
                  }`}
                >
                  {displayCompleted && (
                    <Check className="w-3 h-3 text-[#020617]" strokeWidth={4} />
                  )}
                </div>
              </div>
              {/* AI Badge */}
              {task.is_ai_processing && (
                <div className="flex items-center gap-1.5 animate-pulse">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-purple-400">
                    AI Optimizing...
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
              aria-label="Collapse"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Top: Editable Title */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Task Title
            </label>
            <input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCancel();
              }}
              className="w-full bg-slate-950/50 border border-slate-700/50 rounded-lg px-4 py-3 text-base font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              placeholder="Enter task title..."
              autoFocus
            />
          </div>

          {/* Middle: Notes/Description Textarea */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {task.description ? "AI Suggestions" : "Notes"}
            </label>
            <textarea
              ref={textareaRef}
              value={editDescription}
              onChange={(e) => {
                setEditDescription(e.target.value);
                // Auto-resize
                if (textareaRef.current) {
                  textareaRef.current.style.height = 'auto';
                  textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCancel();
                // Allow Ctrl/Cmd + Enter to save
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleSave();
                }
              }}
              placeholder={task.description ? "AI-generated suggestions will appear here..." : "Add notes or details about this task..."}
              className="w-full bg-slate-950/50 border border-slate-700/50 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none min-h-[120px] transition-all placeholder:text-slate-500"
            />
          </div>

          {/* Bottom: Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/50">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || (editText.trim() === task.title && editDescription.trim() === (task.description || ''))}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
