CREATE DATABASE IF NOT EXISTS personal_finance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE personal_finance;

-- 1. Таблица учетных записей пользователей
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    linked_user_id INT NULL,
    FOREIGN KEY (linked_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 2. Таблица счетов
CREATE TABLE IF NOT EXISTS accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT '₽',
    initial_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Справочник категорий учета расходов и доходов
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL, -- income(доход) или expense(расход)
    icon VARCHAR(50) NOT NULL DEFAULT 'Grid',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Таблица транзакций
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_id INT NOT NULL,
    category_id INT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    transaction_date DATE NOT NULL,
    description TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Системные категории по умолчанию
INSERT INTO categories (user_id, name, type, icon) VALUES
(NULL, 'Зарплата', 'income', 'Coins'),
(NULL, 'Фриланс', 'income', 'Laptop'),
(NULL, 'Кешбэк/Подарки', 'income', 'Gift'),
(NULL, 'Продукты', 'expense', 'ShoppingBag'),
(NULL, 'Аренда жилья', 'expense', 'Home'),
(NULL, 'Транспорт', 'expense', 'Car'),
(NULL, 'Развлечения', 'expense', 'Gamepad'),
(NULL, 'Прочее', 'expense', 'Grid');