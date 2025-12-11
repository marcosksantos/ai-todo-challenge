'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getTasks, createTask, toggleTask, editTask, deleteTask } from '@/lib/tasks'
import TodoItem from './TodoItem'
import { Plus, Loader2 } from 'lucide-react'

// Helper function to generate IDs in non-secure contexts (HTTP)
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments where crypto is not available
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function TodoList() {
  // Create client instance inside component
  const supabase = createClient()
  
  const [tasks, setTasks] = useState<any[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)

  // 1. Auth & Initial Load
  useEffect(() => {
    const initData = async () => {
      // Check active session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setUser(session.user)
        try {
          const data = await getTasks(supabase, session.user.id)
          setTasks(data || [])
        } catch (e) {
          console.error('Error fetching tasks:', e)
        }
      }
      setLoading(false)
    }

    initData()
    
    // Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user) 
      } else {
        setUser(null)
        setTasks([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // 2. Realtime Subscription
  useEffect(() => {
    if (!user) return

    console.log('🔌 Connecting to Realtime for user:', user.id)

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
        (payload: any) => {
          console.log('⚡ Realtime Event:', payload)
          const { eventType, new: newRecord, old: oldRecord } = payload
          
          setTasks((current) => {
            if (eventType === 'INSERT') {
               // Prevent duplicates from optimistic updates
               if (current.some(t => t.id === newRecord.id)) {
                 // Update the temporary ID with the real one if needed, or just replace
                 return current.map(t => t.id === newRecord.id ? newRecord : t)
               }
               return [newRecord, ...current]
            }
            if (eventType === 'UPDATE') {
              return current.map(t => t.id === newRecord.id ? { ...t, ...newRecord } : t)
            }
            if (eventType === 'DELETE') {
              return current.filter(t => t.id !== oldRecord.id)
            }
            return current
          })
        }
      )
      .subscribe((status) => {
        console.log('Realtime Status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim() || !user) return

    setSubmitting(true)
    
    // FIX: Use custom generator instead of crypto.randomUUID()
    const tempId = generateUUID()
    
    // Optimistic Update
    const optimisticTask = {
      id: tempId,
      title: newTaskTitle,
      completed: false,
      created_at: new Date().toISOString(),
      user_id: user.id,
      is_ai_processing: true
    }

    setTasks([optimisticTask, ...tasks])
    setNewTaskTitle('')

    try {
      // Pass 'supabase' client to the function
      const newTask = await createTask(supabase, newTaskTitle, user.id)
      
      // Trigger Automation via API Route (Auth cookies included automatically by browser)
      if (newTask) {
        fetch('/api/n8n-trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Important for cookies
          body: JSON.stringify({
            taskId: newTask.id,
            title: newTask.title
          })
        }).catch(err => console.error('Webhook Error:', err))
      }
    } catch (error: any) {
      console.error('FULL ERROR OBJECT:', error)
      console.error('Error Message:', error.message)
      console.error('Error Details:', error.details)
      
      // Rollback
      setTasks(current => current.filter(t => t.id !== tempId))
      
      // Show specific alert
      alert(`Failed: ${error.message || 'Unknown error'}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Handlers
  const handleToggle = async (id: string, completed: boolean) => {
    // Optimistic
    setTasks(tasks.map(t => t.id === id ? { ...t, completed } : t))
    await toggleTask(supabase, id, completed, user.id)
  }

  const handleEdit = async (id: string, newTitle: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, title: newTitle } : t))
    await editTask(supabase, id, newTitle, user.id)
  }

  const handleDelete = async (id: string) => {
    // Optimistic
    setTasks(tasks.filter(t => t.id !== id))
    await deleteTask(supabase, id, user.id)
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-400" /></div>

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-white">My Tasks</h1>
        <p className="text-gray-400">
          Managed by AI & Realtime
          {user && <span className="block text-xs text-gray-500 mt-1">User: {user.email}</span>}
        </p>
      </header>

      <form onSubmit={handleAddTask} className="relative">
        <input
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="New task..."
          className="w-full bg-[#1e2029] border border-gray-700 rounded-lg px-4 py-4 pr-12 text-white focus:ring-2 focus:ring-purple-600 outline-none placeholder-gray-500"
          disabled={submitting}
        />
        <button type="submit" disabled={submitting} className="absolute right-2 top-2 p-2 bg-purple-600 rounded text-white hover:bg-purple-700 transition-colors disabled:opacity-50">
          {submitting ? <Loader2 className="animate-spin w-5 h-5"/> : <Plus size={20} />}
        </button>
      </form>

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border border-dashed border-gray-800 rounded-lg">
            No tasks yet. Add one to start!
          </div>
        ) : (
          tasks.map(task => (
            <TodoItem 
              key={task.id} 
              task={task} 
              onToggle={handleToggle} 
              onEdit={handleEdit} 
              onDelete={handleDelete} 
            />
          ))
        )}
      </div>
    </div>
  )
}
