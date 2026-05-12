-- Script de Criação do Banco de Dados Hospeda Smart (Supabase/PostgreSQL)

-- 1. Tabela de Perfis (Usuários)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- Nota: Em produção real, use Supabase Auth. Aqui guardaremos para fins de simulação de login conforme pedido.
  role TEXT NOT NULL CHECK (role IN ('Administrador', 'Gestor/Gerente', 'Operador 1', 'Operador 2')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Tabela de Clientes
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  rg TEXT,
  cpf TEXT,
  phone TEXT,
  email TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_zip TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Tabela de Produtos
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  unit_value DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Tabela de Quartos
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  room_type TEXT NOT NULL CHECK (room_type IN ('Standard', 'Luxo', 'Master')),
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Tabela de Tarifas
CREATE TABLE IF NOT EXISTS rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  special_value DECIMAL(10,2),
  status TEXT NOT NULL CHECK (status IN ('Ativa', 'Inativa')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Tabela de Reservas
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  rate_id UUID REFERENCES rates(id) ON DELETE CASCADE NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  is_corporate BOOLEAN DEFAULT FALSE,
  corporate_name TEXT,
  corporate_cnpj TEXT,
  billing_type TEXT CHECK (billing_type IN ('Imediato', 'Faturamento 10 dias', 'Faturamento 15 dias', 'Faturamento 20 dias', 'Faturamento 30 dias', 'Faturamento 45 dias')),
  observations TEXT,
  status TEXT NOT NULL DEFAULT 'Gerada' CHECK (status IN ('Gerada', 'Iniciada', 'Finalizada')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Tabela de Consumo
CREATE TABLE IF NOT EXISTS consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_value DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS (Row Level Security) - Para simplificar neste exemplo, permitiremos acesso total
-- Em um ambiente real, as políticas seriam mais restritivas.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (Permitir tudo para fins de demonstração rápida)
CREATE POLICY "Allow all to everyone" ON profiles FOR ALL TO anon, authenticated USING (true);
CREATE POLICY "Allow all to everyone" ON clients FOR ALL TO anon, authenticated USING (true);
CREATE POLICY "Allow all to everyone" ON products FOR ALL TO anon, authenticated USING (true);
CREATE POLICY "Allow all to everyone" ON rooms FOR ALL TO anon, authenticated USING (true);
CREATE POLICY "Allow all to everyone" ON rates FOR ALL TO anon, authenticated USING (true);
CREATE POLICY "Allow all to everyone" ON reservations FOR ALL TO anon, authenticated USING (true);
CREATE POLICY "Allow all to everyone" ON consumption FOR ALL TO anon, authenticated USING (true);

-- Inserir usuário administrador inicial
INSERT INTO profiles (full_name, email, password, role)
VALUES ('Raphael Dian Soares', 'raphaeldscarioca@gmail.com', 'rds3557', 'Administrador')
ON CONFLICT (email) DO NOTHING;
