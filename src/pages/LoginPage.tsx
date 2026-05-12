import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Profile } from '../types';
import { LogIn, Hotel } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginPageProps {
  onLogin: (profile: Profile) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Tentando login com:', email);
      const { data, error: supabaseError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

      if (supabaseError || !data) {
        console.error('Erro no login ou usuário não encontrado:', supabaseError);
        setError('E-mail ou senha incorretos.');
      } else {
        console.log('Login bem-sucedido:', data);
        onLogin(data);
      }
    } catch (err) {
      console.error('Erro inesperado no login:', err);
      setError('Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-600 text-white shadow-2xl shadow-indigo-200 mb-4 floating">
            <Hotel size={40} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Hospeda Smart</h1>
          <p className="text-slate-500 mt-2">Gestão hoteleira inteligente</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-red-500 text-sm font-medium"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2 btn-3d disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Entrar no Sistema</span>
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
