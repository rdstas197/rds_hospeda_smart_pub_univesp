import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Room, Reservation, Profile } from '../types';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Bed,
  CheckCircle2,
  XCircle,
  Hash,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO,
  isWithinInterval,
  startOfDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import GeminiAssistant from '../components/GeminiAssistant';

export default function HomePage({ user }: { user: Profile }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isRealTime, setIsRealTime] = useState(true);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDateCal = startOfWeek(monthStart);
  const endDateCal = endOfWeek(monthEnd);

  const fetchData = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    
    // Calculate range to cover both the calendar and the custom inputs
    const queryStartDate = startDate < format(startDateCal, 'yyyy-MM-dd') ? startDate : format(startDateCal, 'yyyy-MM-dd');
    const queryEndDate = endDate > format(endDateCal, 'yyyy-MM-dd') ? endDate : format(endDateCal, 'yyyy-MM-dd');

    try {
      // Fetch all rooms
      const { data: roomsData } = await supabase.from('rooms').select('*').order('room_number');
      if (roomsData) setRooms(roomsData);

      // Fetch reservations that overlap with the selected period
      const { data: resData } = await supabase
        .from('reservations')
        .select('*, client:clients(*), room:rooms(*)')
        .neq('status', 'Finalizada')
        .or(`and(check_in_date.lte.${queryEndDate},check_out_date.gte.${queryStartDate})`);
      
      if (resData) setReservations(resData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, startDateCal, endDateCal]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    // Real-time subscription for reservations
    const channel = supabase
      .channel('reservations_realtime_home')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => {
          fetchData(true); // Silent update for real-time changes
          // If we are in "Real-Time" mode, we want to ensure the view is fresh
          if (isRealTime) {
            setSelectedDay(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, isRealTime]);
  const calendarDays = eachDayOfInterval({
    start: startDateCal,
    end: endDateCal,
  });

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
    setIsRealTime(false);
  };
  const prevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
    setIsRealTime(false);
  };

  const getReservationsForDay = (day: Date) => {
    return reservations.filter(res => {
      const start = parseISO(res.check_in_date);
      const end = parseISO(res.check_out_date);
      return isWithinInterval(startOfDay(day), { start: startOfDay(start), end: startOfDay(end) });
    });
  };

  const getRoomStatus = (room: Room, date: Date = new Date()) => {
    const checkDate = startOfDay(date);
    const activeRes = reservations.find(res => {
      if (res.room_id !== room.id) return false;
      const start = parseISO(res.check_in_date);
      const end = parseISO(res.check_out_date);
      return isWithinInterval(checkDate, { start: startOfDay(start), end: startOfDay(end) });
    });

    if (activeRes) {
      return { status: activeRes.status === 'Iniciada' ? 'Ocupado' : 'Reservado', resId: activeRes.id.substring(0, 8) };
    }
    return { status: 'Disponível', resId: null };
  };

  const filteredRooms = selectedDay 
    ? rooms.filter(room => getRoomStatus(room, selectedDay).status !== 'Disponível')
    : rooms;

  return (
    <div className="space-y-6 min-h-full flex flex-col pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Painel de Controle</h1>
          <p className="text-xs md:text-sm text-slate-500">Visão geral das reservas e ocupação</p>
        </div>
        
        <div className="flex items-center space-x-4 w-full md:w-auto">
          <button 
            onClick={() => {
              // This will be handled by the GeminiAssistant component
              // For now, we can just open it
              const event = new CustomEvent('open-gemini-assistant', { 
                detail: { prompt: "Analise a ocupação atual do hotel e me dê 3 insights rápidos." } 
              });
              window.dispatchEvent(event);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-all font-bold text-sm"
          >
            <Sparkles size={16} />
            <span className="hidden sm:inline">Insights IA</span>
          </button>
          
          <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200 w-full md:w-auto overflow-x-auto">
            <CalendarIcon size={18} className="text-slate-400 flex-shrink-0 ml-2" />
            <div className="flex items-center space-x-2 whitespace-nowrap">
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-xs md:text-sm font-medium text-slate-700 p-0"
              />
              <span className="text-slate-400 text-xs">até</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-xs md:text-sm font-medium text-slate-700 p-0"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Section */}
        <div className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base md:text-lg font-bold text-slate-800 capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <div className="flex space-x-2">
              <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ChevronLeft size={20} />
              </button>
              <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto p-2 md:p-4">
            <div className="min-w-[600px] lg:min-w-0 grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="bg-slate-50 p-2 text-center text-[10px] md:text-xs font-bold text-slate-500 uppercase">
                  {day}
                </div>
              ))}
              {calendarDays.map((day, idx) => {
                const dayReservations = getReservationsForDay(day);
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDay && isSameDay(day, selectedDay);

                return (
                  <div 
                    key={idx} 
                    onClick={() => {
                      setSelectedDay(isSelected ? null : day);
                      setIsRealTime(isSelected);
                    }}
                    className={`min-h-[80px] md:min-h-[120px] p-1 md:p-2 bg-white flex flex-col space-y-1 cursor-pointer transition-all ${
                      !isCurrentMonth ? 'opacity-40' : ''
                    } ${isSelected ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-50/30' : 'hover:bg-slate-50'}`}
                  >
                    <div className={`text-right text-xs md:text-sm font-bold mb-1 ${
                      isToday ? 'text-indigo-600' : isSelected ? 'text-indigo-700' : 'text-slate-400'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar max-h-[60px] md:max-h-none">
                      {dayReservations.map(res => (
                        <div 
                          key={res.id} 
                          className={`text-[8px] md:text-[10px] px-1 py-0.5 rounded font-bold truncate border ${
                            res.status === 'Iniciada' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                          }`}
                          title={`${res.room?.room_number} - ${res.client?.full_name}`}
                        >
                          Qto: {res.room?.room_number}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Room List Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden h-[500px] lg:h-auto">
          <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-800">Status dos Quartos</h2>
              <p className="text-[10px] md:text-xs text-slate-500">
                Situação atual em tempo real / Conforme seleção de data no calendário
              </p>
            </div>
            <button 
              onClick={() => {
                setSelectedDay(null);
                setIsRealTime(true);
                setCurrentDate(new Date());
                fetchData();
              }}
              disabled={loading}
              className={`p-2 rounded-xl transition-all ${isRealTime ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-100 hover:text-indigo-600'} disabled:opacity-50`}
              title="Atualizar em tempo real"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : isRealTime ? 'animate-pulse' : ''} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {filteredRooms.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm">Nenhum quarto reservado para este dia.</p>
              </div>
            ) : filteredRooms.map(room => {
              const { status, resId } = getRoomStatus(room, selectedDay || new Date());
              return (
                <div key={room.id} className="p-3 md:p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-600">
                        <Bed size={16} className="md:w-5 md:h-5" />
                      </div>
                      <div>
                        <p className="text-xs md:text-sm font-bold text-slate-800">Quarto {room.room_number}</p>
                        <p className="text-[9px] md:text-[10px] text-slate-400 uppercase font-bold tracking-wider">{room.room_type}</p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-wider ${
                      status === 'Ocupado' ? 'bg-red-50 text-red-600' : 
                      status === 'Reservado' ? 'bg-indigo-50 text-indigo-600' :
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {status}
                    </div>
                  </div>
                  {(status === 'Ocupado' || status === 'Reservado') && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center text-[9px] md:text-[10px] text-slate-500 font-medium">
                      <Hash size={12} className="mr-1" />
                      Reserva: <span className="ml-1 text-slate-700 font-bold">{resId}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Gemini Assistant */}
      <GeminiAssistant context={{ 
        totalRooms: rooms.length, 
        totalReservations: reservations.length,
        currentDate: format(new Date(), 'yyyy-MM-dd'),
        selectedDay: selectedDay ? format(selectedDay, 'yyyy-MM-dd') : 'Hoje',
        occupancy: rooms.filter(r => getRoomStatus(r, selectedDay || new Date()).status !== 'Disponível').length
      }} />
    </div>
  );
}
