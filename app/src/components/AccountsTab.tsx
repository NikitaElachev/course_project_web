import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { Account, Category, Transaction } from '../types';
import { formatCurrency, calculateAccountBalance } from '../utils';
import CategoryIcon from './CategoryIcon';

// Описание данных от родителя (App.tsx)
interface AccountsTabProps {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  onAddAccount: (acc: Omit<Account, 'id' | 'created_at'>) => void;
  onEditAccount: (id: number, name: string) => void;
  onDeleteAccount: (id: number) => void;
  isViewer: boolean;
}

export default function AccountsTab({
  accounts,
  categories,
  transactions,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  isViewer
}: AccountsTabProps) {
  // Состояния для управления формой и интерфейсом
  const [showAddModal, setShowAddModal] = useState(false); // Показать/скрыть окно добавления
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('₽');
  const [initialBalance, setInitialBalance] = useState('');
  
  // Состояния для режима редактирования прямо в таблице
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  // Обработчик отправки формы нового счета
  const handleAddSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!name || !initialBalance) return;
    // Вызываем функцию, переданную из App.tsx
    onAddAccount({ user_id: 1, name, currency, initial_balance: parseFloat(initialBalance) });
    // Очищаем форму и закрываем модальное окно
    setName(''); setInitialBalance(''); setShowAddModal(false);
  };

  // Сохранение отредактированного названия счета
  const saveEdit = (id: number) => {
    if (!editingName.trim()) return; // Проверка на пустоту
    onEditAccount(id, editingName);
    setEditingId(null); // Выход из режима редактирования
  };

  // Функция помогающая подобрать иконку от базовых слов
  const getAccountIcon = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes('накопитель') || n.includes('вклад')) return 'Briefcase';
    if (n.includes('карт') || n.includes('кредит')) return 'CreditCard';
    if (n.includes('наличн')) return 'Wallet';
    return 'Grid';
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Управление счетами</h2>
          <div style={{fontSize:'12px', color:'var(--text-muted)'}}>Ваши кошельки, карты и вклады</div>
        </div>
        <div className="flex gap-2">
           {/* Если пользователь не наблюдатель, показываем кнопку добавления */}
           {!isViewer && (
             <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
               <Plus size={16} /> Добавить
             </button>
           )}
        </div>
      </div>

      {/* Таблица со списком счетов */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Счет</th>
              <th>Начальный баланс</th>
              <th>Текущий баланс</th>
              <th className="text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(acc => {
              const isEditing = editingId === acc.id;
              // Динамический расчет баланса
              const balance = calculateAccountBalance(acc, transactions, categories);
              return (
                <tr key={acc.id}>
                  <td>
                    <div className="flex gap-3 items-center">
                      <div className="icon-container neutral"><CategoryIcon name={getAccountIcon(acc.name)} /></div>
                      {isEditing ? (
                        <input type="text" value={editingName} onChange={e => setEditingName(e.target.value)} className="form-control" style={{width:'auto'}} />
                      ) : (
                        <span className="font-bold">{acc.name}</span>
                      )}
                    </div>
                  </td>
                  <td className="font-mono text-muted">{formatCurrency(acc.initial_balance, acc.currency)}</td>
                  <td className={`font-mono font-bold ${balance < 0 ? 'text-danger' : ''}`}>
                    {formatCurrency(balance, acc.currency)}
                  </td>
                  <td className="text-right">
                    {/* Если режим редактирования активен, то показываем галочку и крестик */}
                    {isEditing ? (
                       <div className="flex justify-end gap-2">
                         <button onClick={() => saveEdit(acc.id)} className="btn-icon-only text-success"><Check size={16} /></button>
                         <button onClick={() => setEditingId(null)} className="btn-icon-only text-muted"><X size={16} /></button>
                       </div>
                    ) : (
                       <div className="flex justify-end gap-2">
                         {/* Если не наблюдатель - показываем кнопки карандаша и корзины */}
                         {!isViewer && (
                           <>
                             <button onClick={() => { setEditingId(acc.id); setEditingName(acc.name); }} className="btn-icon-only text-muted"><Edit2 size={16} /></button>
                             <button onClick={() => onDeleteAccount(acc.id)} className="btn-icon-only text-danger"><Trash2 size={16} /></button>
                           </>
                         )}
                       </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Модальное окно создания счета */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Добавить счет</h3>
            <form onSubmit={handleAddSubmit}>
               <div className="form-group">
                 <label className="form-label">Название</label>
                 <input type="text" required value={name} onChange={e => setName(e.target.value)} className="form-control" />
               </div>
               <div className="form-group flex gap-2">
                 <div style={{flex: 1}}>
                    <label className="form-label">Валюта</label>
                    <select value={currency} onChange={e => setCurrency(e.target.value)} className="form-control">
                      <option value="₽">₽</option><option value="$">$</option><option value="€">€</option>
                    </select>
                 </div>
                 <div style={{flex: 2}}>
                    <label className="form-label">Начальный баланс</label>
                    <input type="number" required value={initialBalance} onChange={e => setInitialBalance(e.target.value)} className="form-control" />
                 </div>
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