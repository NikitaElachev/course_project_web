import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Account, Category, Transaction } from '../types';
import { formatCurrency, calculateTotalPortfolioBalance } from '../utils';
import CategoryIcon from './CategoryIcon';
import { jsPDF } from 'jspdf';
import { robotoBase64 } from '../fonts/Roboto'; 

interface DashboardProps {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  addTransaction: (trans: Omit<Transaction, 'id' | 'created_at'>) => void;
  isViewer: boolean;
}

export default function Dashboard({
  accounts,
  categories,
  transactions,
  addTransaction,
  isViewer
}: DashboardProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  // Подсчет общего баланса по всем счетам (из utils.ts)
  const totalBalance = calculateTotalPortfolioBalance(accounts, transactions, categories);
  
  // Вычисление доходов и расходов за текущий месяц
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  let monthlyIncomes = 0;
  let monthlyExpenses = 0;
  
  transactions.forEach(t => { // Цикл перебора для каждой отдельной транзакции
    const tDate = new Date(t.transaction_date);
    if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
      const cat = categories.find(c => c.id === t.category_id); // Пытаемся найти в массиве категорию транзакции
      if (cat) {
        if (cat.type === 'income') monthlyIncomes += t.amount;
        else if (cat.type === 'expense') monthlyExpenses += t.amount;
      }
    }
  });

  // Подготовка данных для диаграммы (Расходы по категориям)
  const expenseCategories = categories.filter(c => c.type === 'expense'); // Фильтруем общий массив категорий (только расходы)
  const expenseTransactions = transactions.filter(t => { // Фильтруем весь массива транзакций (только расходы)
    const cat = categories.find(c => c.id === t.category_id); // Для каждой транзакции ищем категорию
    return cat && cat.type === 'expense'; // Транзакция остается в массиве, если ее категория существует и имеет тип расход 
  });
  
  const totalExpenseSum = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  const expenseByCategory = expenseCategories.map(cat => { // Проходим циклом по каждой категории расходов
    const sum = expenseTransactions
      .filter(t => t.category_id === cat.id) // Фильруем по 1 категории
      .reduce((s, t) => s + t.amount, 0); // Находим сумму

    const percentage = totalExpenseSum > 0 ? (sum / totalExpenseSum) * 100 : 0;
    return { ...cat, amount: sum, percentage: Math.round(percentage) }; // Возвращаем новый объект
  }).filter(item => item.amount > 0); // Оставляем только те, где есть траты

  const displayExpensesByCategory = expenseByCategory;

  const PIE_COLORS = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
    '#06b6d4', '#6366f1'
  ];

  // Математика для отрисовки SVG круга
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercentage = 0;

  // Сортируем транзакции по убыванию даты и берем только 5 последних
  const sortedTransactions = [...transactions].sort((a,b) => 
    new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
  ).slice(0, 5);

  // Обработчик отправки формы для создания новой транзакции
  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!amount || !categoryId || !accountId) return;
    
    const parsedAmount = parseFloat(amount);
    const parsedAccountId = parseInt(accountId);
    const parsedCategoryId = parseInt(categoryId);

    addTransaction({
      account_id: parsedAccountId,
      category_id: parsedCategoryId,
      amount: parsedAmount,
      transaction_date: date,
      description: description || 'Без описания'
    });

    setShowAddModal(false);
  };

  // Функция экспорта отчета в PDF с помощью jsPDF
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Подключаем кастомный шрифт
      doc.addFileToVFS("Roboto-Regular.ttf", robotoBase64);
      doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
      doc.setFont("Roboto", "normal"); 
      doc.text('== ФИНАНСОВЫЙ ОБЗОР ==', 15, 20);
      doc.text(`Общий баланс: ${totalBalance} RUB`, 15, 30);
      doc.text(`Доходы за месяц: ${monthlyIncomes} RUB`, 15, 40);
      doc.text(`Расходы за месяц: ${monthlyExpenses} RUB`, 15, 50);
      
      let currentY = 65;
      if (displayExpensesByCategory.length > 0) {
        doc.text('== ФИНАНСОВЫЙ ОБЗОР ==', 15, 20);
        currentY += 10;
        displayExpensesByCategory.forEach(cat => {
            doc.text(`${cat.name}: ${cat.amount} (${cat.percentage}%)`, 15, currentY);
            currentY += 10;
        });
      }

      doc.save('finance_dashboard_report.pdf');
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <div>
      {/* 3 верхние метрики */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-title">Общий баланс</div>
          <div className="metric-value">{formatCurrency(totalBalance)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">Доходы за месяц</div>
          <div className="metric-value income">+{formatCurrency(monthlyIncomes)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-title">Расходы за месяц</div>
          <div className="metric-value expense">-{formatCurrency(monthlyExpenses)}</div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Карточка с диаграммой */}
        <div className="card dashboard-col-5">
          <div className="card-header">
            <h3 className="card-title" style={{marginBottom: '20px'}}>Расходы по категориям</h3>
            <button className="btn btn-secondary" onClick={handleExportPDF}>
              Экспорт PDF
            </button>
          </div>
          {/* Круговая диаграмма */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                {/* Векторный холст, rotate(-90deg) переносит начало рисования вверх (изначально справа) */}
                <svg viewBox="0 0 120 120" style={{ width: '180px', height: '180px', transform: 'rotate(-90deg)' }}>
                  {/* Базовое серое кольцо подложки */}
                  <circle cx="60" cy="60" r={radius} fill="transparent" stroke="#f5f5f5" strokeWidth="14" />                 
                  {/* Отрисовка цветных долей расходов по каждой категории */}
                  {displayExpensesByCategory.map((item, index) => {
                    const pct = item.percentage;                   
                    {/* Математика диаграммы */}
                    const strokeDashoffset = circumference - (circumference * pct) / 100;
                    const strokeDasharray = `${(circumference * pct) / 100} ${circumference}`;
                    const rotationOffset = (accumulatedPercentage / 100) * circumference;
                    accumulatedPercentage += pct;
                    {/* Берем цвет для сектора из палитры */}
                    const strokeColor = PIE_COLORS[index % PIE_COLORS.length];

                    return (
                      /* Отрисовка каждого цветного сегмента кольца */
                      <circle key={index} cx="60" cy="60" r={radius} fill="transparent"
                        stroke={strokeColor} strokeWidth="14" strokeDasharray={strokeDasharray}
                        strokeDashoffset={-rotationOffset} strokeLinecap="round" />
                    );
                  })}
                </svg>
              </div>

          {/* Легенда диаграммы */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
            {displayExpensesByCategory.length > 0 ? (
              displayExpensesByCategory.map((item, idx) => (
                <div key={idx} className="flex flex-row">
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                  <span>{item.name} ({item.percentage}%)</span>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: 'span 2', textAlign: 'center', color: 'var(--text-muted)' }}>Нет данных</div>
            )}
          </div>
        </div>

        {/* Последние операции */}
        <div className="card dashboard-col-7">
          <div className="card-header">
            <h3 className="card-title">Последние операции</h3>
            {!isViewer && (
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                <Plus size={16} /> Добавить
              </button>
            )}
          </div>
          
          <div>
            {sortedTransactions.length === 0 ? (
               <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Нет транзакций</div>
            ) : (
              sortedTransactions.map(t => {
                const cat = categories.find(c => c.id === t.category_id);
                const isExpense = cat?.type === 'expense';
                return (
                  <div key={t.id} className="list-item">
                    <div className="list-item-content">
                      <div className={`icon-container ${isExpense ? 'expense' : 'income'}`}>
                        <CategoryIcon name={cat?.icon || 'Grid'} />
                      </div>
                      <div>
                        <div className="font-bold">{cat?.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.description}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${isExpense ? '' : 'text-success'}`}>
                        {isExpense ? '-' : '+'}{formatCurrency(t.amount)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.transaction_date}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно добавления транзакции с дашборда */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Новая операция</h3>
            <form onSubmit={handleSubmit}>
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