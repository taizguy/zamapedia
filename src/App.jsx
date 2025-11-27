import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import welcomeImg from './assets/welcome.png';
import fheImg from './assets/fhe.png';
import { BookOpen, Code, Terminal, Zap, ExternalLink, AlertTriangle, User, Link } from 'lucide-react';

// --- CONFIGURATION & COLORS ---
const API_CONFIG = {
    model: 'gemini-2.5-flash-preview-09-2025',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent',
    apiKey: 'AIzaSyCA7pEuVe2bLWGK9TueD0ndrcdOP4F7LE8', // set via environment or runtime
    maxRetries: 5,
    initialDelay: 1000,
};

// Frontend API base (set via Netlify env: VITE_API_BASE_URL)
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// Custom Color Definitions
const ACCENT_YELLOW = '#ffd208';
const TEXT_GRAY = 'text-gray-900';
const BG_WHITE = 'bg-white';

// --- DUMMY USER ID (for state management simulation) ---
const userId = 'USER_ZAMA_DEV_SESSION';
const LiveBackgroundCharacter = ({ imgSrc }) => {
    const [ttsAvailable, setTtsAvailable] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isClipPlaying, setIsClipPlaying] = useState(false);
    const audioRef = useRef(null);
    const [isPopped, setIsPopped] = useState(false);
    const [isWaving, setIsWaving] = useState(false);
    const popTimeoutRef = useRef(null);

    const speak = useCallback(() => {
        try {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                // If already speaking, cancel to toggle off
                if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
                    window.speechSynthesis.cancel();
                    setIsSpeaking(false);
                    console.debug('TTS cancelled');
                     return (
                        <div
                            className={`w-full max-w-4xl mx-auto p-6 sm:p-8 rounded-xl shadow-lg mt-8 mb-12 transition-all duration-500 ${BG_WHITE}`}
                            style={{...zamaShadow, minHeight: '300px', color: '#000' }}
                        >
                            <h2 className="text-xl font-medium mb-4 pb-2 border-b border-gray-200" style={{ color: '#000' }}>
                                <BookOpen className="inline w-6 h-6 mr-2 mb-1" />
                                ZamaPedia Answer
                            </h2>
                            <div className="text-center py-12">
                                <Zap className="w-12 h-12 mx-auto mb-4" style={{ color: '#db3434ff' }} />
                                        <p className={`text-2xl font-light text-black`}>
                                    {response.text}
                                </p>
                                <p className={`text-base font-light mt-4 text-gray-600`}>
                                    (Try asking about FHE, FHEVM, or Zama!)
                                </p>
                            </div>
                        </div>
                    );
                    chosen = voices.find(v => /female|woman/i.test(String(v.name || ''))) || voices.find(v => /en-US|en-GB|en-CA/.test(String(v.lang || ''))) || voices[0];
                }

                if (chosen) utter.voice = chosen;

                utter.onend = () => { setIsSpeaking(false); console.debug('TTS finished');
                    // stop pop/wave after speech ends
                    try { clearTimeout(popTimeoutRef.current); } catch(e){}
                    setIsWaving(false); setIsPopped(false);
                };
                utter.onerror = (ev) => { setIsSpeaking(false); console.warn('TTS error', ev); setIsWaving(false); setIsPopped(false); };

                setIsSpeaking(true);
                window.speechSynthesis.speak(utter);
                setTtsAvailable(true);
                console.debug('LiveBackgroundCharacter speaking with voice:', chosen?.name || chosen?.lang || 'default');
                return true;
            }
        } catch (e) {
            console.warn('Speech not available', e);
        }
        setTtsAvailable(false);
        return false;
    }, []);

    // Simple beep fallback using WebAudio so user gets audible feedback even if TTS fails
    const playBeepFallback = useCallback(() => {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine';
            o.frequency.value = 440;
            g.gain.value = 0.0001;
            o.connect(g);
            g.connect(ctx.destination);
            const now = ctx.currentTime;
            g.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
            o.start(now);
            g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
            o.stop(now + 0.5);
        } catch (e) {
            console.warn('beep fallback failed', e);
        }
    }, []);

    const handleSpeak = useCallback(() => {
        try {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                const voices = window.speechSynthesis.getVoices() || [];
                if (!voices || voices.length === 0) {
                    const onVoices = () => {
                        try {
                            window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
                            const ok = speak();
                            if (!ok) playBeepFallback();
                        } catch (e) { console.warn(e); }
                    };
                    window.speechSynthesis.addEventListener('voiceschanged', onVoices);
                    window.speechSynthesis.getVoices();
                    setTimeout(() => {
                        // trigger pop & wave when attempting to speak
                        try { clearTimeout(popTimeoutRef.current); } catch(e){}
                        setIsPopped(true); setIsWaving(true);
                        popTimeoutRef.current = setTimeout(() => { setIsWaving(false); setIsPopped(false); }, 2200);
                        const ok = speak();
                        if (!ok) playBeepFallback();
                    }, 250);
                } else {
                    try { clearTimeout(popTimeoutRef.current); } catch(e){}
                    setIsPopped(true); setIsWaving(true);
                    popTimeoutRef.current = setTimeout(() => { setIsWaving(false); setIsPopped(false); }, 2200);
                    const ok = speak();
                    if (!ok) playBeepFallback();
                }
            } else {
                playBeepFallback();
            }

            try { sessionStorage.setItem('bgCharacterSpoken', '1'); } catch (e) {}
        } catch (e) {
            console.warn('handleSpeak error', e);
        }
    }, [speak, playBeepFallback]);

    // cleanup on unmount
    useEffect(() => {
        return () => {
            try { clearTimeout(popTimeoutRef.current); } catch(e){}
            try { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } } catch(e){}
        };
    }, []);

    return (
        <div className="fixed inset-0 z-30 pointer-events-none">
            <div className="absolute top-6 right-6 pointer-events-auto">
                <div className="relative">
                    <img
                        src={imgSrc}
                        alt="Zama"
                        className={`w-44 h-44 object-cover rounded-full shadow-lg animate-float-slow cursor-pointer ${isPopped ? 'pop-out' : ''}`}
                        onClick={() => { if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); setIsPopped(false); setIsWaving(false); } else { handleSpeak(); } }}
                    />
                    {/* Play button explicitly triggers speech (user gesture) */}
                    <button
                        aria-label="Play greeting"
                        onClick={() => {
                            if (isSpeaking) {
                                window.speechSynthesis.cancel();
                                setIsSpeaking(false);
                            } else {
                                handleSpeak();
                            }
                        }}
                        className="absolute -left-3 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-2 shadow-md focus:outline-none"
                        style={{ pointerEvents: 'auto', zIndex: 1000 }}
                    >
                        {isSpeaking ? '⏸' : '🔊'}
                    </button>
                    {/* Play clip button: will try to play /audio/gzama.mp3 if present, otherwise a smooth melody fallback */}
                    <button
                        aria-label="Play clip"
                        onClick={async () => {
                            try {
                                if (isClipPlaying) {
                                    if (audioRef.current) {
                                        audioRef.current.pause();
                                        audioRef.current.currentTime = 0;
                                    }
                                    setIsClipPlaying(false);
                                    return;
                                }

                                let audio = audioRef.current;
                                if (!audio) {
                                    audio = new Audio('/audio/gzama.mp3');
                                    audio.crossOrigin = 'anonymous';
                                    audioRef.current = audio;
                                }

                                audio.onended = () => { setIsClipPlaying(false); setIsWaving(false); setIsPopped(false); };
                                audio.onerror = (e) => { console.warn('audio play error', e); setIsClipPlaying(false); };

                                // trigger pop & wave for the clip play
                                try { clearTimeout(popTimeoutRef.current); } catch(e){}
                                setIsPopped(true); setIsWaving(true);
                                popTimeoutRef.current = setTimeout(() => { setIsWaving(false); setIsPopped(false); }, 2200);
                                await audio.play();
                                setIsClipPlaying(true);
                                try { sessionStorage.setItem('bgCharacterSpoken', '1'); } catch (e) {}
                                return;
                            } catch (err) {
                                console.debug('No external clip or failed to play, using synthesized melody fallback', err);
                            }

                            try {
                                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                                if (!AudioCtx) return;
                                const ctx = new AudioCtx();
                                // trigger pop & wave for the synthesized melody fallback
                                try { clearTimeout(popTimeoutRef.current); } catch(e){}
                                setIsPopped(true); setIsWaving(true);
                                popTimeoutRef.current = setTimeout(() => { setIsWaving(false); setIsPopped(false); }, 2200);
                                setIsClipPlaying(true);
                                const now = ctx.currentTime;
                                const o1 = ctx.createOscillator();
                                const g1 = ctx.createGain();
                                o1.type = 'sine'; o1.frequency.value = 660; g1.gain.value = 0.0001;
                                o1.connect(g1); g1.connect(ctx.destination);
                                g1.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
                                o1.start(now);
                                g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
                                o1.stop(now + 0.35);

                                const o2 = ctx.createOscillator();
                                const g2 = ctx.createGain();
                                o2.type = 'sine'; o2.frequency.value = 880; g2.gain.value = 0.0001;
                                o2.connect(g2); g2.connect(ctx.destination);
                                g2.gain.exponentialRampToValueAtTime(0.09, now + 0.18);
                                o2.start(now + 0.18);
                                g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
                                o2.stop(now + 0.65);

                                setTimeout(() => { setIsClipPlaying(false); setIsWaving(false); setIsPopped(false); }, 700);
                                try { sessionStorage.setItem('bgCharacterSpoken', '1'); } catch (e) {}
                            } catch (e) {
                                console.warn('melody fallback failed', e);
                            }
                        }}
                        className="absolute -left-12 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-2 shadow-md focus:outline-none"
                        style={{ pointerEvents: 'auto', zIndex: 1000 }}
                    >
                        {isClipPlaying ? '⏸' : '▶'}
                    </button>
                    <div className="speech-bubble">gZama</div>
                    {/* Hand bubble positioned near avatar; shows animated wave while active */}
                    {/* <div className="hand-bubble" aria-hidden>
                        <span className={isWaving ? 'hand-wave' : ''}>👋</span>
                    </div> */}
                    {!ttsAvailable && (
                        <div className="text-xs text-red-600 mt-2">TTS unavailable — click to play a sound</div>
                    )}
                </div>
            </div>
        </div>
    );
};


