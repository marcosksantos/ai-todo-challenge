// AI Todo Copilot - Tasks Database Functions
// All database operations for tasks (CRUD) using Supabase client

import { SupabaseClient } from '@supabase/supabase-js'
import type { Task } from './types'

/**
 * Retrieves all tasks for a specific user, ordered by creation date (newest first).
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID to filter tasks
 * @returns Array of tasks for the user
 * @throws Error if database query fails
 */
export async function getTasks(supabase: SupabaseClient, userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, completed, created_at, user_id, description')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as Task[]
}

/**
 * Creates a new task in the database.
 * 
 * @param supabase - Supabase client instance
 * @param title - Task title
 * @param userId - User ID who owns the task
 * @returns Created task object
 * @throws Error if database insert fails
 */
export async function createTask(supabase: SupabaseClient, title: string, userId: string): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert([{ 
      title, 
      user_id: userId, 
      completed: false 
    }])
    .select()
    .single()

  if (error) throw error
  return data as Task
}

/**
 * Toggles the completion status of a task.
 * 
 * @param supabase - Supabase client instance
 * @param id - Task ID to update
 * @param completed - New completion status
 * @param userId - User ID for authorization
 * @throws Error if database update fails
 */
export async function toggleTask(supabase: SupabaseClient, id: string, completed: boolean, userId: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ completed })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw error
}

/**
 * Updates the title of a task.
 * 
 * @param supabase - Supabase client instance
 * @param id - Task ID to update
 * @param title - New task title
 * @param userId - User ID for authorization
 * @throws Error if database update fails
 */
export async function editTask(supabase: SupabaseClient, id: string, title: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ title })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw error
}

/**
 * Updates the description of a task.
 * 
 * @param supabase - Supabase client instance
 * @param id - Task ID to update
 * @param description - New task description
 * @param userId - User ID for authorization
 * @throws Error if database update fails
 */
export async function updateTaskDescription(supabase: SupabaseClient, id: string, description: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ description })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw error
}

/**
 * Deletes a task from the database.
 * 
 * @param supabase - Supabase client instance
 * @param id - Task ID to delete
 * @param userId - User ID for authorization
 * @throws Error if database delete fails
 */
export async function deleteTask(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw error
}
