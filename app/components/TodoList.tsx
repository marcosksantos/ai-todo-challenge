'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getTasks, createTask, toggleTask, editTask, deleteTask } from '@/lib/tasks'
import TodoItem from './TodoItem'
import { Plus, Loader2, Wifi, WifiOff } from 'lucide-react'

// Helper for generating temporary IDs for optimistic updates
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function TodoList() {
  const supabase = createClient()
  const [tasks, setTasks] = useState<any[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [realtimeStatus, setRealtimeStatus] = useState('disconnected')

  // 1. Initialize: Authenticate user and load initial tasks
  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const data = await getTasks(supabase, user.id)
        setTasks(data || [])
      }
      setLoading(false)
    }
    initData()
  }, [])

  // 2. Realtime Subscription: Listen for INSERT, UPDATE, DELETE events
  useEffect(() => {
    if (!user) return

    console.log('🔌 Connecting to Realtime...', user.id)
    
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
        (payload: any) => {
          console.log('➕ INSERT event:', payload.new)
          const newTask = payload.new
          
          setTasks(current => {
            // Check if task already exists (from optimistic update)
            const exists = current.find(t => t.id === newTask.id)
            if (exists) {
              // Replace optimistic task with real data, preserve is_ai_processing if set
              return current.map(t => 
                t.id === newTask.id 
                  ? { ...newTask, is_ai_processing: t.is_ai_processing }
                  : t
              )
            }
            // Add new task at the beginning (most recent first)
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
        (payload: any) => {
          console.log('✏️ UPDATE event:', payload.new)
          const updatedTask = payload.new
          
          setTasks(current => {
            // Update the specific task in local state
            return current.map(task => {
              if (task.id === updatedTask.id) {
                // If title changed (AI update), remove processing indicator
                const titleChanged = task.title !== updatedTask.title
                return { 
                  ...updatedTask, 
                  // Clear is_ai_processing when title is updated by AI
                  is_ai_processing: titleChanged ? false : (task.is_ai_processing || false)
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
        (payload: any) => {
          console.log('🗑️ DELETE event:', payload.old)
          const deletedId = payload.old.id
          
          setTasks(current => current.filter(task => task.id !== deletedId))
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('📡 Realtime status:', status)
        }
        setRealtimeStatus(status)
      })

    return () => {
      console.log('🔌 Disconnecting from Realtime...')
      supabase.removeChannel(channel)
    }
  }, [user, supabase])

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim() || !user) return

    setSubmitting(true)
    const tempId = generateUUID()
    
    // Optimistic update: Show task immediately with loading indicator
    const optimisticTask = {
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
        // Replace temporary ID with real database ID
        setTasks(current => current.map(t => 
          t.id === tempId ? { ...t, id: newTask.id } : t
        ))

        // Trigger AI processing via N8N webhook
        fetch('/api/n8n-trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            taskId: newTask.id,
            title: newTask.title
          })
        }).catch(console.error)
      }

    } catch (error: any) {
      console.error('Error creating task:', error)
      // Rollback optimistic update on error
      setTasks(current => current.filter(t => t.id !== tempId))
      alert(`Error: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Task action handlers with optimistic updates
  const handleToggle = async (id: string, completed: boolean) => {
    // Optimistic update: Update UI immediately
    setTasks(tasks.map(t => t.id === id ? { ...t, completed } : t))
    // Persist to database (Realtime will confirm the update)
    await toggleTask(supabase, id, completed, user.id)
  }

  const handleEdit = async (id: string, newTitle: string) => {
    // Optimistic update: Update UI immediately
    setTasks(tasks.map(t => t.id === id ? { ...t, title: newTitle } : t))
    // Persist to database (Realtime will confirm the update)
    await editTask(supabase, id, newTitle, user.id)
  }

  const handleDelete = async (id: string) => {
    // Optimistic update: Remove from UI immediately
    setTasks(tasks.filter(t => t.id !== id))
    // Persist to database (Realtime will confirm the deletion)
    await deleteTask(supabase, id, user.id)
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-400" /></div>

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <header className="space-y-2 relative">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold text-white">My Tasks</h1>
                <p className="text-gray-400 text-sm">
                User: {user?.email}
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
          placeholder="New task... (e.g. 'leite')"
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
            onDelete={handleDelete} 
          />
        ))}
      </div>
    </div>
  )
}
