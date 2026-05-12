import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Profile, UserRole } from '../types';
import { Plus, Edit2, Trash2, X, Save, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function UsersPage({ user }: { user: Profile }) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [formData, setFormData] = useState<any>({});

  const canEdit = user.role === 'Administrador' || user.role === 'Gestor/Gerente';
  const canDelete = user.role === 'Administrador' || user.role === 'Gestor/Gerente';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('full_name');
    if (!error && data) setUsers(data);
    setLoading(false);
  };

  const handleOpenModal = (u?: Profile) => {
    if (u) {
      setEditingUser(u);
      setFormData(u);
    } else {
      setEditingUser(null);
      setFormData({ role: 'Operador 2' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.full_name || !formData.email || !formData.role || (!editingUser && !formData.password)) {
      return alert('Todos os campos obrigatórios devem ser preenchidos');
    }

    if (editingUser) {
      const { error } = await supabase.from('profiles').update(formData).eq('id', editingUser.id);
      if (error) alert('Erro ao atualizar usuário');
    } else {
      const { error } = await supabase.from('profiles').insert([formData]);
      if (error) alert('Erro ao cadastrar usuário');
    }
    setIsModalOpen(false);
    fetchUsers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este usuário?')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) alert('Erro ao excluir usuário');
    else fetchUsers();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Usuários</h1>
          <p className="text-slate-500">Gerencie as permissões de acesso ao sistema</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 flex items-center space-x-2 btn-3d"
        >
          <Plus size={20} />
          <span>Novo Usuário</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Nome</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">E-mail</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Perfil</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Carregando...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Nenhum usuário cadastrado.</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{u.full_name}</td>
                  <td className="px-6 py-4 text-slate-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Shield size={14} className="text-indigo-500" />
                      <span className="text-sm font-bold text-slate-700">{u.role}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => handleOpenModal(u)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(u.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="text-xl font-bold text-slate-800">
                  {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nome Completo *</label>
                  <input
                    type="text"
                    value={formData.full_name || ''}
                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">E-mail *</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Senha *</label>
                  <input
                    type="password"
                    value={formData.password || ''}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder={editingUser ? 'Deixe em branco para manter' : ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Perfil *</label>
                  <select
                    value={formData.role || 'Operador 2'}
                    onChange={e => setFormData({...formData, role: e.target.value as any})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="Administrador">Administrador</option>
                    <option value="Gestor/Gerente">Gestor/Gerente</option>
                    <option value="Operador 1">Operador 1</option>
                    <option value="Operador 2">Operador 2</option>
                  </select>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end space-x-4">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 flex items-center space-x-2 btn-3d"
                >
                  <Save size={20} />
                  <span>Salvar</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
