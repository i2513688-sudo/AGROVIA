/* =========================================================
   BASE DE DATOS AGROVIA - SQL SERVER
   ========================================================= */

-- Crear base de datos
IF DB_ID('agrovia') IS NULL
BEGIN
    CREATE DATABASE agrovia;
END
GO

USE agrovia;
GO


/* =========================================================
   TABLA USERS
   ========================================================= */

IF OBJECT_ID('users', 'U') IS NULL
BEGIN
    CREATE TABLE users (
        id INT IDENTITY(1,1) NOT NULL,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(160) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL,
        company VARCHAR(160) NULL,
        location VARCHAR(160) NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),

        CONSTRAINT PK_users PRIMARY KEY (id),
        CONSTRAINT UQ_users_email UNIQUE (email),
        CONSTRAINT CHK_users_role
            CHECK (role IN ('farmer', 'buyer'))
    );
END
GO


/* =========================================================
   TABLA PRODUCTS
   ========================================================= */

IF OBJECT_ID('products', 'U') IS NULL
BEGIN
    CREATE TABLE products (
        id INT IDENTITY(1,1) NOT NULL,
        name VARCHAR(120) NOT NULL,
        category VARCHAR(60) NOT NULL,
        description VARCHAR(MAX) NOT NULL,
        quantity DECIMAL(12,2) NOT NULL,
        unit VARCHAR(30) NOT NULL,
        price DECIMAL(12,2) NOT NULL,
        harvest_date VARCHAR(40) NULL,
        image VARCHAR(500) NULL,
        farmer_id INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),

        CONSTRAINT PK_products PRIMARY KEY (id),

        CONSTRAINT CHK_products_quantity
            CHECK (quantity > 0),

        CONSTRAINT CHK_products_price
            CHECK (price > 0),

        CONSTRAINT FK_products_farmer
            FOREIGN KEY (farmer_id)
            REFERENCES users(id)
            ON DELETE CASCADE
    );
END
GO


/* =========================================================
   TABLA ORDERS
   ========================================================= */

IF OBJECT_ID('orders', 'U') IS NULL
BEGIN
    CREATE TABLE orders (
        id INT IDENTITY(1,1) NOT NULL,
        quantity DECIMAL(12,2) NOT NULL,
        message VARCHAR(MAX) NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        buyer_id INT NOT NULL,
        product_id INT NOT NULL,

        CONSTRAINT PK_orders PRIMARY KEY (id),

        CONSTRAINT CHK_orders_quantity
            CHECK (quantity > 0),

        CONSTRAINT CHK_orders_status
            CHECK (status IN ('pending', 'accepted', 'declined')),

        CONSTRAINT FK_orders_buyer
            FOREIGN KEY (buyer_id)
            REFERENCES users(id),

        CONSTRAINT FK_orders_product
            FOREIGN KEY (product_id)
            REFERENCES products(id)
    );
END
GO


/* =========================================================
   INSERTAR USUARIOS
   ========================================================= */

IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE email = 'demo@agrovia.co'
)
BEGIN
    SET IDENTITY_INSERT users ON;

    INSERT INTO users
    (id, name, email, password_hash, role, company, location)
    VALUES
    (
        1,
        'Mariana López',
        'demo@agrovia.co',
        '$2b$12$aPY6WSko2aVsOA1GGdTa0.unLk0mil9wzb.uyTf8yBX2kXndq.BjG',
        'farmer',
        'Finca La Esperanza',
        'Rionegro, Antioquia'
    );

    SET IDENTITY_INSERT users OFF;
END
GO


IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE email = 'comprador@agrovia.co'
)
BEGIN
    SET IDENTITY_INSERT users ON;

    INSERT INTO users
    (id, name, email, password_hash, role, company, location)
    VALUES
    (
        2,
        'Restaurante Sazón Local',
        'comprador@agrovia.co',
        '$2b$12$puWpIUqwZIvLPitZsTHeRedFkmQeqoencQnFOogcCm0iZnxAYtKjO',
        'buyer',
        'Sazón Local',
        'Medellín, Antioquia'
    );

    SET IDENTITY_INSERT users OFF;
END
GO


UPDATE products
SET name = 'Papa',
    category = 'Hortalizas',
    description = 'Papa seleccionada, fresca y de excelente calidad para restaurantes y negocios locales.',
    image = '/static/images/papa.png'
WHERE name = 'Aguacate Hass premium';

UPDATE products
SET name = 'Choclo',
    category = 'Granos',
    description = 'Choclo fresco y dulce, ideal para cocina tradicional y preparaciones de alto volumen.',
    image = '/static/images/choclo.png'
WHERE name = 'Tomate chonto';

UPDATE products
SET name = 'Habas',
    category = 'Hortalizas',
    description = 'Habas frescas de cosecha reciente, cultivadas localmente y listas para tu negocio.',
    image = '/static/images/habas.png'
WHERE name = 'Café especial lavado';
GO


/* =========================================================
   PRODUCTO 1 - PAPA
   ========================================================= */

IF NOT EXISTS (
    SELECT 1 FROM products
    WHERE name = 'Papa'
)
BEGIN
    INSERT INTO products
    (
        name,
        category,
        description,
        quantity,
        unit,
        price,
        harvest_date,
        image,
        farmer_id
    )
    SELECT
        'Papa',
        'Hortalizas',
        'Papa seleccionada, fresca y de excelente calidad para restaurantes y negocios locales.',
        840,
        'kg',
        9800,
        '12 sep 2026',
        '/static/images/papa.png',
        id
    FROM users
    WHERE email = 'demo@agrovia.co';
END
GO


/* =========================================================
    PRODUCTO 2 - CHOCLO
   ========================================================= */

IF NOT EXISTS (
    SELECT 1 FROM products
    WHERE name = 'Choclo'
)
BEGIN
    INSERT INTO products
    (
        name,
        category,
        description,
        quantity,
        unit,
        price,
        harvest_date,
        image,
        farmer_id
    )
    SELECT
        'Choclo',
        'Granos',
        'Choclo fresco y dulce, ideal para cocina tradicional y preparaciones de alto volumen.',
        420,
        'kg',
        4200,
        '10 sep 2026',
        '/static/images/choclo.png',
        id
    FROM users
    WHERE email = 'demo@agrovia.co';
END
GO


/* =========================================================
    PRODUCTO 3 - HABAS
   ========================================================= */

IF NOT EXISTS (
    SELECT 1 FROM products
    WHERE name = 'Habas'
)
BEGIN
    INSERT INTO products
    (
        name,
        category,
        description,
        quantity,
        unit,
        price,
        harvest_date,
        image,
        farmer_id
    )
    SELECT
        'Habas',
        'Hortalizas',
        'Habas frescas de cosecha reciente, cultivadas localmente y listas para tu negocio.',
        120,
        'kg',
        39000,
        '28 ago 2026',
        '/static/images/habas.png',
        id
    FROM users
    WHERE email = 'demo@agrovia.co';
END
GO


/* =========================================================
   VERIFICACIÓN
   ========================================================= */

SELECT 'Base de datos AGROVIA lista' AS mensaje;
GO

SELECT
    TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
  AND TABLE_NAME IN ('users', 'products', 'orders')
ORDER BY TABLE_NAME;
GO


/* =========================================================
   MOSTRAR DATOS
   ========================================================= */

SELECT * FROM users;
GO

SELECT * FROM products;
GO

SELECT * FROM orders;
GO 