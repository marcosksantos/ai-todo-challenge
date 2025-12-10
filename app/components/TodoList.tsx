"use client";

import { useEffect, useState, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getTasks, createTask } from "@/lib/tasks";
import TodoItem from "./TodoItem";
import { Bot, Loader2, Plus, LogOut, User as UserIcon, Phone, X, Save } from "lucide-react";
import type { Task } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

export default function TodoList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [updatingPhone, setUpdatingPhone] = useState(false);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        setPhoneNumber((user.user_metadata?.phone as string) || "");
      }
    };
    getUser();
  }, []);

  // Load tasks
  const fetchTasks = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getTasks(user.id);
      if (data) setTasks(data as Task[]);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTasks();
      // Realtime subscription with user filter
      const channel = supabase
        .channel("realtime:tasks")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tasks",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const { eventType, new: newRecord, old: oldRecord } = payload;
            setTasks((current) => {
              if (eventType === "INSERT") return [newRecord as Task, ...current];
              if (eventType === "DELETE")
                return current.filter((t) => t.id !== oldRecord.id);
              if (eventType === "UPDATE")
                return current.map((t) =>
                  t.id === newRecord.id ? ({ ...newRecord } as Task) : t
                );
              return current;
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const handleAddTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTask.trim() || !user) return;
    setSubmitting(true);

    try {
      const task = await createTask(newTask.trim(), user.id);
      if (task) {
        setTasks((prev) => [{ ...task, is_ai_processing: true } as Task, ...prev]);
        setNewTask("");
        // Call N8N without waiting (Fire & Forget)
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  const handleUpdatePhone = async () => {
    if (!user) return;
    setUpdatingPhone(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { phone: phoneNumber },
      });
      if (error) throw error;
      setShowPhoneModal(false);
    } catch (error) {
      console.error("Error updating phone:", error);
      alert("Failed to update phone number");
    } finally {
      setUpdatingPhone(false);
    }
  };

  if (!user) {
    return (
      <div className="w-full max-w-xl mx-auto bg-[#0B1120] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden mt-10 p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
        <p className="text-slate-400">Loading user...</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-xl mx-auto bg-[#0B1120] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden mt-10">
        {/* Header with User Profile */}
        <div className="p-6 border-b border-slate-800/60 bg-slate-900/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-bold text-white">AI Tasks</h2>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              aria-label="Log out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Section */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {user.email}
                </p>
                <p className="text-xs text-slate-400">
                  {phoneNumber || "No phone number"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPhoneModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg transition-colors border border-blue-400/20"
            >
              <Phone className="w-4 h-4" />
              {phoneNumber ? "Update" : "Add"} Phone
            </button>
          </div>
          <p className="text-sm text-slate-400 mt-2">Automated by N8N & Supabase</p>
        </div>

        {/* Input Moderno */}
        <div className="p-4 bg-slate-900/20">
          <form
            onSubmit={handleAddTask}
            className="flex gap-2 items-center bg-[#030712] border border-slate-700 rounded-xl p-1 focus-within:ring-2 focus-within:ring-blue-600/50 transition-all"
          >
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
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>

        {/* Lista Limpa */}
        <div className="divide-y divide-slate-800/50 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500 flex justify-center">
              <Loader2 className="animate-spin" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-12 text-center text-slate-600">
              <p>No tasks yet.</p>
            </div>
          ) : (
            tasks.map((task) => (
              <TodoItem
                key={task.id}
                task={task}
                onUpdate={fetchTasks}
                userId={user.id}
              />
            ))
          )}
        </div>
      </div>

      {/* Phone Number Update Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B1120] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-500" />
                {phoneNumber ? "Update" : "Add"} Phone Number
              </h3>
              <button
                onClick={() => setShowPhoneModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Add your phone number for WhatsApp integration
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full bg-[#030712] border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUpdatePhone}
                  disabled={updatingPhone}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {updatingPhone ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowPhoneModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
