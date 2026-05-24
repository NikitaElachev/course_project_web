import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, UserCheck } from 'lucide-react';

// Описание данных от родителя (App.tsx)
interface AuthScreenProps {
  onLogin: (userId: number, email: string, role: 'user' | 'viewer') => void;
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // Состояния для регистрации
  const [registerRole, setRegisterRole] = useState<'user' | 'viewer'>('user');
  const [linkedEmail, setLinkedEmail] = useState(''); // Почта user для viewer

  // Обработка формы (Вход или Регистрация)
  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Заполните все поля');
      return;
    }
    
    setError('');

    try {
      if (isLogin) {
        // Логика авторизации
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          setError(typeof data.detail === 'string' ? data.detail : (data.detail?.[0]?.msg || 'Ошибка авторизации'));
          return;
        }
        
        // Передаем данные наверх в App.tsx
        onLogin(data.id, data.email, data.role);
      } else {
        // Логика регистрации
        const body: any = { email, password, role: registerRole };
        // Если регистрируем наблюдателя, добавляем почту основного аккаунта
        if (registerRole === 'viewer') {
          body.linked_email = linkedEmail;
        }

        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          setError(typeof data.detail === 'string' ? data.detail : (data.detail?.[0]?.msg || 'Ошибка регистрации'));
          return;
        }
        
        // После успешной регистрации переключаем экран обратно на Вход
        setIsLogin(true);
        setError('Регистрация успешна! Теперь вы можете войти.');
      }
    } catch (err) {
      console.error('Backend fetch failed', err);
      setError('Ошибка соединения с сервером');
    }
  };

  return (
    <div className="auth-container">
      {/* motion.div отвечает за красивую анимацию появления карточки */}
      <motion.div 
        className="auth-card card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="auth-header text-center mb-4">
          <div className="sidebar-logo" style={{ margin: '0 auto 16px auto', width: 48, height: 48, fontSize: 24 }}>Ф</div>
          <h2 className="card-title" style={{ fontSize: 24, marginBottom: 8 }}>{isLogin ? 'Вход в систему' : 'Регистрация'}</h2>
        </div>

        {/* Блок вывода ошибок и успешных сообщений */}
        {error && (
          <div className={`badge ${error.includes('успешна') ? 'income' : 'expense'}`} style={{ width: '100%', marginBottom: 16, padding: '10px', textAlign: 'center', boxSizing: 'border-box' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input 
              type="email" 
              className="form-control" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="student@polytech.ru" 
            />
          </div>
          <div className="form-group mb-4">
            <label className="form-label">Пароль</label>
            <input 
              type="password" 
              className="form-control" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="*******" 
            />
          </div>

          {/* Дополнительные поля, которые появляются только при Регистрации */}
          {!isLogin && (
            <>
              <div className="form-group mb-4">
                <label className="form-label">Роль</label>
                <select
                  className="form-control"
                  value={registerRole}
                  onChange={e => setRegisterRole(e.target.value as 'user' | 'viewer')}
                >
                  <option value="user">Обычный пользователь</option>
                  <option value="viewer">Наблюдатель (только чтение)</option>
                </select>
              </div>

              {/* Поле привязки появляется только если выбрана роль viewer */}
              {registerRole === 'viewer' && (
                <div className="form-group mb-4">
                  <label className="form-label">Email пользователя для привязки</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    value={linkedEmail} 
                    onChange={e => setLinkedEmail(e.target.value)} 
                    placeholder="student@polytech.ru" 
                  />
                </div>
              )}
            </>
          )}
          
          <button type="submit" className="btn btn-primary w-full" style={{ padding: '12px 16px', fontSize: 14 }}>
            {isLogin ? <><ShieldCheck size={18} /> Войти</> : <><UserCheck size={18} /> Зарегистрироваться</>}
          </button>
        </form>

        {/* Переключатель между экраном Входа и экраном Регистрации */}
        <div className="text-center" style={{ marginTop: 24, fontSize: 13 }}>
          <span className="text-muted">{isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}</span>
          <br/>
          <button 
            className="btn btn-secondary" 
            style={{ marginTop: 8, padding: '6px 12px', fontSize: 12 }} 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
          >
            {isLogin ? 'Создать аккаунт' : 'Войти в систему'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}