import React, { useState, useEffect } from 'react';
import { DndContext } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Phone, MessageCircle, CalendarCheck, Play, Pause, Settings, BarChart3, Crosshair, Target, StopCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// --- CUSTOM HOOK: LOCAL STORAGE ---
function useLocalStorage(key, initialValue) {
  const[storedValue, setStoredValue] = useState(() => {
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
const DraggableCard = ({ lead, onMarkMeeting }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: lead.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="bg-p21-dark p-3 rounded-md mb-2 border border-gray-700 shadow-sm cursor-grab active:cursor-grabbing">
      <div className="flex justify-between items-start">
        <h4 className="font-bold text-p21-white text-sm">{lead.company}</h4>
        <span className="text-p21-green text-xs">{'★'.repeat(lead.priority)}</span>
      </div>
      <p className="text-gray-400 text-xs mt-1">{lead.niche} • {lead.city}</p>
      
      <div className="flex gap-2 mt-3" onPointerDown={(e) => e.stopPropagation()}>
        <button className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs py-1 rounded flex items-center justify-center gap-1"
          onClick={() => window.open(`https://wa.me/`, '_blank')}>
          <MessageCircle size={12} /> WA
        </button>
        <button className="flex-1 bg-p21-green hover:bg-[#85a62b] text-p21-dark font-bold text-xs py-1 rounded flex items-center justify-center gap-1"
          onClick={() => onMarkMeeting(lead.id)}>
          <CalendarCheck size={12} /> Meet
        </button>
      </div>
    </div>
  );
};

const DroppableColumn = ({ id, title, leads, onMarkMeeting }) => {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="bg-p21-panel min-w-[250px] w-[250px] flex flex-col rounded-lg p-2 h-[calc(100vh-180px)] overflow-y-auto">
      <h3 className="text-p21-white font-bold text-sm mb-3 flex justify-between">
        {title} <span className="bg-p21-dark px-2 rounded text-p21-green">{leads.length}</span>
      </h3>
      <div className="flex-1">
        {leads.map(lead => <DraggableCard key={lead.id} lead={lead} onMarkMeeting={onMarkMeeting} />)}
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [activeTab, setActiveTab] = useState('COLD_CALL');
  
  // States: Persisted
  const [leads, setLeads] = useLocalStorage('p21_leads',[
    { id: '1', company: 'TechCorp SA', niche: 'SaaS', city: 'São Paulo', priority: 3, stage: 'Novo Lead' },
    { id: '2', company: 'Logistica BR', niche: 'Logística', city: 'Curitiba', priority: 2, stage: 'T1' },
  ]);
  const [pomodoroLogs, setPomodoroLogs] = useLocalStorage('p21_logs', []);
  const [strategyParams, setStrategyParams] = useLocalStorage('p21_strategy', {
    meta: 50000, ticket: 5000, taxaContato: 20, taxaAgendamento: 10, taxaFechamento: 25
  });

  // States: Pomodoro Timer
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({ ligacoes: 0, conexoes: 0, decisores: 0, reunioes: 0 });

  // Columns for Kanban
  const COLUMNS =['Novo Lead', 'T1', 'WhatsApp', 'T2', 'T3', 'T4', 'T5', 'T6'];

  // Timer Effect
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      setIsActive(false);
      setShowLogModal(true); // Mandatory Modal
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);
  const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  const submitLog = (e) => {
    e.preventDefault();
    setPomodoroLogs([...pomodoroLogs, { date: new Date().toISOString(), ...logForm }]);
    setShowLogModal(false);
    setTimeLeft(25 * 60); // Reset timer
    setLogForm({ ligacoes: 0, conexoes: 0, decisores: 0, reunioes: 0 });
  };

  // Actions
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;
    setLeads(leads.map(l => l.id === active.id ? { ...l, stage: over.id } : l));
  };

  const markMeeting = (id) => {
    setLeads(leads.map(l => l.id === id ? { ...l, stage: 'Oportunidades', meetingDate: '', meetLink: '', gmbLink: '' } : l));
  };

  const addLead = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newLead = {
      id: Date.now().toString(), company: formData.get('company'), niche: formData.get('niche'), city: formData.get('city'), priority: parseInt(formData.get('priority')), stage: 'Novo Lead'
    };
    setLeads([...leads, newLead]);
    e.target.reset();
  };

  // Strategy Math Calculation
  const calcVendas = strategyParams.meta / (strategyParams.ticket || 1);
  const calcLigacoes = calcVendas / (((strategyParams.taxaAgendamento || 1) / 100) * ((strategyParams.taxaContato || 1) / 100));

  return (
    <div className="min-h-screen bg-p21-dark text-p21-white font-sans overflow-hidden flex flex-col">
      
      {/* 1. CABEÇALHO GLOBAL (MOTOR DE RITMO) */}
      <header className="bg-p21-panel border-b border-gray-700 p-4 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-wider text-p21-white">
            PERFORMANCE<span className="text-p21-green">21</span>
          </h1>
          <nav className="flex gap-2 ml-8">
            {['DASHBOARD', 'COLD_CALL', 'OPORTUNIDADES', 'ESTRATEGIA', 'POMODORO'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${activeTab === tab ? 'bg-p21-green text-p21-dark' : 'text-gray-400 hover:text-p21-white'}`}>
                {tab.replace('_', ' ')}
              </button>
            ))}
          </nav>
        </div>

        {/* Global Pomodoro & Quick Actions */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <button onClick={toggleTimer} className={`p-2 rounded-full ${isActive ? 'bg-red-500 text-white' : 'bg-p21-green text-p21-dark'} hover:opacity-80`}>
              {isActive ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <span className="text-2xl font-mono font-bold w-20 text-center tracking-widest">{formatTime(timeLeft)}</span>
          </div>
          
          <div className="h-8 w-px bg-gray-600"></div>
          
          <div className="flex gap-2 text-sm">
            <button className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded text-white">
              <Phone size={14} /> Ligação
            </button>
            <button className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded text-white">
              <MessageCircle size={14} /> WhatsApp
            </button>
            <button onClick={() => setActiveTab('OPORTUNIDADES')} className="flex items-center gap-1 bg-p21-green hover:bg-[#85a62b] px-3 py-1.5 rounded text-p21-dark font-bold">
              <CalendarCheck size={14} /> + Reunião
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 overflow-hidden flex flex-col">
        
        {/* ABA: COLD CALL (FUNIL DE 8 ETAPAS) */}
        {activeTab === 'COLD_CALL' && (
          <div className="flex-1 flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-p21-green flex items-center gap-2"><Target size={20} /> Prospecção Ativa</h2>
              <form onSubmit={addLead} className="flex gap-2">
                <input required name="company" placeholder="Empresa" className="bg-p21-dark border border-gray-600 px-2 py-1 rounded text-sm outline-none" />
                <input required name="niche" placeholder="Nicho" className="bg-p21-dark border border-gray-600 px-2 py-1 rounded text-sm outline-none w-24" />
                <input required name="city" placeholder="Cidade" className="bg-p21-dark border border-gray-600 px-2 py-1 rounded text-sm outline-none w-24" />
                <select name="priority" className="bg-p21-dark border border-gray-600 px-2 py-1 rounded text-sm outline-none text-p21-green">
                  <option value="1">★</option><option value="2">★★</option><option value="3">★★★</option>
                </select>
                <button type="submit" className="bg-p21-green text-p21-dark px-4 font-bold rounded text-sm">+ Novo Lead</button>
              </form>
            </div>
            
            <DndContext onDragEnd={handleDragEnd}>
              <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start">
                {COLUMNS.map(col => (
                  <DroppableColumn key={col} id={col} title={col} onMarkMeeting={markMeeting} 
                    leads={leads.filter(l => l.stage === col)} />
                ))}
              </div>
            </DndContext>
          </div>
        )}

        {/* ABA: OPORTUNIDADES (FECHAMENTO) */}
        {activeTab === 'OPORTUNIDADES' && (
          <div className="flex-1 overflow-auto">
            <h2 className="text-lg font-bold text-p21-green flex items-center gap-2 mb-6"><CalendarCheck size={20} /> Reuniões Agendadas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leads.filter(l => l.stage === 'Oportunidades').map(lead => (
                <div key={lead.id} className="bg-p21-panel p-4 rounded-lg border border-gray-700">
                  <h3 className="font-bold text-lg">{lead.company}</h3>
                  <p className="text-sm text-gray-400 mb-4">{lead.niche} • {lead.city}</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-p21-green">Data e Horário</label>
                      <input type="datetime-local" className="w-full bg-p21-dark p-2 mt-1 rounded text-sm border border-gray-600" 
                        value={lead.meetingDate || ''} onChange={(e) => setLeads(leads.map(l => l.id === lead.id ? {...l, meetingDate: e.target.value} : l))} />
                    </div>
                    <div>
                      <label className="text-xs text-p21-green">Google Meet Link</label>
                      <input type="url" placeholder="https://meet.google.com/..." className="w-full bg-p21-dark p-2 mt-1 rounded text-sm border border-gray-600"
                        value={lead.meetLink || ''} onChange={(e) => setLeads(leads.map(l => l.id === lead.id ? {...l, meetLink: e.target.value} : l))} />
                    </div>
                    <div>
                      <label className="text-xs text-p21-green">Google Meu Negócio</label>
                      <input type="url" placeholder="GMB Link..." className="w-full bg-p21-dark p-2 mt-1 rounded text-sm border border-gray-600"
                        value={lead.gmbLink || ''} onChange={(e) => setLeads(leads.map(l => l.id === lead.id ? {...l, gmbLink: e.target.value} : l))} />
                    </div>
                  </div>
                </div>
              ))}
              {leads.filter(l => l.stage === 'Oportunidades').length === 0 && (
                <p className="text-gray-500 col-span-full">Nenhuma reunião marcada ainda. Volte para o Cold Call e acelere!</p>
              )}
            </div>
          </div>
        )}

        {/* ABA: ESTRATÉGIA (CÁLCULO DE NÚMEROS DE OURO) */}
        {activeTab === 'ESTRATEGIA' && (
          <div className="max-w-4xl mx-auto w-full">
            <h2 className="text-lg font-bold text-p21-green flex items-center gap-2 mb-6"><Crosshair size={20} /> Números de Ouro</h2>
            
            <div className="grid grid-cols-2 gap-8">
              <div className="bg-p21-panel p-6 rounded-lg border border-gray-700 space-y-4">
                <h3 className="font-bold text-white mb-2 border-b border-gray-600 pb-2">Parâmetros Atuais</h3>
                {Object.keys(strategyParams).map(key => (
                  <div key={key} className="flex items-center justify-between">
                    <label className="text-sm text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()} {key.includes('taxa') ? '(%)' : '(R$)'}</label>
                    <input type="number" value={strategyParams[key]} 
                      onChange={(e) => setStrategyParams({...strategyParams, [key]: Number(e.target.value)})}
                      className="bg-p21-dark border border-gray-600 w-24 p-1 text-right rounded text-p21-white" />
                  </div>
                ))}
              </div>

              <div className="bg-p21-green text-p21-dark p-6 rounded-lg shadow-lg flex flex-col justify-center">
                <h3 className="font-bold text-xl mb-4 border-b border-black/10 pb-2">A Matemática não mente:</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm opacity-80">Para bater R$ {strategyParams.meta}, você precisa de:</p>
                    <p className="text-3xl font-black">{Math.ceil(calcVendas)} Vendas</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-80">Com suas taxas atuais, sua meta de ligações é:</p>
                    <p className="text-4xl font-black mt-1">
                      {isFinite(calcLigacoes) ? Math.ceil(calcLigacoes) : 0} <span className="text-lg">Calls</span>
                    </p>
                  </div>
                  <p className="text-xs opacity-70 mt-4 pt-4 border-t border-black/10">
                    Fórmula: Ligações = Vendas / (Tx Agendamento × Tx Contato)
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA: DASHBOARD */}
        {activeTab === 'DASHBOARD' && (
          <div className="flex-1 flex flex-col">
            <h2 className="text-lg font-bold text-p21-green flex items-center gap-2 mb-6"><BarChart3 size={20} /> Inteligência de Dados</h2>
            
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-p21-panel p-4 rounded-lg border border-gray-700">
                <p className="text-gray-400 text-sm">Leads Totais</p>
                <p className="text-3xl font-bold text-p21-white">{leads.length}</p>
              </div>
              <div className="bg-p21-panel p-4 rounded-lg border border-gray-700">
                <p className="text-gray-400 text-sm">Reuniões Marcadas</p>
                <p className="text-3xl font-bold text-p21-green">{leads.filter(l => l.stage === 'Oportunidades').length}</p>
              </div>
              <div className="bg-p21-panel p-4 rounded-lg border border-gray-700">
                <p className="text-gray-400 text-sm">Conversão Global (Lead para Reunião)</p>
                <p className="text-3xl font-bold text-p21-white">
                  {leads.length > 0 ? Math.round((leads.filter(l => l.stage === 'Oportunidades').length / leads.length) * 100) : 0}%
                </p>
              </div>
            </div>

            <div className="flex-1 bg-p21-panel p-4 rounded-lg border border-gray-700 h-64">
              <h3 className="text-sm font-bold text-gray-300 mb-4">Produtividade Pomodoro (Últimos Ciclos)</h3>
              {pomodoroLogs.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pomodoroLogs.slice(-10).map((log, i) => ({ name: `Ciclo ${i+1}`, ligacoes: log.ligacoes, reunioes: log.reunioes }))}>
                    <XAxis dataKey="name" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip contentStyle={{ backgroundColor: '#152039', borderColor: '#374151' }} />
                    <Bar dataKey="ligacoes" fill="#9abd33" name="Ligações" />
                    <Bar dataKey="reunioes" fill="#f1fbfd" name="Reuniões" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">Nenhum ciclo finalizado ainda.</div>
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
             
             <div className="bg-p21-panel p-6 rounded-lg border border-gray-700 flex flex-col gap-4">
                <div>
                  <label className="block text-left text-sm text-p21-green mb-1">Tempo de Foco (Minutos)</label>
                  <input type="number" defaultValue="25" className="w-full bg-p21-dark border border-gray-600 rounded p-2 text-white" 
                         onChange={(e) => setTimeLeft(Number(e.target.value) * 60)} disabled={isActive} />
                </div>
                <button onClick={toggleTimer} className={`mt-4 py-3 rounded font-bold flex justify-center items-center gap-2 ${isActive ? 'bg-red-500 text-white' : 'bg-p21-green text-p21-dark'}`}>
                  {isActive ? <><StopCircle size={20} /> Parar Foco</> : <><Play size={20} /> Iniciar Sessão Brutal</>}
                </button>
             </div>
          </div>
        )}

      </main>

      {/* POPUP OBRIGATÓRIO (FIM DE CICLO) */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
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
                  <label className="text-sm text-gray-300">{field.label}</label>
                  <input type="number" required min="0" value={logForm[field.key]} 
                    onChange={(e) => setLogForm({...logForm, [field.key]: parseInt(e.target.value) || 0})}
                    className="w-16 bg-p21-panel text-center rounded border border-gray-600 text-white p-1" />
                </div>
              ))}
            </div>
            
            <button type="submit" className="w-full bg-p21-green text-p21-dark font-bold py-3 rounded-md hover:bg-[#85a62b] transition-colors">
              Salvar Dados e Descansar
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
