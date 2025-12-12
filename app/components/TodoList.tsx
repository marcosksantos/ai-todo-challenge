// AI Todo Copilot - TodoList Component
// Main task list component with Realtime subscriptions, optimistic updates, and AI integration

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, Wifi, WifiOff, LogOut } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { getTasks, createTask, toggleTask, editTask, deleteTask, updateTaskDescription } from '@/lib/tasks'
import TodoItem from './TodoItem'
import type { Task } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

/**
 * Generates a temporary UUID for optimistic updates.
 * Uses crypto.randomUUID if available, otherwise falls back to a custom implementation.
 * 
 * @returns A UUID string
 */
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * TodoList component that manages the main task list interface.
 * Handles Realtime subscriptions, optimistic updates, and AI processing triggers.
 */
export default function TodoList() {
  const supabase = createClient()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [realtimeStatus, setRealtimeStatus] = useState<string>('disconnected')
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [editingTaskIds, setEditingTaskIds] = useState<Set<string>>(new Set())

  // Initialize: Authenticate user and load initial tasks
  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const taskData = await getTasks(supabase, user.id)
        setTasks(taskData || [])
      }
      setLoading(false)
    }
    initData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Realtime Subscription: Listen for INSERT, UPDATE, DELETE events
  useEffect(() => {
    if (!user) return
    
    const channel = supabase
      .channel(`realtime:tasks:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Supabase sends snake_case, map to Task type
          const dbTask = payload.new as {
            id: string
            title: string
            completed: boolean
            created_at: string
            user_id: string
            description?: string | null
          }
          
          const newTask: Task = {
            id: dbTask.id,
            title: dbTask.title,
            completed: dbTask.completed,
            created_at: dbTask.created_at,
            user_id: dbTask.user_id,
            description: dbTask.description ?? null,
            is_ai_processing: false // New tasks from DB don't have this flag
          }
          
          setTasks(current => {
            // Check if task already exists (from optimistic update or previous Realtime event)
            const existingIndex = current.findIndex(t => t.id === newTask.id)
            if (existingIndex !== -1) {
              // Replace existing task with real data from DB, preserve is_ai_processing if it was set
              return current.map(t => 
                t.id === newTask.id 
                  ? { ...newTask, is_ai_processing: t.is_ai_processing ?? false }
                  : t
              )
            }
            // Task doesn't exist yet, add at the beginning (most recent first)
            // This handles edge case where Realtime arrives before optimistic update is replaced
            return [newTask, ...current]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Supabase sends snake_case, map to Task type
          const dbTask = payload.new as {
            id: string
            title: string
            completed: boolean
            created_at: string
            user_id: string
            description?: string | null
          }
          
          const updatedTask: Task = {
            id: dbTask.id,
            title: dbTask.title,
            completed: dbTask.completed,
            created_at: dbTask.created_at,
            user_id: dbTask.user_id,
            description: dbTask.description ?? null,
            is_ai_processing: false // DB doesn't store this, will be set below if needed
          }
          
          console.log('[TodoList] 🔄 Realtime UPDATE received:', {
            taskId: updatedTask.id,
            oldTitle: '...',
            newTitle: updatedTask.title,
            hasDescription: !!updatedTask.description
          })
          
          setTasks(current => {
            // Update the specific task in local state
            return current.map(task => {
              if (task.id === updatedTask.id) {
                // Don't overwrite if user is currently editing this task
                if (editingTaskIds.has(updatedTask.id)) {
                  console.log('[TodoList] ⏸️ Skipping update - task is being edited:', updatedTask.id)
                  return task
                }
                
                // Check if title or description changed (AI update)
                const titleChanged = task.title.trim() !== updatedTask.title.trim()
                const oldDesc = (task.description || '').trim()
                const newDesc = (updatedTask.description || '').trim()
                const descriptionChanged = oldDesc !== newDesc
                
                // If AI updated title or description, clear processing flag
                if (titleChanged || descriptionChanged) {
                  console.log('[TodoList] ✅ AI update detected - clearing processing flag:', {
                    taskId: updatedTask.id,
                    titleChanged,
                    descriptionChanged,
                    oldTitle: task.title,
                    newTitle: updatedTask.title,
                    hadDescription: !!task.description,
                    hasDescription: !!updatedTask.description
                  })
                  return { 
                    ...updatedTask, 
                    is_ai_processing: false
                  }
                }
                
                // Log when no changes detected (for debugging stuck states)
                if (task.is_ai_processing) {
                  console.log('[TodoList] ⚠️ Task still processing but no changes detected:', {
                    taskId: updatedTask.id,
                    currentTitle: task.title,
                    dbTitle: updatedTask.title,
                    currentDesc: task.description || '(empty)',
                    dbDesc: updatedTask.description || '(empty)'
                  })
                }
                
                // If no changes detected, preserve the current is_ai_processing state
                // This handles cases where only other fields (like completed) changed
                return { 
                  ...updatedTask, 
                  is_ai_processing: task.is_ai_processing ?? false
                }
              }
              return task
            })
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Supabase sends old record in snake_case
          const deletedRecord = payload.old as { id: string }
          const deletedId = deletedRecord.id
          
          if (deletedId) {
            setTasks(current => current.filter(task => task.id !== deletedId))
          }
        }
      )
      .subscribe((status) => {
        setRealtimeStatus(status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase, editingTaskIds])

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim() || !user) return

    setSubmitting(true)
    const tempId = generateUUID()
    
    // Optimistic update: Show task immediately with AI processing indicator
    const optimisticTask: Task = {
      id: tempId,
      title: newTaskTitle,
      completed: false,
      created_at: new Date().toISOString(),
      user_id: user.id,
      is_ai_processing: true // Show spinner while AI processes
    }

    setTasks([optimisticTask, ...tasks])
    setNewTaskTitle('')

    try {
      // Save to database
      const newTask = await createTask(supabase, newTaskTitle, user.id)
      
      if (newTask) {
        // Replace temporary ID with real database ID and set AI processing flag
        setTasks(current => current.map(t => 
          t.id === tempId 
            ? { 
                ...newTask, 
                is_ai_processing: true // Keep processing flag until AI updates
              } 
            : t
        ))

        // Trigger AI processing via N8N webhook (fire-and-forget)
        // Send exactly { taskId, title } as expected by the API
        console.log('[TodoList] 🚀 Triggering N8N for task:', {
          taskId: newTask.id,
          title: newTask.title
        })
        
        fetch('/api/n8n-trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            taskId: newTask.id,
            title: newTask.title
          })
        })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error('[TodoList] ❌ N8N trigger failed:', {
              status: response.status,
              statusText: response.statusText,
              error: errorData
            })
          } else {
            const data = await response.json().catch(() => ({}))
            console.log('[TodoList] ✅ N8N trigger sent successfully:', {
              taskId: newTask.id,
              response: data
            })
          }
        })
        .catch((error) => {
          // Log error but don't break the UI - AI processing is optional
          console.error('[TodoList] 💥 Error triggering AI processing:', error)
        })
      }

    } catch (error) {
      // Rollback optimistic update on error
      setTasks(current => current.filter(t => t.id !== tempId))
      const errorMessage = error instanceof Error ? error.message : 'Failed to create task'
      console.error('Error creating task:', errorMessage)
      alert(`Error: ${errorMessage}`)
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * Handles task completion toggle with optimistic updates.
   * 
   * @param id - Task ID to toggle
   * @param completed - New completion status
   */
  const handleToggle = async (id: string, completed: boolean) => {
    if (!user) return
    
    // Optimistic update: Update UI immediately
    setTasks(tasks.map(t => t.id === id ? { ...t, completed } : t))
    // Persist to database (Realtime will confirm the update)
    await toggleTask(supabase, id, completed, user.id)
  }

  /**
   * Handles task title editing with optimistic updates and Realtime conflict protection.
   * 
   * @param id - Task ID to edit
   * @param newTitle - New title for the task
   */
  const handleEdit = async (id: string, newTitle: string) => {
    if (!user) return
    
    // Mark as editing to protect from Realtime overwrites
    setEditingTaskIds(prev => new Set(prev).add(id))
    
    // Optimistic update: Update UI immediately
    setTasks(tasks.map(t => t.id === id ? { ...t, title: newTitle } : t))
    
    try {
      // Persist to database (Realtime will confirm the update)
      await editTask(supabase, id, newTitle, user.id)
    } finally {
      // Remove from editing set after a short delay to allow Realtime to sync
      setTimeout(() => {
        setEditingTaskIds(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, 1000)
    }
  }

  /**
   * Handles task description editing with optimistic updates and Realtime conflict protection.
   * 
   * @param id - Task ID to edit
   * @param description - New description for the task
   */
  const handleEditDescription = async (id: string, description: string) => {
    if (!user) return
    
    // Mark as editing to protect from Realtime overwrites
    setEditingTaskIds(prev => new Set(prev).add(id))
    
    // Optimistic update: Update UI immediately
    setTasks(tasks.map(t => t.id === id ? { ...t, description } : t))
    
    try {
      // Persist to database
      await updateTaskDescription(supabase, id, description, user.id)
    } finally {
      // Remove from editing set after a short delay
      setTimeout(() => {
        setEditingTaskIds(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, 1000)
    }
  }

  const handleToggleExpand = (taskId: string) => {
    setExpandedTaskId(prev => prev === taskId ? null : taskId)
  }

  /**
   * Handles task deletion with optimistic updates.
   * 
   * @param id - Task ID to delete
   */
  const handleDelete = async (id: string) => {
    if (!user) return
    
    // Optimistic update: Remove from UI immediately
    setTasks(tasks.filter(t => t.id !== id))
    // Persist to database (Realtime will confirm the deletion)
    await deleteTask(supabase, id, user.id)
  }

  /**
   * Handles user logout and redirects to auth page.
   */
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      // AuthGuard will handle redirect to /auth automatically
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-400" /></div>

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <header className="space-y-2 relative">
        <div className="flex justify-between items-start">
            <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-bold text-white">My Tasks</h1>
                  <button
                    onClick={handleLogout}
                    className="text-gray-400 hover:text-red-400 transition-colors text-sm font-normal px-3 py-1.5 rounded-md border border-gray-700 hover:border-red-400/50 flex items-center gap-1.5"
                    aria-label="Sign out"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
                <p className="text-gray-400 text-xs">
                  {user?.email}
                </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono bg-gray-800 px-2 py-1 rounded">
                {realtimeStatus === 'SUBSCRIBED' ? (
                    <><Wifi size={14} className="text-green-400" /> Online</>
                ) : (
                    <><WifiOff size={14} className="text-red-400" /> {realtimeStatus}</>
                )}
            </div>
        </div>
      </header>

      <form onSubmit={handleAddTask} className="relative">
        <input
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="New task... (e.g., 'Buy milk')"
          className="w-full bg-[#1e2029] border border-gray-700 rounded-lg px-4 py-4 pr-12 text-white focus:ring-2 focus:ring-purple-600 outline-none placeholder-gray-500"
          disabled={submitting}
        />
        <button type="submit" disabled={submitting} className="absolute right-2 top-2 p-2 bg-purple-600 rounded text-white hover:bg-purple-700 transition-colors disabled:opacity-50">
          {submitting ? <Loader2 className="animate-spin w-5 h-5"/> : <Plus size={20} />}
        </button>
      </form>

      <div className="space-y-3">
        {tasks.map(task => (
          <TodoItem 
            key={task.id} 
            task={task} 
            onToggle={handleToggle} 
            onEdit={handleEdit}
            onEditDescription={handleEditDescription}
            onDelete={handleDelete}
            isExpanded={expandedTaskId === task.id}
            onToggleExpand={() => handleToggleExpand(task.id)}
          />
        ))}
      </div>
    </div>
  )
}
