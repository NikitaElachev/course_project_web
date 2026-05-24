from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, date
import mysql.connector
from mysql.connector import Error
import os
import bcrypt
from dotenv import load_dotenv

# Путь к .env файлу
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path=env_path, override=True)

# Создание экземпляра приложения
app = FastAPI()

# Настройка CORS для работы с фронтендом (разрешаем запросы с любых адресов)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Настройки соединения с базой данных MySQL
db_config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'personal_finance'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD')
}

# Функция подключения к БД
def get_db_connection():
    try:
        connection = mysql.connector.connect(**db_config)
        return connection
    except Error as e:
        print(f"\n Ошибка подключения к MySQL: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Не удалось подключиться к базе данных"
        )

# Функция хеширования паролей
def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password=pwd_bytes, salt=salt)
    return hashed_password.decode('utf-8')

# Функция проверки соответствия введенного пароля и сохраненного в БД хеша
def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_byte_enc = plain_password.encode('utf-8')
    hashed_password_byte_enc = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password=password_byte_enc, hashed_password=hashed_password_byte_enc)


# Pydantic схемы данных

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str = 'user'
    linked_email: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    created_at: datetime

class AccountCreate(BaseModel):
    name: str
    currency: str = "₽"
    initial_balance: float = 0.0

class AccountResponse(BaseModel):
    id: int
    user_id: int
    name: str
    currency: str
    initial_balance: float
    current_balance: float
    created_at: datetime

class CategoryCreate(BaseModel):
    name: str
    type: str
    icon: Optional[str] = "Grid"

class CategoryResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    name: str
    type: str
    icon: str

class TransactionCreate(BaseModel):
    account_id: int
    category_id: int
    amount: float
    transaction_date: date
    description: Optional[str] = None

class TransactionResponse(BaseModel):
    id: int
    account_id: int
    category_id: int
    amount: float
    transaction_date: date
    description: Optional[str] = None
    created_at: datetime



