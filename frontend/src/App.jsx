import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ShieldAlert, Cpu, Award, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Copy, Menu, LogOut, Trash2 } from 'lucide-react';
import axios from 'axios';
import mermaid from 'mermaid';

mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
});

// --- Component: Dynamic Mermaid Flowchart (accepts dynamic syntax from backend) ---
const MermaidFlowchart = ({ syntax, isEmergency }) => {
    const ref = useRef(null);
    const uniqueId = useRef(`mermaid-${Date.now()}`);

    // Default locked chart shown before any audit
    const defaultChart = `graph TD
    A["Input"] --> B{"Gatekeeper"}
    B --> C["Bloom's Check"]
    C --> D["Audit Result"]
    style A fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#fff
    style B fill:#0f172a,stroke:#00f2fe,stroke-width:2px,color:#fff
    style C fill:#0f172a,stroke:#555,stroke-width:1px,color:#555
    style D fill:#0f172a,stroke:#555,stroke-width:1px,color:#555`;

    const chartToRender = syntax || defaultChart;
    const hasResult = !!syntax;

    useEffect(() => {
        if (!ref.current) return;
        mermaid.render(uniqueId.current, chartToRender)
            .then((result) => {
                if (ref.current) ref.current.innerHTML = result.svg;
            })
            .catch(e => console.error('Mermaid render error:', e));
    }, [chartToRender]);

    return (
        <div className="relative w-full flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <div
                    className="w-2 h-2 rounded-full"
                    style={{
                        background: isEmergency ? '#eab308' : hasResult ? '#22d3ee' : '#374151',
                        boxShadow: isEmergency ? '0 0 8px #eab308' : hasResult ? '0 0 8px #22d3ee' : 'none'
                    }}
                />
                <span className="text-[9px] font-black tracking-[2px] uppercase text-gray-400">
                    {isEmergency ? 'Emergency Override' : hasResult ? 'Audit Path' : 'Awaiting Audit'}
                </span>
            </div>

            {/* Chart */}
            <div
                ref={ref}
                className={`w-full transition-all duration-700 ${hasResult ? 'opacity-100' : 'opacity-30 grayscale'
                    }`}
                style={isEmergency ? { filter: 'drop-shadow(0 0 8px rgba(234,179,8,0.5))' } : {}}
            />

            {!hasResult && (
                <div className="flex items-center justify-center gap-2 mt-4">
                    <ShieldAlert size={12} className="text-gray-600" />
                    <span className="text-[9px] font-black tracking-[3px] text-gray-600 uppercase">LOCKED</span>
                </div>
            )}
        </div>
    );
};

