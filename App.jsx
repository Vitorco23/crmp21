import React, { useState, useEffect, useRef } from 'react';
import { DndContext, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { 
  Phone, MessageCircle, CalendarCheck, Play, Pause, Settings, BarChart3, 
  Crosshair, Target, RotateCcw, GripVertical, Upload, X, FileText, 
  Trophy, Filter, FileSpreadsheet, LayoutDashboard, Clock, ChevronRight, CheckCircle2, List
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import * as XLSX from 'xlsx';

// --- CUSTOM HOOK: LOCAL STORAGE ---
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(storedValue));
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

// --- DND-KIT COMPONENTS ---
const DraggableCard = ({ lead, onMarkMeeting, onOpenDrawer }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: lead.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div ref={setNodeRef} style={style} className="bg-p21-dark rounded-md mb-2 border border-gray-700 shadow-sm flex flex-col overflow-hidden transition-colors hover:border-gray-500">
      <div className="p-3 pb-2 cursor-pointer flex-1" onClick={() => onOpenDrawer(lead)}>
        <div className="flex justify-between items-start">
          <h4 className="font-bold text-p21-white text-sm truncate pr-2">{lead.company}</h4>
          <span className="text-p21-green text-[10px] shrink-0 tracking-widest">{'★'.repeat(lead.priority)}</span>
        </div>
        <p className="text-gray-400 text-xs mt-1 truncate">{lead.niche} • {lead.city}</p>
      </div>
      
      <div className="flex gap-1 p-2 bg-p21-panel/50 items-center justify-between border-t border-gray-700">
        <div className="flex gap-2 w-full">
          <button className="flex-1 bg-[#25D366] hover:bg-[#1da851] text-white text-[11px] py-1 rounded flex items-center justify-center gap-1"
            onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${lead.phone?.replace(/\D/g, '') || ''}`, '_blank'); }}>
            <MessageCircle size={12} /> WA
          </button>
          <button className="flex-1 bg-p21-green hover:bg-[#85a62b] text-p21-dark font-bold text-[11px] py-1 rounded flex items-center justify-center gap-1"
            onClick={(e) => { e.stopPropagation(); onMarkMeeting(lead.id); }}>
            <CalendarCheck size={12} /> Meet
          </button>
        </div>
        <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing p-1 text-gray-500 hover:text-p21-white ml-1">
          <GripVertical size={16} />
        </div>
      </div>
    </div>
  );
};

const DroppableColumn = ({ id, title, leads, onMarkMeeting, onOpenDrawer }) => {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="bg-p21-panel min-w-[260px] w-[260px] flex flex-col rounded-lg border border-gray-700 h-[calc(100vh-160px)] overflow-hidden">
      <div className="bg-black/20 p-3 border-b border-gray-700 flex justify-between items-center sticky top-0 z-10">
        <h3 className="text-p21-white font-bold text-xs uppercase tracking-wider">{title}</h3>
        <span className="bg-p21-dark px-2 py-0.5 rounded text-p21-green text-xs font-mono">{leads.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 minimal-scrollbar">
        {leads.map(lead => <DraggableCard key={lead.id} lead={lead} onMarkMeeting={onMarkMeeting} onOpenDrawer={onOpenDrawer} />)}
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [activeTab, setActiveTab] = useState('COLD_CALL');
  const [dashTab, setDashTab] = useState('GERAL');
  const fileInputRef = useRef(null);
  
  // Persisted States
  const [leads, setLeads] = useLocalStorage('p21_leads', []);
  const [pomodoroLogs, setPomodoroLogs] = useLocalStorage('p21_logs', []);
  const [strategyParams, setStrategyParams] = useLocalStorage('p21_strategy', {
    meta: 50000, ticket: 5000, diasSemana: 5, horasDia: 8, 
    txCallDecisor: 20, txDecisorMeet: 30, txMeetHeld: 80, txMeetClose: 25
  });

  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

  // Drawer State
  const [selectedLead, setSelectedLead] = useState(null);
  const[isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Timer State (50 Minutos = 3000 segundos)
  const TIMER_DEFAULT = 50 * 60;
  const [timeLeft, setTimeLeft] = useState(TIMER_DEFAULT);
  const [isActive, setIsActive] = useState(false);
  const[showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({ ligacoes: 0, conexoes: 0, decisores: 0, reunioes: 0 });

  const COLUMNS =['Novo Lead', 'T1', 'WhatsApp', 'T2', 'T3', 'T4', 'T5', 'T6'];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Timer Logic
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      setIsActive(false);
      setShowLogModal(true);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => { setIsActive(false); setTimeLeft(TIMER_DEFAULT); };
  const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  const submitLog = (e) => {
    e.preventDefault();
    setPomodoroLogs([...pomodoroLogs, { date: new Date().toISOString(), ...logForm }]);
    setShowLogModal(false);
    resetTimer();
    setLogForm({ ligacoes: 0, conexoes: 0, decisores: 0, reunioes: 0 });
  };

  // Actions
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;
    setLeads(leads.map(l => l.id === active.id ? { ...l, stage: over.id } : l));
  };

  const markMeeting = (id) => {
    setLeads(leads.map(l => l.id === id ? { ...l, stage: 'Oportunidades' } : l));
  };

  const openDrawer = (lead) => {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedLead(null), 300); // Wait for transition
  };

  const updateSelectedLead = (updates) => {
    const updatedLead = { ...selectedLead, ...updates };
    setSelectedLead(updatedLead);
    setLeads(leads.map(l => l.id === updatedLead.id ? updatedLead : l));
  };

  const addLead = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newLead = {
      id: Date.now().toString(), company: formData.get('company'), niche: formData.get('niche'), 
      city: formData.get('city'), priority: 3, stage: 'Novo Lead',
      phone: '', email: '', instagram: '', gmbLink: '', obs: '', icpScore: 3,
      oppValue: strategyParams.ticket, proposalDate: '', meetingNotes: '', objections: ''
    };
    setLeads([newLead, ...leads]);
    e.target.reset();
  };

  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const rows = jsonData.slice(1).filter(row => row.length > 0 && row[0]);

        const importedLeads = rows.map((row, index) => ({
          id: `${Date.now()}-${index}`, 
          company: row[0] ? String(row[0]).trim() : 'Desconhecido', 
          niche: row[1] ? String(row[1]).trim() : 'Geral', 
          city: row[2] ? String(row[2]).trim() : '-', 
          priority: parseInt(row[3]) || 3, 
          phone: row[4] ? String(row[4]).trim() : '', 
          email: row[5] ? String(row[5]).trim() : '',
          stage: 'Novo Lead', obs: '', icpScore: 3,
          oppValue: strategyParams.ticket, meetingNotes: '', objections: ''
        }));
        setLeads(prev => [...importedLeads, ...prev]);
        alert(`🔥 ${importedLeads.length} leads importados com sucesso!`);
      } catch (error) {
        alert('Erro ao ler planilha. O formato deve ser Empresa, Nicho, Cidade, Prioridade, Telefone, Email.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Math & Strategy (Pro)
  const horasMes = strategyParams.diasSemana * 4.3 * strategyParams.horasDia;
  const valorHora = strategyParams.meta / (horasMes || 1);
  const valorMinuto = valorHora / 60;

  const vendasNecessarias = strategyParams.meta / (strategyParams.ticket || 1);
  const reunioesRealizadas = vendasNecessarias / ((strategyParams.txMeetClose || 1) / 100);
  const reunioesAgendadas = reunioesRealizadas / ((strategyParams.txMeetHeld || 1) / 100);
  const decisores = reunioesAgendadas / ((strategyParams.txDecisorMeet || 1) / 100);
  const ligacoes = decisores / ((strategyParams.txCallDecisor || 1) / 100);

  const filteredLogs = pomodoroLogs.filter(log => {
    if (!dateFilter.start && !dateFilter.end) return true;
    const logDate = new Date(log.date).getTime();
    const start = dateFilter.start ? new Date(dateFilter.start).getTime() : 0;
    const end = dateFilter.end ? new Date(dateFilter.end).setHours(23,59,59,999) : Infinity;
    return logDate >= start && logDate <= end;
  });

  // Funnel Analytics
  const maxFunnelCount = Math.max(...COLUMNS.map(c => leads.filter(l => l.stage === c).length), 1);

  return (
    <div className="h-screen w-screen bg-[#0f172a] text-p21-white font-sans overflow-hidden flex flex-col relative">
      
      {/* 1. HEADER FIXO ROBUSTO */}
      <header className="h-16 bg-[#152039] border-b border-gray-700 flex items-center justify-between px-6 shrink-0 z-40">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-black tracking-widest text-white">
            PERFORM<span className="text-p21-green">21</span>
          </h1>
          <nav className="flex gap-2">
            {[
              { id: 'DASHBOARD', icon: LayoutDashboard, label: 'Dashboard' },
              { id: 'COLD_CALL', icon: Phone, label: 'Cold Call' },
              { id: 'OPORTUNIDADES', icon: Trophy, label: 'Oportunidades' },
              { id: 'ESTRATEGIA', icon: Target, label: 'Estratégia' }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === tab.id ? 'bg-p21-green text-[#152039] shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Cold Call Timer Header */}
        <div className="flex items-center gap-3 bg-[#0a0f1d] px-4 py-1.5 rounded-lg border border-gray-700 shadow-inner">
          <div className="flex flex-col items-end mr-2">
            <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Foco Profundo</span>
            <span className={`text-xl font-mono font-black tracking-widest ${isActive ? 'text-p21-green' : 'text-white'}`}>{formatTime(timeLeft)}</span>
          </div>
          <button onClick={toggleTimer} className={`p-2 rounded-md ${isActive ? 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-p21-green hover:bg-[#85a62b] text-[#152039]'}`}>
            {isActive ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button onClick={resetTimer} className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white transition-colors">
            <RotateCcw size={16} />
          </button>
        </div>
      </header>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 overflow-hidden flex flex-col p-4">
        
        {/* ABA: COLD CALL */}
        {activeTab === 'COLD_CALL' && (
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h2 className="text-lg font-bold text-p21-green flex items-center gap-2"><Phone size={18} /> Funil de Prospecção</h2>
              
              <div className="flex gap-3 items-center">
                <input type="file" accept=".csv, .xlsx, .xls" ref={fileInputRef} className="hidden" onChange={handleFileImport} />
                <button onClick={() => fileInputRef.current.click()} className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 font-bold rounded text-xs flex items-center gap-2 border border-gray-600 transition-colors">
                  <FileSpreadsheet size={14} /> Importar Base
                </button>
                
                <form onSubmit={addLead} className="flex gap-2 bg-[#1e2b4d] p-1.5 rounded-lg border border-gray-700">
                  <input required name="company" placeholder="Empresa" className="bg-[#152039] border border-gray-600 px-3 py-1.5 rounded text-xs outline-none text-white w-40 focus:border-p21-green" />
                  <input required name="niche" placeholder="Nicho" className="bg-[#152039] border border-gray-600 px-3 py-1.5 rounded text-xs outline-none text-white w-28 focus:border-p21-green" />
                  <input required name="city" placeholder="Cidade" className="bg-[#152039] border border-gray-600 px-3 py-1.5 rounded text-xs outline-none text-white w-28 focus:border-p21-green" />
                  <button type="submit" className="bg-p21-green text-[#152039] px-4 font-black rounded text-xs uppercase hover:bg-[#85a62b]">+ Lead</button>
                </form>
              </div>
            </div>
            
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className="flex gap-4 overflow-x-auto overflow-y-hidden flex-1 items-start minimal-scrollbar pb-2">
                {COLUMNS.map(col => (
                  <DroppableColumn key={col} id={col} title={col} 
                    onMarkMeeting={markMeeting} onOpenDrawer={openDrawer}
                    leads={leads.filter(l => l.stage === col)} />
                ))}
              </div>
            </DndContext>
          </div>
        )}

        {/* ABA: OPORTUNIDADES */}
        {activeTab === 'OPORTUNIDADES' && (
          <div className="flex-1 overflow-auto minimal-scrollbar">
            <h2 className="text-lg font-bold text-p21-green flex items-center gap-2 mb-6"><Trophy size={18} /> Pipeline de Fechamento</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {leads.filter(l => l.stage === 'Oportunidades').map(lead => (
                <div key={lead.id} className="bg-[#1e2b4d] p-4 rounded-xl border border-gray-700 flex flex-col relative group hover:border-p21-green transition-colors cursor-pointer" onClick={() => openDrawer(lead)}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-base text-white truncate pr-2">{lead.company}</h3>
                    <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded font-mono font-bold shrink-0">
                      R$ {lead.oppValue || 0}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-4 flex items-center gap-1"><Crosshair size={12}/> {lead.niche}</p>
                  
                  <div className="mt-auto pt-3 border-t border-gray-700 flex items-center justify-between text-xs">
                    <span className="text-gray-400">Proposta:</span>
                    <span className="text-white font-mono">{lead.proposalDate ? new Date(lead.proposalDate).toLocaleDateString() : 'A Definir'}</span>
                  </div>
                </div>
              ))}
              {leads.filter(l => l.stage === 'Oportunidades').length === 0 && (
                <div className="col-span-full py-10 text-center text-gray-500 border-2 border-dashed border-gray-700 rounded-xl">
                  Nenhuma oportunidade ativa. Continue prospectando.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA: ESTRATÉGIA PRO */}
        {activeTab === 'ESTRATEGIA' && (
          <div className="h-full flex flex-col overflow-y-auto minimal-scrollbar pr-2">
            <h2 className="text-lg font-bold text-p21-green flex items-center gap-2 mb-6 shrink-0"><Target size={18} /> Engenharia Reversa (Máquina de Vendas)</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">
              
              {/* Painel Esquerdo: Inputs Financeiros e de Tempo */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="bg-[#1e2b4d] p-6 rounded-xl border border-gray-700">
                  <h3 className="font-bold text-white mb-4 border-b border-gray-700 pb-2 flex items-center gap-2"><CheckCircle2 size={16} className="text-p21-green"/> Base Financeira</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wider">Meta de Faturamento (R$)</label>
                      <input type="number" value={strategyParams.meta} onChange={e => setStrategyParams({...strategyParams, meta: Number(e.target.value)})} className="w-full bg-[#152039] border border-gray-600 p-2 rounded text-p21-green font-bold text-lg focus:border-p21-green outline-none mt-1" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wider">Ticket Médio (R$)</label>
                      <input type="number" value={strategyParams.ticket} onChange={e => setStrategyParams({...strategyParams, ticket: Number(e.target.value)})} className="w-full bg-[#152039] border border-gray-600 p-2 rounded text-white font-bold text-lg focus:border-p21-green outline-none mt-1" />
                    </div>
                  </div>
                </div>

                <div className="bg-[#1e2b4d] p-6 rounded-xl border border-gray-700">
                  <h3 className="font-bold text-white mb-4 border-b border-gray-700 pb-2 flex items-center gap-2"><Clock size={16} className="text-p21-green"/> Gestão de Tempo</h3>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wider">Dias / Sem</label>
                      <input type="number" max="7" value={strategyParams.diasSemana} onChange={e => setStrategyParams({...strategyParams, diasSemana: Number(e.target.value)})} className="w-full bg-[#152039] border border-gray-600 p-2 rounded text-white focus:border-p21-green outline-none mt-1" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wider">Horas / Dia</label>
                      <input type="number" max="24" value={strategyParams.horasDia} onChange={e => setStrategyParams({...strategyParams, horasDia: Number(e.target.value)})} className="w-full bg-[#152039] border border-gray-600 p-2 rounded text-white focus:border-p21-green outline-none mt-1" />
                    </div>
                  </div>
                  <div className="bg-[#152039] p-4 rounded-lg border border-gray-700 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">Seu Valor / Hora</p>
                      <p className="text-xl font-black text-p21-green">{valorHora.toLocaleString('pt-BR', {style: 'currency', currency:'BRL'})}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 uppercase">Seu Valor / Min</p>
                      <p className="text-lg font-bold text-white">{valorMinuto.toLocaleString('pt-BR', {style: 'currency', currency:'BRL'})}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Painel Central: Taxas de Conversão (Sliders) */}
              <div className="lg:col-span-4 bg-[#1e2b4d] p-6 rounded-xl border border-gray-700">
                <h3 className="font-bold text-white mb-6 border-b border-gray-700 pb-2">Taxas de Conversão (%)</h3>
                <div className="space-y-6">
                  {[
                    { key: 'txCallDecisor', label: 'Ligação → Decisor' },
                    { key: 'txDecisorMeet', label: 'Decisor → Agendamento' },
                    { key: 'txMeetHeld', label: 'Agendamento → Reunião Realizada' },
                    { key: 'txMeetClose', label: 'Reunião Realizada → Venda' }
                  ].map(slider => (
                    <div key={slider.key}>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-gray-300">{slider.label}</span>
                        <span className="font-bold text-p21-green">{strategyParams[slider.key]}%</span>
                      </div>
                      <input type="range" min="1" max="100" value={strategyParams[slider.key]} 
                        onChange={e => setStrategyParams({...strategyParams,[slider.key]: Number(e.target.value)})}
                        className="w-full accent-p21-green h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Painel Direito: Funil de Esforço Necessário */}
              <div className="lg:col-span-4 bg-[#1e2b4d] p-6 rounded-xl border border-p21-green shadow-[0_0_15px_rgba(154,189,51,0.1)] flex flex-col">
                <h3 className="font-bold text-p21-green mb-6 border-b border-gray-700 pb-2">Volume Mensal Necessário</h3>
                <div className="space-y-4 flex-1 flex flex-col justify-center">
                  <div className="flex justify-between items-center p-3 bg-[#152039] rounded-lg border border-gray-700">
                    <span className="text-sm text-gray-400">Ligações Criadas</span>
                    <span className="text-xl font-black text-white">{Math.ceil(ligacoes)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[#152039] rounded-lg border border-gray-700">
                    <span className="text-sm text-gray-400">Falar com Decisores</span>
                    <span className="text-xl font-black text-white">{Math.ceil(decisores)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[#152039] rounded-lg border border-gray-700 border-l-4 border-l-blue-500">
                    <span className="text-sm text-gray-400">Reuniões Agendadas</span>
                    <span className="text-xl font-black text-white">{Math.ceil(reunioesAgendadas)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[#152039] rounded-lg border border-gray-700 border-l-4 border-l-yellow-500">
                    <span className="text-sm text-gray-400">Reuniões Realizadas</span>
                    <span className="text-xl font-black text-white">{Math.ceil(reunioesRealizadas)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-p21-green rounded-lg text-[#152039]">
                    <span className="text-sm font-bold">Vendas Fechadas</span>
                    <span className="text-2xl font-black">{Math.ceil(vendasNecessarias)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA: DASHBOARD */}
        {activeTab === 'DASHBOARD' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-4 shrink-0 border-b border-gray-700 pb-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><LayoutDashboard size={18} /> Central Analítica</h2>
              <div className="flex gap-2">
                {['GERAL', 'FUNIL', 'POMODORO'].map(t => (
                   <button key={t} onClick={() => setDashTab(t)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${dashTab === t ? 'bg-p21-green text-[#152039]' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                     {t}
                   </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto minimal-scrollbar">
              {/* SUB-ABA: GERAL */}
              {dashTab === 'GERAL' && (
                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-3 grid grid-cols-4 gap-4">
                    <div className="bg-[#1e2b4d] p-5 rounded-xl border border-gray-700">
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Leads Totais</p>
                      <p className="text-3xl font-black text-white">{leads.length}</p>
                    </div>
                    <div className="bg-[#1e2b4d] p-5 rounded-xl border border-gray-700">
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Oportunidades</p>
                      <p className="text-3xl font-black text-p21-green">{leads.filter(l => l.stage === 'Oportunidades').length}</p>
                    </div>
                    <div className="bg-[#1e2b4d] p-5 rounded-xl border border-gray-700">
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Pipeline Previsto (R$)</p>
                      <p className="text-3xl font-black text-white">
                        {leads.filter(l => l.stage === 'Oportunidades').reduce((acc, l) => acc + (Number(l.oppValue) || 0), 0).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="bg-[#1e2b4d] p-5 rounded-xl border border-gray-700">
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Ciclos Realizados</p>
                      <p className="text-3xl font-black text-blue-400">{pomodoroLogs.length}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-ABA: FUNIL */}
              {dashTab === 'FUNIL' && (
                <div className="bg-[#1e2b4d] p-6 rounded-xl border border-gray-700 h-full flex flex-col">
                  <h3 className="font-bold text-white mb-6 text-sm">Distribuição Horizontal de Prospecção</h3>
                  <div className="flex-1 flex flex-col justify-between max-w-4xl w-full mx-auto pb-8">
                    {COLUMNS.map((col, i) => {
                      const count = leads.filter(l => l.stage === col).length;
                      const percent = maxFunnelCount === 0 ? 0 : (count / maxFunnelCount) * 100;
                      return (
                        <div key={col} className="flex items-center gap-4">
                          <div className="w-32 text-right text-xs font-bold text-gray-400">{col}</div>
                          <div className="flex-1 bg-[#152039] h-6 rounded-r-md relative flex items-center border border-gray-700/50">
                            <div className="h-full bg-p21-green rounded-r-md transition-all duration-1000" style={{width: `${percent}%`, opacity: 1 - (i*0.08)}}></div>
                            <span className="absolute left-3 text-xs font-black text-white drop-shadow-md">{count}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* SUB-ABA: POMODORO */}
              {dashTab === 'POMODORO' && (
                <div className="grid grid-cols-2 gap-6 h-full">
                  <div className="bg-[#1e2b4d] p-6 rounded-xl border border-gray-700 flex flex-col">
                    <h3 className="font-bold text-white mb-4 text-sm flex items-center gap-2"><BarChart3 size={16}/> Produtividade por Ciclo</h3>
                    <div className="flex-1 w-full h-full min-h-[300px]">
                      {pomodoroLogs.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={pomodoroLogs.slice(-15).map((log, i) => ({ name: `C${i+1}`, ligacoes: log.ligacoes, decisores: log.decisores }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                            <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#152039', borderColor: '#374151', borderRadius: '8px' }} />
                            <Line type="monotone" dataKey="ligacoes" stroke="#9abd33" strokeWidth={3} dot={{r: 4}} name="Ligações" />
                            <Line type="monotone" dataKey="decisores" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} name="Decisores" />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : <div className="h-full flex items-center justify-center text-gray-500 text-sm">Sem dados de ciclo.</div>}
                    </div>
                  </div>

                  <div className="bg-[#1e2b4d] p-6 rounded-xl border border-gray-700 flex flex-col">
                    <h3 className="font-bold text-white mb-4 text-sm flex items-center gap-2"><List size={16}/> Histórico de Sessões</h3>
                    <div className="flex-1 overflow-y-auto space-y-3 minimal-scrollbar pr-2">
                      {[...pomodoroLogs].reverse().map((log, i) => (
                        <div key={i} className="bg-[#152039] p-4 rounded-lg border border-gray-700 flex justify-between items-center">
                          <div>
                            <p className="text-[10px] text-gray-500 font-mono mb-1">{new Date(log.date).toLocaleString('pt-BR')}</p>
                            <p className="text-sm font-bold text-white">Sessão Finalizada</p>
                          </div>
                          <div className="flex gap-4 text-center">
                            <div><p className="text-xs text-gray-400">Calls</p><p className="font-black text-p21-green">{log.ligacoes}</p></div>
                            <div><p className="text-xs text-gray-400">Decis.</p><p className="font-black text-blue-400">{log.decisores}</p></div>
                            <div><p className="text-xs text-gray-400">Meet</p><p className="font-black text-yellow-400">{log.reunioes}</p></div>
                          </div>
                        </div>
                      ))}
                      {pomodoroLogs.length === 0 && <p className="text-gray-500 text-sm italic">Nenhuma sessão registrada.</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* 2. CRM DRAWER (PAINEL LATERAL DIREITO) */}
      {/* Overlay */}
      {isDrawerOpen && <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity" onClick={closeDrawer}></div>}
      
      {/* Drawer Panel */}
      <div className={`fixed inset-y-0 right-0 w-[450px] bg-[#1e2b4d] border-l border-gray-700 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedLead && (
          <>
            {/* Drawer Header */}
            <div className="p-5 border-b border-gray-700 bg-[#152039] flex justify-between items-start shrink-0">
              <div className="w-full">
                <div className="flex justify-between items-center mb-1">
                  <h2 className="text-xl font-black text-white">{selectedLead.company}</h2>
                  <button onClick={closeDrawer} className="text-gray-400 hover:text-white bg-gray-800 p-1.5 rounded-md"><ChevronRight size={16}/></button>
                </div>
                <div className="flex gap-2 items-center text-xs mt-2">
                  <span className="bg-gray-800 px-2 py-0.5 rounded text-gray-300 border border-gray-700">{selectedLead.stage}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-p21-green font-bold">{selectedLead.niche}</span>
                </div>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 minimal-scrollbar">
              
              {/* Pontuação ICP */}
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2 block">Score ICP (Fit do Cliente)</label>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(star => (
                    <button key={star} onClick={() => updateSelectedLead({icpScore: star})} className={`text-2xl ${star <= (selectedLead.icpScore || 3) ? 'text-p21-green' : 'text-gray-700'} hover:scale-110 transition-transform`}>
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Informações de Contato Rápidas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Telefone / WA</label>
                  <input type="text" value={selectedLead.phone || ''} onChange={e => updateSelectedLead({phone: e.target.value})} className="w-full bg-[#152039] border border-gray-700 rounded p-2 text-xs text-white focus:border-p21-green outline-none" placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">E-mail</label>
                  <input type="email" value={selectedLead.email || ''} onChange={e => updateSelectedLead({email: e.target.value})} className="w-full bg-[#152039] border border-gray-700 rounded p-2 text-xs text-white focus:border-p21-green outline-none" placeholder="contato@empresa.com" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Instagram (@)</label>
                  <input type="text" value={selectedLead.instagram || ''} onChange={e => updateSelectedLead({instagram: e.target.value})} className="w-full bg-[#152039] border border-gray-700 rounded p-2 text-xs text-white focus:border-p21-green outline-none" placeholder="@empresa" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Link GMB</label>
                  <input type="url" value={selectedLead.gmbLink || ''} onChange={e => updateSelectedLead({gmbLink: e.target.value})} className="w-full bg-[#152039] border border-gray-700 rounded p-2 text-xs text-white focus:border-p21-green outline-none" placeholder="https://g.page..." />
                </div>
              </div>

              {/* Bloco Condicional: Se for Oportunidade */}
              {selectedLead.stage === 'Oportunidades' && (
                <div className="bg-p21-green/10 border border-p21-green/30 p-4 rounded-xl space-y-4">
                  <h3 className="font-bold text-p21-green text-sm flex items-center gap-2"><Trophy size={14}/> Detalhes da Oportunidade</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase block mb-1">Valor Previsto (R$)</label>
                      <input type="number" value={selectedLead.oppValue || ''} onChange={e => updateSelectedLead({oppValue: e.target.value})} className="w-full bg-[#152039] border border-p21-green/50 rounded p-2 text-xs text-white outline-none font-mono font-bold" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase block mb-1">Data da Proposta</label>
                      <input type="date" value={selectedLead.proposalDate || ''} onChange={e => updateSelectedLead({proposalDate: e.target.value})} className="w-full bg-[#152039] border border-p21-green/50 rounded p-2 text-xs text-gray-300 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase block mb-1">Objeções Levantadas / Respostas</label>
                    <textarea value={selectedLead.objections || ''} onChange={e => updateSelectedLead({objections: e.target.value})} rows="2" className="w-full bg-[#152039] border border-p21-green/50 rounded p-2 text-xs text-white outline-none resize-none minimal-scrollbar" placeholder="Ex: 'Achei caro' -> Apresentei ROI em 3 meses."></textarea>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase block mb-1">Anotações da Reunião</label>
                    <textarea value={selectedLead.meetingNotes || ''} onChange={e => updateSelectedLead({meetingNotes: e.target.value})} rows="3" className="w-full bg-[#152039] border border-p21-green/50 rounded p-2 text-xs text-white outline-none resize-none minimal-scrollbar" placeholder="Dores do cliente, situação atual, expectativas..."></textarea>
                  </div>
                </div>
              )}

              {/* Observações Gerais do Cold Call */}
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-2 flex items-center gap-1"><FileText size={12}/> Observações de Prospecção</label>
                <textarea value={selectedLead.obs || ''} onChange={e => updateSelectedLead({obs: e.target.value})} rows="6" className="w-full bg-[#152039] border border-gray-700 rounded p-3 text-sm text-gray-200 outline-none focus:border-p21-green resize-none minimal-scrollbar leading-relaxed" placeholder="Registre aqui o log completo de tentativas de ligação, nomes de secretárias, objeções no cold call..."></textarea>
              </div>

            </div>
            
            {/* Drawer Footer */}
            <div className="p-4 border-t border-gray-700 bg-[#152039] flex justify-end shrink-0">
               <button onClick={closeDrawer} className="bg-p21-green hover:bg-[#85a62b] text-[#152039] font-bold px-6 py-2 rounded-md transition-colors text-sm">
                 Salvar e Fechar
               </button>
            </div>
          </>
        )}
      </div>

      {/* POPUP POMODORO (OBRIGATÓRIO FIM DE CICLO) */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
          <form onSubmit={submitLog} className="bg-[#1e2b4d] border-t-4 border-p21-green p-6 rounded-xl shadow-2xl max-w-sm w-full">
            <h2 className="text-xl font-bold text-white mb-2 text-center">Tempo Concluído! 🔥</h2>
            <p className="text-sm text-gray-400 text-center mb-6">O que você produziu nesta sessão de 50 min?</p>
            <div className="space-y-4 mb-6">
              {[
                { key: 'ligacoes', label: '📞 Ligações Realizadas' },
                { key: 'conexoes', label: '🗣️ Conexões (Atendidas)' },
                { key: 'decisores', label: '🎯 Falei com Decisores' },
                { key: 'reunioes', label: '📅 Reuniões Agendadas' }
              ].map(field => (
                <div key={field.key} className="flex justify-between items-center bg-[#152039] p-3 rounded-lg border border-gray-700">
                  <label className="text-xs text-gray-300 font-bold">{field.label}</label>
                  <input type="number" required min="0" value={logForm[field.key]} 
                    onChange={(e) => setLogForm({...logForm,[field.key]: parseInt(e.target.value) || 0})}
                    className="w-16 bg-[#1e2b4d] text-center rounded border border-gray-600 text-white p-1 font-mono text-sm outline-none focus:border-p21-green" />
                </div>
              ))}
            </div>
            <button type="submit" className="w-full bg-p21-green text-[#152039] font-black py-3 rounded-lg hover:bg-[#85a62b] transition-colors">
              Registrar e Descansar
            </button>
          </form>
        </div>
      )}

      {/* CSS Embutido para scrollbars e inputs de range customizados */}
      <style dangerouslySetInnerHTML={{__html: `
        .minimal-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .minimal-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .minimal-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }
        .minimal-scrollbar::-webkit-scrollbar-thumb:hover { background: #9abd33; }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 16px; height: 16px; border-radius: 50%;
          background: #9abd33; cursor: pointer; border: 2px solid #152039;
        }
      `}} />
    </div>
  );
}
