import { Account, Category, Transaction } from './types';

// Транслитер, чтобы скачанные jsPDF-отчеты не имели проблем с кодировкой (jsPDF не поддерживает кириллицу)
export function transliterate(text: string): string {
  const ru: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 
    'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i', 
    'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 
    'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 
    'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 
    'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 
    'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 
    'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh', 'З': 'Z', 'И': 'I', 
    'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 
    'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 
    'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 
    'Ш': 'Sh', 'Щ': 'Shch', 'Ъ': '', 'Ы': 'Y', 'Ь': '', 
    'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
  };
  const letters = text.split('');
  // Проходим по каждой букве и заменяем её
  const translatedLetters = letters.map((char) => {
    if (ru[char] !== undefined) {
      return ru[char]; // Если буква есть в словаре возвращаем замену
    } else {
      return char;     // Если буквы нет возвращаем её же
    }
  });
  // Склеиваем буквы обратно в один текст
  return translatedLetters.join('');
}

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