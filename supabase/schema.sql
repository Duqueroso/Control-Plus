-- ============================================
-- Control+ Database Schema
-- Sistema ERP/POS para Papelería
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'employee');
CREATE TYPE payment_method AS ENUM ('cash', 'transfer', 'qr', 'card');
CREATE TYPE sale_status AS ENUM ('completed', 'cancelled', 'refunded');
CREATE TYPE cash_register_status AS ENUM ('open', 'closed');
CREATE TYPE cash_movement_type AS ENUM ('income', 'expense');

-- ============================================
-- USERS (extends Supabase auth.users)
-- ============================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'employee',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CATEGORIES
-- ============================================

CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- PRODUCTS
-- ============================================

CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    category_id UUID NOT NULL REFERENCES public.categories(id),
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    sale_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 5,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SALES
-- ============================================

CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_method payment_method NOT NULL,
    status sale_status NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SALE ITEMS
-- ============================================

CREATE TABLE public.sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    total NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CASH REGISTERS
-- ============================================

CREATE TABLE public.cash_registers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    initial_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status cash_register_status NOT NULL DEFAULT 'closed',
    opened_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CASH MOVEMENTS
-- ============================================

CREATE TABLE public.cash_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id),
    type cash_movement_type NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- EXPENSES
-- ============================================

CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    category TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SETTINGS
-- ============================================

CREATE TABLE public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_code ON public.products(code);
CREATE INDEX idx_products_stock_low ON public.products(stock) WHERE stock <= min_stock;
CREATE INDEX idx_sales_user ON public.sales(user_id);
CREATE INDEX idx_sales_date ON public.sales(created_at);
CREATE INDEX idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX idx_cash_movements_register ON public.cash_movements(cash_register_id);
CREATE INDEX idx_expenses_user ON public.expenses(user_id);
CREATE INDEX idx_expenses_date ON public.expenses(expense_date);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sales_updated_at
    BEFORE UPDATE ON public.sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, admins can update
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can update profiles"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Categories: all authenticated users can read, admins can write
CREATE POLICY "Categories are viewable by authenticated users"
    ON public.categories FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage categories"
    ON public.categories FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Products: all authenticated users can read, employees can read
CREATE POLICY "Products are viewable by authenticated users"
    ON public.products FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage products"
    ON public.products FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Sales: all authenticated users can read own, admins can read all
CREATE POLICY "Users can view own sales"
    ON public.sales FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Employees can create sales"
    ON public.sales FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sales"
    ON public.sales FOR UPDATE
    TO authenticated
    USING (
      user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
    WITH CHECK (
      user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    );

-- Sale items: follows sales access
CREATE POLICY "Sale items are viewable by authenticated users"
    ON public.sale_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sales
            WHERE id = sale_id AND (user_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
            ))
        )
    );

CREATE POLICY "Employees can manage sale items"
    ON public.sale_items FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sales
            WHERE id = sale_id AND user_id = auth.uid()
        )
    );

-- Cash registers: users can access own, admins can access all
CREATE POLICY "Users can manage own cash register"
    ON public.cash_registers FOR ALL
    TO authenticated
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- Cash movements: follows cash register access
CREATE POLICY "Users can manage own cash movements"
    ON public.cash_movements FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cash_registers
            WHERE id = cash_register_id AND (user_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
            ))
        )
    );

-- Expenses: all authenticated users can read, employees can create
CREATE POLICY "Expenses are viewable by authenticated users"
    ON public.expenses FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Employees can manage expenses"
    ON public.expenses FOR ALL
    TO authenticated
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- Settings: admins only
CREATE POLICY "Admins can manage settings"
    ON public.settings FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default categories
INSERT INTO public.categories (name, description) VALUES
    ('Papelería', 'Artículos de papelería general'),
    ('Tecnología', 'Productos tecnológicos y electrónicos'),
    ('Oficina', 'Muebles y equipos de oficina'),
    ('Otros', 'Productos diversos');

-- Insert default admin profile (after creating auth user)
-- Note: This will be done via Supabase dashboard or migration
-- ============================================
-- HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION decrement_stock(product_id UUID, quantity INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET stock = stock - quantity
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_stock(product_id UUID, quantity INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET stock = stock + quantity
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION soft_delete_product(product_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET is_active = false
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reactivate_product(product_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET is_active = true
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION hard_delete_product(p_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM sale_items WHERE product_id = p_id;
  DELETE FROM products WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
