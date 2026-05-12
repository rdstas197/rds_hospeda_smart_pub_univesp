import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Room, Profile } from '../types';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function RoomsPage({ user }: { user: Profile }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState<Partial<Room>>({});

  const canDelete = user.role !== 'Operador 1';

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('rooms').select('*').order('room_number');
    if (!error && data) setRooms(data);
    setLoading(false);
  };

  const handleOpenModal = (room?: Room) => {
    if (room) {
      setEditingRoom(room);
      setFormData(room);
    } else {
      setEditingRoom(null);
      setFormData({ room_type: 'Standard' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.room_number || !formData.description || !formData.room_type) {
      return alert('Número, Descrição e Tipo são obrigatórios');
    }

    if (editingRoom) {
      const { error } = await supabase.from('rooms').update(formData).eq('id', editingRoom.id);
      if (error) alert('Erro ao atualizar quarto');
    } else {
      const { error } = await supabase.from('rooms').insert([formData]);
      if (error) alert('Erro ao cadastrar quarto');
    }
    setIsModalOpen(false);
    fetchRooms();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este quarto?')) return;
    const { error } = await supabase.from('rooms').delete().eq('id', id);
    if (error) alert('Erro ao excluir quarto');
    else fetchRooms();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quartos</h1>
          <p className="text-slate-500">Gerencie as unidades habitacionais</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 flex items-center space-x-2 btn-3d"
        >
          <Plus size={20} />
          <span>Novo Quarto</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Número</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Descrição</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Tipo</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Carregando...</td></tr>
              ) : rooms.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Nenhum quarto cadastrado.</td></tr>
              ) : rooms.map(room => (
                <tr key={room.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-indigo-600">{room.room_number}</td>
                  <td className="px-6 py-4 text-slate-600">{room.description}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      room.room_type === 'Standard' ? 'bg-slate-100 text-slate-600' :
                      room.room_type === 'Luxo' ? 'bg-amber-100 text-amber-600' :
                      'bg-indigo-100 text-indigo-600'
                    }`}>
                      {room.room_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => handleOpenModal(room)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    {canDelete && (
                      <button 
                        onClick={() => handleDelete(room.id)}
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
                  {editingRoom ? 'Editar Quarto' : 'Novo Quarto'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Número do Quarto *</label>
                    <input
                      type="text"
                      value={formData.room_number || ''}
                      onChange={e => setFormData({...formData, room_number: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo do Quarto *</label>
                    <select
                      value={formData.room_type || 'Standard'}
                      onChange={e => setFormData({...formData, room_type: e.target.value as any})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      <option value="Standard">Standard</option>
                      <option value="Luxo">Luxo</option>
                      <option value="Master">Master</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Descrição do Quarto *</label>
                  <input
                    type="text"
                    value={formData.description || ''}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Observações e Comodidades</label>
                  <textarea
                    rows={3}
                    value={formData.observations || ''}
                    onChange={e => setFormData({...formData, observations: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
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
