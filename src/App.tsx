import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Profile, UserRole } from './types';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Bed, 
  DollarSign, 
  UserCircle, 
  CalendarDays, 
  LogOut,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ClientsPage from './pages/ClientsPage';
import ProductsPage from './pages/ProductsPage';
import RoomsPage from './pages/RoomsPage';
import RatesPage from './pages/RatesPage';
import UsersPage from './pages/UsersPage';
import ReservationsPage from './pages/ReservationsPage';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';

type Page = 'Home' | 'Clientes' | 'Produtos' | 'Quartos' | 'Tarifas' | 'Usuarios' | 'Reservas';

export default function App() {
  const [user, setUser] = useState<Profile | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('Home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('hospeda_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (profile: Profile) => {
    setUser(profile);
    localStorage.setItem('hospeda_user', JSON.stringify(profile));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('hospeda_user');
    setCurrentPage('Home');
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const menuItems = [
    { id: 'Home', label: 'Home', icon: LayoutDashboard, roles: ['Administrador', 'Gestor/Gerente', 'Operador 1', 'Operador 2'] },
    { id: 'Clientes', label: 'Cadastro de Clientes', icon: Users, roles: ['Administrador', 'Gestor/Gerente', 'Operador 1', 'Operador 2'] },
    { id: 'Produtos', label: 'Cadastro de Produtos', icon: Package, roles: ['Administrador', 'Gestor/Gerente', 'Operador 1'] },
    { id: 'Quartos', label: 'Cadastro de Quartos', icon: Bed, roles: ['Administrador', 'Gestor/Gerente', 'Operador 1'] },
    { id: 'Tarifas', label: 'Cadastro de Tarifas', icon: DollarSign, roles: ['Administrador', 'Gestor/Gerente', 'Operador 1'] },
    { id: 'Usuarios', label: 'Cadastro de Usuários', icon: UserCircle, roles: ['Administrador', 'Gestor/Gerente'] },
    { id: 'Reservas', label: 'Reservas', icon: CalendarDays, roles: ['Administrador', 'Gestor/Gerente', 'Operador 1', 'Operador 2'] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user.role));

  const renderPage = () => {
    switch (currentPage) {
      case 'Clientes': return <ClientsPage user={user} />;
      case 'Produtos': return <ProductsPage user={user} />;
      case 'Quartos': return <RoomsPage user={user} />;
      case 'Tarifas': return <RatesPage user={user} />;
      case 'Usuarios': return <UsersPage user={user} />;
      case 'Reservas': return <ReservationsPage user={user} />;
      case 'Home': return <HomePage user={user} />;
      default: return (
        <div className="flex flex-col items-center justify-center h-full text-slate-500">
          <LayoutDashboard size={64} className="mb-4 opacity-20" />
          <h2 className="text-2xl font-semibold">Bem-vindo ao Hospeda Smart</h2>
          <p>Selecione uma opção no menu lateral para começar.</p>
        </div>
      );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-white border-r border-slate-200 flex flex-col z-20 shadow-xl"
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-bold text-indigo-600 tracking-tight"
            >
              Hospeda Smart
            </motion.h1>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {filteredMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id as Page)}
              className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 ${
                currentPage === item.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 translate-x-1' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <item.icon size={22} className={currentPage === item.id ? 'mr-3' : isSidebarOpen ? 'mr-3' : 'mx-auto'} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
              {isSidebarOpen && currentPage === item.id && <ChevronRight size={16} className="ml-auto" />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut size={22} className={isSidebarOpen ? 'mr-3' : 'mx-auto'} />
            {isSidebarOpen && <span className="font-medium">Sair</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Topbar */}
        <header className="h-16 bg-white border-bottom border-slate-200 flex items-center justify-end px-8 shadow-sm z-10">
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-bold text-slate-800">{user.full_name}</p>
              <p className="text-xs text-slate-500 font-medium">{user.role}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border-2 border-indigo-200">
              {user.full_name.charAt(0)}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