// --- Interactive ANN Background with Framer Motion Hooks ---
const ANNBackground = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        let animationFrameId;
        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        const particles = [];
        const numParticles = 80;
        const mouse = { x: -1000, y: -1000 };

        const handleMouseMove = (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };

        const handleMouseLeave = () => {
            mouse.x = -1000;
            mouse.y = -1000;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseout', handleMouseLeave);

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };
        window.addEventListener('resize', handleResize);

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 1.5;
                this.vy = (Math.random() - 0.5) * 1.5;
                this.radius = Math.random() * 2 + 1;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < 0 || this.x > width) this.vx = -this.vx;
                if (this.y < 0 || this.y > height) this.vy = -this.vy;

                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 150) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(0, 242, 254, ${1 - distance / 150})`;
                    ctx.lineWidth = 1;
                    ctx.moveTo(this.x, this.y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.stroke();
                    ctx.closePath();
                    // Subtle shift towards mouse
                    this.x -= dx * 0.01;
                    this.y -= dy * 0.01;
                }
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = '#7000ff';
                ctx.fill();
                ctx.closePath();
            }
        }

        for (let i = 0; i < numParticles; i++) {
            particles.push(new Particle());
        }

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();

                // Connect nearby particles
                for (let j = i; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 120) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(112, 0, 255, ${0.4 - distance / 300})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                        ctx.closePath();
                    }
                }
            }
            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseout', handleMouseLeave);
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <motion.canvas
            ref={canvasRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none"
        />
    );
};

// --- Component: 3D Rotating Golden Badge ---
const GoldBadge = ({ hash }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(hash);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div
            initial={{ scale: 0.5, opacity: 0, rotateY: 90 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            transition={{ type: "spring", bounce: 0.4, duration: 1.2 }}
            whileHover={{ rotateY: 15, rotateX: 10, scale: 1.05 }}
            className="relative perspective-1000 bg-gradient-to-br from-yellow-300/20 via-amber-500/10 to-transparent border border-yellow-500/50 p-6 rounded-2xl text-center shadow-[0_0_40px_rgba(234,179,8,0.2)] backdrop-blur-xl isolate overflow-hidden z-20"
            style={{ transformStyle: "preserve-3d" }}
        >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute -inset-10 bg-gradient-to-r from-transparent via-yellow-200/20 to-transparent -z-10 blur-xl pointer-events-none"></motion.div>

            <h2 className="text-yellow-400 font-black text-2xl tracking-widest mb-2 flex items-center justify-center gap-3 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]">
                <Award size={32} className="text-yellow-300" /> PROOF OF THOUGHT
            </h2>
            <p className="text-amber-200/80 mb-6 text-sm font-semibold tracking-wider">Perfect Logic Sequence Verified</p>

            <div className="bg-[#051105] p-4 rounded-lg border border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)] flex items-center justify-between gap-4">
                <code className="text-green-400 font-mono tracking-widest font-bold text-sm md:text-base break-all text-left shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                    [{hash}]
                </code>
                <button
                    onClick={handleCopy}
                    className="p-3 bg-green-500/10 hover:bg-green-500/20 rounded-md border border-green-500/40 text-green-400 transition-all hover:scale-105 active:scale-95 shrink-0 hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                    title="Copy to Clipboard"
                >
                    {copied ? <span className="text-xs font-black tracking-widest px-1">COPIED</span> : <Copy size={20} />}
                </button>
            </div>
        </motion.div>
    );
}

// --- Component: Accordion Audit Result ---
const AuditAccordion = ({ result }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [displayScore, setDisplayScore] = useState(0);
    const isPerfect = result?.logic_score === 100;
    const isFail = result?.logic_score < 85;

    // Animated score roll-up
    useEffect(() => {
        let start = 0;
        const end = result?.logic_score || 0;
        if (start === end) return;
        const duration = 1500; // 1.5 seconds
        let startTime = null;

        const animateScore = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            // Ease out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            setDisplayScore(Math.round(easeProgress * end));

            if (progress < 1) {
                requestAnimationFrame(animateScore);
            }
        };
        requestAnimationFrame(animateScore);
    }, [result?.logic_score]);

    return (
        <div className="w-full flex flex-col gap-4">
            {/* Header Toggle */}
            <motion.div
                layout
                onClick={() => setIsOpen(!isOpen)}
                className={`glass-panel p-4 rounded-2xl cursor-pointer flex items-center justify-between transition-all hover:bg-white/10 ${isPerfect ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : isFail ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-neonCyan/30'}`}
            >
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center justify-center p-3 bg-spaceNavy/50 rounded-xl border border-white/5 min-w-[100px]">
                        <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Score</span>
                        <span className={`text-3xl font-black ${isPerfect ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]' : isFail ? 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'neon-text-cyan'}`}>
                            {displayScore}
                        </span>
                    </div>
                    <div className="hidden md:block">
                        <h3 className="font-bold text-gray-200 tracking-wider">Gatekeeper Audit Log</h3>
                        <p className="text-sm text-gray-500">{isPerfect ? 'Absolute Perfection.' : isFail ? 'Critical Sequence Failure.' : 'Evaluation completed with notes.'}</p>
                    </div>
                </div>

                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} className="text-gray-400 p-2">
                    <ChevronDown size={24} />
                </motion.div>
            </motion.div>

            {/* Accordion Content */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="flex flex-col gap-4 pt-2 pb-6">

                            {/* Socratic Critique */}
                            <div className="glass-panel p-6 rounded-2xl border-neonPurple/40 bg-neonPurple/5">
                                <strong className="text-neonPurple mb-3 block uppercase text-sm tracking-[3px]">Socratic Critique:</strong>
                                <p className="text-gray-200 leading-relaxed font-medium">{result?.feedback}</p>
                            </div>

                            {/* Conditional Renderings Based on Score */}
                            {isFail && (
                                <div className="relative overflow-hidden bg-[#110505] border border-[#ff3333] border-l-[6px] p-6 rounded-lg shadow-[0_0_20px_rgba(255,51,51,0.2)]">
                                    <div className="absolute inset-0 scanline pointer-events-none opacity-50 z-10"></div>
                                    <div className="flex items-center gap-3 mb-4 text-[#ff4444] font-black tracking-widest">
                                        <Cpu className="animate-pulse" size={24} />
                                        [CRITICAL FAILURE] VIRTUAL SYSTEM CRASH
                                    </div>
                                    <code className="text-[#ff5555] font-mono text-sm block leading-relaxed relative z-0 crt-flicker p-4 bg-black/50 border border-red-500/20 rounded shadow-inner">
                                        &gt; {result?.simulation || "Sequence collapse. Core logic compromised. Rebooting... "}
                                        <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="inline-block w-2 h-4 bg-red-500 ml-1 translate-y-1"></motion.span>
                                    </code>
                                </div>
                            )}

                            {result?.analogy && (
                                <div className="glass-panel border-green-500/30 p-5 rounded-2xl shadow-[0_0_15px_rgba(34,197,94,0.05)] bg-green-500/5">
                                    <strong className="text-green-400 text-sm tracking-[2px] uppercase block mb-3">💡 Real-World Analogy:</strong>
                                    <span className="text-gray-300 italic text-lg">{result.analogy}</span>
                                </div>
                            )}

                            {result?.assumptions?.length > 0 && (
                                <div className="glass-panel border-orange-500/30 p-5 rounded-2xl shadow-[0_0_15px_rgba(249,115,22,0.05)] bg-orange-500/5">
                                    <strong className="text-orange-400 text-sm tracking-[2px] uppercase block mb-4">⚠️ Detected Assumptions:</strong>
                                    <ul className="space-y-3">
                                        {result.assumptions.map((a, i) => (
                                            <li key={i} className="flex gap-3 text-gray-300 items-start">
                                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 shrink-0 shadow-[0_0_5px_rgba(249,115,22,0.8)]"></div>
                                                <span className="leading-snug">{a}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {isPerfect && result?.pot_hash && (
                                <GoldBadge hash={result.pot_hash} />
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// --- Main Application ---
function App() {
    const [domain, setDomain] = useState("");
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [vault, setVault] = useState([]);
    const [bloomsLevel, setBloomsLevel] = useState(1);
    const [mermaidSyntax, setMermaidSyntax] = useState(null);
    const [isEmergencyReveal, setIsEmergencyReveal] = useState(false);

    const BLOOMS_LABELS = {
        1: { label: "Remember", color: "#22d3ee", desc: "Recall facts" },
        2: { label: "Understand", color: "#38bdf8", desc: "Explain concepts" },
        3: { label: "Apply", color: "#818cf8", desc: "Solve problems" },
        4: { label: "Analyze", color: "#a78bfa", desc: "Break down systems" },
        5: { label: "Evaluate", color: "#f472b6", desc: "Critique & justify" },
        6: { label: "Create", color: "#fb923c", desc: "Synthesize new ideas" },
    };

    // Load Vault from localStorage
    useEffect(() => {
        const storedVault = localStorage.getItem('tark_vault');
        if (storedVault) {
            try {
                setVault(JSON.parse(storedVault));
            } catch (e) {
                console.error("Failed to parse Tark Vault");
            }
        }
    }, []);

    const saveCredential = (hash, domain, feedback, timestamp) => {
        const newEntry = { hash, domain, feedback, timestamp };
        setVault(prev => {
            const updated = [newEntry, ...prev];
            localStorage.setItem('tark_vault', JSON.stringify(updated));
            return updated;
        });
    };

    const clearVault = () => {
        if (window.confirm("Are you sure you want to clear all earned credentials?")) {
            localStorage.removeItem('tark_vault');
            setVault([]);
        }
    };

    // Auto-scroll chat to bottom
    const chatEndRef = useRef(null);
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isEvaluating]);

    const handleVerify = async (e) => {
        e.preventDefault();
        if (!domain) return alert("Select a domain first.");
        if (!input.trim()) return;

        const userMsg = { role: 'user', content: input, domain: domain };
        // Reset previous messages and start fresh each submission
        setMessages([userMsg]);
        setInput("");
        setIsEvaluating(true);

        try {
            const res = await axios.post('http://127.0.0.1:8000/verify-logic', {
                input: userMsg.content,
                domain: userMsg.domain,
                min_blooms_level: bloomsLevel,
                bypass_audit: false
            });

            const resultData = res.data;
            setMessages(prev => [...prev, { role: 'assistant', result: resultData }]);
            setMermaidSyntax(resultData.mermaid_syntax || null);
            setIsEmergencyReveal(false);

            if (resultData.logic_score === 100 && resultData.pot_hash) {
                saveCredential(resultData.pot_hash, resultData.domain, resultData.feedback, new Date().toISOString());
            }

            setIsEvaluating(false);

        } catch (err) {
            console.error("API Evaluation Error:", err);
            const isConnectionError = !err.response;
            const errorFeedback = isConnectionError
                ? `GATEKEEPER OFFLINE: Cannot reach TARK Backend. \n\nFix: Open a terminal and run:\n  python main.py\n\nEnsure it shows 'Uvicorn running on http://0.0.0.0:8000'`
                : `SERVER ERROR [${err.response?.status}]: ${err.response?.data?.detail || err.message}`;
            setMessages(prev => [...prev, {
                role: 'assistant',
                result: {
                    logic_score: 0,
                    feedback: errorFeedback,
                    simulation: isConnectionError
                        ? "CONNECTION_REFUSED: BEDROCK ENGINE OFFLINE. Run 'python main.py' to start the backend."
                        : `HTTP_ERROR_${err.response?.status}: Backend returned an error.`,
                    assumptions: [],
                    domain: domain
                }
            }]);
            setIsEvaluating(false);
        }
    };

    const handleGiveUp = async () => {
        if (!domain || !input.trim()) return;
        const userMsg = { role: 'user', content: `[EMERGENCY REVEAL] ${input}`, domain };
        setMessages([userMsg]);
        setInput("");
        setIsEvaluating(true);
        setIsEmergencyReveal(true);
        try {
            const res = await axios.post('http://127.0.0.1:8000/verify-logic', {
                input: userMsg.content,
                domain,
                min_blooms_level: bloomsLevel,
                bypass_audit: true
            });
            setMessages(prev => [...prev, { role: 'assistant', result: res.data, isReveal: true }]);
            setMermaidSyntax(res.data.mermaid_syntax || null);
            setIsEvaluating(false);
        } catch (err) {
            setIsEvaluating(false);
            setIsEmergencyReveal(false);
            alert('Expert reveal failed. Is the backend running?');
        }
    };

    return (
        <div className={`min-h-screen relative flex bg-[#050510] selection:bg-neonCyan/30 overflow-hidden ${isEmergencyReveal ? 'animate-shake' : ''}`}>
            <ANNBackground />

            {/* Fixed Flowchart Panel — left side, z-50, does not overlap vault */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="fixed top-32 z-50 pointer-events-auto"
                style={{
                    left: sidebarOpen ? '340px' : '16px',
                    width: '260px',
                    transition: 'left 0.4s ease'
                }}
            >
                <div
                    className="rounded-2xl p-4"
                    style={{
                        background: 'rgba(5,5,16,0.85)',
                        backdropFilter: 'blur(20px)',
                        border: isEmergencyReveal
                            ? '1px solid rgba(234,179,8,0.5)'
                            : mermaidSyntax
                                ? '1px solid rgba(0,242,254,0.2)'
                                : '1px solid rgba(255,255,255,0.06)',
                        boxShadow: isEmergencyReveal
                            ? '0 0 24px rgba(234,179,8,0.2)'
                            : '0 8px 32px rgba(0,0,0,0.5)'
                    }}
                >
                    <div className="text-[8px] font-black tracking-[3px] uppercase mb-3"
                        style={{ color: isEmergencyReveal ? '#eab308' : '#00f2fe' }}
                    >
                        ARCHITECTURE MAP
                    </div>
                    <MermaidFlowchart syntax={mermaidSyntax} isEmergency={isEmergencyReveal} />
                </div>
            </motion.div>

            {/* Collapsible Sidebar */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.aside
                        initial={{ x: -400, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -400, opacity: 0 }}
                        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                        className="fixed md:relative top-0 left-0 h-screen w-80 glass-panel border-r border-white/10 p-6 flex flex-col shrink-0 z-50 overflow-y-auto"
                    >
                        <div className="flex justify-between items-center mb-10">
                            <div className="flex items-center gap-3">
                                <ShieldAlert className="text-neonCyan animate-pulse-glow" size={24} />
                                <h2 className="text-xl font-black uppercase tracking-[3px] neon-text-cyan">
                                    Vault
                                </h2>
                            </div>
                            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
                                <LogOut size={20} />
                            </button>
                        </div>

                        {/* Reasoning Portfolio / Vault */}
                        {vault.length > 0 && (
                            <div className="mt-4 flex flex-col gap-4">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex justify-between items-center pb-2 border-b border-white/5">
                                    <span>Reasoning Portfolio <span className="ml-2 bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full text-[10px]">{vault.length} EARNED</span></span>
                                    <button
                                        onClick={clearVault}
                                        className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-500/10"
                                        title="Clear Portfolio"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </h3>
                                <div className="flex flex-col gap-3">
                                    {vault.map((item, i) => (
                                        <div key={i} className="glass-panel border-yellow-500/30 p-3 rounded-xl shadow-[0_0_10px_rgba(234,179,8,0.1)] flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <Award size={14} className="text-yellow-400" />
                                                <span className="text-xs font-bold text-gray-300 truncate">{item.domain}</span>
                                            </div>
                                            <code className="text-[#00ff00] font-mono text-[10px] bg-black/50 p-1.5 rounded truncate shadow-inner">
                                                {item.hash}
                                            </code>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto relative z-0 flex flex-col items-center scroll-smooth">

                {/* Dashboard Header */}
                <header className="w-full max-w-4xl px-6 flex flex-col items-center text-center space-y-8 pt-20 pb-12 mb-8">
                    {!sidebarOpen && (
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="fixed top-8 left-8 p-3 rounded-2xl glass-panel text-cyan-400 hover:scale-110 transition-transform z-50"
                        >
                            <Menu size={24} />
                        </button>
                    )}

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative z-50 p-5 rounded-[2rem] bg-cyan-400/5 border border-cyan-400/10 shadow-2xl mb-2"
                    >
                        <ShieldAlert className="text-cyan-400" size={72} />
                    </motion.div>

                    <div className="relative z-50 space-y-3">
                        <motion.h1
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-6xl md:text-8xl font-black bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent drop-shadow-lg tracking-tighter"
                        >
                            TARK
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-cyan-400 font-semibold tracking-[0.4em] text-xs uppercase"
                        >
                            Cognitive Verification Loop // v2.0
                        </motion.p>
                    </div>



                    <div className="relative z-50 w-full max-w-md mt-4">
                        <select
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            className="w-full bg-black/60 backdrop-blur-xl border border-cyan-500/30 text-white p-5 rounded-2xl appearance-none outline-none font-black text-center cursor-pointer hover:border-cyan-400 transition-all shadow-lg"
                        >
                            <option value="" disabled className="bg-[#050510]">SELECT VERIFICATION DOMAIN</option>
                            <option value="🚀 Coding" className="bg-[#050510]">🚀 Coding</option>
                            <option value="📚 Studies" className="bg-[#050510]">📚 Studies</option>
                            <option value="🏦 Banking Advice Logic Helper" className="bg-[#050510]">🏦 Banking Advice</option>
                        </select>
                    </div>

                    {/* Cognitive Strictness Slider */}
                    <div className="relative z-50 w-full max-w-md mt-2">
                        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[3px] text-gray-400">Cognitive Strictness</span>
                                    <span
                                        className="text-xs font-black tracking-widest uppercase mt-1"
                                        style={{ color: BLOOMS_LABELS[bloomsLevel].color, textShadow: `0 0 12px ${BLOOMS_LABELS[bloomsLevel].color}` }}
                                    >
                                        TARGET: {BLOOMS_LABELS[bloomsLevel].label.toUpperCase()}
                                    </span>
                                </div>
                                <span
                                    className="text-xs font-black px-3 py-1 rounded-full border"
                                    style={{
                                        color: BLOOMS_LABELS[bloomsLevel].color,
                                        borderColor: BLOOMS_LABELS[bloomsLevel].color + '50',
                                        background: BLOOMS_LABELS[bloomsLevel].color + '15',
                                    }}
                                >
                                    L{bloomsLevel}: {BLOOMS_LABELS[bloomsLevel].label}
                                </span>
                            </div>

                            <input
                                type="range"
                                min={1}
                                max={6}
                                step={1}
                                value={bloomsLevel}
                                onChange={(e) => setBloomsLevel(Number(e.target.value))}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, ${BLOOMS_LABELS[bloomsLevel].color} 0%, ${BLOOMS_LABELS[bloomsLevel].color} ${(bloomsLevel - 1) / 5 * 100}%, rgba(255,255,255,0.1) ${(bloomsLevel - 1) / 5 * 100}%, rgba(255,255,255,0.1) 100%)`
                                }}
                            />

                            <div className="flex justify-between mt-2">
                                {[1, 2, 3, 4, 5, 6].map(l => (
                                    <span
                                        key={l}
                                        className="text-[9px] font-bold transition-all"
                                        style={{ color: l <= bloomsLevel ? BLOOMS_LABELS[bloomsLevel].color : 'rgba(255,255,255,0.2)' }}
                                    >
                                        {BLOOMS_LABELS[l].label.slice(0, 3).toUpperCase()}
                                    </span>
                                ))}
                            </div>

                            <p className="text-center text-gray-500 text-[10px] mt-3 italic">
                                {BLOOMS_LABELS[bloomsLevel].desc} — Required for passing score
                            </p>
                        </div>
                    </div>
                </header>

                {/* Chat / Transcript Area */}
                <div className="w-full flex-1 overflow-y-auto px-4 md:px-8 pb-72 scroll-smooth space-y-8">
                    <div className="max-w-3xl mx-auto space-y-8 flex flex-col pt-4">
                        {messages.length === 0 && (
                            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative z-50 flex flex-col items-center justify-center text-center mt-2">
                                <div className="w-24 h-24 rounded-full border border-cyan-400/20 flex items-center justify-center mb-6" style={{ background: 'rgba(0, 242, 254, 0.05)', boxShadow: '0 0 50px rgba(0,242,254,0.1)' }}>
                                    <Cpu size={40} className="text-cyan-400 animate-pulse" />
                                </div>
                                <h2 className="text-4xl font-black text-white mb-2 tracking-tight">SYSTEMS ONLINE</h2>
                                <p className="text-cyan-400 font-semibold text-sm max-w-sm">
                                    Initiating Cognitive Verification Loop. Awaiting logical sequence input.
                                </p>
                            </motion.div>
                        )}

                        {messages.map((msg, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex flex-col items-center gap-4 w-full`}
                            >
                                {/* Role Tag (Centered Pill) */}
                                <div className="flex items-center gap-4 w-full justify-center opacity-40">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10"></div>
                                    <span className={`text-[9px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full border ${msg.role === 'user' ? 'text-gray-400 border-white/10' : 'text-neonCyan border-neonCyan/20'}`}>
                                        {msg.role === 'user' ? 'TRANSMISSION' : 'LOGIC_AUDIT'}
                                    </span>
                                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10"></div>
                                </div>

                                <div className="w-full">
                                    {msg.role === 'user' ? (
                                        <div className="glass-card p-8 rounded-[2.5rem] text-gray-100 border-white/5 mx-auto max-w-2xl bg-[#11112a]/40 shadow-xl">
                                            <p className="whitespace-pre-wrap leading-relaxed font-medium text-lg text-center">{msg.content}</p>
                                        </div>
                                    ) : (
                                        <div className="w-full max-w-3xl mx-auto">
                                            <AuditAccordion result={msg.result} />
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}

                        {isEvaluating && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-6">
                                <div className="w-12 h-12 rounded-full border-t-2 border-neonCyan animate-spin"></div>
                                <div className="glass-panel py-4 px-8 rounded-full border-neonCyan/20 text-neonCyan font-mono text-xs tracking-widest animate-pulse">
                                    CRUNCHING COGNITIVE DATA...
                                </div>
                            </motion.div>
                        )}

                        <div ref={chatEndRef} />
                    </div>
                </div>

                {/* Input Bar — aligned to heading center */}
                <div
                    className="fixed bottom-12 z-50 w-full max-w-xl px-6"
                    style={{
                        left: sidebarOpen ? 'calc(50% + 160px)' : '50%',
                        transform: 'translateX(-50%)',
                        transition: 'left 0.3s ease'
                    }}
                >
                    <motion.div
                        whileHover={{ scale: 1.01 }}
                        className="bg-black/50 backdrop-blur-xl border border-cyan-500/30 rounded-full flex items-center p-2 shadow-2xl transition-all focus-within:border-cyan-400"
                    >
                        <textarea
                            rows="1"
                            disabled={isEvaluating}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleVerify(e);
                                }
                            }}
                            placeholder={domain ? "Execute reasoning sequence..." : "⚠️ Select a domain first"}
                            className="flex-1 bg-transparent border-none py-4 px-6 text-white placeholder-gray-500 outline-none resize-none disabled:opacity-50 font-medium text-base"
                        />
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            whileHover={{ scale: 1.1 }}
                            onClick={handleVerify}
                            disabled={isEvaluating || !input.trim() || !domain}
                            className="bg-cyan-500 p-4 rounded-full text-black font-black hover:bg-cyan-400 transition-all disabled:opacity-20"
                            style={{ boxShadow: '0 0 20px rgba(0,242,254,0.5)' }}
                        >
                            <Send className="w-6 h-6" />
                        </motion.button>
                        <motion.button
                            id="give-up-btn"
                            whileTap={{ scale: 0.9 }}
                            whileHover={{ scale: 1.05 }}
                            onClick={handleGiveUp}
                            disabled={isEvaluating || !input.trim() || !domain}
                            className="text-[10px] font-black uppercase tracking-widest px-3 py-3 rounded-full mr-1 transition-all disabled:opacity-20 whitespace-nowrap"
                            style={{
                                background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(251,146,60,0.15))',
                                border: '1px solid rgba(239,68,68,0.4)',
                                color: '#f97316',
                                boxShadow: '0 0 12px rgba(239,68,68,0.3)'
                            }}
                        >
                            I Give Up
                        </motion.button>
                    </motion.div>
                </div>
            </main>
        </div>
    )
}

export default App
