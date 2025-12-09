import { supabase } from "./supabaseClient";

export async function getTasks() {
  const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createTask(title: string) {
  const { data, error } = await supabase.from("tasks").insert({ title, completed: false }).select().single();
  if (error) throw error;
  return data;
}

export async function toggleTask(id: string, completed: boolean) {
  const { data, error } = await supabase.from("tasks").update({ completed }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function editTask(id: string, title: string) {
  const { data, error } = await supabase.from("tasks").update({ title }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
  return true;
}
