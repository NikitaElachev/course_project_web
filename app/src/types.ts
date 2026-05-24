export interface User {
  id: number;
  email: string;
  role: 'user' | 'viewer';
  is_active: boolean;
  created_at: string;
}

export interface Account {
  id: number;
  user_id: number;
  name: string;
  currency: string;
  initial_balance: number;
  created_at: string;
}

export type CategoryType = 'income' | 'expense';

export interface Category {
  id: number;
  user_id: number | null;
  name: string;
  type: CategoryType;
  icon: string;
}

export interface Transaction {
  id: number;
  account_id: number;
  category_id: number;
  amount: number;
  transaction_date: string;
  description: string;
  created_at: string;
}