import React, { useState, useEffect, useRef } from 'react';
import {
    Save, Cpu, Layout, Activity,
    Monitor, Plus, ChevronRight, ShieldAlert, Zap, Music
} from 'lucide-react';
import { useOpenRGB } from './hooks/useOpenRGB';
import { useDevices } from './hooks/useDevices';
import { useProfiles } from './hooks/useProfiles';
import { useEffects } from './hooks/useEffects';
import { ConnectionStatus } from './components/ConnectionStatus';
import { CleanupPanel } from './components/CleanupPanel';
import { EffectsPanel } from './components/EffectsPanel';
import { HardwareModeSelector } from './components/HardwareModeSelector';

// Logo Component
const NightwolfLogo: React.FC<{ className?: string }> = ({ className = '' }) => {
    return (
        <div className={`relative flex items-center bg-zinc-950 px-6 py-4 rounded-2xl border border-white/10 overflow-hidden group cursor-pointer transition-all duration-500 hover:border-blue-500/50 ${className}`}>
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-[pan_2s_linear_infinite]" />
                <div className="absolute bottom-0 right-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent animate-[pan_2s_linear_infinite_reverse]" />
            </div>
            <div className="absolute -left-4 -top-4 w-24 h-24 bg-blue-600/10 blur-[30px] rounded-full group-hover:bg-blue-500/20 transition-all duration-700" />
            <div className="relative z-10 flex items-center gap-5">
                <div className="relative">
                    <svg width="42" height="42" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]">
                        <path d="M20 15L35 45L20 55L20 15Z" fill="white" className="group-hover:fill-blue-400 transition-colors" />
                        <path d="M80 15L65 45L80 55L80 15Z" fill="white" className="group-hover:fill-blue-400 transition-colors" />
                        <path d="M50 10L35 45H65L50 10Z" fill="white" />
                        <path d="M35 45L50 90L65 45H35Z" fill="white" />
                        <path d="M40 45L45 50L40 55" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />
                        <path d="M60 45L55 50L60 55" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />
                        <path d="M45 75L50 80L55 75" stroke="black" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                        <span className="text-white font-[1000] text-2xl tracking-[-0.08em] uppercase italic leading-none">Nightwolf</span>
                        <div className="w-2 h-2 bg-blue-600 rounded-sm rotate-45 animate-pulse" />
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] font-black text-zinc-500 tracking-[0.4em] uppercase">RGB</span>
                        <div className="flex-1 h-[1px] bg-zinc-800" />
                    </div>
                </div>
            </div>
            <style>{`
        @keyframes pan { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      `}</style>
        </div>
    );
};

// UI Components
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-zinc-900/60 border border-zinc-800/50 rounded-2xl overflow-hidden backdrop-blur-xl ${className}`}>
        {children}
    </div>
);

interface ButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary';
    className?: string;
    disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
    const variants = {
        primary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.35)]',
        secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700',
    };
    return (
        <button onClick={onClick} disabled={disabled} className={`px-6 py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}>
            {children}
        </button>
    );
};

interface SliderProps {
    label: string;
    value: number;
    min?: number;
    max?: number;
    onChange: (value: number) => void;
    unit?: string;
}

const Slider: React.FC<SliderProps> = ({ label, value, min = 0, max = 100, onChange, unit = '%' }) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{label}</span>
            <span className="text-blue-500 font-mono font-bold text-sm bg-blue-500/10 px-3 py-1 rounded-md">{value}{unit}</span>
        </div>
        <input
            type="range" min={min} max={max} value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
    </div>
);

interface AudioVisualizerProps {
    color: string;
    isActive: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ color, isActive }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        if (!isActive) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let animationId: number;
        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const bars = 60;
            const barWidth = canvas.width / bars;
            for (let i = 0; i < bars; i++) {
                const h = Math.random() * (canvas.height * 0.75) + (Math.sin(Date.now() / 200 + i) * 20);
                const grad = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - h);
                grad.addColorStop(0, color);
                grad.addColorStop(1, '#ffffff');
                ctx.fillStyle = grad;
                ctx.fillRect(i * barWidth + 4, canvas.height - h, barWidth - 8, h);
            }
            animationId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(animationId);
    }, [isActive, color]);

    return (
        <div className="h-44 w-full bg-[#030303] rounded-3xl border border-zinc-800/50 relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
            {!isActive && <p className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.4em] z-10">À espera de entrada de Áudio</p>}
            <canvas ref={canvasRef} className="w-full h-full relative z-10" width={1000} height={200} />
        </div>
    );
};

