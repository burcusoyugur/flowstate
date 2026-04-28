export type Column = {
  id: string;
  title: string;
  order: number;
  board_id?: string | null;
};

export type Task = {
  id: string;
  content: string;
  description: string | null;
  column_id: string;
  order: number;
  labels?: string[] | null;
  due_date?: string | null;
  created_by_user_id?: string | null;
  created_by_name?: string | null;
  created_by_image?: string | null;
};

export type Board = {
  id: string;
  name?: string | null;
  user_id?: string | null;
};

