'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getTasks, createTask, toggleTask, editTask, deleteTask } from '@/lib/tasks'
import TodoItem from './TodoItem'
import { Plus, Loader2, Wifi, WifiOff } from 'lucide-react'

// Helper for HTTP environments (IP address)
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

  // 1. Auth & Data Load
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

  // 2. Realtime Connection (Robust Refetch Strategy)
  useEffect(() => {
    if (!user) return

    console.log('🔌 Connecting Realtime...', user.id)
    const channel = supabase
      .channel(`realtime:tasks:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload: any) => {
          console.log('⚡ Realtime Event received:', payload)
          
          // DEADLINE FIX: Brute-force refresh to guarantee UI matches DB
          // This solves ID mismatches and kills the 'spinner' automatically
          const freshTasks = await getTasks(supabase, user.id)
          setTasks(freshTasks || [])
        }
      )
      .subscribe((status) => {
        console.log('STATUS:', status)
        setRealtimeStatus(status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim() || !user) return

    setSubmitting(true)
    const tempId = generateUUID() // Temporary ID for UI
    
    // 1. Optimistic Add (Show immediately)
    const optimisticTask = {
      id: tempId,
      title: newTaskTitle,
      completed: false,
      created_at: new Date().toISOString(),
      user_id: user.id,
      is_ai_processing: true // Start Spinner
    }

    setTasks([optimisticTask, ...tasks])
    setNewTaskTitle('')

    try {
      // 2. Save to DB
      const newTask = await createTask(supabase, newTaskTitle, user.id)
      
      // 3. CRITICAL: Swap Temp ID with Real ID locally
      if (newTask) {
        setTasks(current => current.map(t => 
          t.id === tempId ? { ...t, id: newTask.id } : t
        ))

        // 4. Trigger AI (N8N)
        fetch('/api/n8n-trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            taskId: newTask.id, // Send Real ID to N8N
            title: newTask.title
          })
        }).catch(console.error)
      }

    } catch (error: any) {
      console.error('Error:', error)
      setTasks(current => current.filter(t => t.id !== tempId)) // Rollback
      alert(`Error: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Handlers
  const handleToggle = async (id: string, completed: boolean) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed } : t))
    await toggleTask(supabase, id, completed, user.id)
  }

  const handleEdit = async (id: string, newTitle: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, title: newTitle } : t))
    await editTask(supabase, id, newTitle, user.id)
  }

  const handleDelete = async (id: string) => {
    setTasks(tasks.filter(t => t.id !== id))
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
