import React, { useState, useEffect, useRef } from 'react';
import { DndContext, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { 
  Phone, MessageCircle, CalendarCheck, Play, Pause, Settings, BarChart3, 
  Crosshair, Target, StopCircle, GripVertical, Upload, X, FileText, Link as LinkIcon, 
  Trophy, Filter
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
  },[key, storedValue]);

  return [storedValue, setStoredValue];
}

// --- DND-KIT COMPONENTS ---
const DraggableCard = ({ lead, onMarkMeeting, onOpenModal }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: lead.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div ref={setNodeRef} style={style} className="bg-p21-dark rounded-md mb-2 border border-gray-700 shadow-sm flex flex-col overflow-hidden transition-colors hover:border-gray-500">
      
      {/* Área clicável para abrir o Modal */}
      <div className="p-3 pb-2 cursor-pointer flex-1" onClick={() => onOpenModal(lead)}>
        <div className="flex justify-between items-start">
          <h4 className="font-bold text-p21-white text-sm truncate pr-2">{lead.company}</h4>
          <span className="text-p21-green text-xs shrink-0">{'★'.repeat(lead.priority)}</span>
        </div>
        <p className="text-gray-400 text-xs mt-1">{lead.niche} • {lead.city}</p>
        {lead.nextStep && (
           <p className="text-[#9abd33] text-[10px] mt-2 font-medium bg-[#9abd33]/10 px-1 py-0.5 rounded truncate">
             → {lead.nextStep}
           </p>
        )}
      </div>
      
      {/* Rodapé com botões e Handle de Arraste isolado para evitar missclicks */}
      <div className="flex gap-1 p-2 bg-p21-panel/50 items-center justify-between border-t border-gray-700">
        <div className="flex gap-2 w-full">
          <button className="flex-1 bg-green-600 hover:bg-green-500 text-white text-[11px] py-1 rounded flex items-center justify-center gap-1"
            onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${lead.phone?.replace(/\D/g, '') || ''}`, '_blank'); }}>
            <MessageCircle size={12} /> WA
          </button>
          <button className="flex-1 bg-p21-green hover:bg-[#85a62b] text-p21-dark font-bold text-[11px] py-1 rounded flex items-center justify-center gap-1"
            onClick={(e) => { e.stopPropagation(); onMarkMeeting(lead.id); }}>
            <CalendarCheck size={12} /> Meet
          </button>
        </div>
        {/* DRAG HANDLE - Somente aqui o card é arrastável */}
        <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing p-1 text-gray-500 hover:text-p21-white ml-1">
          <GripVertical size={16} />
        </div>
      </div>
    </div>
  );
};

const DroppableColumn = ({ id, title, leads, onMarkMeeting, onOpenModal }) => {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="bg-p21-panel min-w-[250px] w-[250px] flex flex-col rounded-lg p-2 h-[calc(100vh-180px)] overflow-y-auto border border-transparent">
      <h3 className="text-p21-white font-bold text-sm mb-3 flex justify-between items-center sticky top-0 bg-p21-panel z-10 pb-2 border-b border-gray-700">
        {title} <span className="bg-p21-dark px-2 py-0.5 rounded text-p21-green text-xs">{leads.length}</span>
      </h3>
      <div className="flex-1">
        {leads.map(lead => <DraggableCard key={lead.id} lead={lead} onMarkMeeting={onMarkMeeting} onOpenModal={onOpenModal} />)}
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [activeTab, setActiveTab] = useState('COLD_CALL');
  const fileInputRef = useRef(null);
  
  // States: Persisted
  const [leads, setLeads] = useLocalStorage('p21_leads', []);
  const[pomodoroLogs, setPomodoroLogs] = useLocalStorage('p21_logs', []);
  const[strategyParams, setStrategyParams] = useLocalStorage('p21_strategy', {
    meta: 50000, ticket: 5000, taxaContato: 20, taxaAgendamento: 10, taxaFechamento: 25, gastoTrafego: 1000, tempoContrato: 6
  });

  // States: Dashboard Filters
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

  // States: Modal Lead Detail
  const[selectedLead, setSelectedLead] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [newLink, setNewLink] = useState({ url: '', label: '' });

  // States: Pomodoro Timer
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({ ligacoes: 0, conexoes: 0, decisores: 0, reunioes: 0 });

  const COLUMNS =['Novo Lead', 'T1', 'WhatsApp', 'T2', 'T3', 'T4', 'T5', 'T6'];

  // Dnd Sensors to prevent drag interfering with clicks
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // --- TIMER EFFECTS ---
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
  const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  const submitLog = (e) => {
    e.preventDefault();
    setPomodoroLogs([...pomodoroLogs, { date: new Date().toISOString(), ...logForm }]);
    setShowLogModal(false);
    setTimeLeft(25 * 60);
    setLogForm({ ligacoes: 0, conexoes: 0, decisores: 0, reunioes: 0 });
  };

  // --- ACTIONS ---
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;
    setLeads(leads.map(l => l.id === active.id ? { ...l, stage: over.id } : l));
  };

  const markMeeting = (id) => {
    setLeads(leads.map(l => l.id === id ? { ...l, stage: 'Oportunidades' } : l));
  };

  const addLead = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newLead = {
      id: Date.now().toString(), company: formData.get('company'), niche: formData.get('niche'), 
      city: formData.get('city'), priority: parseInt(formData.get('priority')), stage: 'Novo Lead',
      notes: [], links: []
    };
    setLeads([...leads, newLead]);
    e.target.reset();
  };

  const handleCSVImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const lines = evt.target.result.split('\n').filter(l => l.trim() !== '');
      const importedLeads = lines.slice(1).map((line, index) => {
        // Formato esperado CSV: Empresa, Nicho, Cidade, Prioridade, Telefone, CNPJ
        const[company, niche, city, priority, phone, cnpj] = line.split(',');
        return {
          id: `${Date.now()}-${index}`, company: company?.trim() || 'Desconhecido', 
          niche: niche?.trim() || 'Geral', city: city?.trim() || '-', 
          priority: parseInt(priority) || 1, phone: phone?.trim() || '', cnpj: cnpj?.trim() || '',
          stage: 'Novo Lead', notes: [], links: []
        };
      });
      setLeads([...leads, ...importedLeads]);
      alert(`${importedLeads.length} leads importados com sucesso!`);
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // --- MODAL ACTIONS ---
  const updateSelectedLead = (updates) => {
    const updatedLead = { ...selectedLead, ...updates };
    setSelectedLead(updatedLead);
    setLeads(leads.map(l => l.id === updatedLead.id ? updatedLead : l));
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    const note = { date: new Date().toLocaleString('pt-BR'), text: newNote };
    updateSelectedLead({ notes:[note, ...(selectedLead.notes || [])] });
    setNewNote('');
  };

  const addLink = () => {
    if (!newLink.url.trim()) return;
    updateSelectedLead({ links:[{ ...newLink }, ...(selectedLead.links || [])] });
    setNewLink({ url: '', label: '' });
  };

  // --- MATH & STRATEGY ---
  const calcVendas = strategyParams.meta / (strategyParams.ticket || 1);
  const calcReunioes = calcVendas / ((strategyParams.taxaFechamento || 1) / 100);
  const calcContatos = calcReunioes / ((strategyParams.taxaAgendamento || 1) / 100);
  const calcLeads = calcContatos / ((strategyParams.taxaContato || 1) / 100);
  
  const calcCAC = strategyParams.gastoTrafego / (calcVendas || 1);
  const calcLTV = strategyParams.ticket * strategyParams.tempoContrato;
  const metaSemanal = strategyParams.meta / 4.3;

  // --- DASHBOARD CALCS ---
  const filteredLogs = pomodoroLogs.filter(log => {
    if (!dateFilter.start && !dateFilter.end) return true;
    const logDate = new Date(log.date).getTime();
    const start = dateFilter.start ? new Date(dateFilter.start).getTime() : 0;
    const end = dateFilter.end ? new Date(dateFilter.end).setHours(23,59,59,999) : Infinity;
    return logDate >= start && logDate <= end;
  });

  const topNiches = Object.entries(
    leads.filter(l => l.stage === 'Oportunidades')
         .reduce((acc, l) => { acc[l.niche] = (acc[l.niche] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="min-h-screen bg-p21-dark text-p21-white font-sans overflow-hidden flex flex-col relative">
      
      {/* CABEÇALHO GLOBAL */}
      <header className="bg-p21-panel border-b border-gray-700 p-4 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-wider text-p21-white">
            PERFORMANCE<span className="text-p21-green">21</span>
          </h1>
          <nav className="flex gap-1 ml-8 bg-black/20 p-1 rounded-md">
            {['DASHBOARD', 'COLD_CALL', 'OPORTUNIDADES', 'ESTRATEGIA', 'POMODORO'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${activeTab === tab ? 'bg-p21-green text-p21-dark shadow-sm' : 'text-gray-400 hover:text-p21-white hover:bg-white/5'}`}>
                {tab.replace('_', ' ')}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-full border border-gray-700">
            <button onClick={toggleTimer} className={`p-1.5 rounded-full ${isActive ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-p21-green text-p21-dark hover:scale-105'} transition-all`}>
              {isActive ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <span className="text-xl font-mono font-bold w-16 text-center tracking-widest">{formatTime(timeLeft)}</span>
          </div>
          
          <div className="h-6 w-px bg-gray-600"></div>
          
          <div className="flex gap-2 text-sm">
            <button className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded text-white text-xs font-medium">
              <Phone size={14} /> Ligar
            </button>
            <button className="flex items-center gap-1 bg-p21-green hover:bg-[#85a62b] px-3 py-1.5 rounded text-p21-dark font-bold text-xs">
              <CalendarCheck size={14} /> + Reunião
            </button>
          </div>
        </div>
      </header>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 p-6 overflow-hidden flex flex-col">
        
        {/* ABA: COLD CALL */}
        {activeTab === 'COLD_CALL' && (
          <div className="flex-1 flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-p21-green flex items-center gap-2"><Target size={20} /> Prospecção Ativa</h2>
              
              <div className="flex gap-2 items-center">
                {/* Botão Bulk Import */}
                <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleCSVImport} />
                <button onClick={() => fileInputRef.current.click()} title="Importar CSV (Empresa, Nicho, Cidade, Prioridade, Telefone, CNPJ)"
                  className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 font-medium rounded text-xs flex items-center gap-1 transition-colors border border-gray-600">
                  <Upload size={14} /> Importar CSV
                </button>
                
                <form onSubmit={addLead} className="flex gap-2 bg-p21-panel p-1 rounded-md border border-gray-700">
                  <input required name="company" placeholder="Empresa" className="bg-p21-dark border border-gray-600 px-2 py-1 rounded text-xs outline-none" />
                  <input required name="niche" placeholder="Nicho" className="bg-p21-dark border border-gray-600 px-2 py-1 rounded text-xs outline-none w-24" />
                  <input required name="city" placeholder="Cidade" className="bg-p21-dark border border-gray-600 px-2 py-1 rounded text-xs outline-none w-24" />
                  <select name="priority" className="bg-p21-dark border border-gray-600 px-2 py-1 rounded text-xs outline-none text-p21-green">
                    <option value="1">★</option><option value="2">★★</option><option value="3">★★★</option>
                  </select>
                  <button type="submit" className="bg-p21-green text-p21-dark px-4 font-bold rounded text-xs">+ Lead</button>
                </form>
              </div>
            </div>
            
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start minimal-scrollbar">
                {COLUMNS.map(col => (
                  <DroppableColumn key={col} id={col} title={col} 
                    onMarkMeeting={markMeeting} onOpenModal={setSelectedLead}
                    leads={leads.filter(l => l.stage === col)} />
                ))}
              </div>
            </DndContext>
          </div>
        )}

        {/* ABA: OPORTUNIDADES */}
        {activeTab === 'OPORTUNIDADES' && (
          <div className="flex-1 overflow-auto">
            <h2 className="text-lg font-bold text-p21-green flex items-center gap-2 mb-6"><CalendarCheck size={20} /> Deals e Agendamentos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {leads.filter(l => l.stage === 'Oportunidades').map(lead => (
                <div key={lead.id} className="bg-p21-panel p-4 rounded-lg border border-gray-700 flex flex-col relative group">
                  <div className="absolute top-2 right-2 cursor-pointer p-1 text-gray-500 hover:text-white" onClick={() => setSelectedLead(lead)}>
                    <FileText size={16} />
                  </div>
                  <h3 className="font-bold text-base truncate pr-6">{lead.company}</h3>
                  <p className="text-xs text-p21-green mb-4">{lead.niche}</p>
                  <div className="space-y-2 mt-auto">
                    <input type="datetime-local" className="w-full bg-p21-dark p-1.5 rounded text-xs border border-gray-600 text-gray-300" 
                      value={lead.meetingDate || ''} onChange={(e) => setLeads(leads.map(l => l.id === lead.id ? {...l, meetingDate: e.target.value} : l))} />
                    <input type="url" placeholder="Google Meet URL" className="w-full bg-p21-dark p-1.5 rounded text-xs border border-gray-600 text-gray-300 placeholder-gray-600"
                      value={lead.meetLink || ''} onChange={(e) => setLeads(leads.map(l => l.id === lead.id ? {...l, meetLink: e.target.value} : l))} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA: ESTRATÉGIA PRO */}
        {activeTab === 'ESTRATEGIA' && (
          <div className="w-full h-full overflow-auto grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-p21-panel p-5 rounded-lg border border-gray-700 overflow-y-auto">
              <h2 className="text-base font-bold text-p21-green flex items-center gap-2 mb-4 border-b border-gray-600 pb-2"><Crosshair size={18} /> Inputs de Ouro</h2>
              <div className="space-y-3">
                {Object.keys(strategyParams).map(key => (
                  <div key={key} className="flex flex-col">
                    <label className="text-xs text-gray-400 capitalize mb-1">{key.replace(/([A-Z])/g, ' $1').trim()} {key.includes('taxa') ? '(%)' : key.includes('tempo') ? '(Meses)' : '(R$)'}</label>
                    <input type="number" value={strategyParams[key]} 
                      onChange={(e) => setStrategyParams({...strategyParams, [key]: Number(e.target.value)})}
                      className="bg-p21-dark border border-gray-600 w-full p-2 rounded text-sm text-p21-white focus:border-p21-green focus:outline-none" />
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Saúde Financeira */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-p21-panel p-4 rounded-lg border-l-4 border-p21-green">
                  <p className="text-xs text-gray-400 mb-1">Meta Semanal (R$)</p>
                  <p className="text-2xl font-black">{metaSemanal.toLocaleString('pt-BR', {style: 'currency', currency:'BRL'})}</p>
                </div>
                <div className="bg-p21-panel p-4 rounded-lg border-l-4 border-blue-500">
                  <p className="text-xs text-gray-400 mb-1">LTV Projetado (R$)</p>
                  <p className="text-2xl font-black">{calcLTV.toLocaleString('pt-BR', {style: 'currency', currency:'BRL'})}</p>
                </div>
                <div className="bg-p21-panel p-4 rounded-lg border-l-4 border-red-500">
                  <p className="text-xs text-gray-400 mb-1">CAC Máximo Estimado (R$)</p>
                  <p className="text-2xl font-black">{calcCAC.toLocaleString('pt-BR', {style: 'currency', currency:'BRL'})}</p>
                </div>
              </div>

              {/* Funil Invertido */}
              <div className="bg-p21-panel p-5 rounded-lg border border-gray-700 flex-1">
                <h3 className="font-bold text-white mb-6 border-b border-gray-600 pb-2">Funil Invertido: Esforço Necessário (Mensal)</h3>
                <div className="space-y-4 font-mono text-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-right text-gray-400">Leads</div>
                    <div className="flex-1 bg-gray-800 rounded-r-md h-8 flex items-center relative">
                      <div className="bg-gray-600 h-full rounded-r-md" style={{width: '100%'}}></div>
                      <span className="absolute left-3 font-bold">{Math.ceil(calcLeads)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-right text-gray-400">Contatos</div>
                    <div className="flex-1 bg-gray-800 rounded-r-md h-8 flex items-center relative">
                      <div className="bg-blue-600 h-full rounded-r-md" style={{width: `${(calcContatos/calcLeads)*100}%`}}></div>
                      <span className="absolute left-3 font-bold">{Math.ceil(calcContatos)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-right text-p21-green font-bold">Reuniões</div>
                    <div className="flex-1 bg-gray-800 rounded-r-md h-8 flex items-center relative">
                      <div className="bg-p21-green h-full rounded-r-md" style={{width: `${(calcReunioes/calcLeads)*100}%`}}></div>
                      <span className="absolute left-3 font-bold text-p21-dark">{Math.ceil(calcReunioes)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-right text-yellow-400 font-bold">Vendas</div>
                    <div className="flex-1 bg-gray-800 rounded-r-md h-8 flex items-center relative">
                      <div className="bg-yellow-400 h-full rounded-r-md" style={{width: `${(calcVendas/calcLeads)*100}%`}}></div>
                      <span className="absolute left-3 font-bold text-p21-dark">{Math.ceil(calcVendas)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA: DASHBOARD */}
        {activeTab === 'DASHBOARD' && (
          <div className="flex-1 flex flex-col h-full overflow-y-auto pr-2 minimal-scrollbar">
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-lg font-bold text-p21-green flex items-center gap-2"><BarChart3 size={20} /> Inteligência de Dados</h2>
              <div className="flex items-center gap-2 bg-p21-panel p-1.5 rounded-lg border border-gray-700">
                <Filter size={14} className="text-gray-400 ml-1" />
                <input type="date" value={dateFilter.start} onChange={e => setDateFilter({...dateFilter, start: e.target.value})} className="bg-p21-dark text-xs p-1 border border-gray-600 rounded text-gray-300" />
                <span className="text-gray-500 text-xs">até</span>
                <input type="date" value={dateFilter.end} onChange={e => setDateFilter({...dateFilter, end: e.target.value})} className="bg-p21-dark text-xs p-1 border border-gray-600 rounded text-gray-300" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-p21-panel p-4 rounded-lg border border-gray-700">
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Leads Totais</p>
                <p className="text-3xl font-black text-p21-white">{leads.length}</p>
              </div>
              <div className="bg-p21-panel p-4 rounded-lg border border-gray-700">
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Reuniões Marcadas</p>
                <p className="text-3xl font-black text-p21-green">{leads.filter(l => l.stage === 'Oportunidades').length}</p>
              </div>
              <div className="bg-p21-panel p-4 rounded-lg border border-gray-700">
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Conversão Global</p>
                <p className="text-3xl font-black text-p21-white">
                  {leads.length > 0 ? Math.round((leads.filter(l => l.stage === 'Oportunidades').length / leads.length) * 100) : 0}%
                </p>
              </div>
              <div className="bg-p21-panel p-4 rounded-lg border border-gray-700 border-b-4 border-b-yellow-400">
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1 flex items-center gap-1"><Trophy size={12}/> Top Nichos</p>
                <div className="mt-1 space-y-1">
                  {topNiches.length > 0 ? topNiches.map((niche, i) => (
                    <div key={i} className="flex justify-between text-xs border-b border-gray-700 pb-1 last:border-0">
                      <span className="text-gray-300 truncate">{i+1}. {niche[0]}</span>
                      <span className="font-bold text-p21-green">{niche[1]}</span>
                    </div>
                  )) : <span className="text-xs text-gray-500">Sem dados de reuniões</span>}
                </div>
              </div>
            </div>

            <div className="flex-1 bg-p21-panel p-5 rounded-lg border border-gray-700 min-h-[300px]">
              <h3 className="text-sm font-bold text-gray-300 mb-4">Produtividade Pomodoro {dateFilter.start && '(Filtrada)'}</h3>
              {filteredLogs.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredLogs.slice(-15).map((log, i) => ({ name: `C${i+1}`, ligacoes: log.ligacoes, reunioes: log.reunioes }))}>
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#152039', borderColor: '#374151', borderRadius: '8px' }} cursor={{fill: '#2a3b63'}} />
                    <Bar dataKey="ligacoes" fill="#9abd33" name="Ligações" radius={[4,4,0,0]} barSize={30} />
                    <Bar dataKey="reunioes" fill="#3b82f6" name="Reuniões" radius={[4,4,0,0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 text-sm">Nenhum ciclo finalizado neste período.</div>
              )}
            </div>
          </div>
        )}

        {/* ABA: POMODORO CONFIG */}
        {activeTab === 'POMODORO' && (
          <div className="max-w-md mx-auto w-full text-center py-12">
             <Settings size={48} className="mx-auto text-p21-green mb-6 opacity-50" />
             <h2 className="text-2xl font-bold text-p21-white mb-2">Ajuste seu Ritmo</h2>
             <p className="text-gray-400 text-sm mb-8">A base do CRM de alta performance é o tempo protegido.</p>
             <div className="bg-p21-panel p-6 rounded-lg border border-gray-700 flex flex-col gap-4 shadow-xl">
                <div>
                  <label className="block text-left text-xs font-bold uppercase tracking-wider text-p21-green mb-2">Tempo de Foco (Minutos)</label>
                  <input type="number" defaultValue="25" className="w-full bg-p21-dark border border-gray-600 rounded p-3 text-white text-lg font-mono text-center outline-none focus:border-p21-green" 
                         onChange={(e) => setTimeLeft(Number(e.target.value) * 60)} disabled={isActive} />
                </div>
                <button onClick={toggleTimer} className={`mt-4 py-3 rounded font-bold flex justify-center items-center gap-2 transition-all ${isActive ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-p21-green text-p21-dark hover:bg-[#85a62b]'}`}>
                  {isActive ? <><StopCircle size={20} /> Interromper Foco</> : <><Play size={20} /> Iniciar Sessão Brutal</>}
                </button>
             </div>
          </div>
        )}

      </main>

      {/* MODAL DE DETALHES DO LEAD */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-p21-panel border border-gray-700 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start p-5 border-b border-gray-700 bg-black/20 rounded-t-xl">
              <div>
                <h2 className="text-2xl font-black text-p21-white flex items-center gap-2">
                  {selectedLead.company} <span className="text-p21-green text-sm mt-1">{'★'.repeat(selectedLead.priority)}</span>
                </h2>
                <p className="text-sm text-gray-400 mt-1">{selectedLead.niche} • {selectedLead.city} | Etapa atual: <span className="text-white font-bold">{selectedLead.stage}</span></p>
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-gray-400 hover:text-white p-1 bg-gray-800 rounded-full"><X size={20}/></button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-6 minimal-scrollbar">
              
              {/* Coluna Esquerda: Dados Rápidos */}
              <div className="space-y-4">
                <div className="bg-p21-dark p-4 rounded-lg border border-gray-700 space-y-3">
                  <h3 className="font-bold text-sm text-p21-green border-b border-gray-700 pb-2 mb-3">Informações Base</h3>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider block">Telefone / WhatsApp</label>
                    <input type="text" value={selectedLead.phone || ''} onChange={(e) => updateSelectedLead({phone: e.target.value})} className="w-full bg-transparent border-b border-gray-600 focus:border-p21-green text-sm text-white py-1 outline-none" placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider block">CNPJ</label>
                    <input type="text" value={selectedLead.cnpj || ''} onChange={(e) => updateSelectedLead({cnpj: e.target.value})} className="w-full bg-transparent border-b border-gray-600 focus:border-p21-green text-sm text-white py-1 outline-none" placeholder="00.000.000/0001-00" />
                  </div>
                  <div>
                    <label className="text-[10px] text-p21-green font-bold uppercase tracking-wider block mt-4">Próximo Passo Estipulado</label>
                    <input type="text" value={selectedLead.nextStep || ''} onChange={(e) => updateSelectedLead({nextStep: e.target.value})} className="w-full bg-p21-panel rounded border border-gray-600 focus:border-p21-green text-sm text-white p-2 outline-none mt-1" placeholder="Ex: Ligar quarta-feira de manhã..." />
                  </div>
                </div>

                <div className="bg-p21-dark p-4 rounded-lg border border-gray-700">
                  <h3 className="font-bold text-sm text-p21-green border-b border-gray-700 pb-2 mb-3 flex items-center gap-1"><LinkIcon size={14}/> Links e Anexos</h3>
                  <div className="flex gap-2 mb-3">
                    <input type="text" placeholder="Nome" value={newLink.label} onChange={e=>setNewLink({...newLink, label: e.target.value})} className="w-1/3 bg-p21-panel p-1.5 rounded text-xs border border-gray-600 text-white outline-none" />
                    <input type="url" placeholder="URL (Drive, PDF, Site)" value={newLink.url} onChange={e=>setNewLink({...newLink, url: e.target.value})} className="flex-1 bg-p21-panel p-1.5 rounded text-xs border border-gray-600 text-white outline-none" />
                    <button onClick={addLink} className="bg-gray-700 hover:bg-gray-600 px-3 rounded text-white text-xs">+</button>
                  </div>
                  <ul className="space-y-2">
                    {selectedLead.links?.map((link, i) => (
                      <li key={i} className="text-xs bg-p21-panel p-2 rounded flex justify-between items-center border border-gray-700">
                        <span className="font-medium truncate pr-2 w-24">{link.label || 'Link'}</span>
                        <a href={link.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate flex-1">{link.url}</a>
                        <button onClick={() => updateSelectedLead({links: selectedLead.links.filter((_, idx) => idx !== i)})} className="text-red-400 hover:text-red-300 ml-2"><X size={12}/></button>
                      </li>
                    ))}
                    {(!selectedLead.links || selectedLead.links.length === 0) && <p className="text-xs text-gray-500 italic">Nenhum anexo salvo.</p>}
                  </ul>
                </div>
              </div>

              {/* Coluna Direita: Notas Históricas */}
              <div className="bg-p21-dark flex flex-col rounded-lg border border-gray-700">
                <div className="p-4 border-b border-gray-700">
                  <h3 className="font-bold text-sm text-p21-green flex items-center gap-1"><FileText size={14}/> Log de Interações</h3>
                </div>
                <div className="p-4 bg-p21-panel/30 border-b border-gray-700 flex flex-col gap-2">
                  <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} rows="3" placeholder="Registrar ligação, objeção, e-mail enviado..." className="w-full bg-p21-dark rounded p-2 text-sm border border-gray-600 text-white outline-none focus:border-p21-green resize-none minimal-scrollbar"></textarea>
                  <button onClick={addNote} className="bg-p21-green text-p21-dark font-bold text-xs py-2 px-4 rounded self-end hover:bg-[#85a62b] transition-colors">Salvar Registro</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 minimal-scrollbar">
                  {selectedLead.notes?.map((note, i) => (
                    <div key={i} className="bg-p21-panel p-3 rounded-lg border border-gray-700/50">
                      <p className="text-[10px] text-gray-500 mb-1 font-mono">{note.date}</p>
                      <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{note.text}</p>
                    </div>
                  ))}
                  {(!selectedLead.notes || selectedLead.notes.length === 0) && <p className="text-xs text-gray-500 italic text-center mt-4">Nenhum histórico registrado. Inicie o ataque.</p>}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* POPUP POMODORO FIM DE CICLO */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <form onSubmit={submitLog} className="bg-p21-panel border-t-4 border-p21-green p-6 rounded-lg shadow-2xl max-w-sm w-full">
            <h2 className="text-xl font-bold text-p21-white mb-2 text-center">Fim do Foco! 🔥</h2>
            <p className="text-sm text-gray-400 text-center mb-6">O que você produziu neste ciclo?</p>
            <div className="space-y-4 mb-6">
              {[
                { key: 'ligacoes', label: '📞 Total de Ligações Feitas' },
                { key: 'conexoes', label: '🗣️ Conexões (Atendidas)' },
                { key: 'decisores', label: '🎯 Falei com Decisores' },
                { key: 'reunioes', label: '📅 Reuniões Marcadas' }
              ].map(field => (
                <div key={field.key} className="flex justify-between items-center bg-p21-dark p-2 rounded border border-gray-700">
                  <label className="text-xs text-gray-300 font-medium">{field.label}</label>
                  <input type="number" required min="0" value={logForm[field.key]} 
                    onChange={(e) => setLogForm({...logForm, [field.key]: parseInt(e.target.value) || 0})}
                    className="w-16 bg-p21-panel text-center rounded border border-gray-600 text-white p-1 font-mono text-sm outline-none focus:border-p21-green" />
                </div>
              ))}
            </div>
            <button type="submit" className="w-full bg-p21-green text-p21-dark font-bold py-3 rounded-md hover:bg-[#85a62b] transition-colors">
              Salvar Dados e Descansar
            </button>
          </form>
        </div>
      )}

      {/* Estilos Globais injetados em tempo de execução para scrollbars minimalistas */}
      <style dangerouslySetInnerHTML={{__html: `
        .minimal-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .minimal-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .minimal-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }
        .minimal-scrollbar::-webkit-scrollbar-thumb:hover { background: #9abd33; }
      `}} />
    </div>
  );
}