// Main App
export default function App() {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'lighting' | 'effects' | 'profiles'>('lighting');
    const [selectedDevice, setSelectedDevice] = useState<string>('all');
    const [globalColor, setGlobalColor] = useState<string>('#3b82f6');
    const [brightness, setBrightness] = useState<number>(90);
    const [effect, setEffect] = useState<string>('static');
    const [profileName, setProfileName] = useState<string>('');
    const [showProfileDialog, setShowProfileDialog] = useState<boolean>(false);
    const [showCleanupPanel, setShowCleanupPanel] = useState<boolean>(false);

    const { connected, deviceCount } = useOpenRGB();
    const { devices, loading, setColor, setBrightness: setDeviceBrightness, syncAll } = useDevices();
    const { profiles, createProfile, applyProfile, deleteProfile } = useProfiles();
    const { activeEffect, startEffect, stopEffect } = useEffects();

    const handleColorChange = async (color: string) => {
        setGlobalColor(color);
        try {
            if (selectedDevice === 'all') {
                await syncAll(color);
            } else {
                const deviceId = parseInt(selectedDevice);
                await setColor(deviceId, color);
            }
        } catch (error) {
            console.error('Failed to set color:', error);
        }
    };

    const handleBrightnessChange = async (value: number) => {
        setBrightness(value);
        try {
            if (selectedDevice !== 'all') {
                const deviceId = parseInt(selectedDevice);
                await setDeviceBrightness(deviceId, value);
            }
        } catch (error) {
            console.error('Failed to set brightness:', error);
        }
    };

    const handleSaveProfile = async () => {
        if (!profileName.trim()) return;
        try {
            await createProfile(profileName, `Saved at ${new Date().toLocaleString()}`);
            setProfileName('');
            setShowProfileDialog(false);
        } catch (error) {
            console.error('Failed to save profile:', error);
        }
    };

    return (
        <div className="flex h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-blue-600/40 overflow-hidden">

            {/* Sidebar */}
            <aside className="w-80 border-r border-white/5 flex flex-col p-8 space-y-12 bg-[#080808] z-20">
                <NightwolfLogo />

                <nav className="flex-1 space-y-3">
                    {[
                        { id: 'dashboard' as const, label: 'Dashboard', icon: <Layout size={20} /> },
                        { id: 'lighting' as const, label: 'Iluminação', icon: <Activity size={20} /> },
                        { id: 'effects' as const, label: 'Efeitos', icon: <Zap size={20} /> },
                        { id: 'profiles' as const, label: 'Meus Perfis', icon: <Save size={20} /> },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all duration-500 group ${activeTab === item.id ? 'bg-zinc-900 border border-zinc-800 text-blue-500 shadow-2xl' : 'text-zinc-600 hover:text-zinc-300'}`}
                        >
                            <div className="flex items-center gap-4">
                                <span className={activeTab === item.id ? 'text-blue-500' : 'group-hover:text-blue-400'}>{item.icon}</span>
                                <span className="font-black text-[11px] uppercase tracking-[0.2em]">{item.label}</span>
                            </div>
                            {activeTab === item.id && <ChevronRight size={14} className="animate-pulse" />}
                        </button>
                    ))}
                </nav>

                <div className="space-y-4 border-t border-zinc-900 pt-8">
                    <ConnectionStatus connected={connected} deviceCount={deviceCount} />

                    <button
                        onClick={() => setShowCleanupPanel(true)}
                        className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 p-4 rounded-2xl flex items-center justify-between group cursor-pointer transition-all duration-300"
                    >
                        <div className="flex items-center gap-3">
                            <ShieldAlert size={18} className="text-red-500 group-hover:animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-red-500">RGB Cleanup</span>
                        </div>
                        <ChevronRight size={14} className="text-red-500" />
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-12 pb-32 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.05),transparent)] relative">

                {/* Header */}
                <header className="flex justify-between items-end mb-16">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]' : 'bg-red-500'}`} />
                            <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${connected ? 'text-blue-600' : 'text-red-600'}`}>
                                {connected ? 'Engine Link Active' : 'Disconnected'}
                            </span>
                        </div>
                        <h2 className="text-6xl font-black uppercase tracking-tighter italic">
                            {activeTab === 'lighting' ? 'Matrix RGB' :
                                activeTab === 'dashboard' ? 'Overview' : 'Perfis'}
                        </h2>
                    </div>
                </header>

                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-12">
                        <div className="relative group scale-125">
                            <div className="absolute inset-[-40px] bg-blue-600/20 blur-[100px] opacity-100" />
                            <NightwolfLogo className="p-14 border-2 border-white/10" />
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-4xl font-black italic uppercase tracking-tighter text-white">Wolf Core Deployment</h3>
                            <p className="text-zinc-600 text-xs font-bold uppercase tracking-[0.3em] max-w-lg mx-auto leading-relaxed">
                                Estado: {connected ? 'Optimizado' : 'Aguardando Conexão'}. {connected && `${deviceCount} dispositivo(s) detectado(s).`}
                            </p>
                        </div>
                        <Button variant="primary" className="px-20 py-5 text-xl" onClick={() => setActiveTab('lighting')}>
                            Iniciar Dashboard
                        </Button>
                    </div>
                )}

                {/* Lighting Tab */}
                {activeTab === 'lighting' && (
                    <div className="grid grid-cols-12 gap-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                        <div className="col-span-4 space-y-6">
                            <h3 className="text-[11px] font-black text-zinc-700 uppercase tracking-[0.3em]">Módulos de Hardware</h3>
                            <button
                                onClick={() => setSelectedDevice('all')}
                                className={`w-full p-6 rounded-3xl border-2 flex items-center justify-between transition-all duration-500 ${selectedDevice === 'all' ? 'border-blue-600/50 bg-blue-600/5 shadow-2xl shadow-blue-600/5' : 'border-zinc-800/50 bg-transparent hover:border-zinc-700'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <Monitor size={20} className={selectedDevice === 'all' ? 'text-blue-500' : 'text-zinc-700'} />
                                    <span className={`font-black text-[13px] uppercase tracking-widest ${selectedDevice === 'all' ? 'text-white' : 'text-zinc-600'}`}>Sync Global</span>
                                </div>
                            </button>

                            <div className="space-y-3">
                                {loading ? (
                                    <p className="text-zinc-700 text-xs">Carregando dispositivos...</p>
                                ) : devices.length === 0 ? (
                                    <p className="text-zinc-700 text-xs">Nenhum dispositivo detectado</p>
                                ) : (
                                    devices.map(device => (
                                        <button
                                            key={device.id}
                                            onClick={() => setSelectedDevice(device.id.toString())}
                                            className={`w-full p-5 rounded-2xl border transition-all duration-300 ${selectedDevice === device.id.toString() ? 'border-zinc-700 bg-zinc-900/60 shadow-inner' : 'border-zinc-800/20 bg-transparent hover:bg-zinc-900/20'}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <Cpu size={18} className={selectedDevice === device.id.toString() ? 'text-blue-500' : 'text-zinc-700'} />
                                                    <span className="text-[12px] font-bold uppercase tracking-wider">{device.name}</span>
                                                </div>
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedDevice === 'all' || selectedDevice === device.id.toString() ? globalColor : '#1a1a1a' }} />
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="col-span-8 space-y-10">
                            <Card className="p-12 bg-zinc-950/40 border-zinc-800/30">
                                <div className="grid grid-cols-2 gap-16">
                                    <div className="space-y-10">
                                        <h3 className="text-[11px] font-black text-zinc-700 uppercase tracking-widest">Engine Palette</h3>
                                        <div className="grid grid-cols-5 gap-4">
                                            {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ffffff', '#22d3ee', '#f43f5e', '#a855f7'].map(c => (
                                                <button
                                                    key={c} onClick={() => handleColorChange(c)}
                                                    className={`w-full aspect-square rounded-xl border-2 transition-all duration-300 ${globalColor === c ? 'border-white scale-110 shadow-2xl' : 'border-transparent opacity-30 hover:opacity-100 hover:scale-105'}`}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                        <div className="pt-8 border-t border-zinc-900">
                                            <Slider label="Master Illumination" value={brightness} onChange={handleBrightnessChange} />
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h3 className="text-[11px] font-black text-zinc-700 uppercase tracking-widest">Core Effects</h3>
                                        <div className="grid grid-cols-1 gap-2">
                                            {[
                                                { id: 'static', name: 'Constant Aura', icon: <Monitor size={16} /> },
                                                { id: 'breath', name: 'Wolf Heartbeat', icon: <Activity size={16} /> },
                                                { id: 'flash', name: 'Thunder Strike', icon: <Zap size={16} /> },
                                                { id: 'music', name: 'Sonic Reaction', icon: <Music size={16} /> },
                                            ].map(eff => (
                                                <button
                                                    key={eff.id} onClick={() => setEffect(eff.id)}
                                                    className={`flex items-center gap-4 px-6 py-5 rounded-2xl border-2 transition-all duration-300 ${effect === eff.id ? 'border-blue-600/40 bg-blue-600/10 text-white' : 'border-zinc-800/40 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900/40'}`}
                                                >
                                                    <div className={effect === eff.id ? 'text-blue-500' : ''}>{eff.icon}</div>
                                                    <span className="text-[12px] font-black uppercase tracking-widest">{eff.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[11px] font-black text-zinc-700 uppercase tracking-widest">Espectro em Tempo Real</h3>
                                    {effect === 'music' && <span className="text-[10px] text-blue-500 font-black animate-pulse">A TRANSMITIR DADOS...</span>}
                                </div>
                                <AudioVisualizer color={globalColor} isActive={effect === 'music'} />
                            </div>

                            <div className="flex justify-end gap-5 pt-8">
                                <Button variant="secondary" className="px-10" onClick={() => setShowProfileDialog(true)}>
                                    <Save size={16} /> Salvar Perfil
                                </Button>
                                <Button variant="primary" className="px-14 py-4 !text-sm italic" onClick={() => handleColorChange(globalColor)}>
                                    Aplicar Agora
                                </Button>
                            </div>

                            <HardwareModeSelector />
                        </div>
                    </div>
                )}

                {/* Effects Tab */}
                {activeTab === 'effects' && (
                    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-1000">
                        <EffectsPanel
                            activeEffect={activeEffect}
                            startEffect={startEffect}
                            stopEffect={stopEffect}
                            currentColor={globalColor}
                        />
                    </div>
                )}

                {/* Profiles Tab */}
                {activeTab === 'profiles' && (
                    <div className="grid grid-cols-3 gap-8">
                        {profiles.map((p) => (
                            <Card key={p.id} className="p-10 hover:border-blue-600/50 transition-all duration-500 group cursor-pointer bg-zinc-950/40">
                                <div className="text-blue-500 mb-8"><Zap size={32} /></div>
                                <h4 className="text-2xl font-black italic uppercase tracking-tighter mb-4">{p.name}</h4>
                                <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest mb-10 leading-relaxed">{p.description}</p>
                                <div className="flex gap-2">
                                    <Button variant="secondary" className="flex-1 group-hover:bg-blue-600 group-hover:text-white transition-all" onClick={() => applyProfile(p.id)}>
                                        Ativar
                                    </Button>
                                    <Button variant="secondary" className="px-3" onClick={() => deleteProfile(p.id)}>
                                        ✕
                                    </Button>
                                </div>
                            </Card>
                        ))}
                        <button
                            onClick={() => setShowProfileDialog(true)}
                            className="border-4 border-dashed border-zinc-900 rounded-3xl flex flex-col items-center justify-center p-10 text-zinc-800 hover:text-blue-500 hover:border-blue-500/30 transition-all duration-500">
                            <Plus size={48} className="mb-4" />
                            <span className="font-black text-[10px] uppercase tracking-[0.4em]">Criar Snapshot</span>
                        </button>
                    </div>
                )}

                {/* Profile Dialog */}
                {showProfileDialog && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowProfileDialog(false)}>
                        <div className="bg-zinc-900 p-10 rounded-3xl border border-zinc-800 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-2xl font-black mb-6">Salvar Perfil</h3>
                            <input
                                type="text"
                                value={profileName}
                                onChange={(e) => setProfileName(e.target.value)}
                                placeholder="Nome do perfil..."
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white mb-6 focus:outline-none focus:border-blue-600"
                            />
                            <div className="flex gap-4">
                                <Button variant="secondary" className="flex-1" onClick={() => setShowProfileDialog(false)}>Cancelar</Button>
                                <Button variant="primary" className="flex-1" onClick={handleSaveProfile}>Salvar</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Cleanup Panel */}
                {showCleanupPanel && (
                    <CleanupPanel onClose={() => setShowCleanupPanel(false)} />
                )}

            </main>

            <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #050505; }
        ::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
        @keyframes pan { 0% { opacity: 0.3; transform: scaleX(0.8); } 50% { opacity: 1; transform: scaleX(1); } 100% { opacity: 0.3; transform: scaleX(0.8); } }
      `}</style>
        </div>
    );
}
