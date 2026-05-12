import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Reservation, Client, Room, Rate, Profile, Product, Consumption } from '../types';
import { 
  Plus, Edit2, Trash2, X, Save, Search, 
  CheckCircle2, LogOut, ShoppingCart, FileText, 
  ChevronRight, Calendar, User, Bed, DollarSign 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, differenceInDays, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReservationsPage({ user }: { user: Profile }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Reservation>>({
    status: 'Gerada',
    is_corporate: false
  });
  const [searchClient, setSearchClient] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [rates, setRates] = useState<Rate[]>([]);
  
  // Consumption state
  const [isConsumptionModalOpen, setIsConsumptionModalOpen] = useState(false);
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
  const [consumptions, setConsumptions] = useState<Consumption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [consumptionQty, setConsumptionQty] = useState(1);

  // Checkout state
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('Todas');

  const canDelete = (res: Reservation) => {
    if (user.role === 'Operador 1') return false;
    return res.status === 'Gerada';
  };

  const canEdit = (res: Reservation) => {
    if (res.status === 'Finalizada') return false;
    if (user.role === 'Operador 1' && res.status === 'Iniciada') return false;
    return true;
  };

  useEffect(() => {
    fetchReservations();
    fetchRates();
    fetchProducts();
  }, []);

  const fetchReservations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reservations')
      .select('*, client:clients(*), room:rooms(*), rate:rates(*)')
      .order('created_at', { ascending: false });
    if (!error && data) setReservations(data);
    setLoading(false);
  };

  const fetchRates = async () => {
    const { data } = await supabase.from('rates').select('*').eq('status', 'Ativa');
    if (data) setRates(data);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*');
    if (data) setProducts(data);
  };

  const handleSearchClient = async () => {
    if (!searchClient) return;
    const { data } = await supabase
      .from('clients')
      .select('*')
      .ilike('full_name', `%${searchClient}%`);
    if (data) setClients(data);
  };

  const handleSearchRooms = async () => {
    if (!formData.check_in_date || !formData.check_out_date) return alert('Informe o período primeiro');
    
    // Buscar quartos que NÃO têm reservas conflitantes
    const { data: busyRooms } = await supabase
      .from('reservations')
      .select('room_id')
      .neq('status', 'Finalizada')
      .or(`and(check_in_date.lte.${formData.check_out_date},check_out_date.gte.${formData.check_in_date})`);
    
    const busyIds = busyRooms?.map(r => r.room_id) || [];
    
    let query = supabase.from('rooms').select('*');
    if (busyIds.length > 0) {
      query = query.not('id', 'in', `(${busyIds.join(',')})`);
    }
    
    const { data } = await query;
    if (data) setRooms(data);
  };

  const handleOpenModal = (res?: Reservation) => {
    if (res) {
      setEditingReservation(res);
      setFormData(res);
      setSelectedClient(res.client || null);
      setSelectedRoom(res.room || null);
    } else {
      setEditingReservation(null);
      setFormData({ status: 'Gerada', is_corporate: false });
      setSelectedClient(null);
      setSelectedRoom(null);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedClient || !selectedRoom || !formData.rate_id || !formData.check_in_date || !formData.check_out_date) {
      return alert('Preencha todos os campos obrigatórios');
    }

    const payload = {
      ...formData,
      client_id: selectedClient.id,
      room_id: selectedRoom.id,
    };

    // Remover campos de relacionamento antes de salvar
    delete (payload as any).client;
    delete (payload as any).room;
    delete (payload as any).rate;

    if (editingReservation) {
      const { error } = await supabase.from('reservations').update(payload).eq('id', editingReservation.id);
      if (error) alert('Erro ao atualizar reserva');
    } else {
      const { error } = await supabase.from('reservations').insert([payload]);
      if (error) alert('Erro ao cadastrar reserva');
    }
    setIsModalOpen(false);
    fetchReservations();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta reserva?')) return;
    const { error } = await supabase.from('reservations').delete().eq('id', id);
    if (error) alert('Erro ao excluir reserva');
    else fetchReservations();
  };

  const generateCheckinPDF = (res: Reservation) => {
    const doc = new jsPDF();
    
    // Header background
    doc.setFillColor(79, 70, 229); // indigo-600
    doc.rect(0, 0, 210, 40, 'F');
    
    // Brand Logo
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(170, 8, 24, 24, 5, 5, 'F');
    doc.setFillColor(79, 70, 229);
    doc.roundedRect(174, 12, 16, 16, 4, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('H', 182, 23, { align: 'center' });

    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Hospeda Smart', 20, 22);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('SISTEMA DE GESTÃO HOTELEIRA', 20, 30);
    
    // Receipt Title
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPROVANTE DE CHECK-IN', 105, 55, { align: 'center' });
    
    // Info Grid
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text('HÓSPEDE', 20, 65);
    doc.text('QUARTO', 100, 65);
    doc.text('RESERVA ID', 140, 65);
    
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(res.client?.full_name || 'N/A', 20, 72);
    doc.text(`#${res.room?.room_number}`, 100, 72);
    doc.text(res.id.substring(0, 8).toUpperCase(), 140, 72);

    // Table for details
    const bodyData = [
      ['Documento/CPF', res.client?.cpf || 'N/A'],
      ['Telefone', res.client?.phone || 'N/A'],
      ['E-mail', res.client?.email || 'N/A'],
      ['Tipo de Quarto', res.room?.room_type || 'N/A'],
      ['Data de Entrada', format(parseISO(res.check_in_date), 'dd/MM/yyyy')],
      ['Saída Prevista', format(parseISO(res.check_out_date), 'dd/MM/yyyy')],
      ['Tarifa Aplicada', `${res.rate?.description} (R$ ${res.rate?.value.toFixed(2)}/noite)`],
    ];

    if (res.is_corporate) {
      bodyData.push(['Empresa', res.corporate_name || 'N/A']);
      bodyData.push(['CNPJ', res.corporate_cnpj || 'N/A']);
      bodyData.push(['Faturamento', res.billing_type || 'N/A']);
    }

    bodyData.push(['Observações', res.observations || 'Nenhuma']);

    autoTable(doc, {
      startY: 80,
      head: [['CAMPO', 'INFORMAÇÃO']],
      body: bodyData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 10, textColor: [51, 65, 85] },
      margin: { left: 20, right: 20 }
    });

    // Signature Area
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    doc.setDrawColor(203, 213, 225);
    doc.line(55, finalY, 155, finalY);
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Assinatura do Hóspede', 105, finalY + 5, { align: 'center' });

    // Footer
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 277, 210, 20, 'F');
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, 288);
    doc.text('Hospeda Smart - Excelência em Hospedagem', 190, 288, { align: 'right' });
    
    doc.save(`checkin_${res.id.substring(0, 8)}.pdf`);
  };

  const generateCheckoutPDF = (res: Reservation, data: any) => {
    const doc = new jsPDF();
    
    // Header background
    doc.setFillColor(79, 70, 229); // indigo-600
    doc.rect(0, 0, 210, 40, 'F');
    
    // Brand Logo
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(170, 8, 24, 24, 5, 5, 'F');
    doc.setFillColor(79, 70, 229);
    doc.roundedRect(174, 12, 16, 16, 4, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('H', 182, 23, { align: 'center' });

    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Hospeda Smart', 20, 22);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('EXTRATO DE ENCERRAMENTO DE ESTADIA', 20, 30);
    
    // Receipt Title
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('EXTRATO DE CHECK-OUT', 105, 55, { align: 'center' });
    
    // Info Grid
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text('HÓSPEDE', 20, 65);
    doc.text('QUARTO', 100, 65);
    doc.text('PERÍODO', 140, 65);
    
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(res.client?.full_name || 'N/A', 20, 72);
    doc.text(`#${res.room?.room_number} (${res.room?.room_type})`, 100, 72);
    doc.text(`${format(parseISO(res.check_in_date), 'dd/MM/yy')} - ${format(parseISO(res.check_out_date), 'dd/MM/yy')}`, 140, 72);

    // Additional Details
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`CPF: ${res.client?.cpf || 'N/A'}`, 20, 80);
    doc.text(`E-mail: ${res.client?.email || 'N/A'}`, 100, 80);
    doc.text(`Telefone: ${res.client?.phone || 'N/A'}`, 140, 80);
    
    // Table
    autoTable(doc, {
      startY: 85,
      head: [['DESCRIÇÃO', 'QTD/DIAS', 'VALOR UNIT.', 'TOTAL']],
      body: [
        ['Diárias de Hospedagem', data.days, `R$ ${data.dailyRate.toFixed(2)}`, `R$ ${data.totalDaily.toFixed(2)}`],
        ...data.consumptions.map((c: any) => [
          c.product?.description,
          c.quantity,
          `R$ ${c.unit_value.toFixed(2)}`,
          `R$ ${(c.quantity * c.unit_value).toFixed(2)}`
        ]),
      ],
      foot: [
        [
          { content: 'VALOR TOTAL DA ESTADIA', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: `R$ ${data.grandTotal.toFixed(2)}`, styles: { halign: 'left', fontStyle: 'bold', fillColor: [79, 70, 229], textColor: [255, 255, 255] } }
        ]
      ],
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 10, textColor: [51, 65, 85] },
      footStyles: { fontSize: 11 },
      margin: { left: 20, right: 20 }
    });

    // Footer
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 277, 210, 20, 'F');
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, 288);
    doc.text('Hospeda Smart - Agradecemos a preferência!', 190, 288, { align: 'right' });
    
    doc.save(`checkout_${res.id.substring(0, 8)}.pdf`);
  };

  const handleCheckin = async (res: Reservation) => {
    const { error } = await supabase.from('reservations').update({ status: 'Iniciada' }).eq('id', res.id);
    if (error) return alert('Erro ao fazer check-in');
    
    generateCheckinPDF(res);
    fetchReservations();
  };

  const handleOpenConsumption = async (res: Reservation) => {
    setActiveReservation(res);
    const { data } = await supabase
      .from('consumption')
      .select('*, product:products(*)')
      .eq('reservation_id', res.id);
    if (data) setConsumptions(data);
    setIsConsumptionModalOpen(true);
  };

  const handleAddConsumption = async () => {
    if (!selectedProduct || !activeReservation) return;
    const { error } = await supabase.from('consumption').insert([{
      reservation_id: activeReservation.id,
      product_id: selectedProduct.id,
      quantity: consumptionQty,
      unit_value: selectedProduct.unit_value
    }]);
    if (error) alert('Erro ao adicionar consumo');
    else handleOpenConsumption(activeReservation);
  };

  const handleDeleteConsumption = async (id: string) => {
    const { error } = await supabase.from('consumption').delete().eq('id', id);
    if (error) alert('Erro ao excluir consumo');
    else handleOpenConsumption(activeReservation!);
  };

  const handleOpenCheckout = async (res: Reservation) => {
    setActiveReservation(res);
    const { data: cons } = await supabase
      .from('consumption')
      .select('*, product:products(*)')
      .eq('reservation_id', res.id);
    
    const days = Math.max(1, differenceInDays(new Date(), parseISO(res.check_in_date)));
    const dailyRate = res.rate?.value || 0;
    const totalDaily = days * dailyRate;
    const totalCons = cons?.reduce((acc, curr) => acc + (curr.quantity * curr.unit_value), 0) || 0;
    const grandTotal = totalDaily + totalCons;

    setCheckoutData({
      days,
      dailyRate,
      totalDaily,
      totalCons,
      grandTotal,
      consumptions: cons || []
    });
    setIsCheckoutModalOpen(true);
  };

  const handleConfirmCheckout = async () => {
    if (!activeReservation) return;
    const { error } = await supabase.from('reservations').update({ status: 'Finalizada' }).eq('id', activeReservation.id);
    if (error) return alert('Erro ao finalizar checkout');

    generateCheckoutPDF(activeReservation, checkoutData);
    setIsCheckoutModalOpen(false);
    fetchReservations();
  };

  const handleReprintCheckin = (res: Reservation) => {
    generateCheckinPDF(res);
  };

  const handleReprintCheckout = async (res: Reservation) => {
    const { data: cons } = await supabase
      .from('consumption')
      .select('*, product:products(*)')
      .eq('reservation_id', res.id);
    
    const days = Math.max(1, differenceInDays(parseISO(res.check_out_date), parseISO(res.check_in_date)));
    const dailyRate = res.rate?.value || 0;
    const totalDaily = days * dailyRate;
    const totalCons = cons?.reduce((acc, curr) => acc + (curr.quantity * curr.unit_value), 0) || 0;
    const grandTotal = totalDaily + totalCons;

    generateCheckoutPDF(res, {
      days,
      dailyRate,
      totalDaily,
      totalCons,
      grandTotal,
      consumptions: cons || []
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reservas</h1>
          <p className="text-slate-500">Controle de estadias e ocupação</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            {['Todas', 'Gerada', 'Iniciada', 'Finalizada'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === status 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {status === 'Todas' ? 'Todas' : status}
              </button>
            ))}
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 flex items-center space-x-2 btn-3d"
          >
            <Plus size={20} />
            <span>Nova Reserva</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Hóspede</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Quarto</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Período</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">Situação</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Carregando...</td></tr>
              ) : reservations.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Nenhuma reserva cadastrada.</td></tr>
              ) : reservations
                  .filter(res => statusFilter === 'Todas' || res.status === statusFilter)
                  .map(res => (
                <tr key={res.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800">{res.client?.full_name}</p>
                    <p className="text-xs text-slate-500">{res.client?.cpf || res.client?.phone}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-indigo-600">#{res.room?.room_number}</p>
                    <p className="text-xs text-slate-500">{res.room?.room_type}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {format(parseISO(res.check_in_date), 'dd/MM/yy')} - {format(parseISO(res.check_out_date), 'dd/MM/yy')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      res.status === 'Gerada' ? 'bg-blue-100 text-blue-600' :
                      res.status === 'Iniciada' ? 'bg-emerald-100 text-emerald-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {res.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      {res.status === 'Gerada' && (
                        <button onClick={() => handleCheckin(res)} title="Check-in" className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><CheckCircle2 size={18} /></button>
                      )}
                      {res.status === 'Iniciada' && (
                        <>
                          <button onClick={() => handleOpenConsumption(res)} title="Consumo" className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"><ShoppingCart size={18} /></button>
                          <button onClick={() => handleOpenCheckout(res)} title="Check-out" className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><LogOut size={18} /></button>
                          <button onClick={() => handleReprintCheckin(res)} title="Reimprimir Check-in" className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><FileText size={18} /></button>
                        </>
                      )}
                      {res.status === 'Finalizada' && (
                        <>
                          <button onClick={() => handleReprintCheckin(res)} title="Reimprimir Check-in" className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><FileText size={18} /></button>
                          <button onClick={() => handleReprintCheckout(res)} title="Reimprimir Checkout" className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><FileText size={18} /></button>
                        </>
                      )}
                      {canEdit(res) && (
                        <button onClick={() => handleOpenModal(res)} title="Editar" className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={18} /></button>
                      )}
                      {canDelete(res) && (
                        <button onClick={() => handleDelete(res.id)} title="Excluir" className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Reserva */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="text-xl font-bold text-slate-800">
                  {editingReservation ? 'Editar Reserva' : 'Nova Reserva'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                {/* Cliente */}
                <section className="space-y-4">
                  <div className="flex items-center space-x-2 text-indigo-600">
                    <User size={20} />
                    <h3 className="font-bold">Dados do Hóspede</h3>
                  </div>
                  <div className="flex space-x-2">
                    <input 
                      type="text" 
                      placeholder="Pesquisar cliente..."
                      value={searchClient}
                      onChange={e => setSearchClient(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button onClick={handleSearchClient} className="bg-slate-100 p-3 rounded-xl hover:bg-slate-200 transition-colors"><Search size={20} /></button>
                  </div>
                  {clients.length > 0 && !selectedClient && (
                    <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-50 shadow-sm">
                      {clients.map(c => (
                        <button key={c.id} onClick={() => setSelectedClient(c)} className="w-full p-3 text-left hover:bg-indigo-50 transition-colors flex justify-between items-center">
                          <span>{c.full_name}</span>
                          <span className="text-xs text-slate-400">{c.cpf || c.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedClient && (
                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-indigo-900">{selectedClient.full_name}</p>
                        <p className="text-sm text-indigo-600">{selectedClient.cpf} | {selectedClient.phone}</p>
                      </div>
                      <button onClick={() => setSelectedClient(null)} className="text-indigo-400 hover:text-indigo-600"><X size={20} /></button>
                    </div>
                  )}
                </section>

                {/* Corporativo */}
                <section className="p-4 bg-slate-50 rounded-2xl space-y-4">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.is_corporate}
                      onChange={e => setFormData({...formData, is_corporate: e.target.checked})}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-bold text-slate-700">Reserva Corporativa</span>
                  </label>
                  {formData.is_corporate && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <input 
                        type="text" placeholder="Razão Social" 
                        value={formData.corporate_name || ''}
                        onChange={e => setFormData({...formData, corporate_name: e.target.value})}
                        className="px-4 py-3 rounded-xl border border-slate-200 outline-none"
                      />
                      <input 
                        type="text" placeholder="CNPJ" 
                        value={formData.corporate_cnpj || ''}
                        onChange={e => setFormData({...formData, corporate_cnpj: e.target.value})}
                        className="px-4 py-3 rounded-xl border border-slate-200 outline-none"
                      />
                      <select 
                        value={formData.billing_type || ''}
                        onChange={e => setFormData({...formData, billing_type: e.target.value})}
                        className="px-4 py-3 rounded-xl border border-slate-200 outline-none bg-white md:col-span-2"
                      >
                        <option value="">Selecione o Faturamento</option>
                        <option value="Imediato">Imediato</option>
                        <option value="Faturamento 10 dias">Faturamento 10 dias</option>
                        <option value="Faturamento 15 dias">Faturamento 15 dias</option>
                        <option value="Faturamento 20 dias">Faturamento 20 dias</option>
                        <option value="Faturamento 30 dias">Faturamento 30 dias</option>
                        <option value="Faturamento 45 dias">Faturamento 45 dias</option>
                      </select>
                    </div>
                  )}
                </section>

                {/* Período e Quarto */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-indigo-600">
                      <Calendar size={20} />
                      <h3 className="font-bold">Período de Estadia</h3>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase">Entrada</label>
                      <input 
                        type="date" 
                        value={formData.check_in_date || ''}
                        onChange={e => setFormData({...formData, check_in_date: e.target.value})}
                        disabled={editingReservation?.status === 'Iniciada'}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none disabled:bg-slate-100 disabled:text-slate-500 cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase">Saída</label>
                      <input 
                        type="date" 
                        value={formData.check_out_date || ''}
                        onChange={e => setFormData({...formData, check_out_date: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-indigo-600">
                      <Bed size={20} />
                      <h3 className="font-bold">Quarto</h3>
                    </div>
                    <button 
                      onClick={handleSearchRooms}
                      className="w-full bg-slate-100 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Search size={18} />
                      <span>Buscar Disponíveis</span>
                    </button>
                    {rooms.length > 0 && !selectedRoom && (
                      <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-50 shadow-sm max-h-40 overflow-y-auto">
                        {rooms.map(r => (
                          <button key={r.id} onClick={() => setSelectedRoom(r)} className="w-full p-3 text-left hover:bg-indigo-50 transition-colors flex justify-between items-center">
                            <span className="font-bold">#{r.room_number}</span>
                            <span className="text-xs text-slate-400">{r.room_type}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedRoom && (
                      <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-indigo-900">Quarto #{selectedRoom.room_number}</p>
                          <p className="text-sm text-indigo-600">{selectedRoom.room_type}</p>
                        </div>
                        <button onClick={() => setSelectedRoom(null)} className="text-indigo-400 hover:text-indigo-600"><X size={20} /></button>
                      </div>
                    )}
                  </div>
                </section>

                {/* Tarifa e Obs */}
                <section className="space-y-4">
                  <div className="flex items-center space-x-2 text-indigo-600">
                    <DollarSign size={20} />
                    <h3 className="font-bold">Tarifa e Observações</h3>
                  </div>
                  <select 
                    value={formData.rate_id || ''}
                    onChange={e => setFormData({...formData, rate_id: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none bg-white"
                  >
                    <option value="">Selecione a Tarifa</option>
                    {rates.map(r => (
                      <option key={r.id} value={r.id}>{r.description} - R$ {r.value.toFixed(2)}</option>
                    ))}
                  </select>
                  <textarea 
                    placeholder="Observações da reserva..."
                    rows={3}
                    value={formData.observations || ''}
                    onChange={e => setFormData({...formData, observations: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none resize-none"
                  />
                </section>
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
                  <span>Salvar Reserva</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Consumo */}
      <AnimatePresence>
        {isConsumptionModalOpen && activeReservation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="text-xl font-bold text-slate-800">Consumo - Quarto #{activeReservation.room?.room_number}</h2>
                <button onClick={() => setIsConsumptionModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="flex space-x-4 items-end bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Produto</label>
                    <select 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none bg-white"
                      onChange={e => setSelectedProduct(products.find(p => p.id === e.target.value) || null)}
                    >
                      <option value="">Selecione um produto</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.description} - R$ {p.unit_value.toFixed(2)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24 space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Qtd</label>
                    <input 
                      type="number" min="1" 
                      value={consumptionQty}
                      onChange={e => setConsumptionQty(parseInt(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none"
                    />
                  </div>
                  <button onClick={handleAddConsumption} className="bg-indigo-600 text-white p-3 rounded-xl shadow-lg shadow-indigo-100 btn-3d"><Plus size={24} /></button>
                </div>

                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Produto</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Qtd</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Vlr Unit</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {consumptions.map(c => (
                        <tr key={c.id}>
                          <td className="px-4 py-3 text-sm font-medium">{c.product?.description}</td>
                          <td className="px-4 py-3 text-sm">{c.quantity}</td>
                          <td className="px-4 py-3 text-sm">R$ {c.unit_value.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => handleDeleteConsumption(c.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Checkout */}
      <AnimatePresence>
        {isCheckoutModalOpen && activeReservation && checkoutData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="text-xl font-bold text-slate-800">Resumo de Checkout</h2>
                <button onClick={() => setIsCheckoutModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hóspede Principal</p>
                    <p className="font-bold text-slate-800">{activeReservation.client?.full_name}</p>
                    <p className="text-xs text-slate-500">{activeReservation.client?.cpf}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Acomodação</p>
                    <p className="font-bold text-slate-800">Quarto #{activeReservation.room?.room_number}</p>
                    <p className="text-xs text-slate-500">{activeReservation.room?.room_type}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Check-in</p>
                    <p className="font-bold text-slate-700">{format(parseISO(activeReservation.check_in_date), 'dd/MM/yyyy')}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Check-out</p>
                    <p className="font-bold text-slate-700">{format(parseISO(activeReservation.check_out_date), 'dd/MM/yyyy')}</p>
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Total Noites</p>
                    <p className="font-bold text-indigo-700">{checkoutData.days} {checkoutData.days === 1 ? 'noite' : 'noites'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <ShoppingCart size={16} className="text-amber-500" />
                      Detalhamento de Consumo
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{checkoutData.consumptions.length} itens</span>
                  </div>
                  
                  {checkoutData.consumptions.length > 0 ? (
                    <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/50">
                          <tr>
                            <th className="px-4 py-2.5 font-bold text-slate-600 text-xs">Produto/Serviço</th>
                            <th className="px-4 py-2.5 font-bold text-slate-600 text-xs text-center">Qtd</th>
                            <th className="px-4 py-2.5 font-bold text-slate-600 text-xs text-right">Unitário</th>
                            <th className="px-4 py-2.5 font-bold text-slate-600 text-xs text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {checkoutData.consumptions.map((c: any) => (
                            <tr key={c.id} className="hover:bg-slate-50/30 transition-colors">
                              <td className="px-4 py-2.5 text-slate-700">{c.product?.description}</td>
                              <td className="px-4 py-2.5 text-slate-600 text-center">{c.quantity}</td>
                              <td className="px-4 py-2.5 text-slate-600 text-right">R$ {c.unit_value.toFixed(2)}</td>
                              <td className="px-4 py-2.5 text-slate-700 font-medium text-right">R$ {(c.quantity * c.unit_value).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-sm text-slate-400">Nenhum consumo registrado para esta estadia.</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                        <Bed size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500">Total de Hospedagem</p>
                        <p className="text-[10px] text-slate-400">{activeReservation.rate?.description} (R$ {activeReservation.rate?.value.toFixed(2)} x {checkoutData.days})</p>
                      </div>
                    </div>
                    <p className="font-bold text-slate-700">R$ {checkoutData.totalDaily.toFixed(2)}</p>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                        <ShoppingCart size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500">Total de Consumo</p>
                        <p className="text-[10px] text-slate-400">Produtos e serviços extras</p>
                      </div>
                    </div>
                    <p className="font-bold text-slate-700">R$ {checkoutData.totalCons.toFixed(2)}</p>
                  </div>

                  <div className="flex justify-between items-center p-6 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-100">
                    <div>
                      <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Valor Total a Pagar</p>
                      <p className="text-sm text-indigo-100 opacity-80">Incluindo taxas e serviços</p>
                    </div>
                    <p className="text-3xl font-black">R$ {checkoutData.grandTotal.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end space-x-4">
                <button onClick={() => setIsCheckoutModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancelar</button>
                <button onClick={handleConfirmCheckout} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 flex items-center space-x-2 btn-3d">
                  <CheckCircle2 size={20} />
                  <span>Concluir Checkout</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
