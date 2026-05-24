import React, { useState } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { Account, Category, Transaction } from '../types';
import { formatCurrency } from '../utils';
import CategoryIcon from './CategoryIcon';

interface TransactionsTabProps {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  onAddTransaction: (trans: Omit<Transaction, 'id' | 'created_at'>) => void;
  onEditTransaction: (id: number, trans: Omit<Transaction, 'id' | 'created_at'>) => void;
  onDeleteTransaction: (id: number) => void;
  isViewer: boolean;
}

export default function TransactionsTab({
  accounts,
  categories,
  transactions,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  isViewer
}: TransactionsTabProps) {
  // Состояния для фильтров в панели управления
  const [filterAccount, setFilterAccount] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // Состояние модального окна добавления и редактирования
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  // Открытие модального окна в режиме создания
  const openAddModal = () => {
    setEditingTransactionId(null);
    setAmount('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setShowAddModal(true);
  };

  // Открытие модалки в режиме редактирования
  const openEditModal = (t: Transaction, catType: 'income' | 'expense') => {
    setEditingTransactionId(t.id);
    setAmount(t.amount.toString());
    setType(catType);
    setCategoryId(t.category_id.toString());
    setAccountId(t.account_id.toString());
    setDate(t.transaction_date.split('T')[0]);
    setDescription(t.description || '');
    setShowAddModal(true);
  };

  // Логика фильтрации
  const filteredTransactions = transactions.filter(t => {
    if (filterAccount && t.account_id !== parseInt(filterAccount)) return false; // Фильтр по счету
    const cat = categories.find(c => c.id === t.category_id);
    if (filterType && cat?.type !== filterType) return false; // Фильтр доход или расход
    if (filterDateFrom && t.transaction_date < filterDateFrom) return false; // Фильтр "С даты"
    if (filterDateTo && t.transaction_date > filterDateTo) return false; // Фильтр "По дату"
    // Текстовый поиск по описанию и по названию категории
    if (filterSearch && !t.description?.toLowerCase().includes(filterSearch.toLowerCase()) && !cat?.name.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  }).sort((a,b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()); // Сортировка по убыванию даты

  // Обработчик отправки формы для создания новой транзакции
  const handleAddSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!amount || !categoryId || !accountId) return;
    
    const parsedAmount = parseFloat(amount);
    const parsedAccountId = parseInt(accountId);
    const parsedCategoryId = parseInt(categoryId);

    const payload = {
      account_id: parsedAccountId,
      category_id: parsedCategoryId,
      amount: parsedAmount,
      transaction_date: date,
      description: description || 'Без описания'
    };

    // В зависимости от состояния вызываем либо функцию обновления, либо добавления
    if (editingTransactionId) {
      onEditTransaction(editingTransactionId, payload);
    } else {
      onAddTransaction(payload);
    }

    setShowAddModal(false);
    // Очистка формы
    setAmount('');
    setDescription('');
    setEditingTransactionId(null);
  };

  return (
    <div className="card">
      {/* Панель фильтров и кнопок */}
      <div className="card-header flex-wrap" style={{ gap: '16px' }}>
        <h2 className="card-title">История транзакций</h2>
        
        <div className="flex gap-2 flex-wrap" style={{ flex: 1, justifyContent: 'flex-end' }}>
           <div className="form-group" style={{ marginBottom: 0 }}>
             <input type="text" placeholder="Поиск..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} className="form-control" style={{ width: '150px' }} />
           </div>
           <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="form-control" title="С даты" style={{width:'auto'}} />
           <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="form-control" title="По дату" style={{width:'auto'}} />
           
           <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="form-control" style={{width:'auto'}}>
             <option value="">Все счета</option>
             {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
           </select>
           <select value={filterType} onChange={e => setFilterType(e.target.value)} className="form-control" style={{width:'auto'}}>
             <option value="">Все типы</option>
             <option value="income">Доходы</option>
             <option value="expense">Расходы</option>
           </select>
           
           {!isViewer && (
             <button className="btn btn-primary" onClick={openAddModal}>
               <Plus size={16} /> Добавить
             </button>
           )}
        </div>
      </div>

      {/* Таблица транзакций */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Категория</th>
              <th>Счет</th>
              <th>Описание</th>
              <th>Сумма</th>
              <th className="text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map(t => {
              const cat = categories.find(c => c.id === t.category_id);
              const acc = accounts.find(a => a.id === t.account_id);
              const isExpense = cat?.type === 'expense';
              return (
                <tr key={t.id}>
                  <td className="font-mono text-muted">{t.transaction_date}</td>
                  <td>
                    <div className="flex gap-2 items-center">
                      <div className={`icon-container ${isExpense ? 'expense' : 'income'}`} style={{width:'28px', height:'28px'}}>
                        <CategoryIcon name={cat?.icon || 'Grid'} />
                      </div>
                      <div style={{fontSize:'13px', fontWeight:'600'}}>{cat?.name}</div>
                    </div>
                  </td>
                  <td><span className="badge neutral">{acc?.name}</span></td>
                  <td>{t.description}</td>
                  <td className={`font-mono font-bold ${isExpense ? '' : 'text-success'}`}>
                    {isExpense ? '-' : '+'}{formatCurrency(t.amount)}
                  </td>
                  <td className="text-right">
                    {!isViewer && (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEditModal(t, isExpense ? 'expense' : 'income')} className="btn-icon-only text-muted">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => onDeleteTransaction(t.id)} className="btn-icon-only text-danger">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Универсальное модальное окно (добавление и редактирование) */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">{editingTransactionId ? 'Редактировать операцию' : 'Новая операция'}</h3>
            <form onSubmit={handleAddSubmit}>
               <div className="form-group flex gap-2">
                 <button type="button" className={`btn ${type === 'expense' ? 'btn-primary' : 'btn-secondary'}`} style={{flex:1}} onClick={() => setType('expense')}>Расход</button>
                 <button type="button" className={`btn ${type === 'income' ? 'btn-primary' : 'btn-secondary'}`} style={{flex:1}} onClick={() => setType('income')}>Доход</button>
               </div>
               <div className="form-group">
                 <label className="form-label">Сумма</label>
                 <input type="number" required value={amount} onChange={e => setAmount(e.target.value)} className="form-control" />
               </div>
               <div className="form-group">
                 <label className="form-label">Счет</label>
                 <select required value={accountId} onChange={e => setAccountId(e.target.value)} className="form-control">
                   <option value="">Выберите...</option>
                   {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                 </select>
               </div>
               <div className="form-group">
                 <label className="form-label">Категория</label>
                 <select required value={categoryId} onChange={e => setCategoryId(e.target.value)} className="form-control">
                   <option value="">Выберите...</option>
                   {categories.filter(c => c.type === type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
               </div>
               <div className="form-group">
                 <label className="form-label">Дата & Описание</label>
                 <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="form-control mb-2" />
                 <input type="text" placeholder="Описание" value={description} onChange={e => setDescription(e.target.value)} className="form-control" />
               </div>
               <div className="modal-actions">
                 <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Отмена</button>
                 <button type="submit" className="btn btn-primary">Сохранить</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}