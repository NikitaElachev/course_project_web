import { useState } from 'react';
import { Grid, Coins, BookOpen, Tag, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Account, Category, Transaction } from './types';


// Импорт подкомпонентов
import Dashboard from './components/Dashboard';
import AccountsTab from './components/AccountsTab';
import TransactionsTab from './components/TransactionsTab';
import CategoriesTab from './components/CategoriesTab';
import AuthScreen from './components/AuthScreen';

export default function App() {
  // Состояния авторизации
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Зашел ли пользователь в систему
  const [currentUser, setCurrentUser] = useState(''); // Email текущего пользователя
  const [currentUserRole, setCurrentUserRole] = useState<'user'|'viewer'>('user'); // Роль

  // Состояния БД
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  // Какая вкладка меню сейчас открыта
  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'transactions' | 'categories'>('dashboard');

  // Взаимодействие с БД

  // Функция добавления новой транзакции
  const handleAddTransaction = async (newTrans: Omit<Transaction, 'id' | 'created_at'>) => {
    if (!currentUserId) return; // Проверка авторизован ли пользовтель
    try {
      // Отправляем POST-запрос на сервер (сохраняем в БД)
      const res = await fetch(`/api/transactions?user_id=${currentUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTrans)
      });
      if (res.ok) {
        const item = await res.json();
        // Добавляем новую транзакцию в начало массива на экране
        setTransactions(prev => [item, ...prev]);
        
        // Так как изменилась сумма денег, обновляем счета
        const accRes = await fetch(`/api/accounts?user_id=${currentUserId}`);
        if (accRes.ok) setAccounts(await accRes.json());
      } else {
        console.error('API failed to add transaction');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Функция изменения существующей транзакции
  const handleEditTransaction = async (id: number, updatedTrans: Omit<Transaction, 'id' | 'created_at'>) => {
    if (!currentUserId) return;
    try {
      // Отправляем PUT-запрос для обновления
      const res = await fetch(`/api/transactions/${id}?user_id=${currentUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTrans)
      });
      if (res.ok) {
        const item = await res.json();
        // Находим старую транзакцию в массиве и заменяем ее на обновленную
        setTransactions(prev => prev.map(t => t.id === id ? item : t));
        
        // Обновляем счета для обновления баланса на экране
        const accRes = await fetch(`/api/accounts?user_id=${currentUserId}`);
        if (accRes.ok) setAccounts(await accRes.json());
      } else {
        console.error('API failed to edit transaction');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Функция удаления транзакции
  const handleDeleteTransaction = async (id: number) => {
    if (!currentUserId) return;
    try {
      // Отправляем DELETE-запрос
      const res = await fetch(`/api/transactions/${id}?user_id=${currentUserId}`, { method: 'DELETE' });
      if (res.ok) {
        // Убираем удаленную транзакцию из массива
        setTransactions(prev => prev.filter(t => t.id !== id));
        // Обновляем счета
        const accRes = await fetch(`/api/accounts?user_id=${currentUserId}`);
        if (accRes.ok) setAccounts(await accRes.json());
      } else {
        console.error('API failed to delete transaction');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Функция добавления нового счета
  const handleAddAccount = async (newAcc: Omit<Account, 'id' | 'created_at'>) => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`/api/accounts?user_id=${currentUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAcc)
      });
      if (res.ok) {
        const item = await res.json();
        // Добавляем созданный счет в конец массива счетов
        setAccounts(prev => [...prev, item]);
      } else {
        console.error('API failed to add account');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Функция изменения названия счета
  const handleEditAccount = async (id: number, newName: string) => {
    if (!currentUserId) return;
    try {
      const acc = accounts.find(a => a.id === id);
      if (!acc) return;
      const res = await fetch(`/api/accounts/${id}?user_id=${currentUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...acc, name: newName })
      });
      if (res.ok) {
        const updated = await res.json();
        // Заменяем старый счет на обновленный
        setAccounts(prev => prev.map(a => a.id === id ? updated : a));
      } else {
        console.error('API failed to update account');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Функция удаления счета
  const handleDeleteAccount = async (id: number) => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`/api/accounts/${id}?user_id=${currentUserId}`, { method: 'DELETE' });
      if (res.ok) {
        // Удаляем счет с экрана
        setAccounts(prev => prev.filter(a => a.id !== id));
        // Убираем с экрана все транзакции, которые были привязаны к этому счету
        setTransactions(prev => prev.filter(t => t.account_id !== id));
      } else {
        console.error('API failed to delete account');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Функция добавления новой категории
  const handleAddCategory = async (newCat: Omit<Category, 'id'>) => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`/api/categories?user_id=${currentUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCat)
      });
      if (res.ok) {
        const item = await res.json();
        // Добавляем новую категорию в список
        setCategories(prev => [...prev, item]);
      } else {
        console.error('API failed to add category');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Функция удаления категории
  const handleDeleteCategory = async (id: number) => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`/api/categories/${id}?user_id=${currentUserId}`, { method: 'DELETE' });
      if (res.ok) {
        // Убираем категорию из списка
        setCategories(prev => prev.filter(c => c.id !== id));
      } else {
         console.error('API failed to delete category');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Логика входа
  // Обработчик успешного входа в систему
  const handleLogin = async (userId: number, email: string, role: 'user' | 'viewer') => {
    // Сохраняем данные пользователя в стейты
    setCurrentUser(email);
    setCurrentUserRole(role);
    setCurrentUserId(userId);
    setIsAuthenticated(true); // Убирает экран авторизации
    
    // Загрузка всех данных с бэкенда для вошедшего пользователя
    try {
      const accRes = await fetch(`/api/accounts?user_id=${userId}`);
      if (accRes.ok) {
        setAccounts(await accRes.json());
      } else {
        console.error('API failed to load accounts');
      }
      
      const catRes = await fetch(`/api/categories?user_id=${userId}`);
      if (catRes.ok) {
        setCategories(await catRes.json());
      } else {
        console.error('API failed to load categories');
      }

      const tranRes = await fetch(`/api/transactions?user_id=${userId}`);
      if (tranRes.ok) {
        setTransactions(await tranRes.json());
      } else {
        console.error('API failed to load transactions');
      }
    } catch (err) {
      console.error('Backend fetch failed', err);
    }
  };

  // Логика выхода
  const handleLogout = () => {
    setIsAuthenticated(false); // Перекидывает на экран авторизации
    setCurrentUser('');
    setCurrentUserId(null);
    setActiveTab('dashboard');
  };

  // Рендеринг экрана входа
  // Если пользователь не залогинен, показываем компонент AuthScreen
  if (!isAuthenticated) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  // Рендеринг самого приложения
  return (
    <div className="app-layout">
      {/* Боковая панель навигации */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">Ф</div>
          <div>
            <div>Личные Финансы</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'normal' }}>Курсовой Проект</div>
          </div>
        </div>

        {/* Кнопки меню */}
        <nav className="sidebar-nav">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <Grid size={18} /> Обзор (Dashboard)
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`nav-btn ${activeTab === 'accounts' ? 'active' : ''}`}
          >
            <Coins size={18} /> Мои счета
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`nav-btn ${activeTab === 'transactions' ? 'active' : ''}`}
          >
            <BookOpen size={18} /> Операции
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`nav-btn ${activeTab === 'categories' ? 'active' : ''}`}
          >
            <Tag size={18} /> Категории
          </button>
          
            {/* Блок выхода из аккаунта */}
            <div style={{ marginTop: 'auto' }}>
            <div className="text-muted" style={{ fontSize: 12, padding: '0 16px 12px 16px' }}>Роль: {currentUserRole}</div>
            <button
              onClick={handleLogout}
              className="nav-btn"
              style={{ marginTop: '8px' }}
            >
              <LogOut size={18} /> Выйти
            </button>
          </div>
        </nav>
      </aside>

      {/* Основной контент */}
      <main className="main-area">
        <header className="top-header">
          <div className="header-title">Панель управления</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{currentUser} (241-326)</div>
        </header>

        <div className="workspace">
          {/* AnimatePresence отвечает за плавные анимации перехода между вкладками */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ height: '100%' }}
            >
              {/* Отрисовываем нужный компонент и передаем в него данные и функции чтобы дочерние компоненты могли ими пользоваться */}
              {activeTab === 'dashboard' && (
                <Dashboard
                  accounts={accounts}
                  categories={categories}
                  transactions={transactions}
                  addTransaction={handleAddTransaction}
                  isViewer={currentUserRole === 'viewer'} // Сообщаем компоненту, может ли он изменять данные
                />
              )}
              {activeTab === 'accounts' && (
                <AccountsTab
                  accounts={accounts}
                  categories={categories}
                  transactions={transactions}
                  onAddAccount={handleAddAccount}
                  onEditAccount={handleEditAccount}
                  onDeleteAccount={handleDeleteAccount}
                  isViewer={currentUserRole === 'viewer'}
                />
              )}
              {activeTab === 'transactions' && (
                <TransactionsTab
                  accounts={accounts}
                  categories={categories}
                  transactions={transactions}
                  onAddTransaction={handleAddTransaction}
                  onEditTransaction={handleEditTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                  isViewer={currentUserRole === 'viewer'}
                />
              )}
              {activeTab === 'categories' && (
                <CategoriesTab
                  categories={categories}
                  onAddCategory={handleAddCategory}
                  onDeleteCategory={handleDeleteCategory}
                  isViewer={currentUserRole === 'viewer'}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}