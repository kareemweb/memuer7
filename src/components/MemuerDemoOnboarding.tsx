import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Key, 
  Activity, 
  Sparkles, 
  Layers, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  X, 
  ArrowRight, 
  ArrowLeft,
  ChevronRight,
  Download,
  Lock,
  Unlock,
  Users,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface MemuerDemoOnboardingProps {
  onClose?: () => void;
  forceOpen?: boolean;
}

export function MemuerDemoOnboarding({ onClose, forceOpen = false }: MemuerDemoOnboardingProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [handshakeState, setHandshakeState] = useState<'idle' | 'exchanging' | 'secure'>('idle');
  const [aiPrompt, setAiPrompt] = useState('Secure this session summary...');
  const [aiResult, setAiResult] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [customThemePreview, setCustomThemePreview] = useState('vibrant');

  // Audio Context refs for ambient synth
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRefs = useRef<OscillatorNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Auto-play timer ref
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<number>(0);
  const [slideProgress, setSlideProgress] = useState(0);

  // Check if first time
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }
    if (user) {
      const hasSeen = user.preferences?.hasSeenDemo || localStorage.getItem(`hasSeenDemo_${user.uid}`);
      if (!hasSeen) {
        setIsOpen(true);
      }
    }
  }, [user, forceOpen]);

  // Handle slide auto-play progression
  useEffect(() => {
    if (!isOpen) return;

    if (playTimerRef.current) clearInterval(playTimerRef.current);
    
    if (isPlaying) {
      progressRef.current = 0;
      setSlideProgress(0);
      
      const intervalMs = 100;
      const totalDurationMs = slides[currentSlide].duration;
      const steps = totalDurationMs / intervalMs;
      
      playTimerRef.current = setInterval(() => {
        progressRef.current += 1;
        const percentage = Math.min((progressRef.current / steps) * 100, 100);
        setSlideProgress(percentage);
        
        if (progressRef.current >= steps) {
          handleNextSlide();
        }
      }, intervalMs);
    }

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [currentSlide, isPlaying, isOpen]);

  // Trigger Narration Text-to-Speech & Synthesizer sounds when slide changes
  useEffect(() => {
    if (!isOpen) return;

    // Play Voice narration if not muted
    if (!isAudioMuted) {
      speakSlideText(slides[currentSlide].narrationText);
      playSynthChords(currentSlide);
    }
  }, [currentSlide, isAudioMuted, isOpen]);

  // Clean up audio on unmount or close
  useEffect(() => {
    return () => {
      stopSynthesizer();
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const slides = [
    {
      title: "Welcome to Memuer",
      subtitle: "The Next Generation of Private Messaging",
      description: "Built completely from the ground up with premium security, cutting-edge speed, and absolute end-to-end secrecy.",
      narrationText: "Welcome to Memuer. The next generation of private messaging. Built from the ground up with total end-to-end encryption.",
      duration: 7000,
      gradient: "from-pink-500 via-red-500 to-yellow-500",
    },
    {
      title: "End-to-End Encryption",
      subtitle: "Absolute Privacy is Our Default",
      description: "Your messages are locked using highly secure military-grade key cryptography before they ever leave your device. Only you and your recipient hold the keys.",
      narrationText: "Built from the ground up with total end-to-end encryption. Your privacy is not an option, it's the absolute standard.",
      duration: 8000,
      gradient: "from-indigo-600 via-pink-600 to-red-500",
    },
    {
      title: "E2EE Handshake Protocol",
      subtitle: "Zero-Knowledge Direct Exchange",
      description: "Establish peer-to-peer secure connections dynamically. Negotiate session keys safely in milliseconds using our custom cryptographic handshake protocol.",
      narrationText: "Experience a revolutionary, secure, E-Two-E-E handshake protocol, bridging your communication channel safely.",
      duration: 9000,
      gradient: "from-cyan-500 via-blue-600 to-indigo-700",
    },
    {
      title: "Secure AI Services",
      subtitle: "Intelligence with Absolute Privacy",
      description: "Interact with advanced AI assistants, translate messages, or generate high-accuracy secure summaries. All requests are proxied via secure zero-storage pipelines.",
      narrationText: "Bridging your data seamlessly and safely with advanced AI services. Intelligence without compromises.",
      duration: 8500,
      gradient: "from-violet-600 via-purple-600 to-pink-500",
    },
    {
      title: "Amazing User Interface",
      subtitle: "Stunning, Responsive & Fluid",
      description: "Navigate through custom cinematic layouts, choose high-speed fluid background motions, and customize every chat viewport with breathtaking responsive panels.",
      narrationText: "All wrapped inside a stunning, ultra-clean, and amazing user interface designed for absolute clarity.",
      duration: 8000,
      gradient: "from-rose-500 via-pink-500 to-orange-500",
    },
    {
      title: "Join Memuer Securely",
      subtitle: "Chat Securely. Connect Smarter.",
      description: "Enter your personal workspace now to enjoy real-time messaging, zero cloud data leakage, and a fully customizable secure hub.",
      narrationText: "Memuer. Chat securely. Connect smarter. Enter your workspace now.",
      duration: 99999, // Final slide stays open
      gradient: "from-red-500 via-purple-600 to-blue-500",
    }
  ];

  // Speech Synthesis Narration
  const speakSlideText = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Stop any previous speech

    const utterance = new SpeechSynthesisUtterance(text);
    // Find an English/Natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const optimalVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
                         voices.find(v => v.lang.startsWith('en')) || 
                         voices[0];
    
    if (optimalVoice) {
      utterance.voice = optimalVoice;
    }
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    
    // Pause auto-play when TTS speaks and resume? No, let's keep them in sync.
    window.speechSynthesis.speak(utterance);
  };

  // Synthesizer using Web Audio API to generate gorgeous ambient chords like the video music
  const initSynthesizer = () => {
    if (audioCtxRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
      
      // Main gain control
      const gainNode = audioCtxRef.current.createGain();
      gainNode.gain.setValueAtTime(0.08, audioCtxRef.current.currentTime);
      gainNode.connect(audioCtxRef.current.destination);
      gainNodeRef.current = gainNode;
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  };

  const playSynthChords = (slideIndex: number) => {
    initSynthesizer();
    const ctx = audioCtxRef.current;
    if (!ctx || isAudioMuted || !gainNodeRef.current) return;

    // Stop current oscillators gracefully
    stopOscillatorsGracefully();

    // Frequencies representing the atmospheric chords from the video soundtrack
    // Slide 0: warm Cmaj7/9 (261.63, 329.63, 392.00, 493.88)
    // Slide 1: epic Amin7 (220.00, 261.63, 329.63, 392.00)
    // Slide 2: secure Fmaj7 (174.61, 220.00, 261.63, 349.23)
    // Slide 3: smart G6/9 (196.00, 246.94, 293.66, 392.00)
    // Slide 4: futuristic D9sus4 (146.83, 220.00, 293.66, 369.99)
    // Slide 5: resolving Cmaj9 (130.81, 261.63, 329.63, 392.00, 493.88)
    const chordFrequencies: Record<number, number[]> = {
      0: [130.81, 261.63, 329.63, 392.00, 493.88], // Cmaj9
      1: [110.00, 220.00, 261.63, 329.63, 392.00], // Amin7
      2: [87.31, 174.61, 220.00, 261.63, 349.23],  // Fmaj7
      3: [98.00, 196.00, 246.94, 293.66, 392.00],  // G6
      4: [146.83, 220.00, 293.66, 329.63, 369.99], // D9
      5: [130.81, 261.63, 329.63, 392.00, 493.88]  // resolving C
    };

    const freqs = chordFrequencies[slideIndex] || chordFrequencies[0];

    // Gradually ramp volume up for a soft ambient swell
    gainNodeRef.current.gain.cancelScheduledValues(ctx.currentTime);
    gainNodeRef.current.gain.setValueAtTime(0, ctx.currentTime);
    gainNodeRef.current.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 1.5);

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      
      // Use low-pass filters or soft wave types (sine or triangle) for ambient pads
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      // Slightly detune to give a warm rich chorus effect
      osc.detune.setValueAtTime((Math.random() - 0.5) * 15, ctx.currentTime);

      // Distribute gain across frequencies
      oscGain.gain.setValueAtTime(0.12, ctx.currentTime);
      
      osc.connect(oscGain);
      oscGain.connect(gainNodeRef.current!);
      
      osc.start();
      
      oscillatorRefs.current.push(osc);
    });
  };

  const stopOscillatorsGracefully = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    
    // Ramp volume down first, then stop
    const currentOscs = [...oscillatorRefs.current];
    oscillatorRefs.current = [];

    if (gainNodeRef.current) {
      gainNodeRef.current.gain.cancelScheduledValues(ctx.currentTime);
      gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, ctx.currentTime);
      gainNodeRef.current.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    }

    setTimeout(() => {
      currentOscs.forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {}
      });
    }, 900);
  };

  const stopSynthesizer = () => {
    stopOscillatorsGracefully();
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
  };

  const toggleMute = () => {
    const newMute = !isAudioMuted;
    setIsAudioMuted(newMute);
    
    if (!newMute) {
      speakSlideText(slides[currentSlide].narrationText);
      playSynthChords(currentSlide);
    } else {
      stopOscillatorsGracefully();
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
  };

  const handleNextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      // Loop or pause? Let's stay on final screen or auto-enter if auto mode is complete
    }
  };

  const handlePrevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleCloseAndMarkAsSeen = async () => {
    // Stop all narration/sounds
    stopSynthesizer();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setIsOpen(false);

    if (user) {
      localStorage.setItem(`hasSeenDemo_${user.uid}`, 'true');
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          'preferences.hasSeenDemo': true
        });
      } catch (err) {
        console.error("Failed to update Firestore hasSeenDemo preferences:", err);
      }
    }

    if (onClose) onClose();
  };

  // Interaction handlers for Slides
  const triggerHandshake = () => {
    setHandshakeState('exchanging');
    setTimeout(() => {
      setHandshakeState('secure');
      // synthesizer ding sound for handshake complete!
      if (!isAudioMuted && audioCtxRef.current) {
        const dingOsc = audioCtxRef.current.createOscillator();
        const dingGain = audioCtxRef.current.createGain();
        dingOsc.type = 'sine';
        dingOsc.frequency.setValueAtTime(880, audioCtxRef.current.currentTime); // A5 high note
        dingGain.gain.setValueAtTime(0.1, audioCtxRef.current.currentTime);
        dingGain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.4);
        dingOsc.connect(dingGain);
        dingGain.connect(audioCtxRef.current.destination);
        dingOsc.start();
        setTimeout(() => dingOsc.stop(), 500);
      }
    }, 2000);
  };

  const triggerSecureAiQuery = () => {
    if (isAiProcessing) return;
    setIsAiProcessing(true);
    setAiResult("Connecting secure proxy...");
    
    setTimeout(() => {
      setAiResult("Proxied to server-side pipeline. Handshake key applied.");
    }, 1200);

    setTimeout(() => {
      setAiResult("✓ Decrypted, processed with Gemini, encrypted result: 'AES-256[Session Summary: Encrypted communications secured perfectly with E2EE key pairs. Streak: 5 days.]'");
      setIsAiProcessing(false);
    }, 2500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl flex flex-col justify-between overflow-hidden"
      >
        {/* Animated Background Gradients mimicking the brand look of the video */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
          <div className={`absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-tr ${slides[currentSlide].gradient} transition-all duration-1000 blur-3xl scale-125 opacity-30`} />
          <div className="absolute -top-[10%] -left-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-r from-pink-500 to-yellow-500 blur-[130px] animate-pulse" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 blur-[150px] animate-pulse" />
        </div>

        {/* TOP BAR controls */}
        <div className="relative z-10 px-6 py-4 flex items-center justify-between bg-black/20 border-b border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-yellow-500 flex items-center justify-center shadow-md">
              <span className="font-black text-white text-base">M</span>
            </div>
            <div>
              <h2 className="text-sm font-black tracking-widest text-white uppercase flex items-center gap-1.5">
                Memuer <span className="text-[10px] bg-pink-500/20 text-pink-400 px-1.5 py-0.5 rounded border border-pink-500/20">Demo Mode</span>
              </h2>
              <p className="text-[9px] text-zinc-400 font-semibold tracking-wide uppercase">First Time Cinematic Showcase</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle button */}
            <button 
              onClick={toggleMute}
              className={`p-2 rounded-xl border cursor-pointer transition-all ${
                isAudioMuted 
                  ? "bg-white/5 border-white/10 text-zinc-400 hover:text-white" 
                  : "bg-pink-500/25 border-pink-500/40 text-pink-300 animate-pulse"
              }`}
              title={isAudioMuted ? "Unmute Narration & Music" : "Mute Sound"}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Play/Pause Slider progression */}
            {currentSlide < slides.length - 1 && (
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            )}

            {/* Skip / Close Demo */}
            <button 
              onClick={handleCloseAndMarkAsSeen}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 text-zinc-300 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/20 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              <span>Skip</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* PROGRESS TIMELINE METERS */}
        <div className="relative z-10 px-6 pt-2 flex gap-1.5">
          {slides.map((slide, idx) => (
            <div key={idx} className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden relative">
              {idx < currentSlide && (
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-yellow-400 w-full" />
              )}
              {idx === currentSlide && (
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-pink-500 to-yellow-400" 
                  style={{ width: `${slideProgress}%` }}
                />
              )}
            </div>
          ))}
        </div>

        {/* CORE INTERACTIVE STAGE */}
        <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-6 flex flex-col md:grid md:grid-cols-12 gap-8 items-center min-h-0 relative z-10 overflow-y-auto custom-scrollbar">
          
          {/* LEFT PANEL: Slide Description, Heading and Subtitle */}
          <div className="md:col-span-5 space-y-4 text-center md:text-left">
            <span className="text-[10px] font-black tracking-[0.3em] uppercase bg-gradient-to-r from-pink-400 to-yellow-400 text-transparent bg-clip-text">
              Slide {currentSlide + 1} of {slides.length} • PROTOTYPE SHOWCASE
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
              {slides[currentSlide].title}
            </h1>
            <p className="text-base sm:text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-cyan-300 leading-snug">
              {slides[currentSlide].subtitle}
            </p>
            <p className="text-sm text-zinc-400 font-medium leading-relaxed max-w-lg mx-auto md:mx-0">
              {slides[currentSlide].description}
            </p>

            <div className="pt-2 hidden md:flex items-center gap-4">
              <button 
                onClick={handlePrevSlide}
                disabled={currentSlide === 0}
                className="p-2.5 rounded-full border border-white/10 bg-white/5 text-zinc-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              
              <button 
                onClick={handleNextSlide}
                disabled={currentSlide === slides.length - 1}
                className="p-2.5 rounded-full bg-gradient-to-r from-pink-500 to-yellow-500 text-white disabled:opacity-30 disabled:pointer-events-none hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* RIGHT PANEL: Slide specific Custom Interactive Graphics/Simulations */}
          <div className="md:col-span-7 w-full flex items-center justify-center min-h-[300px] h-full">
            <AnimatePresence mode="wait">
              {/* SLIDE 0: Welcome Memuer 3D perspective phone */}
              {currentSlide === 0 && (
                <motion.div 
                  key="slide0"
                  initial={{ opacity: 0, scale: 0.8, rotateY: 30 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  exit={{ opacity: 0, scale: 0.8, rotateY: -30 }}
                  className="w-full max-w-sm aspect-[9/16] max-h-[380px] sm:max-h-[460px] rounded-[40px] p-6 border border-white/20 bg-white/10 backdrop-blur-xl shadow-[0_0_50px_rgba(236,72,153,0.15)] flex flex-col justify-between relative overflow-hidden"
                  style={{ perspective: 1000 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/10 via-red-500/10 to-yellow-500/5 z-0" />
                  
                  {/* Phone Notch/Dynamic Island */}
                  <div className="w-28 h-4.5 bg-black rounded-full mx-auto z-10 border border-white/5 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-blue-600/60 animate-pulse" />
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center gap-6 relative z-10">
                    <motion.div 
                      animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 6 }}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-pink-500 to-yellow-500 flex items-center justify-center shadow-xl shadow-pink-500/30 border border-white/10"
                    >
                      <span className="font-black text-4xl sm:text-5xl text-white select-none">M</span>
                    </motion.div>
                    <div className="text-center">
                      <h3 className="text-2xl sm:text-3xl font-black text-white tracking-widest mb-1.5">Memuer</h3>
                      <div className="flex gap-1 justify-center">
                        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-pink-500/20 text-pink-300">SECURE</span>
                        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300">FAST</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center text-[10px] text-zinc-400 font-semibold tracking-widest uppercase z-10">
                    TAP 'NEXT' TO EXPLORE FEATURES
                  </div>
                </motion.div>
              )}

              {/* SLIDE 1: End-to-End Encryption key lock visualizer */}
              {currentSlide === 1 && (
                <motion.div 
                  key="slide1"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="w-full max-w-lg bg-indigo-950/40 border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center space-y-6 shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex items-center gap-4 sm:gap-8">
                    {/* Plaintext Box */}
                    <div className="p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/5 text-center flex flex-col items-center space-y-1 w-24 sm:w-32">
                      <Unlock className="w-5 h-5 text-zinc-400" />
                      <p className="text-[10px] font-black uppercase text-zinc-400">Plaintext</p>
                      <span className="text-[11px] font-mono font-bold text-zinc-200">"Hey user!"</span>
                    </div>

                    <div className="flex flex-col items-center gap-1 text-pink-400 animate-pulse">
                      <Key className="w-5 h-5" />
                      <div className="w-8 h-0.5 bg-gradient-to-r from-zinc-500 via-pink-400 to-red-500" />
                      <span className="text-[8px] font-mono font-black uppercase">AES-256</span>
                    </div>

                    {/* Encrypted Cyphertext Box */}
                    <div className="p-3 sm:p-4 rounded-2xl bg-pink-500/15 border border-pink-500/30 text-center flex flex-col items-center space-y-1 w-24 sm:w-32 shadow-lg shadow-pink-500/10">
                      <Lock className="w-5 h-5 text-pink-400" />
                      <p className="text-[10px] font-black uppercase text-pink-300">Encrypted</p>
                      <span className="text-[9px] font-mono text-pink-200 truncate w-full">8f9c1b48d...</span>
                    </div>
                  </div>

                  <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                      <span>ECDH-Nacl Encryption Layer</span>
                      <span className="text-green-400">ACTIVE</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-semibold leading-relaxed">
                      Before leaving your phone, your messages are transformed into unreadable cryptograms. Cloud servers never hold the keys, making surveillance mathematically impossible.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* SLIDE 2: Handshake Protocol interactive simulation */}
              {currentSlide === 2 && (
                <motion.div 
                  key="slide2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="w-full max-w-lg bg-zinc-950/60 border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center space-y-6 shadow-2xl"
                >
                  <div className="flex items-center justify-between w-full">
                    {/* User Node A */}
                    <div className="flex flex-col items-center space-y-1">
                      <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                        <Users className="w-5 h-5 text-cyan-400" />
                      </div>
                      <span className="text-[9px] font-bold text-zinc-300 uppercase">You (Alice)</span>
                      <span className="text-[7px] font-mono text-zinc-500">pub_3a7d9...</span>
                    </div>

                    {/* Tunnel */}
                    <div className="flex-1 mx-4 relative flex items-center justify-center">
                      <div className={`h-1 w-full rounded-full transition-colors duration-1000 ${
                        handshakeState === 'secure' ? 'bg-green-500/30 animate-pulse' : 'bg-white/10'
                      }`} />
                      
                      {handshakeState === 'exchanging' && (
                        <div className="absolute inset-0 flex items-center justify-around">
                          <motion.div 
                            animate={{ x: [0, 120] }} 
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-md shadow-cyan-400/50"
                          />
                          <motion.div 
                            animate={{ x: [0, -120] }} 
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-md shadow-indigo-400/50"
                          />
                        </div>
                      )}

                      {handshakeState === 'secure' && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute bg-green-500 text-black text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg shadow-green-500/20"
                        >
                          <Shield className="w-2.5 h-2.5" /> E2EE Secure
                        </motion.div>
                      )}
                    </div>

                    {/* User Node B */}
                    <div className="flex flex-col items-center space-y-1">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                        <Users className="w-5 h-5 text-indigo-400" />
                      </div>
                      <span className="text-[9px] font-bold text-zinc-300 uppercase">Bob</span>
                      <span className="text-[7px] font-mono text-zinc-500">pub_9f3b2...</span>
                    </div>
                  </div>

                  <div className="text-center w-full">
                    {handshakeState === 'idle' && (
                      <button 
                        onClick={triggerHandshake}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:brightness-110 active:scale-95 text-white text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-cyan-500/10 flex items-center gap-2 mx-auto"
                      >
                        <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                        Initiate Handshake
                      </button>
                    )}

                    {handshakeState === 'exchanging' && (
                      <div className="text-cyan-300 text-xs font-black animate-pulse tracking-widest uppercase">
                        EXCHANGING EPHEMERAL KEYS...
                      </div>
                    )}

                    {handshakeState === 'secure' && (
                      <div className="space-y-2">
                        <p className="text-green-400 text-xs font-black tracking-widest uppercase flex items-center justify-center gap-1.5">
                          ✓ ECDH CRYPTO HANDSHAKE ESTABLISHED
                        </p>
                        <button 
                          onClick={() => setHandshakeState('idle')}
                          className="text-[9px] text-zinc-500 hover:text-zinc-400 uppercase tracking-widest font-bold underline"
                        >
                          Reset Simulation
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* SLIDE 3: Secure AI Services */}
              {currentSlide === 3 && (
                <motion.div 
                  key="slide3"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="w-full max-w-lg bg-indigo-950/30 border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-4 shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-400" /> Zero-Retention AI Proxy
                    </span>
                    <span className="text-[8px] font-mono uppercase bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded tracking-wider font-bold">Secure pipeline</span>
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <input 
                        type="text" 
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Ask AI securely..."
                        className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 text-xs focus:outline-none focus:border-purple-500 transition-colors"
                      />
                      <button 
                        onClick={triggerSecureAiQuery}
                        disabled={isAiProcessing}
                        className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer"
                      >
                        {isAiProcessing ? "Securing..." : "Run AI"}
                      </button>
                    </div>

                    <div className="min-h-[80px] bg-black/40 rounded-xl p-3 border border-white/5 text-left font-mono">
                      {aiResult ? (
                        <p className="text-[10px] text-zinc-300 leading-normal font-semibold">
                          {aiResult}
                        </p>
                      ) : (
                        <p className="text-[10px] text-zinc-500 italic">
                          Click "Run AI" above. Watch how the client-side keys wrap the payload before contacting server-side Gemini API.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-[9px] text-zinc-500 leading-normal">
                    Unlike standard assistants, Memuer proxies AI inputs using server-side keys with **absolute zero storage**. Your questions and files remain safe from external databases.
                  </div>
                </motion.div>
              )}

              {/* SLIDE 4: Beautiful UI experience (Interactive Mockup) */}
              {currentSlide === 4 && (
                <motion.div 
                  key="slide4"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="w-full max-w-md bg-indigo-950/40 border border-white/10 backdrop-blur-xl rounded-3xl p-6 shadow-2xl space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-yellow-500 flex items-center justify-center">
                        <span className="font-black text-white text-xs">M</span>
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-white">Theme Sandbox</span>
                    </div>

                    <div className="flex gap-1.5">
                      {['vibrant', 'midnight', 'forest', 'crimson'].map(t => (
                        <button 
                          key={t}
                          onClick={() => setCustomThemePreview(t)}
                          className={`w-3.5 h-3.5 rounded-full border border-white/20 relative ${
                            t === 'vibrant' ? 'bg-pink-500' :
                            t === 'midnight' ? 'bg-indigo-600' :
                            t === 'forest' ? 'bg-emerald-600' : 'bg-red-600'
                          }`}
                        >
                          {customThemePreview === t && (
                            <span className="absolute inset-0 rounded-full border border-white scale-125" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Simulated App Screen */}
                  <div className={`rounded-2xl border border-white/5 p-4 min-h-[160px] relative overflow-hidden transition-all duration-700 ${
                    customThemePreview === 'vibrant' ? 'bg-gradient-to-br from-pink-950 via-purple-950 to-indigo-950' :
                    customThemePreview === 'midnight' ? 'bg-gradient-to-br from-zinc-950 via-blue-950 to-slate-900' :
                    customThemePreview === 'forest' ? 'bg-gradient-to-br from-zinc-950 via-emerald-950 to-stone-900' :
                    'bg-gradient-to-br from-zinc-950 via-red-950 to-zinc-900'
                  }`}>
                    {/* Simulated Floating orbs preview */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30 blur-2xl">
                      <div className={`absolute top-2 left-6 w-12 h-12 rounded-full ${
                        customThemePreview === 'vibrant' ? 'bg-pink-500' :
                        customThemePreview === 'midnight' ? 'bg-cyan-400' :
                        customThemePreview === 'forest' ? 'bg-emerald-400' : 'bg-rose-500'
                      }`} />
                      <div className={`absolute bottom-2 right-6 w-14 h-14 rounded-full ${
                        customThemePreview === 'vibrant' ? 'bg-violet-500' :
                        customThemePreview === 'midnight' ? 'bg-blue-500' :
                        customThemePreview === 'forest' ? 'bg-teal-400' : 'bg-orange-500'
                      }`} />
                    </div>

                    <div className="relative z-10 space-y-3">
                      {/* Message 1 */}
                      <div className="flex gap-2 max-w-[85%]">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center font-bold text-[9px]">A</div>
                        <div className="p-2.5 rounded-2xl rounded-tl-none bg-white/5 border border-white/5">
                          <p className="text-[10px] text-zinc-300 leading-normal">Did you establish the handshake?</p>
                        </div>
                      </div>

                      {/* Message 2 */}
                      <div className="flex gap-2 max-w-[85%] ml-auto justify-end">
                        <div className={`p-2.5 rounded-2xl rounded-tr-none ${
                          customThemePreview === 'vibrant' ? 'bg-pink-500/20 border-pink-500/25 text-pink-200' :
                          customThemePreview === 'midnight' ? 'bg-blue-500/20 border-blue-500/25 text-blue-200' :
                          customThemePreview === 'forest' ? 'bg-emerald-500/20 border-emerald-500/25 text-emerald-200' :
                          'bg-red-500/20 border-red-500/25 text-red-200'
                        } border`}>
                          <p className="text-[10px] leading-normal font-medium">Yes, the keys are completely synchronized!</p>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center font-bold text-[9px] text-pink-300">You</div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-center text-zinc-500 font-semibold uppercase tracking-widest">
                    CLICK PIPS TO PREVIEW ATMOSPHERES
                  </p>
                </motion.div>
              )}

              {/* SLIDE 5: Final Get Started / Download mockup info */}
              {currentSlide === 5 && (
                <motion.div 
                  key="slide5"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="w-full max-w-md bg-zinc-950/60 border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center space-y-6 shadow-2xl"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-pink-500 to-yellow-500 flex items-center justify-center shadow-xl shadow-pink-500/30">
                    <span className="font-black text-4xl text-white">M</span>
                  </div>

                  <div className="text-center">
                    <h3 className="text-2xl font-black text-white">Ready for Memuer?</h3>
                    <p className="text-xs text-zinc-400 font-semibold mt-1">Enjoy high-privacy end-to-end secure workspace.</p>
                  </div>

                  <div className="w-full space-y-3">
                    <button 
                      onClick={handleCloseAndMarkAsSeen}
                      className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-pink-500 to-yellow-500 hover:brightness-110 active:scale-98 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Enter Secure Workspace</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <div className="flex gap-2">
                      <a 
                        href="#download-desktop"
                        onClick={(e) => { e.preventDefault(); alert("Desktop apps are fully bundled. Running securely inside your modern web environment."); }}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-center text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Desktop
                      </a>
                      <a 
                        href="#download-mobile"
                        onClick={(e) => { e.preventDefault(); alert("Mobile progressive app is completely active inside this browser context."); }}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-center text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Mobile
                      </a>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* BOTTOM NAVIGATION BAR */}
        <div className="relative z-10 px-6 py-4 bg-black/40 border-t border-white/5 flex items-center justify-between backdrop-blur-md shrink-0">
          <button 
            onClick={handleCloseAndMarkAsSeen}
            className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            Skip Entire Walkthrough
          </button>

          <div className="flex items-center gap-3">
            <button 
              onClick={handlePrevSlide}
              disabled={currentSlide === 0}
              className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-zinc-300 disabled:opacity-20 disabled:pointer-events-none hover:bg-white/10 hover:text-white text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
            >
              Back
            </button>
            
            {currentSlide < slides.length - 1 ? (
              <button 
                onClick={handleNextSlide}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-yellow-500 hover:brightness-110 text-white text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-1 cursor-pointer"
              >
                <span>Next Feature</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button 
                onClick={handleCloseAndMarkAsSeen}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-yellow-500 hover:brightness-110 text-white text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Finish & Start Chat</span>
                <Shield className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
