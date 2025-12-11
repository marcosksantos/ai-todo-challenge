import { SupabaseClient } from '@supabase/supabase-js'

export async function getTasks(supabase: SupabaseClient, userId: string) {
  // REMOVED 'is_ai_processing' from select just in case
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, completed, created_at, user_id, description')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createTask(supabase: SupabaseClient, title: string, userId: string) {
  // REMOVED 'is_ai_processing' from insert payload
  const { data, error } = await supabase
    .from('tasks')
    .insert([{ 
      title, 
      user_id: userId, 
      completed: false 
      // is_ai_processing is REMOVED to fix schema error
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function toggleTask(supabase: SupabaseClient, id: string, completed: boolean, userId: string) {
  const { error } = await supabase
    .from('tasks')
    .update({ completed })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw error
}

export async function editTask(supabase: SupabaseClient, id: string, title: string, userId: string) {
  const { error } = await supabase
    .from('tasks')
    .update({ title })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw error
}

export async function deleteTask(supabase: SupabaseClient, id: string, userId: string) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw error
}
