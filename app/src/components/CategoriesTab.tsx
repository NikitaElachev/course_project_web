import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Category } from '../types';
import CategoryIcon from './CategoryIcon';

// Описание данных от родителя (App.tsx)
interface CategoriesTabProps {
  categories: Category[];
  onAddCategory: (cat: Omit<Category, 'id'>) => void;
  onDeleteCategory: (id: number) => void;
  isViewer: boolean;
}

export default function CategoriesTab({
  categories,
  onAddCategory,
  onDeleteCategory,
  isViewer
}: CategoriesTabProps) {
  // Состояния для модального окна добавления категории
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [icon, setIcon] = useState('Grid');

  // Список иконок для выбора
  const availableIcons = ['Grid', 'Coins', 'Laptop', 'Gift', 'ShoppingBag', 'Home', 'Car', 'Gamepad', 'CreditCard', 'Wallet'];

  // Отправка формы создания
  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddCategory({ user_id: 1, name, type, icon});
    setShowAddModal(false);
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Справочник категорий</h2>
        {!isViewer && (
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            <Plus size={16} /> Добавить
          </button>
        )}
      </div>

      <div className="dashboard-grid">
        {/* Левая колонка (Доходы) */}
        <div style={{flex: 1}}>
          <h3 style={{fontSize:'12px', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:'10px'}}>Типы Доходов</h3>
          <div className="table-wrapper">
             {categories.filter(c => c.type === 'income').map(c => (
               <div key={c.id} className="list-item">
                 <div className="flex items-center gap-3">
                   <div className="icon-container income"><CategoryIcon name={c.icon} /></div>
                   <div className="font-bold">{c.name}</div>
                 </div>
                 {/* Кнопка удаления отображается, только если это кастомная категория */}
                 {!isViewer && c.user_id !== null && (
                   <button onClick={() => onDeleteCategory(c.id)} className="btn-icon-only text-danger"><Trash2 size={16} /></button>
                 )}
               </div>
             ))}
          </div>
        </div>
        
        {/* Правая колонка (Расходы) */}
        <div style={{flex: 1}}>
          <h3 style={{fontSize:'12px', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:'10px'}}>Типы Расходов</h3>
          <div className="table-wrapper">
             {categories.filter(c => c.type === 'expense').map(c => (
               <div key={c.id} className="list-item">
                 <div className="flex items-center gap-3">
                   <div className="icon-container expense"><CategoryIcon name={c.icon} /></div>
                   <div className="font-bold">{c.name}</div>
                 </div>
                 {!isViewer && c.user_id !== null && (
                   <button onClick={() => onDeleteCategory(c.id)} className="btn-icon-only text-danger"><Trash2 size={16} /></button>
                 )}
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Модальное окно добавления категории */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Новая категория</h3>
            <form onSubmit={handleSubmit}>
               {/* Выбор типа категории (доход или расход) */}
               <div className="form-group flex gap-2">
                 <button type="button" className={`btn ${type === 'expense' ? 'btn-primary' : 'btn-secondary'}`} style={{flex:1}} onClick={() => setType('expense')}>Расход</button>
                 <button type="button" className={`btn ${type === 'income' ? 'btn-primary' : 'btn-secondary'}`} style={{flex:1}} onClick={() => setType('income')}>Доход</button>
               </div>
               <div className="form-group">
                 <label className="form-label">Название</label>
                 <input type="text" required value={name} onChange={e => setName(e.target.value)} className="form-control" />
               </div>
               {/* Выбор иконки */}
               <div className="form-group">
                 <label className="form-label">Иконка</label>
                 <div style={{display:'flex', gap:'8px', flexWrap:'wrap', background:'var(--bg)', padding:'10px', borderRadius:'8px'}}>
                    {availableIcons.map(ic => (
                      <button key={ic} type="button" onClick={() => setIcon(ic)} className={`icon-container ${icon === ic ? 'income' : 'neutral'}`} style={{cursor:'pointer', border:'none'}}>
                        <CategoryIcon name={ic} />
                      </button>
                    ))}
                 </div>
               </div>
               <div className="modal-actions">
                 <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Отмена</button>
                 <button type="submit" className="btn btn-primary">Создать</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}