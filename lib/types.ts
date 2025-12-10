export type Task = {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
  user_id: string;
  description?: string | null;
  is_ai_processing?: boolean;
};

