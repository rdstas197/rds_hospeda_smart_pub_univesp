import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Rate, Profile } from '../types';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function RatesPage({ user }: { user: Profile }) {
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<Rate | null>(null);
  const [formData, setFormData] = useState<Partial<Rate>>({});

  const canDelete = user.role !== 'Operador 1';
  const canEdit = user.role !== 'Operador 1';

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('rates').select('*').order('description');
    if (!error && data) setRates(data);
    setLoading(false);
  };

  const handleOpenModal = (rate?: Rate) => {
    if (rate) {
      setEditingRate(rate);
      setFormData(rate);
    } else {
      setEditingRate(null);
      setFormData({ status: 'Ativa' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.description || !formData.value || !formData.status) {
      return alert('Descrição, Valor e Status são obrigatórios');
    }

    if (editingRate) {
      const { error } = await supabase.from('rates').update(formData).eq('id', editingRate.id);
      if (error) alert('Erro ao atualizar tarifa');
    } else {
      const { error } = await supabase.from('rates').insert([formData]);
      if (error) alert('Erro ao cadastrar tarifa');
    }
    setIsModalOpen(false);
    fetchRates();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta tarifa?')) return;
    const { error } = await supabase.from('rates').delete().eq('id', id);
    if (error) alert('Erro ao excluir tarifa');
    else fetchRates();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tarifas</h1>
          <p className="text-slate-500">Gerencie os valores de diárias</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 flex items-center space-x-2 btn-3d"
        >
          <Plus size={20} />
          <span>Nova Tarifa</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Descrição</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Valor</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Valor Especial</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Status</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Carregando...</td></tr>
              ) : rates.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Nenhuma tarifa cadastrada.</td></tr>
              ) : rates.map(rate => (
                <tr key={rate.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{rate.description}</td>
                  <td className="px-6 py-4 text-slate-600 font-bold">R$ {rate.value.toFixed(2)}</td>
                  <td className="px-6 py-4 text-emerald-600 font-medium">
                    {rate.special_value ? `R$ ${rate.special_value.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      rate.status === 'Ativa' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {rate.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {canEdit && (
                      <button 
                        onClick={() => handleOpenModal(rate)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                    )}
                    {canDelete && (
                      <button 
                        onClick={() => handleDelete(rate.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
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
                  {editingRate ? 'Editar Tarifa' : 'Nova Tarifa'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nome/Descrição da Tarifa *</label>
                  <input
                    type="text"
                    value={formData.description || ''}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Valor da Tarifa *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.value || ''}
                      onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Valor Especial (Desconto)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.special_value || ''}
                      onChange={e => setFormData({...formData, special_value: e.target.value ? parseFloat(e.target.value) : undefined})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Status *</label>
                  <select
                    value={formData.status || 'Ativa'}
                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="Ativa">Ativa</option>
                    <option value="Inativa">Inativa</option>
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
