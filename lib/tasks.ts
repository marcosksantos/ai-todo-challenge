import { supabase } from "./supabaseClient";

/**
 * Get all tasks for the current authenticated user
 */
export async function getTasks(userId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, completed, created_at, user_id, description")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Create a new task for the current authenticated user
 */
export async function createTask(title: string, userId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .insert({ title, completed: false, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Toggle task completion - ensures task belongs to user
 */
export async function toggleTask(id: string, completed: boolean, userId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .update({ completed })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Edit task title - ensures task belongs to user
 */
export async function editTask(id: string, title: string, userId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .update({ title })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Delete task - ensures task belongs to user
 */
export async function deleteTask(id: string, userId: string) {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  return true;
}
