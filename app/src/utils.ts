import { Account, Category, Transaction } from './types';

// Форматирование валюты
export function formatCurrency(amount: number, currency: string = '₽'): string {
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
  return `${formatted} ${currency}`; // Выводим отформатированное число и валюту
}

// Динамическое вычисление баланса
export function calculateAccountBalance(
  account: Account, 
  transactions: Transaction[], 
  categories: Category[]
): number {
  const accountTransactions = transactions.filter(t => t.account_id === account.id);
  
  let totalIncomes = 0;
  let totalExpenses = 0;
  
  accountTransactions.forEach(t => {
    const cat = categories.find(c => c.id === t.category_id);
    if (cat) {
      if (cat.type === 'income') {
        totalIncomes += t.amount;
      } else if (cat.type === 'expense') {
        totalExpenses += t.amount;
      }
    }
  });
  
  return account.initial_balance + totalIncomes - totalExpenses;
}

// Подсчет суммарного баланса всего портфеля
export function calculateTotalPortfolioBalance(
  accounts: Account[],
  transactions: Transaction[],
  categories: Category[]
): number {
  return accounts.reduce((acc, account) => {
    return acc + calculateAccountBalance(account, transactions, categories);
  }, 0);
}