import React, { useState, useEffect, useRef } from 'react';
import { DndContext, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { 
  Phone, MessageCircle, CalendarCheck, Play, Pause, Settings, BarChart3, 
  Crosshair, Target, RotateCcw, GripVertical, FileText, 
  Trophy, FileSpreadsheet, LayoutDashboard, Clock, ChevronRight, CheckCircle2, List
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

export default function App() {
  const [activeTab, setActiveTab] = useState('COLD_CALL');
  const [dashTab, setDashTab] = useState('GERAL');
  const fileInputRef = useRef(null);
  
  const [leads, setLeads] = useLocalStorage('p21_leads', []);
  const [pomodoroLogs, setPomodoroLogs] = useLocalStorage('p21_logs', []);
  const [strategyParams, setStrategyParams] = useLocalStorage('p21_strategy', {
    meta: 50000, ticket: 5000, diasSemana: 5, horasDia: 8, 
    txCallDecisor: 20, txDecisorMeet: 30, txMeetHeld: 80, txMeetClose: 25
  });

  const [dateFilter] = useState({ start: '', end: '' });
  const [selectedLead, setSelectedLead] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const TIMER_DEFAULT = 50 * 60;
  const [timeLeft, setTimeLeft] = useState(TIMER_DEFAULT);
  const [isActive, setIsActive] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({ ligacoes: 0, conexoes: 0, decisores: 0, reunioes: 0 });

  const COLUMNS = ['Novo Lead', 'T1', 'WhatsApp', 'T2', 'T3', 'T4', 'T5', 'T6'];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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
    setTimeout(() => setSelectedLead(null), 300);
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
        alert(`🔥 ${importedLeads.length} leads importados!`);
      } catch (error) {
        alert('Erro ao ler planilha.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const horasMes = strategyParams.diasSemana * 4.3 * strategyParams.horasDia;
  const valorHora = strategyParams.meta / (horasMes || 1);
  const valorMinuto = valorHora / 60;
  const vendasNecessarias = strategyParams.meta / (strategyParams.ticket || 1);
  const reunioesRealizadas = vendasNecessarias / ((strategyParams.txMeetClose || 1) / 100);
  const reunioesAgendadas = reunioesRealizadas / ((strategyParams.txMeetHeld || 1) / 100);
  const decisores = reunioesAgendadas / ((strategyParams.txDecisorMeet || 1) / 100);
  const ligacoes = decisores / ((strategyParams.txCallDecisor || 1) / 100);

  const maxFunnelCount = Math.max(...COLUMNS.map(c => leads.filter(l => l.stage === c).length), 1);

  return (
    <div className="h-screen w-screen bg-[#0f172a] text-p21-white font-sans overflow-hidden flex flex-col relative">
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
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === tab.id ? 'bg-p21-green text-[#152039]' : 'text-gray-400 hover:text-white'}`}>
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 bg-[#0a0f1d] px-4 py-1.5 rounded-lg border border-gray-700 shadow-inner">
          <div className="flex flex-col items-end mr-2">
            <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Foco Profundo</span>
            <span className={`text-xl font-mono font-black tracking-widest ${isActive ? 'text-p21-green' : 'text-white'}`}>{formatTime(timeLeft)}</span>
          </div>
          <button onClick={toggleTimer} className={`p-2 rounded-md ${isActive ? 'bg-red-500 text-white' : 'bg-p21-green text-[#152039]'}`}>
            {isActive ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button onClick={resetTimer} className="p-2 rounded-md bg-gray-700 text-white"><RotateCcw size={16} /></button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col p-4">
        {activeTab === 'COLD_CALL' && (
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h2 className="text-lg font-bold text-p21-green flex items-center gap-2"><Phone size={18} /> Funil de Prospecção</h2>
              <div className="flex gap-3 items-center">
                <input type="file" accept=".csv, .xlsx, .xls" ref={fileInputRef} className="hidden" onChange={handleFileImport} />
                <button onClick={() => fileInputRef.current.click()} className="bg-gray-800 text-white px-3 py-1.5 font-bold rounded text-xs flex items-center gap-2 border border-gray-600"><FileSpreadsheet size={14} /> Importar Base</button>
                <form onSubmit={addLead} className="flex gap-2 bg-[#1e2b4d] p-1.5 rounded-lg border border-gray-700">
                  <input required name="company" placeholder="Empresa" className="bg-[#152039] border border-gray-600 px-3 py-1.5 rounded text-xs outline-none text-white w-40" />
                  <input required name="niche" placeholder="Nicho" className="bg-[#152039] border border-gray-600 px-3 py-1.5 rounded text-xs outline-none text-white w-28" />
                  <input required name="city" placeholder="Cidade" className="bg-[#152039] border border-gray-600 px-3 py-1.5 rounded text-xs outline-none text-white w-28" />
                  <button type="submit" className="bg-p21-green text-[#152039] px-4 font-black rounded text-xs uppercase">+ Lead</button>
                </form>
              </div>
            </div>
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className="flex gap-4 overflow-x-auto overflow-y-hidden flex-1 items-start minimal-scrollbar pb-2">
                {COLUMNS.map(col => (
                  <DroppableColumn key={col} id={col} title={col} onMarkMeeting={markMeeting} onOpenDrawer={openDrawer} leads={leads.filter(l => l.stage === col)} />
                ))}
              </div>
            </DndContext>
          </div>
        )}

        {activeTab === 'OPORTUNIDADES' && (
          <div className="flex-1 overflow-auto minimal-scrollbar">
            <h2 className="text-lg font-bold text-p21-green flex items-center gap-2 mb-6"><Trophy size={18} /> Pipeline de Fechamento</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {leads.filter(l => l.stage === 'Oportunidades').map(lead => (
                <div key={lead.id} className="bg-[#1e2b4d] p-4 rounded-xl border border-gray-700 group hover:border-p21-green cursor-pointer" onClick={() => openDrawer(lead)}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-base text-white truncate pr-2">{lead.company}</h3>
                    <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded font-mono font-bold">R$ {lead.oppValue || 0}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-4 flex items-center gap-1"><Crosshair size={12}/> {lead.niche}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ESTRATEGIA' && (
          <div className="h-full flex flex-col overflow-y-auto minimal-scrollbar pr-2">
            <h2 className="text-lg font-bold text-p21-green flex items-center gap-2 mb-6"><Target size={18} /> Engenharia Reversa</h2>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="bg-[#1e2b4d] p-6 rounded-xl border border-gray-700">
                  <h3 className="font-bold text-white mb-4 border-b border-gray-700 pb-2">Base Financeira</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-gray-400 uppercase">Meta Mensal (R$)</label>
                      <input type="number" value={strategyParams.meta} onChange={e => setStrategyParams({...strategyParams, meta: Number(e.target.value)})} className="w-full bg-[#152039] border border-gray-600 p-2 rounded text-p21-green font-bold outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase">Ticket Médio (R$)</label>
                      <input type="number" value={strategyParams.ticket} onChange={e => setStrategyParams({...strategyParams, ticket: Number(e.target.value)})} className="w-full bg-[#152039] border border-gray-600 p-2 rounded text-white outline-none" />
                    </div>
                  </div>
                </div>
                <div className="bg-[#1e2b4d] p-6 rounded-xl border border-gray-700">
                  <h3 className="font-bold text-white mb-4 border-b border-gray-700 pb-2">Gestão de Tempo</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" value={strategyParams.diasSemana} onChange={e => setStrategyParams({...strategyParams, diasSemana: Number(e.target.value)})} className="bg-[#152039] border border-gray-600 p-2 rounded text-white outline-none" />
                    <input type="number" value={strategyParams.horasDia} onChange={e => setStrategyParams({...strategyParams, horasDia: Number(e.target.value)})} className="bg-[#152039] border border-gray-600 p-2 rounded text-white outline-none" />
                  </div>
                  <div className="mt-4 p-4 bg-[#152039] rounded-lg border border-gray-700 flex justify-between">
                    <p className="text-[10px] text-gray-400 uppercase">Valor Hora</p>
                    <p className="text-lg font-black text-p21-green">{valorHora.toLocaleString('pt-BR', {style: 'currency', currency:'BRL'})}</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 bg-[#1e2b4d] p-6 rounded-xl border border-gray-700">
                <h3 className="font-bold text-white mb-6 border-b border-gray-700 pb-2">Taxas (%)</h3>
                <div className="space-y-6">
                  {['txCallDecisor', 'txDecisorMeet', 'txMeetHeld', 'txMeetClose'].map(k => (
                    <div key={k}>
                      <div className="flex justify-between text-xs mb-2 text-gray-300"><span>{k}</span><span>{strategyParams[k]}%</span></div>
                      <input type="range" min="1" max="100" value={strategyParams[k]} onChange={e => setStrategyParams({...strategyParams, [k]: Number(e.target.value)})} className="w-full accent-p21-green h-2 cursor-pointer" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-4 bg-[#1e2b4d] p-6 rounded-xl border border-p21-green flex flex-col">
                <h3 className="font-bold text-p21-green mb-6 border-b border-gray-700 pb-2">Esforço Necessário</h3>
                <div className="space-y-4">
                  <div className="flex justify-between p-3 bg-[#152039] rounded-lg"><span>Ligações</span><span className="font-black">{Math.ceil(ligacoes)}</span></div>
                  <div className="flex justify-between p-3 bg-p21-green rounded-lg text-[#152039] font-bold"><span>Vendas</span><span className="text-2xl font-black">{Math.ceil(vendasNecessarias)}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'DASHBOARD' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex justify-between mb-4 shrink-0 border-b border-gray-700 pb-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><LayoutDashboard size={18} /> Central Analítica</h2>
              <div className="flex gap-2">
                {['GERAL', 'FUNIL', 'POMODORO'].map(t => (
                  <button key={t} onClick={() => setDashTab(t)} className={`px-4 py-1.5 text-xs font-bold rounded-md ${dashTab === t ? 'bg-p21-green text-[#152039]' : 'bg-gray-800 text-gray-400'}`}>{t}</button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto minimal-scrollbar">
              {dashTab === 'GERAL' && (
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-[#1e2b4d] p-5 rounded-xl border border-gray-700">
                    <p className="text-[10px] text-gray-400 uppercase mb-1">Leads Totais</p>
                    <p className="text-3xl font-black text-white">{leads.length}</p>
                  </div>
                  <div className="bg-[#1e2b4d] p-5 rounded-xl border border-gray-700">
                    <p className="text-[10px] text-gray-400 uppercase mb-1">Oportunidades</p>
                    <p className="text-3xl font-black text-p21-green">{leads.filter(l => l.stage === 'Oportunidades').length}</p>
                  </div>
                </div>
              )}

              {dashTab === 'FUNIL' && (
                <div className="bg-[#1e2b4d] p-6 rounded-xl border border-gray-700 h-full">
                  <div className="flex-1 flex flex-col justify-between max-w-4xl mx-auto pb-8">
                    {COLUMNS.map((col, i) => {
                      const count = leads.filter(l => l.stage === col).length;
                      const percent = maxFunnelCount === 0 ? 0 : (count / maxFunnelCount) * 100;
                      return (
                        <div key={col} className="flex items-center gap-4">
                          <div className="w-32 text-right text-xs font-bold text-gray-400">{col}</div>
                          <div className="flex-1 bg-[#152039] h-6 rounded-r-md border border-gray-700/50">
                            <div className="h-full bg-p21-green rounded-r-md" style={{width: `${percent}%`, opacity: 1 - (i*0.08)}}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {dashTab === 'POMODORO' && (
                <div className="grid grid-cols-2 gap-6 h-full">
                  <div className="bg-[#1e2b4d] p-6 rounded-xl border border-gray-700 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={pomodoroLogs.slice(-15).map((log, i) => ({ name: `C${i+1}`, ligacoes: log.ligacoes }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis dataKey="name" stroke="#6b7280" fontSize={10} />
                        <YAxis stroke="#6b7280" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#152039', borderColor: '#374151' }} />
                        <Line type="monotone" dataKey="ligacoes" stroke="#9abd33" strokeWidth={3} dot={{r: 4}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {isDrawerOpen && <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={closeDrawer}></div>}
      <div className={`fixed inset-y-0 right-0 w-[450px] bg-[#1e2b4d] border-l border-gray-700 shadow-2xl z-50 transform transition-transform duration-300 ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedLead && (
          <div className="flex flex-col h-full">
            <div className="p-5 border-b border-gray-700 bg-[#152039] flex justify-between items-start">
              <div><h2 className="text-xl font-black text-white">{selectedLead.company}</h2></div>
              <button onClick={closeDrawer} className="text-gray-400 hover:text-white bg-gray-800 p-1.5 rounded-md"><ChevronRight size={16}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 minimal-scrollbar text-xs">
              <div><label className="text-gray-400 uppercase block mb-1">Telefone</label>
                <input type="text" value={selectedLead.phone || ''} onChange={e => updateSelectedLead({phone: e.target.value})} className="w-full bg-[#152039] border border-gray-700 rounded p-2 text-white outline-none" />
              </div>
              <div><label className="text-gray-400 uppercase block mb-1">Observações</label>
                <textarea value={selectedLead.obs || ''} onChange={e => updateSelectedLead({obs: e.target.value})} rows="8" className="w-full bg-[#152039] border border-gray-700 rounded p-3 text-white outline-none resize-none" />
              </div>
            </div>
          </div>
        )}
      </div>

      {showLogModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
          <form onSubmit={submitLog} className="bg-[#1e2b4d] border-t-4 border-p21-green p-6 rounded-xl shadow-2xl max-w-sm w-full">
            <h2 className="text-xl font-bold text-white mb-6 text-center">Fim da Sessão 🔥</h2>
            <div className="space-y-4 mb-6">
              {['ligacoes', 'conexoes', 'decisores', 'reunioes'].map(k => (
                <div key={k} className="flex justify-between items-center bg-[#152039] p-3 rounded-lg border border-gray-700">
                  <label className="text-xs text-gray-300 font-bold capitalize">{k}</label>
                  <input type="number" required value={logForm[k]} onChange={e => setLogForm({...logForm, [k]: parseInt(e.target.value) || 0})} className="w-16 bg-[#1e2b4d] text-center rounded border border-gray-600 text-white p-1 outline-none" />
                </div>
              ))}
            </div>
            <button type="submit" className="w-full bg-p21-green text-[#152039] font-black py-3 rounded-lg">Salvar Sessão</button>
          </form>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .minimal-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .minimal-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }
        .minimal-scrollbar::-webkit-scrollbar-thumb:hover { background: #9abd33; }
      `}} />
    </div>
  );
}
