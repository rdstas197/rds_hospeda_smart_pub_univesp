import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Client, Profile } from '../types';
import { Plus, Edit2, Trash2, Search, X, Save, MapPin, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ClientsPage({ user }: { user: Profile }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [selectedAddressClient, setSelectedAddressClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<Partial<Client>>({});

  const canDelete = user.role !== 'Operador 1';

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('clients').select('*').order('full_name');
    if (!error && data) setClients(data);
    setLoading(false);
  };

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData(client);
    } else {
      setEditingClient(null);
      setFormData({});
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.full_name) return alert('Nome Completo é obrigatório');

    if (editingClient) {
      // Somente campos alterados (simplificado: enviamos tudo que está no formData)
      const { error } = await supabase.from('clients').update(formData).eq('id', editingClient.id);
      if (error) alert('Erro ao atualizar cliente');
    } else {
      const { error } = await supabase.from('clients').insert([formData]);
      if (error) alert('Erro ao cadastrar cliente');
    }
    setIsModalOpen(false);
    fetchClients();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este cliente?')) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) alert('Erro ao excluir cliente');
    else fetchClients();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
          <p className="text-slate-500">Gerencie o cadastro de hóspedes</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 flex items-center space-x-2 btn-3d"
        >
          <Plus size={20} />
          <span>Novo Cliente</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Nome</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">CPF/RG</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Telefone</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">E-mail</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Carregando...</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Nenhum cliente cadastrado.</td></tr>
              ) : clients.map(client => (
                <tr key={client.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">
                    <div className="flex items-center space-x-2">
                      <span>{client.full_name}</span>
                      {client.address_street && (
                        <button 
                          onClick={() => {
                            setSelectedAddressClient(client);
                            setIsAddressModalOpen(true);
                          }}
                          className="text-indigo-500 hover:text-indigo-700 transition-colors p-1 hover:bg-indigo-50 rounded-md"
                          title="Ver endereço"
                        >
                          <MapPin size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{client.cpf || client.rg || '-'}</td>
                  <td className="px-6 py-4 text-slate-600">{client.phone || '-'}</td>
                  <td className="px-6 py-4 text-slate-600">{client.email || '-'}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => handleOpenModal(client)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    {canDelete && (
                      <button 
                        onClick={() => handleDelete(client.id)}
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

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="text-xl font-bold text-slate-800">
                  {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nome Completo *</label>
                  <input
                    type="text"
                    value={formData.full_name || ''}
                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">RG</label>
                  <input
                    type="text"
                    value={formData.rg || ''}
                    onChange={e => setFormData({...formData, rg: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">CPF</label>
                  <input
                    type="text"
                    value={formData.cpf || ''}
                    onChange={e => setFormData({...formData, cpf: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Telefone</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">E-mail</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Logradouro</label>
                  <input
                    type="text"
                    value={formData.address_street || ''}
                    onChange={e => setFormData({...formData, address_street: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Número</label>
                  <input
                    type="text"
                    value={formData.address_number || ''}
                    onChange={e => setFormData({...formData, address_number: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Complemento</label>
                  <input
                    type="text"
                    value={formData.address_complement || ''}
                    onChange={e => setFormData({...formData, address_complement: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Bairro</label>
                  <input
                    type="text"
                    value={formData.address_neighborhood || ''}
                    onChange={e => setFormData({...formData, address_neighborhood: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">CEP</label>
                  <input
                    type="text"
                    value={formData.address_zip || ''}
                    onChange={e => setFormData({...formData, address_zip: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
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
      {/* Modal Endereço */}
      <AnimatePresence>
        {isAddressModalOpen && selectedAddressClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center space-x-2 text-indigo-600">
                  <Home size={20} />
                  <h2 className="text-xl font-bold text-slate-800">Endereço</h2>
                </div>
                <button onClick={() => setIsAddressModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Hóspede</p>
                  <p className="font-bold text-slate-800">{selectedAddressClient.full_name}</p>
                </div>
                <div className="grid grid-cols-1 gap-4 pt-2">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Logradouro</p>
                    <p className="text-slate-700">{selectedAddressClient.address_street}, {selectedAddressClient.address_number}</p>
                    {selectedAddressClient.address_complement && (
                      <p className="text-sm text-slate-500 mt-1">Comp: {selectedAddressClient.address_complement}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Bairro</p>
                      <p className="text-slate-700">{selectedAddressClient.address_neighborhood || '-'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">CEP</p>
                      <p className="text-slate-700">{selectedAddressClient.address_zip || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setIsAddressModalOpen(false)}
                  className="px-8 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