//COLORS
const title = "ZAMAPEDIA";
const colors = [
  "text-red-500",
  "text-orange-500",
  "text-amber-500",
  "text-yellow-500",
  "text-green-500",
  "text-teal-500",
  "text-blue-500",
  "text-purple-500",
  "text-pink-500",
];

// --- Z Canvas Background (full-screen interactive background) ---
const ZCanvas = () => {
    const ref = useRef(null);

    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        function resize() {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = Math.floor(window.innerWidth * dpr);
            canvas.height = Math.floor(window.innerHeight * dpr);
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        resize();
        window.addEventListener('resize', resize);

        const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        function onMove(e) { mouse.x = e.clientX; mouse.y = e.clientY; }
        window.addEventListener('mousemove', onMove);

        let raf = null;

        function draw() {
            const w = canvas.width / (window.devicePixelRatio || 1);
            const h = canvas.height / (window.devicePixelRatio || 1);
            // black background
            ctx.fillStyle = '#ffffffff';
            ctx.fillRect(0, 0, w, h);

            const cx = w / 2;
            const cy = h / 2;
            const dx = (mouse.x - cx) / w;
            const dy = (mouse.y - cy) / h;

            const size = Math.min(w, h) * 0.24;

            ctx.save();
            // subtle parallax translate
            ctx.translate(cx + dx * 80, cy + dy * 40);
            // small rotation based on mouse
            ctx.rotate(-dx * 0.2 + dy * 0.05);

            // draw layered Z to simulate depth
            const layers = 5;
            for (let i = layers - 1; i >= 0; i--) {
                const offset = (i - (layers - 1) / 2) * 6;
                const alpha = 0.12 + (i / layers) * 0.88;
                ctx.font = `${size}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = `rgba(255, 210, 8, ${alpha})`;
                // slight skew effect via scale
                ctx.save();
                ctx.translate(offset, offset * 0.6);
                ctx.fillText('Z', 0, 0);
                ctx.restore();
            }

            // thin dark outline for contrast
            ctx.lineWidth = Math.max(2, size * 0.02);
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.strokeText('Z', 0, 0);

            ctx.restore();

            raf = requestAnimationFrame(draw);
        }

        draw();

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', onMove);
        };
    }, []);

    return <canvas ref={ref} className="fixed inset-0 w-full h-full z-0 pointer-events-none" />;
};

// Animated smiling background using the provided welcome image.
const AnimatedWelcomeBackground = ({ imgSrc }) => {
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const onMove = (e) => {
            const rect = el.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            // set CSS vars for parallax
            el.style.setProperty('--mx', (x * 18).toFixed(2) + 'px');
            el.style.setProperty('--my', (y * 10).toFixed(2) + 'px');
            // move eyes slightly to simulate looking
            el.style.setProperty('--eye-x', (x * 6).toFixed(2) + 'px');
            el.style.setProperty('--eye-y', (y * 3).toFixed(2) + 'px');
        };

        const onLeave = () => {
            el.style.setProperty('--mx', '0px');
            el.style.setProperty('--my', '0px');
            el.style.setProperty('--eye-x', '0px');
            el.style.setProperty('--eye-y', '0px');
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseout', onLeave);

        // periodic blink trigger via CSS class toggle and other micro-animations
        let blinkTimer = null;
        let microTimer = null;

        const blink = () => {
            if (!el) return;
            el.classList.add('welcome-blink');
            setTimeout(() => el && el.classList.remove('welcome-blink'), 220);
            // schedule next blink
            blinkTimer = setTimeout(blink, 2500 + Math.random() * 3500);
        };

        // Micro animations to keep the background continuously doing things
        const microAnimate = () => {
            if (!el) return;
            const choice = Math.random();
            // 40% gaze shift, 25% smile pulse, 20% wink, 15% head tilt
            if (choice < 0.4) {
                // quick glance: set eye vars briefly
                const rx = (Math.random() * 20 - 10).toFixed(1) + 'px';
                const ry = (Math.random() * 8 - 4).toFixed(1) + 'px';
                el.style.setProperty('--eye-x', rx);
                el.style.setProperty('--eye-y', ry);
                setTimeout(() => {
                    el.style.setProperty('--eye-x', '0px');
                    el.style.setProperty('--eye-y', '0px');
                }, 700 + Math.random() * 900);
            } else if (choice < 0.65) {
                // smile pulse
                el.classList.add('smile-wide');
                setTimeout(() => el && el.classList.remove('smile-wide'), 900 + Math.random() * 600);
            } else if (choice < 0.85) {
                // wink: choose left or right
                if (Math.random() < 0.5) {
                    el.classList.add('wink-left');
                    setTimeout(() => el && el.classList.remove('wink-left'), 260 + Math.random() * 420);
                } else {
                    el.classList.add('wink-right');
                    setTimeout(() => el && el.classList.remove('wink-right'), 260 + Math.random() * 420);
                }
            } else {
                // small head tilt
                const tilt = (Math.random() * 6 - 3).toFixed(2) + 'deg';
                el.style.setProperty('--tilt', tilt);
                setTimeout(() => el && el.style.setProperty('--tilt', '0deg'), 1200 + Math.random() * 1400);
            }

            // schedule next micro animation
            microTimer = setTimeout(microAnimate, 1200 + Math.random() * 2600);
        };

        // start blink and micro animations
        blinkTimer = setTimeout(blink, 1500 + Math.random() * 1800);
        microTimer = setTimeout(microAnimate, 1000 + Math.random() * 1200);

        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseout', onLeave);
            clearTimeout(blinkTimer);
            clearTimeout(microTimer);
        };
    }, []);

    return (
        <div ref={ref} className="animated-welcome-bg fixed inset-0 z-10 pointer-events-none opacity-30">
            <div className="welcome-img-wrap" aria-hidden>
                <img src={imgSrc} alt="Welcome" className="welcome-img"/>

                {/* Cheek blush elements (appear when smiling) */}
                <div className="cheek cheek-left" aria-hidden />
                <div className="cheek cheek-right" aria-hidden />

                {/* Sparkles that emit around the face when smile widens */}
                <div className="sparkles" aria-hidden>
                    <span className="sparkle" />
                    <span className="sparkle" />
                    <span className="sparkle" />
                    <span className="sparkle" />
                    <span className="sparkle" />
                    <span className="sparkle" />
                </div>

                {/* SVG overlay provides eyes and mouth that animate */}
                <svg className="welcome-overlay" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice">
                    {/* left eye */}
                    <g className="eye left-eye" transform="translate(230,240)">
                        <circle className="eye-white" cx="0" cy="0" r="24" fill="#e44a4aff" opacity="0.95" />
                        <circle className="eye-pupil" cx="var(--eye-x,0)" cy="var(--eye-y,0)" r="10" fill="#111827" />
                        <ellipse className="eye-lid" cx="0" cy="0" rx="24" ry="24" fill="#000000ff" opacity="0" />
                    </g>
                    {/* right eye */}
                    <g className="eye right-eye" transform="translate(370,240)">
                        <circle className="eye-white" cx="0" cy="0" r="24" fill="#fff243ff" opacity="0.95" />
                        <circle className="eye-pupil" cx="var(--eye-x,0)" cy="var(--eye-y,0)" r="10" fill="#111827" />
                        <ellipse className="eye-lid" cx="0" cy="0" rx="24" ry="24" fill="#000" opacity="0" />
                    </g>

                    {/* mouth path: stroke drawn to form a smile */}
                    <path className="mouth smile-path" d="M210,360 C260,420 340,420 390,360" fill="transparent" stroke="#ffee04ff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                    
                </svg>
                
            </div>
            
        </div>
    );
};

// --- UTILITY FUNCTIONS ---

/**
 * Creates a markdown link/citation block for the source attributions.
 * @param {Array<Object>} sources - List of source objects ({uri, title}).
 * @returns {string} - HTML string for the source block.
 */
const createSourcesBlock = (sources) => {
    if (!sources || sources.length === 0) return '';

    const sourceLinks = sources.map((source, index) => {
        // Generate a simplified display text for the link
        let displayText = source.title || new URL(source.uri).hostname;
        // Limit display text length to keep the block compact
        if (displayText.length > 50) {
            displayText = displayText.substring(0, 47) + '...';
        }

        // The actual source link is created here, using target="_blank" to open in a new tab
        return `<div class="mb-1 text-xs"> <a href="${source.uri}" target="_blank" rel="noopener noreferrer" class="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors"> <span class="font-medium mr-1 text-xs" style="color: ${ACCENT_YELLOW};">[${index + 1}]</span> <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-external-link flex-shrink-0" style="color: ${ACCENT_YELLOW}"><path d="M15 3h6v6"/><path d="M10 14L21 3"/><path d="M18 13v6a2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg> ${displayText} </a> </div>`;
    }).join('');

    return `
        <div class="mt-4 pt-4 border-t border-gray-200">
            <h5 class="text-sm font-medium mb-2" style="color: ${TEXT_GRAY};">Sources:</h5>
            ${sourceLinks}
        </div>
    `;
};


/**
 * Converts raw Gemini text response (with markdown) into styled HTML elements.
 * @param {string} text - The raw text from the Gemini model.
 * @param {Array<Object>} sources - List of source objects for citation replacement.
 * @returns {string} - The HTML formatted string.
 */
const processText = (text, sources) => {
    if (!text) return '';

    let html = text;
    let i = 0;

    // 0. AGGRESSIVE CLEANUP: Remove raw, broken HTML/CSS fragments injected by the model
    html = html.replace(/<\/?span[^>]*>/g, '');
    html = html.replace(/style="[^"]*"/g, '');
    html = html.replace(/spanstyle=[^>]*>/g, '');
    html = html.replace(/<br>/g, '\n');

    // 1. REMOVE BOLD MARKDOWN: Remove **bold** markdown indicators entirely to keep everything font-light.
    html = html.replace(/\*\*(.*?)\*\*/g, '$1');

    // 2. Do not apply color highlighting to response text — keep response font black only

    // 3. Process line-by-line for structured markdown elements
    const lines = html.split('\n');
    let finalHtml = '';
    let inList = false;
    let inTable = false;

    lines.forEach((line, index) => {
        line = line.trim();

        // --- 3.1 TABLE PARSING BLOCK ---
        const isTableSeparator = line.match(/^\|-+\|/);
        const isTableRow = line.startsWith('|') && line.endsWith('|');

        if (isTableRow && !isTableSeparator) {
            if (!inTable) {
                // START OF TABLE BLOCK
                finalHtml += `<table class="min-w-full divide-y divide-gray-200 my-4 border border-gray-200 rounded-lg overflow-hidden"><thead>`;
                
                // Assuming the first non-separator row is the header
                const cells = line.split('|').slice(1, -1).map(c => c.trim());
                finalHtml += '<tr>';
                cells.forEach(cell => {
                    finalHtml += `<th class="px-4 py-2 text-left text-sm font-medium text-gray-500 uppercase tracking-wider bg-gray-50">${cell}</th>`;
                });
                finalHtml += '</tr></thead><tbody>';
                inTable = true;
                i++;
                return;
            }

            // Regular table row
            const cells = line.split('|').slice(1, -1).map(c => c.trim());
            finalHtml += '<tr>';
            cells.forEach(cell => {
                // Apply font-light to table cell content
                finalHtml += `<td class="px-4 py-2 whitespace-normal text-sm font-light text-gray-900">${cell}</td>`;
            });
            finalHtml += `</tr>`;
            i++;
            return;
        } else if (inTable && !isTableRow) {
            // END OF TABLE BLOCK
            finalHtml += '</tbody></table>';
            inTable = false;
        }


        // --- 3.2 HEADING PARSING BLOCK ---
        if (line.startsWith('###')) {
            if (inList) {
                finalHtml += '</ul>';
                inList = false;
            }
            const headingContent = line.substring(3).trim();
            // Headings remain font-light for consistency
            finalHtml += `<h4 class="text-lg font-light mt-4 mb-2 text-gray-900" style="border-bottom: 2px solid ${ACCENT_YELLOW}; padding-bottom: 4px;">${headingContent}</h4>`;
            i++;
            return;
        }


        // --- 3.3 LIST PARSING BLOCK ---
        if (line.startsWith('*') || line.startsWith('-') || line.includes(':')) {
            if (!inList) {
                finalHtml += '<ul class="list-none space-y-2 pl-4">';
                inList = true;
            }

            let listItemContent = line.replace(/^[\*-]\s*/, '').trim();

            // Handle Key: Value pairs for definition list style
            const colonIndex = listItemContent.indexOf(':');
            if (colonIndex > 0 && colonIndex < 40) {
                const key = listItemContent.substring(0, colonIndex).trim();
                const value = listItemContent.substring(colonIndex + 1).trim();
                listItemContent = `<span class="font-medium" style="color: ${ACCENT_YELLOW};">${key}:</span> ${value}`;
            }

            finalHtml += `<li class="flex items-start">
                <span class="mr-2 pt-1 text-sm font-light text-gray-900">•</span>
                <p class="text-base font-light text-gray-900 flex-1">${listItemContent}</p>
            </li>`;

            i++;
            return;
        } else if (inList) {
            // END OF LIST BLOCK
            finalHtml += '</ul>';
            inList = false;
        }

        // --- 3.4 CITATION REPLACEMENT (must come after list/heading/table parsing to avoid conflicts) ---
        // Replace [source: x] with HTML element that links to the sources block
        if (line.includes('[source:')) {
            line = line.replace(/\[source:\s*(\d+)\]/g, (match, sourceIndex) => {
                const index = parseInt(sourceIndex) - 1;
                    if (sources && sources[index] && sources[index].uri) {
                    // Link inline citation directly to the source URL and show title (or hostname) for clarity
                    let title = sources[index].title || '';
                    try {
                        if (!title) title = new URL(sources[index].uri).hostname;
                    } catch (e) {
                        title = sources[index].uri;
                    }
                    // truncate long titles
                    if (title && title.length > 60) title = title.slice(0, 57) + '...';
                    return ` <a href="${sources[index].uri}" target="_blank" rel="noopener noreferrer" title="View Source: ${sources[index].title || sources[index].uri}" class="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors rounded px-1 ml-1">${title}</a>`;
                }
                return ''; // Remove broken citations
            });
        }
        
        // --- 3.5 PARAGRAPH / DEFAULT TEXT ---
        if (line) {
            finalHtml += `<p class="text-base font-light mb-4 text-gray-900">${line}</p>`;
        }
    });

    // Add sources block at the end (linked by the citation anchors)
    finalHtml += `<div id="source-anchor"></div>`;
    finalHtml += createSourcesBlock(sources);

    return finalHtml;
};


/**
 * Exponential backoff fetch utility for API robustness.
 */
const fetchWithRetry = async (url, options, retries = 0) => {
    if (retries >= API_CONFIG.maxRetries) {
        throw new Error("Maximum API retries reached. The API might be down or heavily throttled.");
    }

    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            // Treat 429 (Too Many Requests) and 5xx errors as transient
            if (response.status === 429 || response.status >= 500) {
                throw new Error(`Transient error: ${response.status}`);
            }
            throw new Error(`API Error: ${response.statusText}`);
        }

        return response;
    } catch (error) {
        console.warn(`Fetch attempt ${retries + 1} failed: ${error.message}. Retrying...`);

        if (error.message.includes('Transient error') || retries < API_CONFIG.maxRetries - 1) {
            const delay = API_CONFIG.initialDelay * Math.pow(2, retries);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, options, retries + 1);
        }

        throw error;
    }
}


// --- AI QUERY LOGIC ---

/**
 * Custom React hook for managing AI interactions.
 */
const useAIQuery = () => {
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleQuery = useCallback(async (q) => {
        const currentQuery = q.trim();
        if (!currentQuery) return;

        // Quick client-side relevance check to avoid unnecessary API calls
        try {
            const score = computeRelevanceScore(currentQuery);
            if (score < 0.35) {
                // Below threshold: refuse politely and avoid API call
                setResponse({ text: 'i only gZama bro!', sources: [] });
                setLoading(false);
                return;
            }
        } catch (e) {
            console.warn('Relevance check failed', e);
        }

        setLoading(true);
        setError(null);
        setResponse(null); // Clear previous response when new query is submitted

        // The user's environment will supply the API Key
        const fullApiUrl = `${API_CONFIG.apiUrl}?key=${API_CONFIG.apiKey}`;

        // ENHANCED SYSTEM PROMPT: Prioritize grounding and Zama-specific context
        let systemPrompt = `You are ZamaPedia, a specialized AI assistant. Your primary function is to provide comprehensive, factual, and extremely clear answers about Zama, Fully Homomorphic Encryption (FHE), the FHEVM, and related cryptographic concepts (like TFHE, Paillier, ZKPs).

**Constraints for your response:**
1.  **If the user's query is completely irrelevant to Zama, Fully Homomorphic Encryption (FHE), the FHEVM, or related cryptographic concepts (like TFHE, Paillier, ZKPs), your entire response must be the exact phrase: 'i only gZama bro!'. Do not include any other text, markdown, or sources if this rule applies.**
2.  **Otherwise (if the query is relevant):** Strictly use external search to ground every factual statement. If you cannot find a source, state this clearly.
3.  **Focus on simplicity and clarity.** Explain complex concepts in a way a non-technical audience can grasp.
4.  **Do not use bold markdown (\*\*)** in your response, as the client handles highlighting.
5.  **Format your response with standard markdown only (headings, lists, tables).** Do not inject any raw HTML, CSS, or span tags.
6.  **Always include sources** using the exact format: [source: X], where X is the number of the source from your search tool. If a sentence uses information from multiple sources, include all of them, e.g., [source: 1, 3].
7.  **Do not include a separate "Sources" section.** The application handles rendering the source links based on the citations.
8.  **Ensure all links are provided by the grounding metadata** and do not hallucinate summary text as full URLs on separate lines if found.`;


        const payload = {
            contents: [{ parts: [{ text: currentQuery }] }],
            tools: [{ "google_search": {} }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
        };

        try {
            const fetchOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            };

            const apiResponse = await fetchWithRetry(fullApiUrl, fetchOptions);
            const result = await apiResponse.json();

            const candidate = result.candidates?.[0];

            if (candidate && candidate.content?.parts?.[0]?.text) {
                const text = candidate.content.parts[0].text;
                let sources = [];

                // Check for the specific "i only gZama bro!" response
                if (text.trim() === 'i only gZama bro!') {
                    setResponse({ text, sources: [] });
                    setLoading(false);
                    return; // Exit early if the special response is triggered
                }


                // Normal response path: extract sources
                const groundingMetadata = candidate.groundingMetadata;

                if (groundingMetadata && groundingMetadata.groundingAttributions) {
                    sources = groundingMetadata.groundingAttributions
                        .map(attribution => ({
                            uri: attribution.web?.uri,
                            title: attribution.web?.title,
                        }))
                        .filter(source => source.uri && source.title);
                }

                setResponse({ text, sources });

            } else {
                setError('Received an empty or malformed response from the AI model. Try re-wording your query.');
            }

        } catch (err) {
            console.error('AI Query Error:', err);
            setError(`Failed to connect to the AI Assistant: ${err.message}.`);
        } finally {
            setLoading(false);
        }
    }, []);

    return { query, setQuery, response, loading, error, handleQuery, setResponse };
}

// --- COMPONENTS ---

/**
 * Renders the AI's response with custom styling and source links.
 */
const AIResultDisplay = ({ response, loading, error }) => {
    // Custom shadow style for the Zama effect
    const zamaShadow = {
        boxShadow: `0 0 10px rgba(255, 210, 8, 0.5)`
    };

    // Placeholder for loading state (The Zama Girl GIF/Base64 Image)
            const LoadingPlaceholder = () => (
        <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <div
                className="w-16 h-16 rounded-full bg-cover bg-center animate-spin-slow"
                style={{
                    backgroundImage: `url(${welcomeImg})`,
                    backgroundSize: '150%', // Zoom in a bit
                    backgroundPosition: 'center',
                    border: `4px solid ${ACCENT_YELLOW}`,
                }}
            ></div>
            <p className={`text-sm font-medium text-gray-900`} style={{ color: ACCENT_YELLOW }}>
                Processing Zama knowledge...
            </p>
        </div>
    );

    // Placeholder for error state
    const ErrorPlaceholder = () => (
        <div className="flex flex-col items-center justify-center p-12 space-y-4 text-center">
            <AlertTriangle className="w-8 h-8" style={{ color: ACCENT_YELLOW }} />
            <h3 className={`text-lg font-medium text-gray-900`}>
                ZamaPedia Error
            </h3>
            <p className={`text-sm font-light text-gray-900 max-w-lg`}>
                {error}
                <br/>
                Please try again or re-word your question.
            </p>
        </div>
    );

    if (loading) return <LoadingPlaceholder />;
    if (error) return <ErrorPlaceholder />;

    if (response) {
        // Special case handling for "i only gZama bro!"
        if (response.text.trim() === 'i only gZama bro!') {
                return (
            <div
                className={`w-full max-w-4xl mx-auto p-6 sm:p-8 rounded-xl shadow-lg mt-8 mb-12 transition-all duration-500 ${BG_WHITE}`}
                style={{...zamaShadow, minHeight: '300px', color: '#000' }}
            >
                    <h2 className="text-xl font-medium mb-4 pb-2 border-b border-gray-200" style={{ color: ACCENT_YELLOW }}>
                        <BookOpen className="inline w-6 h-6 mr-2 mb-1" />
                        ZamaPedia Answer
                    </h2>
                    <div className="text-center py-12">
                        <Zap className="w-12 h-12 mx-auto mb-4" style={{ color: ACCENT_YELLOW }} />
                                <p className={`text-2xl font-light text-gray-900`}>
                            {response.text}
                        </p>
                        <p className={`text-base font-light mt-4 text-gray-600`}>
                            (Try asking about FHE, FHEVM, or Zama!)
                        </p>
                    </div>
                </div>
            );
        }

        // Normal response rendering
        const processedHtml = processText(response.text, response.sources);

        return (
            <div
                className={`w-full max-w-4xl mx-auto p-6 sm:p-8 rounded-xl shadow-lg mt-8 mb-12 transition-all duration-500 ${BG_WHITE}`}
                style={{...zamaShadow, minHeight: '300px' }}
            >
                <h2 className="text-xl font-medium mb-4 pb-2 border-b border-gray-200" style={{ color: ACCENT_YELLOW }}>
                    <BookOpen className="inline w-6 h-6 mr-2 mb-1" />
                    ZamaPedia Answer
                </h2>
                {/* DANGER: Setting HTML directly is necessary for structured markdown rendering */}
                <div dangerouslySetInnerHTML={{ __html: processedHtml }} />
            </div>
        );
    }

    return null;
}

// --- MAIN APP COMPONENT ---

const App = () => {
    const { query, setQuery, response, loading, error, handleQuery, setResponse } = useAIQuery();

    // NOTE: welcome overlay removed per user request

    // FIX: Only clear AI response when the query is empty.
    useEffect(() => {
        if (query.length === 0) {
            setResponse(null);
        }
    }, [query, setResponse]);


    return (
        <div className={`min-h-screen relative bg-transparent` }>
            <ZCanvas />
            <AnimatedWelcomeBackground />
            {/* Tailwind quick-test banner (remove after debugging) */}
            
            {/* 1. Live Background Character & User Header */}
            <LiveBackgroundCharacter imgSrc={welcomeImg} />

            {/* <header className={`fixed top-0 right-0 p-4 z-50`}>
                <button
                    title={`User ID: ${userId}`}
                    className={`p-2 rounded-full border border-gray-300 hover:shadow-md transition-shadow bg-white`}
                >
                    <User className="w-5 h-5 text-gray-900" />
                </button>
            </header> */}


            {/* 2. Centered Search Focus Area (Hero) */}
            <div
                id="hero-search"
                className={`flex flex-col items-center min-h-screen w-full relative z-10 p-4 ${response ? 'justify-start pt-20' : 'justify-center'}`}
            >
                {/* Zamapedia Title/Logo (Perfectly Aligned, lighter style) */}
                {/* <div className={`flex items-end mb-6 text-gray-900`}>
                    <h1 className="text-4xl font-bold transition-all duration-300 hover:scale-[1.01]">
                        Zamapedia
                    </h1>
                    <span className="text-xs font-medium ml-2 mb-0.5 p-1 px-2 rounded-md text-gray-600 border border-gray-300 transform transition-all duration-300 hover:shadow-sm">
                        AI Assistant
                    </span>
                </div> */}
                

{/* <div className="flex items-end mb-6 text-gray-900">
  <h1 className="text-4xl font-bold transition-all duration-300 hover:scale-[1.01]">
    {title.split("").map((char, i) => (
      <span key={i} className={colors[i]}>
        {char}
      </span>
    ))}
  </h1>

  <span className="text-xs font-medium ml-2 mb-0.5 p-1 px-2 rounded-md text-gray-600 border border-gray-300 hover:shadow-sm transition-all">
    AI Assistant
  </span>
</div> */}


                {/* Search Bar */}
                <div className="w-full max-w-xl">
                    <form onSubmit={(e) => { e.preventDefault(); handleQuery(query); }} className="relative">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ask about FHE, Zama, FHEVM, Rand Hindi, or TFHE..."
                            disabled={loading}
                            className={`w-full p-4 pl-12 pr-4 text-base rounded-full border-2 ${loading ? 'border-gray-200' : `border-gray-300 hover:border-[#ffd208]`} focus:ring-0 focus:border-[#ffd208] transition-colors duration-200 bg-white text-gray-900 font-light shadow-md hover:shadow-lg`}
                            style={{ paddingLeft: '3rem' }} // For icon
                        />
                        <Zap
                            className={`absolute left-4 top-3/2  transform -translate-y-1/2 w-5 h-5 transition-colors ${loading ? 'text-gray-400' : `text-gray-600`}`}
                            style={{ color: ACCENT_YELLOW }}
                        />
                        <button
                            type="submit"
                            disabled={loading || !query.trim()}
                            className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-all duration-300 ${loading || !query.trim() ? 'bg-gray-200 text-gray-400' : `bg-[#ffd208] text-gray-900 hover:bg-opacity-90`}`}
                            title="Submit Query"
                        >
                            <Terminal className="w-5 h-5" />
                        </button>
                    </form>
                </div>

                {/* AI Result Area */}
                <AIResultDisplay response={response} loading={loading} error={error} />
            </div>

            {/* 3. Minimal Footer Bar (Bottom Left) */}
            <footer className={`fixed bottom-0 left-0 w-full text-xs text-gray-500 p-4 z-40`}>
                <div className="max-w-7xl mx-auto flex justify-start items-center px-4 sm:px-6 lg:px-8 space-x-4">
                    {/* Legal Links (Bottom Left) */}
                    <a href="https://zama.ai" target="_blank" className="hover:text-gray-900 transition-colors">zama</a>
                    <a href="https://docs.zama.org/protocol/zama-protocol-litepaper" target="_blank" className="hover:text-gray-900 transition-colors">whitepaper</a>
                    <a href="https://x.com/zama" target="_blank" className="hover:text-gray-900 transition-colors">x</a>
                </div>
            </footer>

        </div>
    );
};

export default App;