# Эндпоинт регистрации нового пользователя
@app.post("/api/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: UserCreate):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Проверка на уникальность email
        cursor.execute("SELECT id FROM users WHERE email = %s", (user.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email уже зарегистрирован")
        
        hashed_password = hash_password(user.password)
        assigned_role = 'viewer' if user.role == 'viewer' else 'user'
        linked_user_id = None

        # Логика для наблюдателя
        if assigned_role == 'viewer':
            # Если не указана почта
            if not user.linked_email:
                 raise HTTPException(status_code=400, detail="Для роли наблюдателя необходимо указать почту пользователя для привязки")
            # Ищем пользователя с таким email
            cursor.execute("SELECT id, role FROM users WHERE email = %s", (user.linked_email,))
            parent_user = cursor.fetchone()

            if not parent_user:
                 raise HTTPException(status_code=400, detail="Указанный пользователь для привязки не найден")
            if parent_user['role'] == 'viewer':
                 raise HTTPException(status_code=400, detail="Нельзя привязаться к другому наблюдателю")
            linked_user_id = parent_user['id']

        query = """INSERT INTO users (email, hashed_password, role, linked_user_id, is_active, created_at) 
                   VALUES (%s, %s, %s, %s, TRUE, NOW())"""
        cursor.execute(query, (user.email, hashed_password, assigned_role, linked_user_id))
        conn.commit()
        # Получаем ID только что созданной записи в таблице
        user_id = cursor.lastrowid
        cursor.execute("SELECT id, email, role, is_active, created_at FROM users WHERE id = %s", (user_id,))
        # Возвращаем данные клиенту
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()


# Эндпоинт авторизации
@app.post("/api/login", response_model=UserResponse)
def login_user(user: UserCreate):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, email, hashed_password, role, is_active, created_at FROM users WHERE email = %s", (user.email,))
        db_user = cursor.fetchone()
        
        if not db_user:
            raise HTTPException(status_code=400, detail="Неверный email или пароль")
            
        if not verify_password(user.password, db_user['hashed_password']):
            raise HTTPException(status_code=400, detail="Неверный email или пароль")
            
        return {
            "id": db_user['id'],
            "email": db_user['email'],
            "role": db_user['role'],
            "is_active": db_user['is_active'],
            "created_at": db_user['created_at']
        }
    finally:
        cursor.close()
        conn.close()


# Вспомогательные функции
# Функция возвращает роль пользователя по его ID.
def check_user_role(cursor, user_id: int):
    cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return user['role']


# Функция умного перенаправителя
# Если запрашивает обычный пользователь, то возвращает его id.
# Если запрашивает наблюдатель, то возвращает id юзера.
def redirerer(cursor, user_id: int):
    cursor.execute("SELECT role, linked_user_id FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if user['role'] == 'viewer':
        if user['linked_user_id']:
            return user['linked_user_id']
        else:
            raise HTTPException(status_code=400, detail="Наблюдатель не привязан к основному аккаунту")
    return user_id


# Функция контроля прав
def require_editor(cursor, user_id: int):
    if check_user_role(cursor, user_id) == 'viewer':
        raise HTTPException(status_code=403, detail="Режим только для чтения. У вас нет прав для изменения данных.")


# Счета

# Эндпоинт получения счетов (список всех счетов пользователя с динамически вычисленным балансом)
@app.get("/api/accounts", response_model=List[AccountResponse])
def get_accounts(user_id: int = 1):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        target_user_id = redirerer(cursor, user_id)
        cursor.execute("SELECT * FROM accounts WHERE user_id = %s", (target_user_id,))
        accounts = cursor.fetchall()
        
        for acc in accounts:
            # Запрос доходовых операций по счету
            income_query = """
                SELECT COALESCE(SUM(t.amount), 0) as total FROM transactions t
                JOIN categories c ON t.category_id = c.id
                WHERE t.account_id = %s AND c.type = 'income'
            """
            # Выполнение запроса
            cursor.execute(income_query, (acc['id'],))
            # Получение данных из запроса (извлекаем числовое значение по ключу 'total' из словаря)
            income = cursor.fetchone()['total']
            
            # Запрос расходовых операций по счету
            expense_query = """
                SELECT COALESCE(SUM(t.amount), 0) as total FROM transactions t
                JOIN categories c ON t.category_id = c.id
                WHERE t.account_id = %s AND c.type = 'expense'
            """
            cursor.execute(expense_query, (acc['id'],))
            expense = cursor.fetchone()['total']
            
            acc['current_balance'] = acc['initial_balance'] + income - expense
            
        return accounts
    finally:
        cursor.close()
        conn.close()


# Эндпоинт создания счета
@app.post("/api/accounts", response_model=AccountResponse)
def create_account(account: AccountCreate, user_id: int = 1):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        require_editor(cursor, user_id)
        # Запрос для вставки нового счета в таблицу accounts
        query = """INSERT INTO accounts (user_id, name, currency, initial_balance, created_at) 
                   VALUES (%s, %s, %s, %s, NOW())"""
        cursor.execute(query, (user_id, account.name, account.currency, account.initial_balance))
        conn.commit()
        # Получаем ID только что созданной записи
        new_id = cursor.lastrowid
        # Получаем текущие данные о счете
        cursor.execute("SELECT * FROM accounts WHERE id = %s", (new_id,))
        acc_data = cursor.fetchone()
        acc_data['current_balance'] = acc_data['initial_balance']
        return acc_data
    finally:
        cursor.close()
        conn.close()


# Эндпоинт удаления счета
@app.delete("/api/accounts/{account_id}")
def delete_account(account_id: int, user_id: int = 1):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        require_editor(cursor, user_id)
        cursor.execute("SELECT id FROM accounts WHERE id = %s AND user_id = %s", (account_id, user_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Счет не найден")
        
        cursor.execute("DELETE FROM transactions WHERE account_id = %s", (account_id,))
        cursor.execute("DELETE FROM accounts WHERE id = %s", (account_id,))
        conn.commit()
        return {"message": "Счет и ассоциированные транзакции успешно удалены"}
    finally:
        cursor.close()
        conn.close()


# Эндпоинт редактирования счета
@app.put("/api/accounts/{account_id}", response_model=AccountResponse)
def update_account(account_id: int, account: AccountCreate, user_id: int = 1):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        require_editor(cursor, user_id)
        
        cursor.execute("SELECT * FROM accounts WHERE id = %s AND user_id = %s", (account_id, user_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Счет не найден")
            
        query = "UPDATE accounts SET name = %s WHERE id = %s AND user_id = %s"
        cursor.execute(query, (account.name, account_id, user_id))
        conn.commit()
        
        cursor.execute("SELECT * FROM accounts WHERE id = %s", (account_id,))
        acc_data = cursor.fetchone()
        
        income_query = """
            SELECT COALESCE(SUM(t.amount), 0) as total FROM transactions t
            JOIN categories c ON t.category_id = c.id
            WHERE t.account_id = %s AND c.type = 'income'
        """
        cursor.execute(income_query, (account_id,))
        income = cursor.fetchone()['total']
        
        expense_query = """
            SELECT COALESCE(SUM(t.amount), 0) as total FROM transactions t
            JOIN categories c ON t.category_id = c.id
            WHERE t.account_id = %s AND c.type = 'expense'
        """
        cursor.execute(expense_query, (account_id,))
        expense = cursor.fetchone()['total']
        
        acc_data['current_balance'] = acc_data['initial_balance'] + income - expense
        
        return acc_data
    finally:
        cursor.close()
        conn.close()


# Категории

# Эндпоинт получения категорий
@app.get("/api/categories", response_model=List[CategoryResponse])
def get_categories(user_id: int = 1):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        target_user_id = redirerer(cursor, user_id)
        cursor.execute("SELECT * FROM categories WHERE user_id = %s OR user_id IS NULL", (target_user_id,))
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


# Эндпоинт создания категории
@app.post("/api/categories", response_model=CategoryResponse)
def create_category(category: CategoryCreate, user_id: int = 1):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        require_editor(cursor, user_id)
        query = """INSERT INTO categories (user_id, name, type, icon) 
                   VALUES (%s, %s, %s, %s)"""
        cursor.execute(query, (user_id, category.name, category.type, category.icon))
        conn.commit()
        
        new_id = cursor.lastrowid
        cursor.execute("SELECT * FROM categories WHERE id = %s", (new_id,))
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()


# Эндпоинт изменения категории
@app.put("/api/categories/{category_id}", response_model=CategoryResponse)
def update_category(category_id: int, category: CategoryCreate, user_id: int = 1):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        require_editor(cursor, user_id)
        cursor.execute("SELECT * FROM categories WHERE id = %s AND user_id = %s", (category_id, user_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Категория не найдена или недоступна для изменения")
            
        query = """UPDATE categories SET name = %s, type = %s, icon = %s 
                   WHERE id = %s AND user_id = %s"""
        cursor.execute(query, (category.name, category.type, category.icon, category_id, user_id))
        conn.commit()
        
        cursor.execute("SELECT * FROM categories WHERE id = %s", (category_id,))
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()


# Эндпоинт удаления категории
@app.delete("/api/categories/{category_id}")
def delete_category(category_id: int, user_id: int = 1):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        require_editor(cursor, user_id)
        cursor.execute("SELECT user_id FROM categories WHERE id = %s", (category_id,))
        cat = cursor.fetchone()
        
        if not cat:
            raise HTTPException(status_code=404, detail="Категория не найдена")
            
        if cat['user_id'] is None:
            raise HTTPException(status_code=403, detail="Невозможно удалить базовую системную категорию")

        cursor.execute("DELETE FROM categories WHERE id = %s", (category_id,))
        conn.commit()
        return {"detail": "Категория удалена"}
    except mysql.connector.IntegrityError:
        raise HTTPException(
            status_code=400, 
            detail="Невозможно удалить категорию, так как по ней существуют операции. Сначала удалите или измените операции."
        )
    finally:
        cursor.close()
        conn.close()


# Транзакции

# Эндпоинт получения транзакций
@app.get("/api/transactions", response_model=List[TransactionResponse])
def get_transactions(account_id: Optional[int] = None, user_id: int = 1):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        target_user_id = redirerer(cursor, user_id)
        # Фильтрация по счету (если счет указан в запросе)
        if account_id:
            cursor.execute("SELECT id FROM accounts WHERE id = %s AND user_id = %s", (account_id, target_user_id))
            if not cursor.fetchone():
                 raise HTTPException(status_code=403, detail="Доступ запрещен")
            # Запрос для выборки транзакций только по одному счету
            query = "SELECT * FROM transactions WHERE account_id = %s ORDER BY transaction_date DESC"
            cursor.execute(query, (account_id,))
        # Транзакции по всем счетам
        else:
            query = """
                SELECT t.* FROM transactions t
                JOIN accounts a ON t.account_id = a.id
                WHERE a.user_id = %s
                ORDER BY t.transaction_date DESC
            """
            cursor.execute(query, (target_user_id,))
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


# Эндпоинт создания транзакции
@app.post("/api/transactions", response_model=TransactionResponse)
def create_transaction(trans: TransactionCreate, user_id: int = 1):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        require_editor(cursor, user_id)
        cursor.execute("SELECT id FROM accounts WHERE id = %s", (trans.account_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail="Указанный счет не существует")
            
        query = """INSERT INTO transactions (account_id, category_id, amount, transaction_date, description, created_at)
                   VALUES (%s, %s, %s, %s, %s, NOW())"""
        cursor.execute(query, (trans.account_id, trans.category_id, trans.amount, trans.transaction_date, trans.description))
        conn.commit()
        
        new_id = cursor.lastrowid
        cursor.execute("SELECT * FROM transactions WHERE id = %s", (new_id,))
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()


# Эндпоинт изменения транзакции
@app.put("/api/transactions/{transaction_id}", response_model=TransactionResponse)
def update_transaction(transaction_id: int, trans: TransactionCreate, user_id: int = 1):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        require_editor(cursor, user_id)
        cursor.execute("SELECT * FROM transactions WHERE id = %s", (transaction_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Транзакция не найдена")
            
        cursor.execute("SELECT id FROM accounts WHERE id = %s", (trans.account_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail="Указанный счет не существует")
            
        query = """UPDATE transactions SET account_id = %s, category_id = %s, amount = %s, 
                   transaction_date = %s, description = %s
                   WHERE id = %s"""
        cursor.execute(query, (trans.account_id, trans.category_id, trans.amount, trans.transaction_date, trans.description, transaction_id))
        conn.commit()
        
        cursor.execute("SELECT * FROM transactions WHERE id = %s", (transaction_id,))
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()


# Эндпоинт удаления транзакции
@app.delete("/api/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, user_id: int = 1):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        require_editor(cursor, user_id)
        cursor.execute("DELETE FROM transactions WHERE id = %s", (transaction_id,))
        conn.commit()
        return {"detail": "Транзакция удалена"}
    finally:
        cursor.close()
        conn.close()