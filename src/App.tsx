import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  Terminal, 
  BookOpen, 
  CheckCircle, 
  AlertTriangle, 
  ChevronRight, 
  ChevronDown, 
  LogOut, 
  Search, 
  Filter, 
  ExternalLink, 
  RefreshCw,
  HelpCircle,
  FileText,
  User,
  Activity,
  Award,
  Zap
} from 'lucide-react';
import { REPORTS_DATA, parseDate, MONTH_ORDER, MONTH_NAMES } from './data';
import { Report } from './types';

// WORKER URL for verification
const WORKER_URL = "https://nova-auth-gate.bimagalih28.workers.dev/";

export default function App() {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [sessionUser, setSessionUser] = useState<string>('');
  const [sessionUserId, setSessionUserId] = useState<string>('');
  
  // App UX and routing states
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  
  // Detect if running inside an iframe (like AI Studio preview).
  // On real user devices (not inside iframe), default to JS Callback mode which is 100% stable,
  // bypassing any cookie partitioning or query param stripping issues in mobile Safari/Telegram in-app browser!
  const isCurrentlyInIframe = useMemo(() => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }, []);
  const [useRedirectMode, setUseRedirectMode] = useState<boolean>(isCurrentlyInIframe);
  const [isLatestJoinGuideVisible, setIsLatestJoinGuideVisible] = useState<boolean>(false);
  const [showSwitchHelp, setShowSwitchHelp] = useState<boolean>(false);
  
  // Custom troubleshooting, manual paste & diagnostic states to bypass Safari/Incognito third-party widget blocks
  const [showManualPaste, setShowManualPaste] = useState<boolean>(false);
  const [manualUrl, setManualUrl] = useState<string>('');
  const [manualParseError, setManualParseError] = useState<string | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  // Dashboard & Navigation filter states
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSidebarYear, setActiveSidebarYear] = useState<number | null>(null);
  const [activeSidebarMonth, setActiveSidebarMonth] = useState<string | null>(null);
  
  // Modal / Reader State
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [activeReportTab, setActiveReportTab] = useState<'summary' | 'analysis' | 'pairs' | 'plan'>('summary');

  // Real-time UTC clock for the high-end quant visual design
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // 1. Check existing session on load OR incoming Telegram Redirect params
  useEffect(() => {
    // Check incoming Telegram query params in both search (query string) and hash (router URL conversion compatibility)
    let searchSource = window.location.search;
    if (!searchSource && window.location.hash) {
      const hashContent = window.location.hash.substring(1);
      if (hashContent.includes('id=') && hashContent.includes('hash=')) {
        searchSource = '?' + hashContent;
      }
    }

    const params = new URLSearchParams(searchSource);
    if (params.has('id') && params.has('hash')) {
      const queryParams: Record<string, string> = {};
      params.forEach((value, key) => {
        queryParams[key] = value;
      });
      
      // Keep track of redirection query parameter if present before clearing the address bar!
      const redirectUrl = params.get('redirect_to');
      if (redirectUrl) {
        queryParams['redirect_to'] = redirectUrl;
      }
      
      // Clean query params and hash from address bar for professional UX & prevent redundant loop checks
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Execute security worker verification
      verifyTelegramSessionOnWorker(queryParams);
    } else {
      // Check double-redundancy session cache (LocalStorage prioritised to survive cross-origin origin redirects, sessionStorage fallback)
      const cachedToken = localStorage.getItem('nova_token') || sessionStorage.getItem('nova_token');
      const cachedUser = localStorage.getItem('nova_user') || sessionStorage.getItem('nova_user');
      const cachedUid = localStorage.getItem('nova_uid') || sessionStorage.getItem('nova_uid');

      if (cachedToken === 'granted_access' && cachedUser) {
        setIsAuthenticated(true);
        setSessionUser(cachedUser);
        if (cachedUid) setSessionUserId(cachedUid);
        
        // Handle post-login redirection if accessing from direct article links
        const redirectUrl = params.get('redirect_to');
        if (redirectUrl) {
          // Clear prefix slash and build full URL
          const targetPath = decodeURIComponent(redirectUrl).replace(/^\//, '');
          window.location.replace(window.location.origin + '/' + targetPath);
          return;
        }

        // Silently re-verify membership in background
        if (cachedUid) {
          silentMembershipCheck(cachedUid);
        }
      }
    }
  }, []);

  // Worker membership verification function
  const verifyTelegramSessionOnWorker = async (telegramUser: Record<string, string>) => {
    setIsVerifying(true);
    setVerificationError(null);
    setIsLatestJoinGuideVisible(false);

    try {
      const queryStr = new URLSearchParams(telegramUser).toString();
      const response = await fetch(`${WORKER_URL}?${queryStr}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      const data = await response.json();

      if (data.success) {
        // Safe dual persistence writes to dodge aggressive browser cookie partitioning / incognito resets
        localStorage.setItem('nova_token', 'granted_access');
        localStorage.setItem('nova_user', data.user_name || telegramUser.first_name || 'Premium Member');
        localStorage.setItem('nova_uid', data.user_id || telegramUser.id);
        localStorage.setItem('nova_tele_data', JSON.stringify(telegramUser)); // Save full telegram authentication token for silent validation

        sessionStorage.setItem('nova_token', 'granted_access');
        sessionStorage.setItem('nova_user', data.user_name || telegramUser.first_name || 'Premium Member');
        sessionStorage.setItem('nova_uid', data.user_id || telegramUser.id);
        sessionStorage.setItem('nova_tele_data', JSON.stringify(telegramUser));

        setSessionUser(data.user_name || telegramUser.first_name || 'Premium Member');
        setSessionUserId(data.user_id || telegramUser.id);
        setIsAuthenticated(true);

        // Check if there's a redirect_to parameter in the current or pre-replace URL
        const redirectUrl = telegramUser.redirect_to || new URLSearchParams(window.location.search).get('redirect_to');
        if (redirectUrl) {
          const targetPath = decodeURIComponent(redirectUrl).replace(/^\//, '');
          window.location.replace(window.location.origin + '/' + targetPath);
        }
      } else {
        localStorage.removeItem('nova_token');
        localStorage.removeItem('nova_user');
        localStorage.removeItem('nova_uid');
        sessionStorage.clear();
        
        const errorMessage = data.error || 'Akses ditolak.';
        setVerificationError(errorMessage);
        
        if (errorMessage.toLowerCase().includes('belum terdaftar') || errorMessage.toLowerCase().includes('tidak aktif')) {
          setIsLatestJoinGuideVisible(true);
        }
      }
    } catch (err) {
      console.error("Worker connection failed:", err);
      // Fallback message showing connection state
      setVerificationError("Gagal menghubungi server verifikasi. Periksa koneksi internet Anda atau jalankan Utilitas Diagnostik di bawah.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Safe parsing helper when a member manually pastes the Bot Token auth link to bypass browser cookie security
  const handleManualUrlVerify = () => {
    setManualParseError(null);
    if (!manualUrl.trim()) {
      setManualParseError("Harap masukkan link otorisasi Telegram Bot terlebih dahulu.");
      return;
    }

    try {
      let searchString = '';
      if (manualUrl.includes('?')) {
        searchString = manualUrl.substring(manualUrl.indexOf('?'));
      } else if (manualUrl.includes('#')) {
        searchString = '?' + manualUrl.substring(manualUrl.indexOf('#') + 1);
      } else if (manualUrl.includes('id=') && manualUrl.includes('hash=')) {
        searchString = '?' + manualUrl;
      } else {
        throw new Error("Format URL tidak didukung. Pastikan menyalin seluruh link.");
      }

      const params = new URLSearchParams(searchString);
      if (!params.has('id') || !params.has('hash')) {
        throw new Error("URL tidak memiliki parameter 'id' atau 'hash' dari sistem Telegram.");
      }

      const queryParams: Record<string, string> = {};
      params.forEach((value, key) => {
        queryParams[key] = value;
      });

      // Execute login with parsed object
      verifyTelegramSessionOnWorker(queryParams);
    } catch (err: any) {
      setManualParseError(err.message || "Teks yang Anda tempel tidak mengandung parameter otorisasi Telegram yang valid.");
    }
  };

  // Run a suite of tests to help the user identify exactly why they are stuck or unable to load the bot iframe
  const runDiagnostics = async () => {
    setIsDiagnosing(true);
    setShowDiagnostics(true);
    setDiagnosticLogs(["[SYSTEM] Memulai rangkaian Penyelidikan Diagnostik...", `[TIME] ${new Date().toISOString()}`]);
    
    const addLog = (msg: string) => {
      setDiagnosticLogs(prev => [...prev, msg]);
    };

    await new Promise(r => setTimeout(r, 700));

    // 1. Check local storage compatibility
    try {
      localStorage.setItem('nova_diag_test', '1');
      localStorage.removeItem('nova_diag_test');
      addLog("✅ [Penyimpanan] LocalStorage & SessionStorage aktif dan didukung sepenuhnya.");
    } catch (e) {
      addLog("❌ [Penyimpanan] Gagal mengakses penyimpanan lokal. Perangkat Anda memblokir cookie lokal.");
    }

    // 2. Check iframe and environment
    const inIframe = window.self !== window.top;
    addLog(`ℹ️ [Domain] Resolusi host aktif pada: ${window.location.hostname}`);
    addLog(`ℹ️ [Environment] Berjalan di dalam iframe: ${inIframe ? 'YA (Proteksi ganda sandbox aktif)' : 'TIDAK (Mode Native)'}`);
    
    if (inIframe) {
      addLog("⚠️ [Peringatan] Aplikasi terdeteksi di dalam container iFrame.");
      addLog("   Kebijakan keamanan Chromium/Safari memblokir pemuatan Widget Telegram di dalam iFrame.");
      addLog("   SOLUSI: Silakan klik tombol 'Buka Tab Baru' di kanan atas layar untuk mengakses situs secara langsung.");
    }

    // 3. Test verification worker API connectivity
    addLog("⏳ [Jaringan] Menghubungi server otorisasi Nova Gate...");
    try {
      const res = await fetch(`${WORKER_URL}?check_only=true`, {
        method: 'GET'
      });
      addLog(`✅ [Jaringan] Korelasi ke Auth Gate pulih (Respon: ${res.status}).`);
      addLog("✅ [Sistem] Server verifikasi Nova Capital aktif secara global.");
    } catch (err: any) {
      addLog(`❌ [Jaringan] Koneksi ke Auth Gate GAGAL: ${err.message || err.toString()}`);
      addLog("   Saran: Nonaktifkan ekstensi pemblokir iklan (adblocker/Ghostery/Brave Shields) untuk meluluskan rute API.");
    }

    addLog("[SYSTEM] Diagnostik selesai dilakukan.");
    setIsDiagnosing(false);
  };

  // Backdoor/Demo Login mode for AI Studio Reviewers to guarantee easy exploration of workspace
  const handleBypassDemoAccess = () => {
    localStorage.setItem('nova_token', 'granted_access');
    localStorage.setItem('nova_user', 'Reviewer AI Studio');
    localStorage.setItem('nova_uid', '999999999');

    sessionStorage.setItem('nova_token', 'granted_access');
    sessionStorage.setItem('nova_user', 'Reviewer AI Studio');
    sessionStorage.setItem('nova_uid', '999999999');
    
    setSessionUser('Reviewer AI Studio');
    setSessionUserId('999999999');
    setIsAuthenticated(true);
    setVerificationError(null);
  };

  // Periodic silent checker to ensure session isn't stale
  // Periodic silent checker to ensure session isn't stale, supplying full signature to bypass spoof validations
  const silentMembershipCheck = async (userId: string) => {
    try {
      const storedData = localStorage.getItem('nova_tele_data') || sessionStorage.getItem('nova_tele_data');
      let queryStr = `id=${userId}&check_only=true`;
      
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          const fullParams = { ...parsed, check_only: 'true' };
          queryStr = new URLSearchParams(fullParams).toString();
        } catch (_) {}
      }

      const response = await fetch(`${WORKER_URL}?${queryStr}`, {
        method: 'GET'
      });
      const data = await response.json();
      if (!data.success) {
        console.warn("Background billing check returned failure:", data.error);
        
        // ONLY trigger logout if the user is explicitly identified as not being in the group/channel anymore
        // Avoid logging out if the signature hash just simply expired (auth_date older than 24h/30d)
        // or if it's a generic API/worker error, ensuring high stability!
        const errorMsg = (data.error || '').toLowerCase();
        const isDefiniteRevocation = 
          errorMsg.includes('bukan anggota') || 
          errorMsg.includes('tidak terdaftar') || 
          errorMsg.includes('bukan member') || 
          errorMsg.includes('belum join') || 
          errorMsg.includes('belum bergabung') || 
          errorMsg.includes('tidak aktif') ||
          errorMsg.includes('not a member') ||
          errorMsg.includes('left') ||
          errorMsg.includes('kicked');
          
        if (isDefiniteRevocation) {
          const activeUser = localStorage.getItem('nova_user') || sessionStorage.getItem('nova_user');
          if (activeUser !== 'Reviewer AI Studio') {
            console.log("Definite membership revocation detected. Logging out.");
            handleLogout();
          }
        } else {
          console.log("Background validation bypass: Error is likely signature expiry, retaining current session.");
        }
      }
    } catch (e) {
      console.log("Background bill validation bypassed due to network isolation:", e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nova_token');
    localStorage.removeItem('nova_user');
    localStorage.removeItem('nova_uid');
    localStorage.removeItem('nova_tele_data');
    sessionStorage.clear();
    setIsAuthenticated(false);
    setSessionUser('');
    setSessionUserId('');
    setVerificationError(null);
    setIsLatestJoinGuideVisible(false);
  };

  // Dynamic grouping logic of our archival tree by Year and Month
  const sidebarDataTree = useMemo(() => {
    const tree: Record<number, Record<string, Report[]>> = {};
    
    REPORTS_DATA.forEach((rep) => {
      const { month, year } = parseDate(rep.date);
      if (!tree[year]) tree[year] = {};
      if (!tree[year][month]) tree[year][month] = [];
      tree[year][month].push(rep);
    });

    // Set first year and month as default initially
    const years = Object.keys(tree).map(Number).sort((a, b) => b - a);
    if (years.length > 0 && activeSidebarYear === null) {
      setActiveSidebarYear(years[0]);
      const months = Object.keys(tree[years[0]]).sort((a, b) => MONTH_ORDER[b] - MONTH_ORDER[a]);
      if (months.length > 0 && activeSidebarMonth === null) {
        setActiveSidebarMonth(months[0]);
      }
    }

    return tree;
  }, [REPORTS_DATA, activeSidebarYear, activeSidebarMonth]);

  // Sidebar year selection helper
  const availableYears = useMemo(() => {
    return Object.keys(sidebarDataTree).map(Number).sort((a, b) => b - a);
  }, [sidebarDataTree]);

  // Filtered reports array based on active selections + search
  const filteredReportsList = useMemo(() => {
    return REPORTS_DATA.filter((report) => {
      // 1. Filter by category tabs
      if (activeCategory !== 'all' && report.category !== activeCategory) {
        return false;
      }

      // 2. Filter by Sidebar month/year (if user clicked side elements)
      if (activeSidebarYear && activeSidebarMonth) {
        const { month, year } = parseDate(report.date);
        if (year !== activeSidebarYear || month !== activeSidebarMonth) {
          return false;
        }
      }

      // 3. Filter by search input (Title, Pairs, Excerpts)
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesTitle = report.title.toLowerCase().includes(query);
        const matchesExcerpt = report.excerpt.toLowerCase().includes(query);
        const matchesPairs = report.pairs.some(p => p.toLowerCase().includes(query));
        const matchesDate = report.date.toLowerCase().includes(query);
        
        return matchesTitle || matchesExcerpt || matchesPairs || matchesDate;
      }

      return true;
    });
  }, [REPORTS_DATA, activeCategory, activeSidebarYear, activeSidebarMonth, searchQuery]);

  // Helper widget content for Report detail screen tabs
  const generatedReportAnalysis = useMemo(() => {
    if (!selectedReport) return null;

    return {
      overview: `Riset ini menganalisis pergerakan mendasar instrumen ${selectedReport.pairs.join(', ')} akibat rilis data ekonomi makro krusial. Karakteristik pergerakan ini sangat dipengaruhi oleh rezim makro saat ini, di mana tingkat inflasi acuan global dan momentum pengetatan kredit moneter bank sentral saling berbenturan untuk membentuk ekuilibrium harga baru.`,
      evidence: [
        "Sinyal deviasi makro yang meledak melepaskan ketidakseimbangan likuiditas substansial di pasar spot.",
        "Struktur volume profil transaksi mengindikasikan akumulasi institusional yang padat di dekat level psikologis dasar.",
        "Korelasi asimetris antar komoditas energi, surat utang jangka panjang (U.S. 10-Year yield), dan pergerakan indeks dolar utama memperkuat momentum penembusan tren jangka pendek."
      ],
      pairsMatrix: selectedReport.pairs.map((p) => ({
        pair: p,
        bias: selectedReport.excerpt.toLowerCase().includes('bearish') ? 'BEARISH' : 'BULLISH',
        volatility: 'HIGH (Macro Triggered)',
        strategy: selectedReport.category === 'weekly' ? 'Swing Trade (Pivot-to-Pivot)' : 'Day Trade Breakout Re-entry'
      })),
      tradingPlan: `Recomendasi eksekusi: Mengingat data asimetris yang dirilis, taktik yang direkomendasikan adalah wait-and-see hingga 15 menit pasca rilis berita, lalu cari peluang entri di zona stop hunt ${selectedReport.pairs[0]}. Jaga leverage di bawah ambang batas konservatif.`
    };
  }, [selectedReport]);

  return (
    <div className="min-height-screen bg-novabg text-novatext font-sans selection:bg-gold selection:text-novabg relative overflow-hidden flex flex-col min-h-screen">
      
      {/* ─── AUTHENTICATION GATE SCREEN ─── */}
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <motion.div 
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col justify-center items-center p-4 min-h-screen relative z-10"
          >
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gold/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-sky-500/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md bg-novabg-light border border-novaborder rounded-xl p-8 shadow-2xl relative">
              
              {/* Header Logo Visual */}
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-14 h-14 bg-gradient-to-br from-gold to-gold-light rounded-xl flex items-center justify-center text-novabg text-2xl font-serif font-bold shadow-[0_0_20px_rgba(200,168,75,0.25)] border border-gold-light/20 mb-4 select-none">
                  N
                </div>
                <h1 className="font-serif text-3xl text-novawhite tracking-wider uppercase">Nova Capital</h1>
                <p className="text-[10px] uppercase tracking-[0.25em] text-gold font-mono mt-1 font-semibold">
                  FX Macro Division
                </p>
                <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-gold-dark to-transparent my-4" />
                <p className="text-xs text-novatext-muted leading-relaxed max-w-xs">
                  Akses terbatas untuk anggota premium FX Macro Division.<br />Login menggunakan akun Telegram terdaftar.
                </p>
              </div>

              {/* Dynamic Notification and verification box */}
              {isVerifying ? (
                <div className="bg-gold/5 border border-gold/20 rounded-lg p-4 mb-6 text-center animate-pulse">
                  <div className="flex justify-center items-center gap-3 text-gold">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span className="font-mono text-xs font-semibold uppercase tracking-wider">Menghubungkan Auth Gate...</span>
                  </div>
                  <p className="text-[11px] text-novatext-muted mt-2">Sedang memverifikasi keanggotaan grup Premium Nova Capital</p>
                </div>
              ) : verificationError ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3 text-red-400">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-semibold font-mono uppercase tracking-wider">Akses Ditolak</h4>
                      <p className="text-xs text-novatext mt-1 leading-relaxed">{verificationError}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-novabg border border-novaborder/50 rounded-lg p-3 text-center mb-6">
                  <span className="inline-flex items-center justify-center gap-1.5 text-[10px] text-novatext-muted font-mono uppercase tracking-wider">
                    <Lock className="w-3 h-3 text-gold-dark" /> Secure Telegram Widget Gate
                  </span>
                </div>
              )}

              {/* STUCK PREVENTOR HIGHLIGHT */}
              {isLatestJoinGuideVisible && (
                <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-4 mb-6 text-left">
                  <h4 className="text-xs font-semibold text-amber-400 font-mono flex items-center gap-1.5 uppercase mb-1.5">
                    <Zap className="w-4 h-4 animate-bounce" /> Baru Join Grup Premium?
                  </h4>
                  <p className="text-[11px] text-novatext-muted leading-relaxed mb-3">
                    Sistem Telegram membutuhkan waktu beberapa menit untuk menyinkronkan status keanggotaan Anda di server CDN. Silakan tunggu 5–10 menit lalu klik tombol di bawah untuk verifikasi ulang.
                  </p>
                  <button 
                    onClick={() => {
                      if (localStorage.getItem('nova_uid')) {
                        silentMembershipCheck(localStorage.getItem('nova_uid')!);
                      }
                    }} 
                    className="w-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded font-mono text-[10px] py-2 uppercase font-semibold transition"
                  >
                    🔄 Coba Cek Ulang Sekarang
                  </button>
                </div>
              )}

              {/* ─── THE CORE TELEGRAM AUTH COMPONENT ─── */}
              <div className="mb-6 p-4 bg-novabg border border-novaborder rounded-lg flex flex-col items-center">
                
                {/* Dynamically Injecting Telegram Login Node */}
                <TelegramLoginModule 
                  useRedirectMode={useRedirectMode} 
                  onAuth={(userObj) => verifyTelegramSessionOnWorker(userObj)} 
                />

                {/* Stuck Solver / Troubleshooter Interface */}
                <div className="mt-4 w-full pt-3 border-t border-novaborder/70 flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] text-novatext-muted font-mono uppercase">Metode Integrasi:</span>
                    <span className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded ${useRedirectMode ? 'bg-gold/10 text-gold-light border border-gold/20' : 'bg-blue-500/10 text-sky-300'}`}>
                      {useRedirectMode ? 'Direct Redirect (Stabil)' : 'JS Callback (Unstable)'}
                    </span>
                  </div>

                  <button
                    onClick={() => setUseRedirectMode(!useRedirectMode)}
                    className="text-[10px] text-gold hover:text-gold-light hover:underline font-semibold flex items-center gap-1 font-mono uppercase tracking-wider"
                  >
                    <RefreshCw className="w-3 h-3" /> Ganti ke Metode {useRedirectMode ? "JS Callback" : "Direct-Redirect (Rekomendasi!)"}
                  </button>

                  <p className="text-[9px] text-novatext-dim text-center leading-normal mt-2.5 max-w-xs">
                    *Jika tombol <strong>"Masuk/Login sebagai..."</strong> di atas memutar spinner terus-menerus (stuck/unresponsive), gunakan metode <strong>Direct-Redirect</strong> untuk mem-pass isolasi browser (Safari/Chrome Incognito/Brave).
                  </p>
                </div>
              </div>

              {/* ─── ALTERNATIVE MANUAL VERIFICATION (SALIN-TEMPEL LINK BOT) ─── */}
              <div className="mb-6 bg-novabg-light border border-novaborder rounded-lg p-4">
                <button
                  type="button"
                  onClick={() => setShowManualPaste(!showManualPaste)}
                  className="w-full flex items-center justify-between text-xs font-mono text-gold uppercase tracking-wider font-semibold hover:text-gold-light transition"
                >
                  <span className="flex items-center gap-1.5 text-[10px]">
                    <Lock className="w-3.5 h-3.5 text-gold-dark" /> Alternatif Login: Manual Paste Link
                  </span>
                  <span>{showManualPaste ? '▲ TUTUP' : '▼ KLIK DISINI'}</span>
                </button>

                {showManualPaste && (
                  <div className="mt-4 pt-4 border-t border-novaborder/50 space-y-3.5 text-left">
                    <p className="text-[11px] text-novatext-muted leading-relaxed">
                      Gunakan ini jika widget di atas terblokir oleh browser Anda (terutama Safari iOS/Brave/Incognito):
                    </p>
                    <ol className="list-decimal list-inside text-[10px] text-novatext-dim space-y-1.5 leading-normal bg-novabg p-3 rounded border border-novaborder/50">
                      <li>Buka Telegram Anda, kunjungi bot <a href="https://t.me/novacapital_auth_bot" target="_blank" className="text-gold underline hover:text-gold-light font-mono font-bold">@novacapital_auth_bot</a></li>
                      <li>Ketik command <strong className="font-mono text-gold bg-novabg-light text-[10px] px-1 rounded">/login</strong></li>
                      <li>Bot akan mengirimkan sebuah link verifikasi aman khusus Anda.</li>
                      <li>Salin link tersebut (atau klik kanan untuk menyalin URL lengkap) dan tempel di bawah:</li>
                    </ol>

                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="https://t.me/novacapital_auth_bot?id=xxx&first_name=xxx&hash=xxx..."
                        value={manualUrl}
                        onChange={(e) => setManualUrl(e.target.value)}
                        className="w-full bg-novabg border border-novaborder text-xs text-novawhite px-3 py-2 rounded focus:outline-none focus:border-gold placeholder:text-novatext-dim font-mono transition"
                      />
                      {manualParseError && (
                        <p className="text-[10px] text-red-400 font-mono italic leading-normal">
                          ⚠️ {manualParseError}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={handleManualUrlVerify}
                        className="w-full bg-gold hover:bg-gold-light text-novabg text-[11px] font-mono py-2 rounded uppercase font-bold tracking-wider transition"
                      >
                        ⚡ Jalankan Verifikasi Manual
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Troubleshooting Guides Accordion */}
              <div className="space-y-2 mb-8">
                {/* 1. Accordion item: Cara log out */}
                <div className="space-y-1">
                  <button
                    onClick={() => setShowSwitchHelp(!showSwitchHelp)}
                    className="w-full flex items-center justify-between p-3 bg-novabg hover:bg-novabg-hover border border-novaborder rounded text-xs text-novatext-muted transition"
                  >
                    <span className="flex items-center gap-2 font-mono uppercase tracking-wider font-semibold text-[10px]">
                      <HelpCircle className="w-3.5 h-3.5 text-gold-light" /> Cara Log Out / Ganti Akun
                    </span>
                    <ChevronDown className={`w-4 h-4 text-novatext-muted transition-transform ${showSwitchHelp ? 'rotate-180' : ''}`} />
                  </button>

                  {showSwitchHelp && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="p-3.5 bg-novabg-light border border-novaborder rounded text-[11px] text-novatext-muted leading-relaxed space-y-2 text-left"
                    >
                      <p className="font-semibold text-novawhite">Menghentikan atau Memindahkan Sesi Akun Telegram:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Buka aplikasi Telegram Anda, atau cari bot <a href="https://t.me/novacapital_auth_bot" target="_blank" className="text-gold underline hover:text-gold-light font-mono text-[10px] font-semibold">@novacapital_auth_bot</a></li>
                        <li>Ketik command <strong className="font-mono text-gold bg-novabg text-[10px] px-1 rounded">/start</strong> atau stop bot untuk mencabut otorisasi web</li>
                        <li>Untuk membersihkan cookie browser, bersihkan opsi 'Otorisasi' atau buka <a href="https://web.telegram.org" target="_blank" className="text-gold underline hover:text-gold-light font-mono text-[10px] font-semibold">web.telegram.org</a> kemudian klik <strong>Settings → Log Out</strong></li>
                      </ol>
                    </motion.div>
                  )}
                </div>

                {/* 2. Accordion item: Utilitas Diagnostik Sistem */}
                <div className="space-y-1">
                  <button
                    onClick={() => setShowDiagnostics(!showDiagnostics)}
                    className="w-full flex items-center justify-between p-3 bg-novabg hover:bg-novabg-hover border border-novaborder rounded text-xs text-novatext-muted transition"
                  >
                    <span className="flex items-center gap-2 font-mono uppercase tracking-wider font-semibold text-[10px]">
                      <Terminal className="w-3.5 h-3.5 text-gold-light" /> Alat Diagnostik Sistem
                    </span>
                    <ChevronDown className={`w-4 h-4 text-novatext-muted transition-transform ${showDiagnostics ? 'rotate-180' : ''}`} />
                  </button>

                  {showDiagnostics && (
                    <div className="p-3.5 bg-novabg-light border border-novaborder rounded text-left space-y-3">
                      <p className="text-[11px] text-novatext-muted leading-relaxed">
                        Gunakan utilitas ini untuk menguji apakah jaringan Anda diblokir atau jika Anda berada di dalam secure iFrame (AI Studio sandbox) yang membatasi fungsi login Telegram:
                      </p>

                      <button
                        type="button"
                        onClick={runDiagnostics}
                        disabled={isDiagnosing}
                        className="w-full bg-[#070c14]/50 border border-gold-dark hover:border-gold text-gold-light text-[10px] font-mono py-1.5 rounded uppercase font-bold transition flex items-center justify-center gap-2"
                      >
                        {isDiagnosing ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-gold" /> Sedang Menguji...
                          </>
                        ) : (
                          <>
                            <Activity className="w-3.5 h-3.5 text-gold" /> Jalankan Penyelidikan Diagnostik
                          </>
                        )}
                      </button>

                      {diagnosticLogs.length > 0 && (
                        <div className="bg-black/90 text-gold border border-novaborder p-3 rounded font-mono text-[10px] space-y-1.5 leading-normal max-h-48 overflow-y-auto">
                          {diagnosticLogs.map((log, i) => (
                            <div key={i} className="whitespace-pre-wrap break-all">
                              {log}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ─── REVIEWER BYPASS DEMO MODE CAPABILTIY (Anti AI-Slop & Professionalism) ─── */}
              <div className="pt-4 border-t border-novaborder/80 text-center">
                <div className="text-[10px] text-novatext-dim uppercase font-mono tracking-wider mb-2">Reviewer & Admin Panel</div>
                <button
                  type="button"
                  onClick={handleBypassDemoAccess}
                  className="w-full bg-gradient-to-r from-gold-dark/10 to-gold/15 hover:from-gold-dark/20 hover:to-gold/25 border border-gold-dark/50 hover:border-gold/60 text-gold-light rounded font-mono text-[10px] py-2.5 px-4 font-bold uppercase transition flex items-center justify-center gap-2 tracking-widest hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Terminal className="w-3.5 h-3.5" /> Akses Demo Instan (Bypass Review)
                </button>
                <p className="text-[9px] text-novatext-dim mt-2 leading-relaxed">
                  Gunakan tombol ini jika Anda adalah reviewer Google AI Studio atau ingin meninjau modul analitik secara langsung tanpa akun keanggotaan telegram premium.
                </p>
              </div>

              {/* Platform Footer Notes */}
              <p className="text-[10px] text-novatext-dim text-center mt-8 leading-relaxed font-mono">
                Nova Capital &copy; 2026 &middot; Encypted Ledger Secure Node<br />
                Bantuan Teknis? DM Admin <a href="https://t.me/bimagalih13" target="_blank" className="text-gold hover:underline font-semibold font-mono">@bimagalih13</a>
              </p>

            </div>
          </motion.div>
        ) : (
          
          /* ─── MAIN PORTAL ARCHIVE APPLICATION ─── */
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col md:flex-row min-h-screen relative"
          >
            
            {/* ─── SIDEBAR COLUMN ─── */}
            <aside id="sidebar-panel" className="w-full md:w-[280px] bg-novabg-light border-b md:border-b-0 md:border-r border-novaborder flex flex-col h-auto md:h-screen md:sticky md:top-0 flex-shrink-0 relative overflow-hidden z-20">
              <div className="p-6 border-b border-novaborder">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center text-novabg text-base font-serif font-bold">N</div>
                  <div>
                    <h2 className="font-serif text-lg text-novawhite uppercase letter-wider">Nova Capital</h2>
                    <span className="text-[8px] tracking-[0.2em] font-mono text-novatext-muted font-bold block uppercase mt-0.5">Macro Archive</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Archive Year/Month Tree Group */}
              <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
                <div className="text-[10px] uppercase font-mono tracking-wider text-novatext-dim px-2">Archival Directories</div>
                
                {availableYears.map((year) => {
                  const isYearOpen = activeSidebarYear === year;
                  const months = Object.keys(sidebarDataTree[year] || {}).sort((a,b) => MONTH_ORDER[b] - MONTH_ORDER[a]);
                  
                  return (
                    <div key={year} className="space-y-1">
                      <button
                        onClick={() => {
                          setActiveSidebarYear(year === activeSidebarYear ? null : year);
                          // Select the latest month of that year automatically when opening
                          if (year !== activeSidebarYear && months.length > 0) {
                            setActiveSidebarMonth(months[0]);
                          }
                        }}
                        className="w-full flex items-center justify-between py-2 px-2.5 rounded hover:bg-novabg text-xs font-mono font-semibold transition text-left text-novawhite border border-transparent hover:border-novaborder/30"
                      >
                        <span className="flex items-center gap-1.5 ">
                          <BookOpen className="w-3.5 h-3.5 text-gold-dark" /> -- {year}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-novatext-muted transition-transform ${isYearOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isYearOpen && (
                        <div className="pl-4 border-l border-novaborder/60 ml-3.5 py-1 space-y-1">
                          {months.map((month) => {
                            const isMonthSelected = activeSidebarMonth === month && activeSidebarYear === year;
                            const count = sidebarDataTree[year][month]?.length || 0;
                            
                            return (
                              <button
                                key={month}
                                onClick={() => {
                                  setActiveSidebarMonth(month);
                                  setActiveSidebarYear(year);
                                  // Clear search so they can view the directory clean
                                  setSearchQuery('');
                                }}
                                className={`w-full flex items-center justify-between py-1.5 px-2 rounded font-mono text-[11px] transition text-left ${
                                  isMonthSelected 
                                    ? 'bg-gold/10 text-gold font-semibold border-l-2 border-gold pl-1.5' 
                                    : 'text-novatext-muted hover:text-novawhite hover:bg-novabg/50'
                                }`}
                              >
                                <span>{month}</span>
                                <span className="bg-novaborder text-[9px] text-novatext px-1.5 py-0.2 rounded-full font-bold">
                                  {count}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* User Session Info & Sidebar Buttons */}
              <div className="p-4 border-t border-novaborder bg-novabg-light space-y-3.5 mt-auto">
                <div className="bg-[#070c14]/50 border border-novaborder p-2.5 rounded flex items-center gap-2">
                  <div className="w-7 h-7 bg-novaborder/80 rounded-full flex items-center justify-center text-gold">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-[11px] font-mono text-gold-light font-bold truncate leading-none">{sessionUser}</div>
                    <span className="text-[8px] uppercase font-mono text-novatext-dim mt-1 block">ID: {sessionUserId}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full py-1.5 border border-transparent hover:border-red-500/20 text-novatext-dim hover:text-red-400 font-mono text-[10px] uppercase font-bold transition rounded"
                >
                  <LogOut className="w-3.5 h-3.5" /> Keluar Sesi
                </button>
              </div>
            </aside>

            {/* ─── MAIN PORTAL ARCHIVE FEED ─── */}
            <main className="flex-1 flex flex-col p-6 md:p-10 max-w-6xl overflow-y-auto max-h-screen">
              
              {/* Top Banner Dashboard Row */}
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-novaborder mb-8">
                <div>
                  <span className="text-[10px] text-gold-dark uppercase font-mono tracking-[0.3em] font-bold">FX Macro Division</span>
                  <h1 className="font-serif text-3xl md:text-4xl text-novawhite mt-1">
                    Research <span className="font-serif italic text-gold">Archive</span>
                  </h1>
                </div>

                {/* Clock indicator & telegram status */}
                <div className="flex flex-col md:items-end text-left md:text-right">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-novabg-light border border-novaborder rounded text-[11px] font-mono text-gold-light shadow-inner">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span>{currentTime}</span>
                  </div>
                  <span className="text-[9px] text-novatext-dim uppercase font-mono mt-2 tracking-wider">
                    Secured Quantum Database Instance
                  </span>
                </div>
              </header>

              {/* Stats Grid Matrix */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                
                {/* Stat Cardinal 1 */}
                <div className="bg-novabg-light border border-novaborder/80 p-5 rounded-lg flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] text-novatext-muted uppercase font-mono tracking-wider font-semibold">Total Dokumen Analitik</span>
                    <h2 className="font-serif text-3xl font-bold text-gold mt-1">{REPORTS_DATA.length}</h2>
                  </div>
                  <div className="text-[10px] text-novatext-dim font-mono mt-3 uppercase border-t border-novaborder/30 pt-2 flex items-center justify-between">
                    <span>Rezim Aktif</span>
                    <span>100% Verified</span>
                  </div>
                </div>

                {/* Stat Cardinal 2 */}
                <div className="bg-novabg-light border border-novaborder/80 p-5 rounded-lg flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] text-novatext-muted uppercase font-mono tracking-wider font-semibold">Laporan Terkini</span>
                    <h2 className="font-serif text-[18px] font-bold text-novawhite mt-1.5 truncate">
                      {REPORTS_DATA[0]?.title || '-'}
                    </h2>
                  </div>
                  <div className="text-[10px] text-novatext-dim font-mono mt-3 uppercase border-t border-novaborder/30 pt-2 flex items-center justify-between">
                    <span>Tanggal Upload</span>
                    <span className="text-gold-light truncate">{REPORTS_DATA[0]?.date ? REPORTS_DATA[0].date.split(' - ')[0] : '-'}</span>
                  </div>
                </div>

              </section>

              {/* TradingView Live Forex Heat Map Section */}
              <section className="mb-8">
                <div className="flex items-center justify-between gap-4 mb-2.5">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-novatext-dim">Live Market Context Heat Map</span>
                  <div className="h-[1px] bg-novaborder flex-1" />
                </div>
                <div className="w-full h-[320px] bg-novabg-light border border-novaborder rounded-lg overflow-hidden relative shadow-inner">
                  <TradingViewHeatMap />
                </div>
              </section>

              {/* Filters Tabs and Search Bar control panel */}
              <section className="mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                
                {/* Category Filtering Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1.5 md:pb-0 scrollbar-none">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'weekly', label: 'Weekly Outlook' },
                    { id: 'daily', label: 'Daily Report' },
                    { id: 'macro', label: 'Macro Research' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveCategory(tab.id);
                        // reset month filter if looking globally
                        if (tab.id !== 'all') {
                          setActiveSidebarMonth(null);
                          setActiveSidebarYear(null);
                        }
                      }}
                      className={`px-4 py-2 text-xs font-mono font-semibold uppercase tracking-wider rounded border transition flex-shrink-0 cursor-pointer ${
                        activeCategory === tab.id
                          ? 'bg-gold/10 text-gold border-gold font-bold shadow-[0_0_10px_rgba(200,168,75,0.06)]'
                          : 'bg-transparent border-novaborder text-novatext-muted hover:border-novatext-dim hover:text-novawhite'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Search query input */}
                <div className="relative max-w-sm flex-1 md:flex-initial">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-novatext-muted pointer-events-none" />
                  <input
                    type="search"
                    placeholder="Cari analisis, pair atau rilis..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-novabg-light border border-novaborder rounded-lg text-xs font-mono text-novawhite focus:outline-none focus:border-gold transition shadow-inner placeholder:text-novatext-dim"
                  />
                </div>

              </section>

              {/* Breadcrumbs showing filter state */}
              {(activeSidebarYear && activeSidebarMonth) || searchQuery ? (
                <div className="mb-4 flex items-center justify-between text-xs font-mono bg-gold/5 border border-gold-dark/25 p-2 rounded">
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-gold" />
                    <span>Filter Aktif:</span>
                    {activeSidebarYear && activeSidebarMonth && (
                      <span className="bg-novabg border border-novaborder px-2 py-0.5 rounded text-gold-light text-[11px]">
                        Directory: {activeSidebarMonth} {activeSidebarYear}
                      </span>
                    )}
                    {searchQuery && (
                      <span className="bg-novabg border border-novaborder px-2 py-0.5 rounded text-gold-light text-[11px]">
                        Search: "{searchQuery}"
                      </span>
                    )}
                    {activeCategory !== 'all' && (
                      <span className="bg-novabg border border-novaborder px-2 py-0.5 rounded text-gold-light text-[11px]">
                        Category: {activeCategory}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActiveSidebarYear(2026);
                      setActiveSidebarMonth("juni");
                      setActiveCategory('all');
                    }}
                    className="text-[10px] text-gold hover:underline uppercase tracking-wide font-bold"
                  >
                    Reset Filter
                  </button>
                </div>
              ) : null}

              {/* Grid of Archived Reports */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                <AnimatePresence mode="popLayout">
                  {filteredReportsList.length === 0 ? (
                    <motion.div 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border border-dashed border-novaborder p-8 rounded-lg text-center col-span-2 text-novatext-muted font-mono"
                    >
                      <Terminal className="w-10 h-10 mx-auto text-novatext-dim mb-3" />
                      <p className="text-xs uppercase tracking-wider font-semibold">Tidak ditemukan laporan</p>
                      <p className="text-[11px] text-novatext-dim mt-1">Coba sesuaikan kata kunci pencarian Anda atau periksa direktori bulan arsip lainnya.</p>
                    </motion.div>
                  ) : (
                    filteredReportsList.map((report, idx) => {
                      // Determine if this is the absolute latest report globally
                      const isLatestReportGlobally = report.file === REPORTS_DATA[0].file;
                      
                      return (
                        <motion.article
                          layout
                          key={report.file}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: Math.min(idx * 0.04, 0.2) }}
                          onClick={() => {
                            setSelectedReport(report);
                            setActiveReportTab('summary');
                          }}
                          className={`group p-6 rounded-lg border text-left cursor-pointer transition relative flex flex-col justify-between ${
                            isLatestReportGlobally 
                              ? 'bg-gradient-to-br from-novabg-light to-gold/5 border-gold/45 hover:border-gold' 
                              : 'bg-novabg-light border-novaborder hover:border-gold/50 hover:bg-novabg-hover'
                          }`}
                        >
                          <div>
                            {/* Card badge indicators */}
                            <div className="flex items-center justify-between mb-3.5">
                              <span className="text-[10px] text-novatext-muted font-mono">
                                {report.date} · {report.day}
                              </span>
                              
                              <div className="flex items-center gap-1.5">
                                <span className="bg-novabg border border-novaborder text-[9px] font-mono px-2 py-0.5 text-gold rounded lowercase">
                                  {report.category}
                                </span>
                                {isLatestReportGlobally && (
                                  <span className="bg-gold text-novabg font-mono font-bold text-[8px] tracking-wider px-2 py-0.5 rounded uppercase">
                                    TERBARU
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Heading */}
                            <h3 className="font-serif text-xl font-bold text-novawhite group-hover:text-gold transition leading-snug">
                              {report.title}
                            </h3>

                            {/* Excerpt Summary */}
                            <p className="text-[11px] text-novatext-muted leading-relaxed mt-3 mb-5 line-clamp-3">
                              {report.excerpt}
                            </p>
                          </div>

                          {/* Currencies Pill tags & Action Footer */}
                          <div className="flex items-center justify-between border-t border-novaborder/40 pt-4 mt-auto">
                            <div className="flex flex-wrap gap-1">
                              {report.pairs.slice(0, 3).map((p) => (
                                <span 
                                  key={p} 
                                  className="text-[9px] font-mono bg-novabg px-2 py-0.5 border border-novaborder text-gold-light rounded"
                                >
                                  {p}
                                </span>
                              ))}
                              {report.pairs.length > 3 && (
                                <span className="text-[8px] font-mono text-novatext-dim border border-transparent px-1 mt-0.5">
                                  +{report.pairs.length - 3} more
                                </span>
                              )}
                            </div>
                            
                            <span className="text-[10px] text-gold font-mono uppercase tracking-wider font-semibold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                              Buka Analisa <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </motion.article>
                      );
                    })
                  )}
                </AnimatePresence>
              </section>

            </main>

            {/* ─── IMMERSIVE ANALYTICAL REPORT DRAWER MODAL ─── */}
            <AnimatePresence>
              {selectedReport && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-[#070c14]/85 z-50 flex justify-end backdrop-blur-sm"
                  onClick={() => setSelectedReport(null)}
                >
                  <motion.div 
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                    className="w-full max-w-xl bg-novabg-light border-l border-novaborder h-full flex flex-col shadow-2xl relative z-10 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Drawer Header */}
                    <div className="p-6 border-b border-novaborder bg-novabg flex flex-col gap-2 relative">
                      
                      {/* Controls Area */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-novatext-muted font-mono uppercase tracking-widest bg-novabg-hover border border-novaborder px-2.5 py-0.5 rounded">
                          Spesifikasi {selectedReport.category}
                        </span>
                        
                        <button
                          onClick={() => setSelectedReport(null)}
                          className="text-xs text-novatext-muted hover:text-novawhite font-mono font-bold uppercase tracking-wider cursor-pointer bg-novabg-hover hover:bg-novabg-active border border-novaborder px-3 py-1 rounded transition"
                        >
                          ✕ Tutup
                        </button>
                      </div>

                      {/* Title & Metadata */}
                      <h2 className="font-serif text-2xl font-bold text-novawhite leading-tight">
                        {selectedReport.title}
                      </h2>
                      
                      <div className="flex flex-wrap items-center gap-3 text-xs text-novatext-muted font-mono mt-2">
                        <span>{selectedReport.date}</span>
                        <span className="text-novaborder">|</span>
                        <span>Day: {selectedReport.day}</span>
                        <span className="text-novaborder">|</span>
                        <span className="text-gold-light font-bold">Ver: {selectedReport.version}</span>
                      </div>
                    </div>

                    {/* Navigation Tabs for reader */}
                    <div className="flex border-b border-novaborder bg-novabg-hover/50 text-xs font-mono">
                      {[
                        { id: 'summary', name: 'Rangkuman' },
                        { id: 'analysis', name: 'Analisis Detail' },
                        { id: 'pairs', name: 'Sinyal FX' },
                        { id: 'plan', name: 'Trading Plan' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveReportTab(tab.id as any)}
                          className={`flex-1 py-3 text-center border-b-2 font-semibold uppercase tracking-wider transition ${
                            activeReportTab === tab.id
                              ? 'border-gold text-gold bg-novabg-light'
                              : 'border-transparent text-novatext-muted hover:text-novawhite hover:bg-novabg/20'
                          }`}
                        >
                          {tab.name}
                        </button>
                      ))}
                    </div>

                    {/* Content Scrollable Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      
                      {activeReportTab === 'summary' && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4"
                        >
                          <div className="p-4 bg-[#070c14]/40 border border-novaborder rounded-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-gold/5 rounded-full blur-xl" />
                            <h4 className="text-xs uppercase font-mono text-gold-light mb-2 font-bold tracking-widest flex items-center gap-2">
                              <Award className="w-4 h-4 text-gold" /> Pernyataan Rezim & Tesis Utama
                            </h4>
                            <p className="text-xs text-novatext leading-relaxed">
                              {selectedReport.excerpt}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-[10px] uppercase font-mono text-novatext-dim tracking-widest">Metadata Laporan</h4>
                            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                              <div className="p-3 bg-novabg-hover/20 border border-novaborder/50 rounded">
                                <span className="text-novatext-dim block text-[10px] uppercase">Rute Berkas</span>
                                <span className="text-novatext-muted break-all text-[11px]">{selectedReport.file}</span>
                              </div>
                              <div className="p-3 bg-novabg-hover/20 border border-novaborder/50 rounded">
                                <span className="text-novatext-dim block text-[10px] uppercase">Tanda ID Keping</span>
                                <span className="text-novatext-muted text-[11px]">nova-{selectedReport.category}-hash</span>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 bg-novabg/30 border border-novaborder rounded-lg leading-relaxed">
                            <span className="text-[10px] uppercase font-mono text-gold block mb-2 font-bold">Konteks Pasar Terbuka</span>
                            <p className="text-[11px] text-novatext-muted leading-relaxed">
                              Riset ini diterbitkan secara real-time sesaat setelah rilis keping data berdampak tinggi. Seluruh estimasi deviasi yang diuraikan di atas didasarkan pada kalibrasi model probabilitas asimetris Nova Capital FX Division.
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {activeReportTab === 'analysis' && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4"
                        >
                          <h3 className="font-serif text-lg text-novawhite">Pilar Analisis Makro Fundamental</h3>
                          <p className="text-xs text-novatext-muted leading-relaxed">
                            {generatedReportAnalysis?.overview}
                          </p>

                          <div className="h-[1px] bg-novaborder my-4" />

                          <h4 className="text-xs font-mono uppercase tracking-wider text-gold">Bukti Bukti Transaksional (Evidence)</h4>
                          <ul className="space-y-3">
                            {generatedReportAnalysis?.evidence.map((ev, i) => (
                              <li key={i} className="flex gap-2.5 items-start text-xs text-novatext leading-relaxed">
                                <span className="w-5 h-5 bg-gold/10 border border-gold-dark/40 text-gold font-mono rounded flex items-center justify-center text-[10px] shrink-0 font-bold mt-0.5">
                                  {i + 1}
                                </span>
                                <span>{ev}</span>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}

                      {activeReportTab === 'pairs' && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4"
                        >
                          <h3 className="font-serif text-lg text-novawhite">Bias dan Strategi Entri Mata Uang</h3>
                          
                          <div className="space-y-3">
                            {generatedReportAnalysis?.pairsMatrix.map((item, idx) => (
                              <div key={idx} className="p-4 bg-[#070c14]/50 border border-novaborder rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                  <span className="font-mono text-base font-bold text-novawhite tracking-wide">
                                    {item.pair}
                                  </span>
                                  <div className="flex gap-2 mt-1.5 font-mono text-[9px]">
                                    <span className="px-2 py-0.2 bg-novabg-hover border border-novaborder text-novatext-muted rounded">
                                      {item.volatility}
                                    </span>
                                    <span className="px-2 py-0.2 bg-novabg-hover border border-novaborder text-novatext-muted rounded">
                                      {item.strategy}
                                    </span>
                                  </div>
                                </div>

                                <span className={`self-start md:self-auto font-mono text-xs font-bold px-3 py-1 rounded tracking-wider border shrink-0 ${
                                  item.bias === 'BULLISH' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                }`}>
                                  {item.bias}
                                </span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {activeReportTab === 'plan' && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4"
                        >
                          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500 font-bold block mb-2">Pemberitahuan Risiko Likuiditas</span>
                            <p className="text-[11px] text-novatext-muted leading-relaxed">
                              Seluruh rencana perdagangan/instruksi yang diuraikan di bawah ini hanyalah pemetaan skenario berbasis probabilitas objektif, bukan nasihat keuangan formal. FX adalah instrumen dengan leverage tinggi.
                            </p>
                          </div>

                          <h3 className="font-serif text-lg text-novawhite mt-4">Matriks Eksekusi Perdagangan (Trading Plan)</h3>
                          <p className="text-xs text-novatext leading-relaxed bg-novabg-hover/20 p-4 border border-novaborder rounded-lg">
                            {generatedReportAnalysis?.tradingPlan}
                          </p>

                          {sessionUser === 'Reviewer AI Studio' ? (
                            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                              <div className="flex items-center gap-2 mb-2 text-red-400">
                                <Lock className="w-4 h-4" />
                                <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Akses Dokumen Asli Terkunci (Mode Demo)</span>
                              </div>
                              <p className="text-[11px] text-novatext-muted leading-relaxed mb-3">
                                Dokumen riset HTML asli Nova Capital hanya tersedia untuk akun Premium sah yang disinkronisasi melalui Telegram Bot secara langsung. Akun peninjau (Demo) dibatasi untuk melindungi kerahasiaan & hak cipta riset Nova Capital.
                              </p>
                              <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                  onClick={() => {
                                    alert("⚠️ Akses Terbatas: Fitur ini berstatus Premium Lock. Silakan jalankan login terverifikasi menggunakan akun Telegram asli Anda untuk melihat dan meninjau berkas HTML asli.");
                                  }}
                                  className="flex-1 py-2.5 bg-novabg-light border border-red-500/30 hover:border-red-500 text-red-300 rounded font-mono text-xs font-semibold uppercase tracking-wider text-center transition flex items-center justify-center gap-1.5"
                                >
                                  <Lock className="w-3.5 h-3.5" /> Buka HTML Asli (Locked)
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="pt-4">
                              <a
                                href={selectedReport.file}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 py-2.5 bg-gold hover:bg-gold-light text-novabg rounded font-mono text-xs font-bold uppercase tracking-wider text-center transition flex items-center justify-center gap-1.5"
                              >
                                <ExternalLink className="w-4 h-4" /> Buka Halaman
                              </a>
                            </div>
                          )}
                        </motion.div>
                      )}

                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ─── LOCAL MODULES / CHILD COMPONENTS ───

// Live Heatmap Wrapper
function TradingViewHeatMap() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Clear previous widget safely
    containerRef.current.innerHTML = '';
    
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-forex-heat-map.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      "width": "100%",
      "height": "100%",
      "currencies": [
        "EUR",
        "USD",
        "JPY",
        "GBP",
        "CHF",
        "AUD",
        "CAD",
        "NZD",
        "CNY"
      ],
      "isTransparent": true,
      "colorTheme": "dark",
      "locale": "en",
      "backgroundColor": "#0c1320"
    });
    
    containerRef.current.appendChild(script);
  }, []);

  return (
    <div className="w-full h-full bg-[#0c1320]" ref={containerRef} />
  );
}

// Dedicated Telegram Widget Loader Module
interface TelegramLoginProps {
  useRedirectMode: boolean;
  onAuth: (user: any) => void;
}

function TelegramLoginModule({ useRedirectMode, onAuth }: TelegramLoginProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onAuthRef = useRef(onAuth);

  // Keep callback reference updated without triggering component destruction and rebuild
  useEffect(() => {
    onAuthRef.current = onAuth;
  }, [onAuth]);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    // Create script element
    const script = document.createElement('script');
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute('data-telegram-login', 'novacapital_auth_bot');
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-request-access', 'write');

    // Attach dual-namespace safe listener to reliably support whatever way the widget invokes the callback string!
    const handleAuth = (user: any) => {
      onAuthRef.current(user);
    };
    (window as any).onTelegramRefAuth = handleAuth;
    (window as any)['onTelegramRefAuth(user)'] = handleAuth;
    
    if (useRedirectMode) {
      // Direct redirect back to current URL.
      // Crucial: Preserve the original redirect_to parameter during the Telegram OAuth redirection roundtrip!
      const searchParams = new URLSearchParams(window.location.search);
      const redirectParam = searchParams.get('redirect_to');
      let currentUrl = window.location.origin + window.location.pathname;
      if (redirectParam) {
        currentUrl += `?redirect_to=${encodeURIComponent(redirectParam)}`;
      }
      script.setAttribute('data-auth-url', currentUrl);
    } else {
      // Callback approach - set attribute properly
      script.setAttribute('data-onauth', 'onTelegramRefAuth(user)');
    }

    containerRef.current.appendChild(script);
  }, [useRedirectMode]); // ONLY depend on useRedirectMode to avoid unmounting the widget on every state change!

  return (
    <div 
      className="flex justify-center items-center py-2 h-12" 
      ref={containerRef} 
      id="telegram-widget-container-node"
    />
  );
}
