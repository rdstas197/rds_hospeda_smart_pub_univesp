import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Product, Profile } from '../types';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ProductsPage({ user }: { user: Profile }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});

  const canDelete = user.role !== 'Operador 1';

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*').order('description');
    if (!error && data) setProducts(data);
    setLoading(false);
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData(product);
    } else {
      setEditingProduct(null);
      setFormData({});
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.description || !formData.unit_value) return alert('Descrição e Valor são obrigatórios');

    if (editingProduct) {
      const { error } = await supabase.from('products').update(formData).eq('id', editingProduct.id);
      if (error) alert('Erro ao atualizar produto');
    } else {
      const { error } = await supabase.from('products').insert([formData]);
      if (error) alert('Erro ao cadastrar produto');
    }
    setIsModalOpen(false);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este produto?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) alert('Erro ao excluir produto');
    else fetchProducts();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Produtos</h1>
          <p className="text-slate-500">Gerencie o estoque e itens de consumo</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 flex items-center space-x-2 btn-3d"
        >
          <Plus size={20} />
          <span>Novo Produto</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Descrição</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Valor Unitário</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">Carregando...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">Nenhum produto cadastrado.</td></tr>
              ) : products.map(product => (
                <tr key={product.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{product.description}</td>
                  <td className="px-6 py-4 text-slate-600">R$ {product.unit_value.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => handleOpenModal(product)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    {canDelete && (
                      <button 
                        onClick={() => handleDelete(product.id)}
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
                  {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Marca/Descrição do Produto *</label>
                  <input
                    type="text"
                    value={formData.description || ''}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Valor Unitário *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.unit_value || ''}
                    onChange={e => setFormData({...formData, unit_value: parseFloat(e.target.value)})}
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
    </div>
  );
}
