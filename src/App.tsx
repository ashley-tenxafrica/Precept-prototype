import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, Briefcase, FileText, Activity, Users, Settings, 
  Plus, MessageSquare, ChevronRight, CheckCircle2, AlertCircle, 
  Download, Loader2, PlayCircle, FileUp, X, History,
  Cpu, FileSearch, Lock, Scale, Bot, TrendingUp, ArrowRight, Check,
  Trash2, RotateCcw
} from 'lucide-react';

// --- CONFIGURATION ---
const apiKey = process.env.GEMINI_API_KEY || ""; // API key is injected by the environment

// --- SYSTEM PROMPT (The "Assessment Engine") ---
const SYSTEM_PROMPT = `
You are an expert POPIA (Protection of Personal Information Act) compliance consultant for IACT Africa.
You are conducting a "Processing Lawfulness Assessment" with a client regarding a specific business process.

Your goal is to have a conversational interview, gathering the facts, and then structuring the output.
You MUST output your responses in strictly valid JSON format matching the schema provided.

CONVERSATION FLOW:
Step 1: Ask the user to describe the business process in their own words. Use ui_component: "free_text".
Step 2: Based on their description, generate a list of personal information types they likely collect (e.g., ID number, banking details, address) and ask them to select the ones they actually collect. Use ui_component: "multi_select" and populate the "options" array.
Step 3: Based on what they collect, suggest the most likely POPIA Section 11 lawful bases (e.g., "Performance of a contract", "Legal obligation", "Consent") and ask them to confirm. Use ui_component: "checkbox_cards" and provide exactly 3-4 highly relevant options.
Step 4: Ask them about POPIA Section 10 (Minimality). Ask if they collect any data "just in case" or if everything is strictly necessary. Use ui_component: "yes_no".
Step 5: Conclude the interview. Use ui_component: "complete". You MUST provide the final "extracted_data" object containing your assessment of Section 9, Section 10, the confirmed Section 11 bases, and an overall assurance rating (high, reasonable, limited, very_limited) based on their answers.

RULES:
- Be professional, conversational, and helpful.
- Only advance to the next step once the user has answered the current one.
- Do NOT output markdown outside of the JSON. 
`;

// --- MAIN APPLICATION COMPONENT ---
export default function App() {
  const [user, setUser] = useState<any>(null);
  const [currentView, setCurrentView] = useState('landing'); // landing, login, dashboard, run, interview, report, audit
  
  // View states
  const [toasts, setToasts] = useState<{id: number, message: string, type: 'success'|'info'}[]>([]);

  const addToast = (message: string, type: 'success' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };
  
  // Pre-populated demo data reflecting realistic compliance variations
  const [activities, setActivities] = useState<any[]>([
    { 
      id: 1, 
      name: 'Marketing Email Campaigns', 
      desc: 'Sending monthly promotional offers to prospect lists.', 
      data: { 
        assurance_rating: 'limited', 
        s9_reasonable: true, 
        s10_adequate: false, 
        s11_bases: ['Consent'], 
        reasoning: 'Data collected includes excessive demographic fields not strictly necessary for email marketing. Opt-in mechanisms lack granularity.' 
      } 
    },
    { 
      id: 2, 
      name: 'Customer Order Fulfillment', 
      desc: 'Processing addresses and payment info for web orders.', 
      data: { 
        assurance_rating: 'high', 
        s9_reasonable: true, 
        s10_adequate: true, 
        s11_bases: ['Performance of a contract', 'Legal obligation'], 
        reasoning: 'Only necessary shipping and payment data is collected. Retention aligns precisely with SARS tax requirements.' 
      } 
    }
  ]);
  const [currentActivityItem, setCurrentActivityItem] = useState<any>(null);
  const [auditLog, setAuditLog] = useState<any[]>([]);

  const logAction = (action: string, entity: string, details: string) => {
    setAuditLog(prev => [{
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      actor: user?.name || 'System',
      action,
      entity,
      details
    }, ...prev]);
  };

  // --- VIEWS ROUTING ---
  if (!user) {
    if (currentView === 'landing') {
      return <LandingView onDemo={() => setCurrentView('login')} />;
    }
    return <LoginView onLogin={(userData: any) => { 
      setUser(userData); 
      setAuditLog([
        { id: 2, timestamp: new Date(), actor: userData.name, action: 'user.signed_in', entity: 'System', details: 'Successful authentication' },
        { id: 1, timestamp: new Date(Date.now() - 1000), actor: 'System', action: 'org.created', entity: userData.orgName, details: 'Workspace provisioned' }
      ]);
      setCurrentView('dashboard'); 
    }} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#0B1E36] text-white flex flex-col shrink-0 overflow-y-auto">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-lg">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">IACT Africa</span>
        </div>
        
        <div className="px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {user.orgName}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          <NavItem icon={<Activity />} label="Assessments" active={['dashboard', 'run', 'interview', 'report'].includes(currentView)} onClick={() => setCurrentView('dashboard')} />
          <NavItem icon={<Briefcase />} label="Risk Register" active={false} onClick={()=>{}}/>
          <NavItem icon={<FileText />} label="Contracts" active={false} onClick={()=>{}}/>
          <NavItem icon={<History />} label="Audit Trail" active={currentView === 'audit'} onClick={() => setCurrentView('audit')} />
          <NavItem icon={<Users />} label="Team" active={false} onClick={()=>{}}/>
        </nav>
        
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-sm font-medium">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">Information Officer</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Toast Notifications container */}
        <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map(toast => (
            <div key={toast.id} className={`px-4 py-3 rounded-md shadow-lg flex items-center gap-2 text-sm font-medium transition-all transform duration-300 ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
              <CheckCircle2 size={16} className={toast.type === 'success' ? 'text-emerald-500' : 'text-blue-500'} />
              {toast.message}
            </div>
          ))}
        </div>

        {currentView === 'dashboard' && (
          <DashboardView onStart={() => setCurrentView('run')} />
        )}
        {currentView === 'run' && (
          <RunDashboardView 
            activities={activities} 
            onAddActivity={(item: any) => {
              logAction('item.created', item.name, 'Started new processing activity assessment');
              setCurrentActivityItem(item);
              setCurrentView('interview');
            }}
            onDeleteActivity={(id: number) => {
              const item = activities.find(a => a.id === id);
              if (item) {
                logAction('item.deleted', item.name, 'Deleted processing activity');
                setActivities(prev => prev.filter(a => a.id !== id));
                addToast('Activity deleted safely', 'info');
              }
            }}
            onComplete={() => {
              logAction('run.completed', 'Processing Lawfulness', 'Generated final assurance report');
              addToast('Assessment Run completed successfully!', 'success');
              setCurrentView('report');
            }}
            addToast={addToast}
          />
        )}
        {currentView === 'interview' && (
          <InterviewChatView 
            activity={currentActivityItem}
            onComplete={(extractedData: any) => {
              logAction('item.approved_by_user', currentActivityItem.name, `Approved with rating: ${extractedData.assurance_rating}`);
              setActivities([...activities.filter(a => a.id !== currentActivityItem.id), { ...currentActivityItem, data: extractedData }]);
              addToast('Assessment approved and saved.', 'success');
              setCurrentView('run');
            }}
            onCancel={() => {
              addToast('Interview cancelled.', 'info');
              setCurrentView('run');
            }}
            logAction={logAction}
            addToast={addToast}
          />
        )}
        {currentView === 'report' && (
          <ReportView activities={activities} onBack={() => setCurrentView('dashboard')} logAction={logAction} addToast={addToast} />
        )}
        {currentView === 'audit' && (
          <AuditTrailView logs={auditLog} />
        )}
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

// 0. LANDING VIEW
function LandingView({ onDemo }: { onDemo: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-y-auto">
      {/* Header */}
      <header className="px-8 py-6 flex justify-between items-center bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-[#0B1E36] p-2 rounded-lg">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-[#0B1E36]">PRECEPT POC</span>
        </div>
        <button onClick={onDemo} className="bg-blue-600 text-white px-5 py-2.5 rounded-md font-medium hover:bg-blue-700 transition-colors shadow-sm">
          Launch Demo Experience
        </button>
      </header>

      {/* Hero Section */}
      <section className="bg-slate-900 text-white py-24 px-8 overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-400 via-slate-900 to-slate-900"></div>
        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-full text-sm font-semibold mb-6 border border-blue-500/30">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            Prototype v1.0
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            Compliance, <br className="hidden md:block" /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Dynamically Interpreted.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Move beyond static Excel spreadsheets. Precept uses an AI-powered conversational engine to capture nuance, assess legal bases, and generate compliance-grade audit trails—scaling your consulting business from manual hours to annuity revenue.
          </p>
          <div className="flex justify-center gap-4">
            <button onClick={onDemo} className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-700 transition-all hover:scale-105 shadow-lg shadow-blue-900/50">
              Start Interactive Demo <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-8 bg-white selection:bg-blue-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-4">How it optimises the Excel model</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">We've broken down exactly how this prototype solves the structural limitations of static questionnaires and manual auditing.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Scale size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">1. Interprets the Law</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                <strong className="text-slate-800 block mb-1">Old Way:</strong> Consultants interview clients and tick rigid Yes/No boxes that hide the nuance and reasoning.
              </p>
              <p className="text-slate-600 leading-relaxed">
                <strong className="text-slate-800 block mb-1">Precept:</strong> The AI acts as the consultant. It interprets plain English process descriptions and maps them directly to the 6 lawful bases of POPIA Section 11.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                <Cpu size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">2. Two-Phase Engine</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                <strong className="text-slate-800 block mb-1">Old Way:</strong> A flat form mapping directly to database columns.
              </p>
              <p className="text-slate-600 leading-relaxed">
                <strong className="text-slate-800 block mb-1">Precept:</strong> A dynamic system. <br/><em>Phase 1:</em> Interview loops that dynamically render UI components based on previous answers. <br/><em>Phase 2:</em> Strict LLM extraction to structured, validated JSON JSON/Pydantic schemas.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6">
                <FileSearch size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">3. Context Injection</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                <strong className="text-slate-800 block mb-1">Old Way:</strong> Taking the client's word via typed input with no immediate verification of evidence.
              </p>
              <p className="text-slate-600 leading-relaxed">
                <strong className="text-slate-800 block mb-1">Precept:</strong> Upload documents directly during the interview. The backend extracts text and injects it into the AI's prompt for real-time documentary analysis.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-6">
                <Lock size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">4. Immutable Audit Trail</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                <strong className="text-slate-800 block mb-1">Old Way:</strong> Impossible to prove who changed a cell or how a specific conclusion was reached over time.
              </p>
              <p className="text-slate-600 leading-relaxed">
                <strong className="text-slate-800 block mb-1">Precept:</strong> Conversation history is a first-class entity for auditing logic. An append-only audit log tracks every granular action, making the platform genuinely certifiable.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
                <Bot size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">5. Human-in-the-Loop</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                <strong className="text-slate-800 block mb-1">Old Way:</strong> No structured review gates; data goes straight into the final report.
              </p>
              <p className="text-slate-600 leading-relaxed">
                <strong className="text-slate-800 block mb-1">Precept:</strong> The AI doesn't write direct to the DB. It generates a "Summary Card" of its findings and logic. Staff must explicitly review, modify, and officially <span className="font-mono text-sm bg-slate-200 px-1 rounded">approve</span> before saving.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mb-6">
                <TrendingUp size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">6. Scale Your Business</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                <strong className="text-slate-800 block mb-1">Old Way:</strong> Time is money. Selling consultant hours severely limits scale and ties up senior expert capacity.
              </p>
              <p className="text-slate-600 leading-relaxed">
                <strong className="text-slate-800 block mb-1">Precept:</strong> Transition to a SaaS model. Clients can self-serve standard assessments through the AI, opening up highly scalable, recurring annuity revenue streams.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Bottom */}
      <section className="bg-[#0B1E36] py-20 px-8 text-center border-t-8 border-blue-600">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to see it in action?</h2>
        <p className="text-slate-300 max-w-2xl mx-auto mb-10 text-lg">
          Log in as a client to run an assessment, interact with the dynamic AI engine, and see the final compliance report and audit trail.
        </p>
        <button onClick={onDemo} className="flex items-center gap-2 bg-white text-[#0B1E36] px-8 py-4 rounded-lg font-bold text-lg hover:bg-slate-100 transition-all shadow-xl mx-auto hover:-translate-y-1">
          Sign In to Demo <ArrowRight size={20} />
        </button>
      </section>

      <footer className="py-8 text-center text-slate-500 text-sm border-t border-slate-200 bg-white">
        Prototype built for compliance assurance demonstration. © 2026.
      </footer>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
        active ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {React.cloneElement(icon, { size: 18 })}
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}

// 1. LOGIN VIEW
function LoginView({ onLogin }: { onLogin: (data: any) => void }) {
  const [name, setName] = useState('John Cato');
  const [org, setOrg] = useState('Acme Manufacturing');

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-[#0B1E36] p-3 rounded-xl shadow-lg">
            <ShieldCheck size={40} className="text-blue-400" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          Sign in to IACT
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Compliance Assessment Platform POC
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Organisation</label>
              <input type="text" value={org} onChange={e => setOrg(e.target.value)} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>
            <button 
              onClick={() => onLogin({ name, orgName: org })}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign In to Workspace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. DASHBOARD VIEW
function DashboardView({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Available Assessments</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Active Assessment */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col hover:border-blue-300 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Processing Lawfulness</h3>
            <p className="text-sm text-slate-500 flex-1 mb-6">
              Evaluate business processes to determine if data collection is fair, minimised, and has a valid legal reason under POPIA.
            </p>
            <button 
              onClick={onStart}
              className="w-full flex items-center justify-center gap-2 bg-[#0B1E36] text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              <PlayCircle size={18} />
              Start Assessment
            </button>
          </div>

          {/* Coming Soon Assessments */}
          <ComingSoonCard title="Contract Assessment" desc="Inventory of third-party contracts and data protection clauses." />
          <ComingSoonCard title="Personal Information Risk" desc="Condition 7 risk register identifying foreseeable risks and impact." />
          <ComingSoonCard title="Digital Devices Asset Register" desc="Register of every device handling personal information." />
        </div>
      </div>
    </div>
  );
}

function ComingSoonCard({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 flex flex-col opacity-60 grayscale cursor-not-allowed">
      <div className="w-12 h-12 bg-slate-200 text-slate-500 rounded-lg flex items-center justify-center mb-4">
        <FileText size={24} />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 flex-1 mb-6">{desc}</p>
      <div className="w-full text-center py-2 px-4 rounded-md text-sm font-medium bg-slate-200 text-slate-500">
        Coming Soon
      </div>
    </div>
  );
}

// 3. RUN DASHBOARD VIEW

function RunDashboardView({ activities, onAddActivity, onDeleteActivity, onComplete, addToast }: { activities: any[], onAddActivity: (act: any) => void, onDeleteActivity: (id: number) => void, onComplete: () => void, addToast: any }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [actName, setActName] = useState('Employee Onboarding');
  const [actDesc, setActDesc] = useState('Process of collecting details for a new hire.');

  const handleAdd = () => {
    onAddActivity({ id: Date.now(), name: actName, desc: actDesc });
    setShowAddModal(false);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 relative">
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <span>Assessments</span> <ChevronRight size={14} /> <span className="font-medium text-slate-900">Processing Lawfulness</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Current Run</h1>
          </div>
          {activities.length > 0 && (
            <button onClick={onComplete} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors">
              <CheckCircle2 size={18} />
              Complete Assessment
            </button>
          )}
        </div>
      </div>

      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-slate-800">Processing Activities ({activities.length})</h2>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 py-2 px-4 rounded-md text-sm font-medium transition-colors border border-blue-200"
          >
            <Plus size={16} /> Add Activity
          </button>
        </div>

        {activities.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Activity className="text-slate-400" size={32} />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No activities assessed yet</h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-6">
              Start by adding a business process that handles personal information, like "Employee Onboarding" or "Marketing Emails".
            </p>
            <button onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-2 bg-[#0B1E36] text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-slate-800">
              <Plus size={18} /> Add First Activity
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((act, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex items-center justify-between group">
                <div>
                  <h4 className="font-bold text-slate-900 text-lg">{act.name}</h4>
                  <p className="text-sm text-slate-500 mt-1">{act.desc}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Assurance</div>
                    <AssuranceBadge rating={act.data?.assurance_rating} />
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Status</div>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700 bg-green-50 px-2 py-1 rounded-md">
                      <CheckCircle2 size={14} /> Completed
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete this assessment?")) {
                        onDeleteActivity(act.id);
                      }
                    }}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100" 
                    title="Delete assessment"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900">Add Processing Activity</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Activity Name</label>
                <input type="text" value={actName} onChange={e=>setActName(e.target.value)} className="w-full border border-slate-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. Customer Order Processing" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Brief Description</label>
                <textarea value={actDesc} onChange={e=>setActDesc(e.target.value)} rows={3} className="w-full border border-slate-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500" placeholder="What does this process entail?" />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Cancel</button>
              <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">Start Interview</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AssuranceBadge({ rating }: { rating: string }) {
  const styles: Record<string, string> = {
    high: "bg-green-100 text-green-800 border-green-200",
    reasonable: "bg-blue-100 text-blue-800 border-blue-200",
    limited: "bg-yellow-100 text-yellow-800 border-yellow-200",
    very_limited: "bg-red-100 text-red-800 border-red-200"
  };
  const label = rating?.replace('_', ' ').toUpperCase() || 'UNKNOWN';
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold border ${styles[rating?.toLowerCase()] || 'bg-slate-100'}`}>
      ⬤ {label}
    </span>
  );
}

// 4. AI INTERVIEW CHAT VIEW (The core POC feature)

function InterviewChatView({ activity, onComplete, onCancel, logAction, addToast }: { activity: any, onComplete: (data: any) => void, onCancel: () => void, logAction: any, addToast: any }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const startInterview = async () => {
    setMessages([]);
    setExtractedData(null);
    const initialPrompt = `Let's begin assessing the activity: "${activity.name}". Description: "${activity.desc}". Start with Step 1.`;
    await sendMessageToLLM([{ role: 'user', content: initialPrompt }]);
  };

  // Initial prompt
  useEffect(() => {
    startInterview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessageToLLM = async (chatHistory: any[]) => {
    setIsLoading(true);
    
    // Format history for Gemini API
    const contents = chatHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }]
    }));

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: contents,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                text: { type: "STRING" },
                ui_component: { type: "STRING" }, // free_text, multi_select, checkbox_cards, yes_no, complete
                options: { type: "ARRAY", items: { type: "STRING" } },
                extracted_data: {
                  type: "OBJECT",
                  properties: {
                    s9_reasonable: { type: "BOOLEAN" },
                    s10_adequate: { type: "BOOLEAN" },
                    s11_bases: { type: "ARRAY", items: { type: "STRING" } },
                    assurance_rating: { type: "STRING" },
                    reasoning: { type: "STRING" }
                  }
                }
              },
              required: ["text", "ui_component"]
            }
          }
        })
      });

      if (!response.ok) throw new Error("API call failed");
      const data = await response.json();
      
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) throw new Error("Empty response");

      const parsedResponse = JSON.parse(responseText);
      
      setMessages(prev => [...prev, { role: 'assistant', data: parsedResponse }]);

      if (parsedResponse.ui_component === 'complete' && parsedResponse.extracted_data) {
        setExtractedData(parsedResponse.extracted_data);
      }

    } catch (error) {
      console.error("LLM Error:", error);
      // Fallback for demo if API fails
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        data: { text: "I encountered an error connecting to the AI. For the purpose of this demo, let's proceed to the summary.", ui_component: 'complete', extracted_data: { s9_reasonable: true, s10_adequate: true, s11_bases: ['Performance of a contract'], assurance_rating: 'high', reasoning: 'Fallback demo data.' } } 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSubmit = (userResponseText: string) => {
    const newHistory = [...messages.map(m => ({
      role: m.role,
      content: m.role === 'user' ? m.content : JSON.stringify(m.data)
    })), { role: 'user', content: userResponseText }];
    
    setMessages(prev => [...prev, { role: 'user', content: userResponseText }]);
    sendMessageToLLM(newHistory);
  };

  // Render Gen-UI component based on AI instruction
  const renderGenUI = (msgData: any, isLast: boolean) => {
    if (!isLast || isLoading || msgData.ui_component === 'complete') return null;

    const ComponentWrapper = ({ children }: { children: React.ReactNode }) => (
      <div className="mt-4 border border-blue-100 bg-blue-50/50 p-4 rounded-xl shadow-sm">
        {children}
      </div>
    );

    switch (msgData.ui_component) {
      case 'free_text':
        return (
          <ComponentWrapper>
            <form onSubmit={(e: any) => { e.preventDefault(); handleUserSubmit(e.target.reply.value); }} className="flex flex-col gap-3">
              <textarea name="reply" className="w-full border-slate-300 rounded-md p-3 text-sm focus:ring-blue-500 focus:border-blue-500" rows={3} placeholder="Type your answer here..." required autoFocus />
              <button type="submit" className="self-end bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">Submit Answer</button>
            </form>
          </ComponentWrapper>
        );
      
      case 'multi_select':
        return (
          <ComponentWrapper>
            <form onSubmit={(e: any) => {
              e.preventDefault();
              const selected = Array.from(e.target.elements as HTMLCollectionOf<HTMLInputElement>).filter(el => el.checked).map(el => el.value);
              handleUserSubmit(`We collect: ${selected.length > 0 ? selected.join(', ') : 'None of these'}`);
            }} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                {msgData.options?.map((opt: string, i: number) => (
                  <label key={i} className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="checkbox" value={opt} className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded" />
                    <span className="text-sm font-medium text-slate-700">{opt}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-between items-center mt-2">
                <button type="button" onClick={() => {
                  logAction('document.uploaded', 'employment_contract.pdf', 'System extracted 450 tokens for context injection.');
                  handleUserSubmit("I have uploaded our standard Employment Contract. It shows we collect ID, Residential Address, Tax Number, and Banking Details to enroll them in payroll.");
                }} className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-slate-200 px-3 py-1.5 rounded-md font-medium transition-colors border border-slate-300">
                  <FileUp size={16}/> Upload Evidence Document
                </button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">Confirm Selection</button>
              </div>
            </form>
          </ComponentWrapper>
        );

      case 'checkbox_cards':
        return (
          <ComponentWrapper>
            <form onSubmit={(e: any) => {
              e.preventDefault();
              const selected = Array.from(e.target.elements as HTMLCollectionOf<HTMLInputElement>).filter(el => el.checked).map(el => el.value);
              handleUserSubmit(`Confirmed bases: ${selected.join(', ')}`);
            }} className="flex flex-col gap-3">
              <div className="space-y-2">
                {msgData.options?.map((opt: string, i: number) => (
                  <label key={i} className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                    <input type="checkbox" value={opt} defaultChecked={i===0} className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded" />
                    <div>
                      <span className="block text-sm font-bold text-slate-900">{opt}</span>
                      <span className="block text-xs text-slate-500 mt-1">Select this if the processing is strictly necessary for this purpose.</span>
                    </div>
                  </label>
                ))}
              </div>
              <button type="submit" className="self-end mt-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">Confirm Bases</button>
            </form>
          </ComponentWrapper>
        );

      case 'yes_no':
        return (
          <ComponentWrapper>
            <div className="flex gap-4">
              <button onClick={() => handleUserSubmit("Yes, everything is strictly necessary.")} className="flex-1 bg-white border border-slate-300 py-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-blue-300 transition-colors">
                Yes, strictly necessary
              </button>
              <button onClick={() => handleUserSubmit("No, we might collect some things just in case.")} className="flex-1 bg-white border border-slate-300 py-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-red-300 transition-colors">
                No, some 'just in case' data
              </button>
            </div>
          </ComponentWrapper>
        );
      
      default: return null;
    }
  };

  if (extractedData) {
    return <SummaryCardView activity={activity} data={extractedData} onApprove={() => onComplete(extractedData)} onReject={() => { startInterview(); addToast('Interview reset.', 'info'); }} />;
  }

  // Calculate approximate step based on AI responses (Heuristic 1: System Status)
  const aiTurnCount = messages.filter(m => m.role === 'assistant').length;
  const currentStep = Math.min(5, Math.max(1, aiTurnCount));

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="h-16 border-b border-slate-200 px-6 flex items-center justify-between shrink-0 bg-white shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-md text-slate-500 transition-colors" title="Cancel and return to dashboard">
            <X size={20}/>
          </button>
          <div>
            <h2 className="font-bold text-slate-900 text-lg leading-tight flex items-center gap-2">
              Assessment Interview 
              <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-2">Step {currentStep} of 5</span>
            </h2>
            <p className="text-xs text-slate-500">{activity.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (window.confirm("Are you sure you want to start over? All current progress will be lost.")) {
                startInterview();
                addToast('Interview restarted', 'info');
              }
            }} 
            className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded transition-colors"
          >
            <RotateCcw size={14} /> Start Over
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-md border border-green-100">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-medium text-green-700">AI Consultant Active</span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
        <div className="max-w-3xl mx-auto space-y-6 pb-20">
          
          <div className="text-center text-xs text-slate-400 my-4 uppercase tracking-widest font-semibold">
            Interview Started
          </div>

          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            // Skip rendering the silent initial injection prompt
            if (isUser && idx === 0 && msg.content.startsWith("Let's begin assessing")) return null;

            return (
              <div key={idx} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex shrink-0 items-center justify-center shadow-sm ${isUser ? 'bg-slate-200' : 'bg-[#0B1E36]'}`}>
                  {isUser ? <UserAvatar /> : <ShieldCheck size={20} className="text-blue-400" />}
                </div>
                <div className={`max-w-[80%] ${isUser ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block p-4 rounded-2xl shadow-sm text-sm ${isUser ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'}`}>
                    {isUser ? msg.content : msg.data?.text}
                  </div>
                  
                  {!isUser && msg.data && renderGenUI(msg.data, idx === messages.length - 1)}
                </div>
              </div>
            );
          })}
          
          {isLoading && (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-[#0B1E36] flex shrink-0 items-center justify-center shadow-sm">
                <ShieldCheck size={20} className="text-blue-400" />
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-blue-500" />
                <span className="text-sm text-slate-500">Consultant is analyzing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}

function UserAvatar() {
  return <span className="text-sm font-bold text-slate-600">ME</span>;
}

// 5. SUMMARY CARD VIEW (Approval Gate)
function SummaryCardView({ activity, data, onApprove, onReject }: { activity: any, data: any, onApprove: () => void, onReject: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8 flex justify-center items-start">
      <div className="w-full max-w-2xl space-y-4 mt-4">
        
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex items-start gap-3 text-sm">
          <ShieldCheck className="shrink-0 mt-0.5 text-blue-600" size={18} />
          <div>
            <strong>Human-in-the-Loop Approval Required:</strong> To maintain compliance standards, review the AI's extraction and reasoning below. Saving this assessment will log your explicit approval in the system audit trail.
          </div>
        </div>

        <div className="w-full bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
          
          <div className="bg-[#0B1E36] px-8 py-6 text-white flex justify-between items-center">
            <div>
              <div className="text-blue-300 text-xs font-bold tracking-widest uppercase mb-1">Assessment Complete</div>
              <h2 className="text-2xl font-bold">{activity.name}</h2>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 uppercase tracking-widest mb-1 font-bold">Assurance Rating</div>
              <AssuranceBadge rating={data.assurance_rating || 'limited'} />
            </div>
          </div>

          <div className="p-8 space-y-8">
            {/* S9 & S10 Checks */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {data.s9_reasonable ? <CheckCircle2 className="text-green-500" size={20} /> : <AlertCircle className="text-yellow-500" size={20} />}
                    <h4 className="font-bold text-slate-900">Lawful & Fair Processing</h4>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-200 px-1.5 py-0.5 rounded">POPIA Sec 9</span>
                </div>
                <p className="text-sm text-slate-500 mb-2 italic border-l-2 pl-2 border-slate-200">
                  "Does the process respect the user's privacy and follow established laws?"
                </p>
                <p className="text-sm text-slate-800 font-medium">
                  {data.s9_reasonable ? 'Collection occurs fairly and without infringing unreasonable privacy rights.' : 'Potential issue: Processing may not be completely lawful or fair.'}
                </p>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {data.s10_adequate ? <CheckCircle2 className="text-green-500" size={20} /> : <AlertCircle className="text-yellow-500" size={20} />}
                    <h4 className="font-bold text-slate-900">Data Minimisation</h4>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-200 px-1.5 py-0.5 rounded">POPIA Sec 10</span>
                </div>
                <p className="text-sm text-slate-500 mb-2 italic border-l-2 pl-2 border-slate-200">
                  "Are we only collecting the minimum amount of data strictly necessary for the purpose?"
                </p>
                <p className="text-sm text-slate-800 font-medium">
                  {data.s10_adequate ? 'Data collected appears adequate, relevant, and not excessive.' : 'Risk: Collecting excessive "just in case" data. Review fields.'}
                </p>
              </div>
            </div>

            {/* S11 Bases */}
            <div>
              <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                <Briefcase size={18} className="text-blue-600"/> 
                Section 11: Lawful Bases Established
              </h4>
              {data.s11_bases && data.s11_bases.length > 0 ? (
                <ul className="space-y-3">
                  {data.s11_bases.map((basis: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 bg-blue-50 border border-blue-100 p-3 rounded-md">
                      <CheckCircle2 size={18} className="text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold text-blue-900 text-sm block">{basis}</span>
                        <span className="text-xs text-blue-700">Confirmed during interview phase.</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="bg-red-50 text-red-700 p-4 rounded-md text-sm font-medium flex items-center gap-2 border border-red-200">
                  <AlertCircle size={18} /> No lawful basis established. Processing may be unlawful.
                </div>
              )}
            </div>

            {/* AI Reasoning */}
            {data.reasoning && (
               <div className="bg-slate-100 p-4 rounded-lg text-sm text-slate-700 italic border-l-4 border-slate-300">
                  "{data.reasoning}"
               </div>
            )}
          </div>

          <div className="px-8 py-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
            <button onClick={onReject} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors">
              Reject & Redo
            </button>
            <button onClick={onApprove} className="px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2">
              <CheckCircle2 size={18} />
              Approve & Save
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// 6. REPORT VIEW (Simulated PDF Output)
function ReportView({ activities, onBack, logAction, addToast }: { activities: any[], onBack: () => void, logAction: any, addToast: any }) {
  // Calculate average assurance
  const scores = activities.map(a => a.data?.assurance_rating?.toLowerCase());
  const highCount = scores.filter(s => s === 'high').length;
  const reasonableCount = scores.filter(s => s === 'reasonable').length;
  const total = activities.length;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-200 p-8 flex flex-col items-center">
      
      {/* Top action bar */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium bg-white px-4 py-2 rounded-md shadow-sm">
          <ChevronRight size={18} className="rotate-180" /> Back to Dashboard
        </button>
        <button onClick={() => { logAction('report.downloaded', 'Processing Lawfulness Report', 'User downloaded PDF snapshot.'); addToast('Report downloaded', 'success'); }} className="flex items-center gap-2 bg-[#0B1E36] hover:bg-slate-800 text-white px-4 py-2 rounded-md shadow-sm font-medium">
          <Download size={18} /> Download PDF
        </button>
      </div>

      {/* The "Paper" Document */}
      <div className="w-full max-w-4xl bg-white shadow-2xl min-h-[1056px] relative pb-16">
        {/* Header stripe */}
        <div className="h-4 bg-[#0B1E36] w-full"></div>
        
        <div className="p-16">
          <div className="flex justify-between items-start mb-16 border-b-2 border-slate-100 pb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={32} className="text-blue-600" />
                <span className="font-bold text-2xl text-slate-900 tracking-tight">IACT Africa</span>
              </div>
              <p className="text-sm text-slate-500 font-medium">Compliance Assurance Report</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-900 text-lg">Acme Manufacturing</p>
              <p className="text-sm text-slate-500">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Processing Lawfulness</h1>
          <p className="text-lg text-slate-600 mb-12 max-w-2xl leading-relaxed">
            Assessment of business processes against Sections 9, 10, and 11 of the Protection of Personal Information Act (POPIA).
          </p>

          <div className="mb-12 flex gap-8">
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
              <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mb-2">Total Activities Assessed</p>
              <p className="text-5xl font-bold text-[#0B1E36]">{total}</p>
            </div>
            <div className="flex-1 bg-blue-50 border border-blue-100 rounded-xl p-6 text-center">
              <p className="text-sm text-blue-600 font-bold uppercase tracking-widest mb-2">High Assurance</p>
              <p className="text-5xl font-bold text-blue-700">{total > 0 ? Math.round((highCount / total) * 100) : 0}%</p>
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-6 border-b border-slate-200 pb-2">Activity Breakdown</h2>
          
          <div className="space-y-6">
            {activities.map((act, i) => (
              <div key={i} className="flex gap-6 items-start">
                <div className="w-32 pt-1">
                  <AssuranceBadge rating={act.data?.assurance_rating} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-slate-900">{act.name}</h3>
                  <p className="text-sm text-slate-600 mt-1 mb-2">{act.desc}</p>
                  <div className="text-sm text-slate-700 bg-slate-50 p-3 border border-slate-100 rounded-md">
                    <strong>Bases:</strong> {act.data?.s11_bases?.join(', ') || 'None'} <br/>
                    <strong>S.10 Minimality:</strong> {act.data?.s10_adequate ? 'Adequate' : 'Review Needed'}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
        
        {/* Footer */}
        <div className="absolute bottom-8 left-16 right-16 text-center border-t border-slate-200 pt-8 text-xs text-slate-400">
          Generated automatically by IACT Assessment Platform v0.1 • Strict Confidentiality Applies
        </div>
      </div>
    </div>
  );
}

// 7. AUDIT TRAIL VIEW
function AuditTrailView({ logs }: { logs: any[] }) {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
            <History size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">System Audit Trail</h1>
        </div>
        
        <p className="text-sm text-slate-500 mb-6">
          Immutable log of all user actions and AI interactions for compliance verification.
        </p>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold w-32">Timestamp</th>
                <th className="px-6 py-4 font-semibold w-32">Actor</th>
                <th className="px-6 py-4 font-semibold w-48">Action</th>
                <th className="px-6 py-4 font-semibold w-48">Entity</th>
                <th className="px-6 py-4 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                    <span className="font-medium text-slate-800">{log.timestamp.toLocaleTimeString()}</span> <br/>
                    <span className="text-xs text-slate-400">{log.timestamp.toLocaleDateString()}</span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">{log.actor}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 font-mono">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-900 font-medium truncate max-w-[200px]">{log.entity}</td>
                  <td className="px-6 py-4 text-slate-500">{log.details}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No events recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
