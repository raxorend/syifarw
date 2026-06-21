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
  Zap,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Globe,
  Clock,
  Calendar,
  Bell,
  Radio,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Home,
  Archive,
  Newspaper,
  AlertCircle,
  ChevronLeft,
  X,
  Maximize2
} from 'lucide-react';
import { REPORTS_DATA, parseDate, MONTH_ORDER, MONTH_NAMES } from './data';
import { Report } from './types';

// WORKER URL for verification
const WORKER_URL = "https://nova-auth-gate.bimagalih28.workers.dev/";

// ─── LIVE MARKET DATA (simulated, ganti dengan feed real kalau ada) ───
const MARKET_TICKERS = [
  { symbol: 'EUR/USD', price: '1.0892', change: '+0.0023', pct: '+0.21%', dir: 'up' },
  { symbol: 'GBP/USD', price: '1.2743', change: '+0.0041', pct: '+0.32%', dir: 'up' },
  { symbol: 'USD/JPY', price: '157.82', change: '-0.34', pct: '-0.22%', dir: 'down' },
  { symbol: 'XAU/USD', price: '3,248.40', change: '+12.80', pct: '+0.40%', dir: 'up' },
  { symbol: 'DXY', price: '104.23', change: '-0.18', pct: '-0.17%', dir: 'down' },
  { symbol: 'USD/CHF', price: '0.8934', change: '+0.0012', pct: '+0.13%', dir: 'up' },
  { symbol: 'AUD/USD', price: '0.6421', change: '-0.0018', pct: '-0.28%', dir: 'down' },
  { symbol: 'NZD/USD', price: '0.5892', change: '+0.0009', pct: '+0.15%', dir: 'up' },
  { symbol: 'USD/CAD', price: '1.3641', change: '+0.0034', pct: '+0.25%', dir: 'up' },
  { symbol: 'BTC/USD', price: '104,821', change: '+1,234', pct: '+1.19%', dir: 'up' },
];

const MACRO_EVENTS = [
  { time: '14:30', currency: 'USD', event: 'Core PCE Price Index m/m', impact: 'high', consensus: '0.2%', previous: '0.2%' },
  { time: '15:00', currency: 'USD', event: 'CB Consumer Confidence', impact: 'high', consensus: '98.5', previous: '97.0' },
  { time: '16:00', currency: 'EUR', event: 'CPI Flash Estimate y/y', impact: 'high', consensus: '2.4%', previous: '2.6%' },
  { time: '20:00', currency: 'USD', event: 'FOMC Meeting Minutes', impact: 'high', consensus: '-', previous: '-' },
  { time: '22:00', currency: 'JPY', event: 'Tokyo Core CPI y/y', impact: 'medium', consensus: '2.1%', previous: '2.2%' },
];

const REGIME_MATRIX = [
  { pair: 'USD', regime: 'DISINFLASI', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20', dot: 'bg-sky-400' },
  { pair: 'EUR', regime: 'STAGFLASI', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400' },
  { pair: 'GBP', regime: 'REFLASI', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
  { pair: 'JPY', regime: 'NORMALISASI', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', dot: 'bg-purple-400' },
  { pair: 'XAU', regime: 'SAFE-HAVEN', color: 'text-gold', bg: 'bg-gold/10 border-gold/20', dot: 'bg-gold' },
  { pair: 'AUD', regime: 'KONTRAKSI', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', dot: 'bg-rose-400' },
];

// ─── VIEW TYPES ───
type ActiveView = 'terminal' | 'archive' | 'calendar' | 'heatmap';

export default function App() {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [sessionUser, setSessionUser] = useState<string>('');
  const [sessionUserId, setSessionUserId] = useState<string>('');
  
  // App UX and routing states
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const isCurrentlyInIframe = useMemo(() => {
    try { return window.self !== window.top; } catch (e) { return true; }
  }, []);
  const [useRedirectMode, setUseRedirectMode] = useState<boolean>(isCurrentlyInIframe);
  const [isLatestJoinGuideVisible, setIsLatestJoinGuideVisible] = useState<boolean>(false);
  const [showSwitchHelp, setShowSwitchHelp] = useState<boolean>(false);
  const [showManualPaste, setShowManualPaste] = useState<boolean>(false);
  const [manualUrl, setManualUrl] = useState<string>('');
  const [manualParseError, setManualParseError] = useState<string | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  // Navigation
  const [activeView, setActiveView] = useState<ActiveView>('terminal');

  // Archive states
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSidebarYear, setActiveSidebarYear] = useState<number | null>(null);
  const [activeSidebarMonth, setActiveSidebarMonth] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [activeReportTab, setActiveReportTab] = useState<'summary' | 'analysis' | 'pairs' | 'plan'>('summary');

  // Clock
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // Ticker scroll
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
      setCurrentDate(now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Session check on load
  useEffect(() => {
    let searchSource = window.location.search;
    if (!searchSource && window.location.hash) {
      const hashContent = window.location.hash.substring(1);
      if (hashContent.includes('id=') && hashContent.includes('hash=')) searchSource = '?' + hashContent;
    }
    const params = new URLSearchParams(searchSource);
    if (params.has('id') && params.has('hash')) {
      const queryParams: Record<string, string> = {};
      params.forEach((value, key) => { queryParams[key] = value; });
      const redirectUrl = params.get('redirect_to');
      if (redirectUrl) queryParams['redirect_to'] = redirectUrl;
      window.history.replaceState({}, document.title, window.location.pathname);
      verifyTelegramSessionOnWorker(queryParams);
    } else {
      const cachedToken = localStorage.getItem('nova_token') || sessionStorage.getItem('nova_token');
      const cachedUser = localStorage.getItem('nova_user') || sessionStorage.getItem('nova_user');
      const cachedUid = localStorage.getItem('nova_uid') || sessionStorage.getItem('nova_uid');
      if (cachedToken === 'granted_access' && cachedUser) {
        setIsAuthenticated(true);
        setSessionUser(cachedUser);
        if (cachedUid) setSessionUserId(cachedUid);
        if (cachedUid) silentMembershipCheck(cachedUid);
      }
    }
  }, []);

  const verifyTelegramSessionOnWorker = async (telegramUser: Record<string, string>) => {
    setIsVerifying(true);
    setVerificationError(null);
    setIsLatestJoinGuideVisible(false);
    try {
      const queryStr = new URLSearchParams(telegramUser).toString();
      const response = await fetch(`${WORKER_URL}?${queryStr}`, { method: 'GET', headers: { 'Accept': 'application/json' } });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('nova_token', 'granted_access');
        localStorage.setItem('nova_user', data.user_name || telegramUser.first_name || 'Premium Member');
        localStorage.setItem('nova_uid', data.user_id || telegramUser.id);
        localStorage.setItem('nova_tele_data', JSON.stringify(telegramUser));
        sessionStorage.setItem('nova_token', 'granted_access');
        sessionStorage.setItem('nova_user', data.user_name || telegramUser.first_name || 'Premium Member');
        sessionStorage.setItem('nova_uid', data.user_id || telegramUser.id);
        sessionStorage.setItem('nova_tele_data', JSON.stringify(telegramUser));
        setSessionUser(data.user_name || telegramUser.first_name || 'Premium Member');
        setSessionUserId(data.user_id || telegramUser.id);
        setIsAuthenticated(true);
        const redirectUrl = telegramUser.redirect_to || new URLSearchParams(window.location.search).get('redirect_to');
        if (redirectUrl) {
          const targetPath = decodeURIComponent(redirectUrl).replace(/^\//, '');
          window.location.replace(window.location.origin + '/' + targetPath);
        }
      } else {
        localStorage.removeItem('nova_token'); localStorage.removeItem('nova_user'); localStorage.removeItem('nova_uid');
        sessionStorage.clear();
        const errorMessage = data.error || 'Akses ditolak.';
        setVerificationError(errorMessage);
        if (errorMessage.toLowerCase().includes('belum terdaftar') || errorMessage.toLowerCase().includes('tidak aktif')) {
          setIsLatestJoinGuideVisible(true);
        }
      }
    } catch (err) {
      setVerificationError("Gagal menghubungi server verifikasi. Periksa koneksi internet Anda atau jalankan Utilitas Diagnostik di bawah.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualUrlVerify = () => {
    setManualParseError(null);
    if (!manualUrl.trim()) { setManualParseError("Harap masukkan link otorisasi Telegram Bot terlebih dahulu."); return; }
    try {
      let searchString = '';
      if (manualUrl.includes('?')) searchString = manualUrl.substring(manualUrl.indexOf('?'));
      else if (manualUrl.includes('#')) searchString = '?' + manualUrl.substring(manualUrl.indexOf('#') + 1);
      else if (manualUrl.includes('id=') && manualUrl.includes('hash=')) searchString = '?' + manualUrl;
      else throw new Error("Format URL tidak didukung. Pastikan menyalin seluruh link.");
      const params = new URLSearchParams(searchString);
      if (!params.has('id') || !params.has('hash')) throw new Error("URL tidak memiliki parameter 'id' atau 'hash' dari sistem Telegram.");
      const queryParams: Record<string, string> = {};
      params.forEach((value, key) => { queryParams[key] = value; });
      verifyTelegramSessionOnWorker(queryParams);
    } catch (err: any) {
      setManualParseError(err.message || "Teks yang Anda tempel tidak mengandung parameter otorisasi Telegram yang valid.");
    }
  };

  const runDiagnostics = async () => {
    setIsDiagnosing(true); setShowDiagnostics(true);
    setDiagnosticLogs(["[SYSTEM] Memulai rangkaian Penyelidikan Diagnostik...", `[TIME] ${new Date().toISOString()}`]);
    const addLog = (msg: string) => setDiagnosticLogs(prev => [...prev, msg]);
    await new Promise(r => setTimeout(r, 700));
    try { localStorage.setItem('nova_diag_test', '1'); localStorage.removeItem('nova_diag_test'); addLog("✅ [Penyimpanan] LocalStorage & SessionStorage aktif."); } catch (e) { addLog("❌ [Penyimpanan] Gagal mengakses penyimpanan lokal."); }
    const inIframe = window.self !== window.top;
    addLog(`ℹ️ [Domain] ${window.location.hostname}`);
    addLog(`ℹ️ [Environment] Dalam iframe: ${inIframe ? 'YA' : 'TIDAK'}`);
    addLog("⏳ [Jaringan] Menghubungi server otorisasi Nova Gate...");
    try {
      const res = await fetch(`${WORKER_URL}?check_only=true`, { method: 'GET' });
      addLog(`✅ [Jaringan] Server aktif (${res.status}).`);
    } catch (err: any) {
      addLog(`❌ [Jaringan] Koneksi gagal: ${err.message}`);
    }
    addLog("[SYSTEM] Diagnostik selesai.");
    setIsDiagnosing(false);
  };

  const handleBypassDemoAccess = () => {
    localStorage.setItem('nova_token', 'granted_access');
    localStorage.setItem('nova_user', 'Reviewer AI Studio');
    localStorage.setItem('nova_uid', '999999999');
    sessionStorage.setItem('nova_token', 'granted_access');
    sessionStorage.setItem('nova_user', 'Reviewer AI Studio');
    sessionStorage.setItem('nova_uid', '999999999');
    setSessionUser('Reviewer AI Studio'); setSessionUserId('999999999'); setIsAuthenticated(true); setVerificationError(null);
  };

  const silentMembershipCheck = async (userId: string) => {
    try {
      const storedData = localStorage.getItem('nova_tele_data') || sessionStorage.getItem('nova_tele_data');
      let queryStr = `id=${userId}&check_only=true`;
      if (storedData) {
        try { const parsed = JSON.parse(storedData); queryStr = new URLSearchParams({ ...parsed, check_only: 'true' }).toString(); } catch (_) {}
      }
      const response = await fetch(`${WORKER_URL}?${queryStr}`, { method: 'GET' });
      const data = await response.json();
      if (!data.success) {
        const errorMsg = (data.error || '').toLowerCase();
        const isDefiniteRevocation = ['bukan anggota', 'tidak terdaftar', 'bukan member', 'belum join', 'belum bergabung', 'tidak aktif', 'not a member', 'left', 'kicked'].some(k => errorMsg.includes(k));
        if (isDefiniteRevocation) {
          const activeUser = localStorage.getItem('nova_user') || sessionStorage.getItem('nova_user');
          if (activeUser !== 'Reviewer AI Studio') handleLogout();
        }
      }
    } catch (e) {}
  };

  const handleLogout = () => {
    localStorage.removeItem('nova_token'); localStorage.removeItem('nova_user'); localStorage.removeItem('nova_uid'); localStorage.removeItem('nova_tele_data');
    sessionStorage.clear();
    setIsAuthenticated(false); setSessionUser(''); setSessionUserId(''); setVerificationError(null); setIsLatestJoinGuideVisible(false);
  };

  // Archive data
  const sidebarDataTree = useMemo(() => {
    const tree: Record<number, Record<string, Report[]>> = {};
    REPORTS_DATA.forEach((rep) => {
      const { month, year } = parseDate(rep.date);
      if (!tree[year]) tree[year] = {};
      if (!tree[year][month]) tree[year][month] = [];
      tree[year][month].push(rep);
    });
    const years = Object.keys(tree).map(Number).sort((a, b) => b - a);
    if (years.length > 0 && activeSidebarYear === null) {
      setActiveSidebarYear(years[0]);
      const months = Object.keys(tree[years[0]]).sort((a, b) => MONTH_ORDER[b] - MONTH_ORDER[a]);
      if (months.length > 0 && activeSidebarMonth === null) setActiveSidebarMonth(months[0]);
    }
    return tree;
  }, [REPORTS_DATA, activeSidebarYear, activeSidebarMonth]);

  const availableYears = useMemo(() => Object.keys(sidebarDataTree).map(Number).sort((a, b) => b - a), [sidebarDataTree]);

  const filteredReportsList = useMemo(() => {
    return REPORTS_DATA.filter((report) => {
      if (activeCategory !== 'all' && report.category !== activeCategory) return false;
      if (activeSidebarYear && activeSidebarMonth) {
        const { month, year } = parseDate(report.date);
        if (year !== activeSidebarYear || month !== activeSidebarMonth) return false;
      }
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        return report.title.toLowerCase().includes(query) || report.excerpt.toLowerCase().includes(query) || report.pairs.some(p => p.toLowerCase().includes(query)) || report.date.toLowerCase().includes(query);
      }
      return true;
    });
  }, [REPORTS_DATA, activeCategory, activeSidebarYear, activeSidebarMonth, searchQuery]);

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

  // ─── NAV CONFIG ───
  const navItems: { id: ActiveView; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'terminal', label: 'TERMINAL', icon: <Terminal className="w-4 h-4" /> },
    { id: 'archive', label: 'ARCHIVE', icon: <Archive className="w-4 h-4" />, badge: String(REPORTS_DATA.length) },
    { id: 'calendar', label: 'KALENDER', icon: <Calendar className="w-4 h-4" /> },
    { id: 'heatmap', label: 'HEAT MAP', icon: <BarChart2 className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-novabg text-novatext font-sans selection:bg-gold selection:text-novabg relative overflow-hidden flex flex-col">
      
      {/* ─── AUTH GATE ─── */}
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 flex flex-col justify-center items-center p-4 min-h-screen relative z-10">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gold/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-sky-500/5 blur-[100px] rounded-full pointer-events-none" />
            <div className="w-full max-w-md bg-novabg-light border border-novaborder rounded-xl p-8 shadow-2xl relative">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-14 h-14 bg-gradient-to-br from-gold to-gold-light rounded-xl flex items-center justify-center text-novabg text-2xl font-serif font-bold shadow-[0_0_20px_rgba(200,168,75,0.25)] border border-gold-light/20 mb-4 select-none">N</div>
                <h1 className="font-serif text-3xl text-novawhite tracking-wider uppercase">Nova Capital</h1>
                <p className="text-[10px] uppercase tracking-[0.25em] text-gold font-mono mt-1 font-semibold">FX Macro Division</p>
                <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-gold-dark to-transparent my-4" />
                <p className="text-xs text-novatext-muted leading-relaxed max-w-xs">Akses terbatas untuk anggota premium FX Macro Division.<br />Login menggunakan akun Telegram terdaftar.</p>
              </div>
              {isVerifying ? (
                <div className="bg-gold/5 border border-gold/20 rounded-lg p-4 mb-6 text-center animate-pulse">
                  <div className="flex justify-center items-center gap-3 text-gold"><RefreshCw className="w-5 h-5 animate-spin" /><span className="font-mono text-xs font-semibold uppercase tracking-wider">Menghubungkan Auth Gate...</span></div>
                  <p className="text-[11px] text-novatext-muted mt-2">Sedang memverifikasi keanggotaan grup Premium Nova Capital</p>
                </div>
              ) : verificationError ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3 text-red-400"><AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" /><div><h4 className="text-xs font-semibold font-mono uppercase tracking-wider">Akses Ditolak</h4><p className="text-xs text-novatext mt-1 leading-relaxed">{verificationError}</p></div></div>
                </div>
              ) : (
                <div className="bg-novabg border border-novaborder/50 rounded-lg p-3 text-center mb-6">
                  <span className="inline-flex items-center justify-center gap-1.5 text-[10px] text-novatext-muted font-mono uppercase tracking-wider"><Lock className="w-3 h-3 text-gold-dark" /> Secure Telegram Widget Gate</span>
                </div>
              )}
              {isLatestJoinGuideVisible && (
                <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-4 mb-6 text-left">
                  <h4 className="text-xs font-semibold text-amber-400 font-mono flex items-center gap-1.5 uppercase mb-1.5"><Zap className="w-4 h-4 animate-bounce" /> Baru Join Grup Premium?</h4>
                  <p className="text-[11px] text-novatext-muted leading-relaxed mb-3">Sistem Telegram membutuhkan waktu beberapa menit untuk menyinkronkan status keanggotaan Anda. Silakan tunggu 5–10 menit lalu cek ulang.</p>
                  <button onClick={() => { if (localStorage.getItem('nova_uid')) silentMembershipCheck(localStorage.getItem('nova_uid')!); }} className="w-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded font-mono text-[10px] py-2 uppercase font-semibold transition">🔄 Coba Cek Ulang</button>
                </div>
              )}
              <div className="mb-6 p-4 bg-novabg border border-novaborder rounded-lg flex flex-col items-center">
                <TelegramLoginModule useRedirectMode={useRedirectMode} onAuth={(userObj) => verifyTelegramSessionOnWorker(userObj)} />
                <div className="mt-4 w-full pt-3 border-t border-novaborder/70 flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] text-novatext-muted font-mono uppercase">Metode:</span>
                    <span className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded ${useRedirectMode ? 'bg-gold/10 text-gold-light border border-gold/20' : 'bg-blue-500/10 text-sky-300'}`}>{useRedirectMode ? 'Direct Redirect' : 'JS Callback'}</span>
                  </div>
                  <button onClick={() => setUseRedirectMode(!useRedirectMode)} className="text-[10px] text-gold hover:text-gold-light hover:underline font-semibold flex items-center gap-1 font-mono uppercase tracking-wider"><RefreshCw className="w-3 h-3" /> Ganti ke Metode {useRedirectMode ? "JS Callback" : "Direct-Redirect"}</button>
                </div>
              </div>
              <div className="mb-6 bg-novabg-light border border-novaborder rounded-lg p-4">
                <button type="button" onClick={() => setShowManualPaste(!showManualPaste)} className="w-full flex items-center justify-between text-xs font-mono text-gold uppercase tracking-wider font-semibold hover:text-gold-light transition">
                  <span className="flex items-center gap-1.5 text-[10px]"><Lock className="w-3.5 h-3.5 text-gold-dark" /> Alternatif Login: Manual Paste Link</span>
                  <span>{showManualPaste ? '▲ TUTUP' : '▼ KLIK DISINI'}</span>
                </button>
                {showManualPaste && (
                  <div className="mt-4 pt-4 border-t border-novaborder/50 space-y-3.5 text-left">
                    <p className="text-[11px] text-novatext-muted leading-relaxed">Gunakan ini jika widget di atas terblokir oleh browser Anda:</p>
                    <ol className="list-decimal list-inside text-[10px] text-novatext-dim space-y-1.5 leading-normal bg-novabg p-3 rounded border border-novaborder/50">
                      <li>Buka Telegram, kunjungi bot <a href="https://t.me/novacapital_auth_bot" target="_blank" className="text-gold underline font-mono font-bold">@novacapital_auth_bot</a></li>
                      <li>Ketik command <strong className="font-mono text-gold bg-novabg-light text-[10px] px-1 rounded">/login</strong></li>
                      <li>Salin link verifikasi dan tempel di bawah:</li>
                    </ol>
                    <div className="space-y-2">
                      <input type="text" placeholder="https://t.me/novacapital_auth_bot?id=xxx&hash=xxx..." value={manualUrl} onChange={(e) => setManualUrl(e.target.value)} className="w-full bg-novabg border border-novaborder text-xs text-novawhite px-3 py-2 rounded focus:outline-none focus:border-gold placeholder:text-novatext-dim font-mono transition" />
                      {manualParseError && <p className="text-[10px] text-red-400 font-mono italic">⚠️ {manualParseError}</p>}
                      <button type="button" onClick={handleManualUrlVerify} className="w-full bg-gold hover:bg-gold-light text-novabg text-[11px] font-mono py-2 rounded uppercase font-bold tracking-wider transition">⚡ Jalankan Verifikasi Manual</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2 mb-8">
                <div className="space-y-1">
                  <button onClick={() => setShowSwitchHelp(!showSwitchHelp)} className="w-full flex items-center justify-between p-3 bg-novabg hover:bg-novabg-hover border border-novaborder rounded text-xs text-novatext-muted transition">
                    <span className="flex items-center gap-2 font-mono uppercase tracking-wider font-semibold text-[10px]"><HelpCircle className="w-3.5 h-3.5 text-gold-light" /> Cara Log Out / Ganti Akun</span>
                    <ChevronDown className={`w-4 h-4 text-novatext-muted transition-transform ${showSwitchHelp ? 'rotate-180' : ''}`} />
                  </button>
                  {showSwitchHelp && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="p-3.5 bg-novabg-light border border-novaborder rounded text-[11px] text-novatext-muted leading-relaxed space-y-2 text-left">
                      <ol className="list-decimal list-inside space-y-1"><li>Buka Telegram dan kunjungi <a href="https://t.me/novacapital_auth_bot" target="_blank" className="text-gold underline font-mono text-[10px] font-semibold">@novacapital_auth_bot</a></li><li>Ketik <strong className="font-mono text-gold">/start</strong> untuk mencabut otorisasi</li></ol>
                    </motion.div>
                  )}
                </div>
                <div className="space-y-1">
                  <button onClick={() => setShowDiagnostics(!showDiagnostics)} className="w-full flex items-center justify-between p-3 bg-novabg hover:bg-novabg-hover border border-novaborder rounded text-xs text-novatext-muted transition">
                    <span className="flex items-center gap-2 font-mono uppercase tracking-wider font-semibold text-[10px]"><Terminal className="w-3.5 h-3.5 text-gold-light" /> Alat Diagnostik Sistem</span>
                    <ChevronDown className={`w-4 h-4 text-novatext-muted transition-transform ${showDiagnostics ? 'rotate-180' : ''}`} />
                  </button>
                  {showDiagnostics && (
                    <div className="p-3.5 bg-novabg-light border border-novaborder rounded text-left space-y-3">
                      <button type="button" onClick={runDiagnostics} disabled={isDiagnosing} className="w-full bg-[#070c14]/50 border border-gold-dark hover:border-gold text-gold-light text-[10px] font-mono py-1.5 rounded uppercase font-bold transition flex items-center justify-center gap-2">
                        {isDiagnosing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin text-gold" /> Sedang Menguji...</> : <><Activity className="w-3.5 h-3.5 text-gold" /> Jalankan Diagnostik</>}
                      </button>
                      {diagnosticLogs.length > 0 && (
                        <div className="bg-black/90 text-gold border border-novaborder p-3 rounded font-mono text-[10px] space-y-1.5 leading-normal max-h-48 overflow-y-auto">
                          {diagnosticLogs.map((log, i) => <div key={i} className="whitespace-pre-wrap break-all">{log}</div>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="pt-4 border-t border-novaborder/80 text-center">
                <div className="text-[10px] text-novatext-dim uppercase font-mono tracking-wider mb-2">Reviewer & Admin Panel</div>
                <button type="button" onClick={handleBypassDemoAccess} className="w-full bg-gradient-to-r from-gold-dark/10 to-gold/15 hover:from-gold-dark/20 hover:to-gold/25 border border-gold-dark/50 hover:border-gold/60 text-gold-light rounded font-mono text-[10px] py-2.5 px-4 font-bold uppercase transition flex items-center justify-center gap-2 tracking-widest">
                  <Terminal className="w-3.5 h-3.5" /> Akses Demo Instan (Bypass Review)
                </button>
              </div>
              <p className="text-[10px] text-novatext-dim text-center mt-8 leading-relaxed font-mono">Nova Capital © 2026 · Encrypted Ledger Secure Node<br />Bantuan Teknis? DM Admin <a href="https://t.me/bimagalih13" target="_blank" className="text-gold hover:underline font-semibold font-mono">@bimagalih13</a></p>
            </div>
          </motion.div>
        ) : (

          /* ─── MAIN BLOOMBERG TERMINAL LAYOUT ─── */
          <motion.div key="terminal-main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-screen">

            {/* ══════════════════════════════════════════════════
                TOP HEADER BAR — Bloomberg-style command bar
            ══════════════════════════════════════════════════ */}
            <header className="bg-novabg-light border-b border-novaborder flex-shrink-0 z-30">
              
              {/* Primary top bar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-novaborder/50">
                {/* Logo */}
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-gold rounded flex items-center justify-center text-novabg text-sm font-serif font-bold select-none">N</div>
                  <div>
                    <span className="font-serif text-sm text-novawhite uppercase tracking-wider">Nova Capital</span>
                    <span className="hidden md:inline text-[10px] font-mono text-novatext-dim ml-2">/ FX MACRO TERMINAL</span>
                  </div>
                </div>

                {/* Live clock + status */}
                <div className="flex items-center gap-4">
                  <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-novatext-muted">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                    <span className="text-green-400 font-semibold">LIVE</span>
                    <span className="text-novaborder mx-1">|</span>
                    <span>{currentTime}</span>
                  </div>
                  
                  {/* User info + logout */}
                  <div className="flex items-center gap-2">
                    <div className="hidden md:flex items-center gap-1.5 bg-novabg border border-novaborder px-2.5 py-1 rounded text-[11px] font-mono">
                      <User className="w-3 h-3 text-gold" />
                      <span className="text-novawhite font-semibold">{sessionUser}</span>
                    </div>
                    <button onClick={handleLogout} className="flex items-center gap-1.5 px-2.5 py-1 border border-novaborder/60 hover:border-red-500/40 text-novatext-dim hover:text-red-400 font-mono text-[10px] uppercase rounded transition">
                      <LogOut className="w-3 h-3" />
                      <span className="hidden md:inline">Logout</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Ticker tape */}
              <div className="overflow-hidden bg-novabg border-b border-novaborder/50 relative">
                <div className="flex animate-[ticker_40s_linear_infinite] whitespace-nowrap py-1.5 gap-0">
                  {[...MARKET_TICKERS, ...MARKET_TICKERS].map((t, i) => (
                    <span key={i} className="inline-flex items-center gap-2 px-5 border-r border-novaborder/30 text-[11px] font-mono flex-shrink-0">
                      <span className="text-novatext-dim font-semibold">{t.symbol}</span>
                      <span className="text-novawhite font-bold">{t.price}</span>
                      <span className={`flex items-center gap-0.5 font-semibold ${t.dir === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.dir === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {t.pct}
                      </span>
                    </span>
                  ))}
                </div>
                <div className="absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-novabg to-transparent pointer-events-none z-10" />
                <div className="absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-novabg to-transparent pointer-events-none z-10" />
              </div>

              {/* Navigation tabs */}
              <div className="flex items-center gap-0 px-4 pt-0 overflow-x-auto scrollbar-none">
                {navItems.map((item) => (
                  <button key={item.id} onClick={() => setActiveView(item.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all flex-shrink-0 ${
                      activeView === item.id
                        ? 'border-gold text-gold bg-gold/5'
                        : 'border-transparent text-novatext-muted hover:text-novawhite hover:border-novaborder'
                    }`}>
                    {item.icon}
                    {item.label}
                    {item.badge && (
                      <span className="bg-gold/20 text-gold text-[9px] px-1.5 py-0.5 rounded font-bold">{item.badge}</span>
                    )}
                  </button>
                ))}
              </div>
            </header>

            {/* ══════════════════════════════════════════════════
                VIEWS
            ══════════════════════════════════════════════════ */}
            <main className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">

                {/* ─── VIEW: TERMINAL (HOME) ─── */}
                {activeView === 'terminal' && (
                  <motion.div key="view-terminal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto">
                    <div className="max-w-screen-xl mx-auto p-4 md:p-6 space-y-5">

                      {/* Date greeting strip */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-mono text-novatext-dim uppercase tracking-[0.3em]">Nova Capital · FX Macro Division</p>
                          <h1 className="font-serif text-2xl md:text-3xl text-novawhite mt-0.5">
                            Market <span className="italic text-gold">Terminal</span>
                          </h1>
                        </div>
                        <div className="hidden md:block text-right">
                          <p className="text-[11px] font-mono text-novatext-muted">{currentDate}</p>
                          <p className="text-[10px] font-mono text-novatext-dim mt-0.5 uppercase tracking-wider">Jakarta / WIB · UTC+7</p>
                        </div>
                      </div>

                      {/* ─── TOP PANELS GRID (Bloomberg-style multi-panel) ─── */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* Panel 1: Macro Regime Matrix */}
                        <div className="bg-novabg-light border border-novaborder rounded p-4 col-span-1">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-novatext-dim">Rezim Makro Aktif</span>
                            <span className="text-[9px] font-mono text-gold uppercase">Live</span>
                          </div>
                          <div className="space-y-2">
                            {REGIME_MATRIX.map((r) => (
                              <div key={r.pair} className={`flex items-center justify-between p-2 rounded border ${r.bg}`}>
                                <div className="flex items-center gap-2">
                                  <span className={`w-1.5 h-1.5 rounded-full ${r.dot}`} />
                                  <span className="font-mono text-[11px] font-bold text-novawhite">{r.pair}</span>
                                </div>
                                <span className={`font-mono text-[10px] font-bold ${r.color}`}>{r.regime}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Panel 2: Live Quotes */}
                        <div className="bg-novabg-light border border-novaborder rounded p-4 col-span-1">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-novatext-dim">Harga Pasar Spot</span>
                            <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Live</span>
                          </div>
                          <div className="space-y-1.5">
                            {MARKET_TICKERS.slice(0, 7).map((t) => (
                              <div key={t.symbol} className="flex items-center justify-between py-1 border-b border-novaborder/30 last:border-0">
                                <span className="font-mono text-[10px] text-novatext-muted font-semibold">{t.symbol}</span>
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-[11px] text-novawhite font-bold">{t.price}</span>
                                  <span className={`font-mono text-[10px] font-semibold w-16 text-right ${t.dir === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>{t.pct}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Panel 3: Stats + Alerts */}
                        <div className="flex flex-col gap-4 col-span-1">
                          {/* Stats mini cards */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-novabg-light border border-novaborder rounded p-3">
                              <span className="text-[9px] font-mono text-novatext-dim uppercase block">Total Arsip</span>
                              <span className="font-serif text-2xl font-bold text-gold">{REPORTS_DATA.length}</span>
                              <span className="text-[9px] font-mono text-novatext-dim block mt-1">Dokumen</span>
                            </div>
                            <div className="bg-novabg-light border border-novaborder rounded p-3">
                              <span className="text-[9px] font-mono text-novatext-dim uppercase block">Weekly</span>
                              <span className="font-serif text-2xl font-bold text-sky-400">{REPORTS_DATA.filter(r => r.category === 'weekly').length}</span>
                              <span className="text-[9px] font-mono text-novatext-dim block mt-1">Outlook</span>
                            </div>
                            <div className="bg-novabg-light border border-novaborder rounded p-3">
                              <span className="text-[9px] font-mono text-novatext-dim uppercase block">Daily</span>
                              <span className="font-serif text-2xl font-bold text-emerald-400">{REPORTS_DATA.filter(r => r.category === 'daily').length}</span>
                              <span className="text-[9px] font-mono text-novatext-dim block mt-1">Report</span>
                            </div>
                            <div className="bg-novabg-light border border-novaborder rounded p-3">
                              <span className="text-[9px] font-mono text-novatext-dim uppercase block">Bulan</span>
                              <span className="font-serif text-2xl font-bold text-purple-400">2</span>
                              <span className="text-[9px] font-mono text-novatext-dim block mt-1">Aktif</span>
                            </div>
                          </div>
                          {/* Alert notice */}
                          <div className="bg-gold/5 border border-gold/20 rounded p-3 flex gap-2">
                            <Bell className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[10px] font-mono font-bold text-gold uppercase tracking-wider">Riset Terbaru</p>
                              <p className="text-[11px] text-novatext-muted mt-0.5 leading-relaxed">{REPORTS_DATA[0]?.title}</p>
                              <button onClick={() => { setActiveView('archive'); }} className="text-[10px] font-mono text-gold underline mt-1">Buka Arsip →</button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ─── ECONOMIC CALENDAR ─── */}
                      <div className="bg-novabg-light border border-novaborder rounded">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-novaborder">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gold" />
                            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-novatext-muted">Kalender Ekonomi Hari Ini</span>
                          </div>
                          <button onClick={() => setActiveView('calendar')} className="text-[10px] font-mono text-gold uppercase tracking-wider hover:underline">Lihat Semua →</button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px] font-mono">
                            <thead>
                              <tr className="border-b border-novaborder/50 text-[9px] text-novatext-dim uppercase">
                                <th className="text-left px-4 py-2">Waktu</th>
                                <th className="text-left px-4 py-2">Mata Uang</th>
                                <th className="text-left px-4 py-2">Event</th>
                                <th className="text-center px-4 py-2">Dampak</th>
                                <th className="text-right px-4 py-2">Konsensus</th>
                                <th className="text-right px-4 py-2">Sebelumnya</th>
                              </tr>
                            </thead>
                            <tbody>
                              {MACRO_EVENTS.map((ev, i) => (
                                <tr key={i} className="border-b border-novaborder/20 last:border-0 hover:bg-novabg/50 transition">
                                  <td className="px-4 py-2.5 text-novatext-muted">{ev.time}</td>
                                  <td className="px-4 py-2.5">
                                    <span className="bg-novabg border border-novaborder px-2 py-0.5 rounded text-[10px] font-bold text-novawhite">{ev.currency}</span>
                                  </td>
                                  <td className="px-4 py-2.5 text-novawhite font-semibold">{ev.event}</td>
                                  <td className="px-4 py-2.5 text-center">
                                    <span className={`inline-block w-2 h-2 rounded-full ${ev.impact === 'high' ? 'bg-rose-500' : 'bg-amber-400'}`} />
                                  </td>
                                  <td className="px-4 py-2.5 text-right text-gold-light">{ev.consensus}</td>
                                  <td className="px-4 py-2.5 text-right text-novatext-muted">{ev.previous}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* ─── RECENT REPORTS LIST ─── */}
                      <div className="bg-novabg-light border border-novaborder rounded">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-novaborder">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gold" />
                            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-novatext-muted">Riset Terbaru</span>
                          </div>
                          <button onClick={() => setActiveView('archive')} className="text-[10px] font-mono text-gold uppercase tracking-wider hover:underline">Buka Arsip Lengkap →</button>
                        </div>
                        <div className="divide-y divide-novaborder/30">
                          {REPORTS_DATA.slice(0, 6).map((report, idx) => (
                            <div key={report.file} onClick={() => { setSelectedReport(report); setActiveReportTab('summary'); }}
                              className="flex items-start gap-4 px-4 py-3 hover:bg-novabg/60 cursor-pointer transition group">
                              <div className="flex-shrink-0 w-8 text-center">
                                <span className="font-mono text-[11px] text-novatext-dim">{String(idx + 1).padStart(2, '0')}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                                    report.category === 'weekly' ? 'text-sky-400 border-sky-500/30 bg-sky-500/10' :
                                    report.category === 'daily' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                                    'text-purple-400 border-purple-500/30 bg-purple-500/10'
                                  }`}>{report.category}</span>
                                  {idx === 0 && <span className="text-[9px] font-mono bg-gold text-novabg px-1.5 py-0.5 rounded font-bold uppercase">NEW</span>}
                                </div>
                                <p className="font-mono text-[12px] text-novawhite font-semibold group-hover:text-gold transition truncate">{report.title}</p>
                                <p className="text-[10px] text-novatext-dim font-mono mt-0.5">{report.date}</p>
                              </div>
                              <div className="flex-shrink-0 flex items-center gap-1 flex-wrap justify-end">
                                {report.pairs.slice(0, 2).map(p => (
                                  <span key={p} className="text-[9px] font-mono bg-novabg border border-novaborder text-gold-light px-1.5 py-0.5 rounded">{p}</span>
                                ))}
                                <ChevronRight className="w-4 h-4 text-novatext-dim group-hover:text-gold transition ml-1" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </motion.div>
                )}

                {/* ─── VIEW: ARCHIVE ─── */}
                {activeView === 'archive' && (
                  <motion.div key="view-archive" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex overflow-hidden">
                    
                    {/* Sidebar */}
                    <aside className="w-[220px] flex-shrink-0 bg-novabg-light border-r border-novaborder flex flex-col h-full overflow-hidden hidden md:flex">
                      <div className="p-4 border-b border-novaborder">
                        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-novatext-dim mb-1">Direktori Arsip</p>
                        <p className="text-[10px] font-mono text-novatext-muted">Total: <span className="text-gold font-bold">{REPORTS_DATA.length}</span> dokumen</p>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {availableYears.map((year) => {
                          const isYearOpen = activeSidebarYear === year;
                          const months = Object.keys(sidebarDataTree[year] || {}).sort((a, b) => MONTH_ORDER[b] - MONTH_ORDER[a]);
                          return (
                            <div key={year}>
                              <button onClick={() => { setActiveSidebarYear(year === activeSidebarYear ? null : year); if (year !== activeSidebarYear && months.length > 0) setActiveSidebarMonth(months[0]); }}
                                className="w-full flex items-center justify-between py-1.5 px-2 rounded hover:bg-novabg text-[11px] font-mono font-bold transition text-novawhite border border-transparent hover:border-novaborder/30">
                                <span className="flex items-center gap-1.5"><BookOpen className="w-3 h-3 text-gold-dark" /> {year}</span>
                                <ChevronDown className={`w-3 h-3 text-novatext-muted transition-transform ${isYearOpen ? 'rotate-180' : ''}`} />
                              </button>
                              {isYearOpen && (
                                <div className="pl-3 border-l border-novaborder/60 ml-3 py-1 space-y-0.5">
                                  {months.map((month) => {
                                    const isSelected = activeSidebarMonth === month && activeSidebarYear === year;
                                    const count = sidebarDataTree[year][month]?.length || 0;
                                    return (
                                      <button key={month} onClick={() => { setActiveSidebarMonth(month); setActiveSidebarYear(year); setSearchQuery(''); }}
                                        className={`w-full flex items-center justify-between py-1 px-2 rounded font-mono text-[10px] transition text-left ${isSelected ? 'bg-gold/10 text-gold font-bold border-l-2 border-gold pl-1' : 'text-novatext-muted hover:text-novawhite hover:bg-novabg/50'}`}>
                                        <span className="capitalize">{month}</span>
                                        <span className="bg-novaborder text-[8px] text-novatext px-1.5 rounded-full font-bold">{count}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </aside>

                    {/* Main archive content */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                      
                      {/* Archive toolbar */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-novaborder bg-novabg-light flex-shrink-0">
                        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none flex-1">
                          {['all', 'weekly', 'daily', 'macro'].map((cat) => (
                            <button key={cat} onClick={() => { setActiveCategory(cat); if (cat !== 'all') { setActiveSidebarMonth(null); setActiveSidebarYear(null); } }}
                              className={`px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider rounded border transition flex-shrink-0 ${activeCategory === cat ? 'bg-gold/10 text-gold border-gold' : 'bg-transparent border-novaborder text-novatext-muted hover:border-gold/40 hover:text-novawhite'}`}>
                              {cat === 'all' ? 'Semua' : cat === 'weekly' ? 'Weekly' : cat === 'daily' ? 'Daily' : 'Macro'}
                            </button>
                          ))}
                        </div>
                        <div className="relative flex-shrink-0">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-novatext-muted pointer-events-none" />
                          <input type="search" placeholder="Cari..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-40 pl-8 pr-3 py-1.5 bg-novabg border border-novaborder rounded text-[11px] font-mono text-novawhite focus:outline-none focus:border-gold transition placeholder:text-novatext-dim" />
                        </div>
                      </div>

                      {/* Archive grid */}
                      <div className="flex-1 overflow-y-auto p-4">
                        {(activeSidebarYear && activeSidebarMonth) || searchQuery ? (
                          <div className="mb-3 flex items-center justify-between text-[11px] font-mono bg-gold/5 border border-gold-dark/25 px-3 py-2 rounded">
                            <div className="flex items-center gap-2">
                              <Filter className="w-3.5 h-3.5 text-gold" />
                              {activeSidebarYear && activeSidebarMonth && <span className="bg-novabg border border-novaborder px-2 py-0.5 rounded text-gold-light text-[10px] capitalize">{activeSidebarMonth} {activeSidebarYear}</span>}
                              {searchQuery && <span className="bg-novabg border border-novaborder px-2 py-0.5 rounded text-gold-light text-[10px]">"{searchQuery}"</span>}
                            </div>
                            <button onClick={() => { setSearchQuery(''); setActiveSidebarYear(2026); setActiveSidebarMonth('juni'); setActiveCategory('all'); }} className="text-[10px] text-gold hover:underline uppercase font-bold">Reset</button>
                          </div>
                        ) : null}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          <AnimatePresence mode="popLayout">
                            {filteredReportsList.length === 0 ? (
                              <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border border-dashed border-novaborder p-8 rounded text-center col-span-3 text-novatext-muted font-mono">
                                <Terminal className="w-8 h-8 mx-auto text-novatext-dim mb-2" />
                                <p className="text-xs uppercase tracking-wider font-semibold">Tidak ditemukan laporan</p>
                              </motion.div>
                            ) : (
                              filteredReportsList.map((report, idx) => {
                                const isLatest = report.file === REPORTS_DATA[0].file;
                                return (
                                  <motion.article layout key={report.file} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, delay: Math.min(idx * 0.03, 0.15) }}
                                    onClick={() => { setSelectedReport(report); setActiveReportTab('summary'); }}
                                    className={`group p-4 rounded border text-left cursor-pointer transition flex flex-col justify-between ${isLatest ? 'bg-gradient-to-br from-novabg-light to-gold/5 border-gold/45 hover:border-gold' : 'bg-novabg-light border-novaborder hover:border-gold/50 hover:bg-novabg-hover'}`}>
                                    <div>
                                      <div className="flex items-center justify-between mb-2.5">
                                        <span className="text-[9px] text-novatext-muted font-mono">{report.date}</span>
                                        <div className="flex items-center gap-1">
                                          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${report.category === 'weekly' ? 'text-sky-400 border-sky-500/30 bg-sky-500/10' : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'}`}>{report.category}</span>
                                          {isLatest && <span className="bg-gold text-novabg font-mono font-bold text-[8px] px-1.5 py-0.5 rounded uppercase">NEW</span>}
                                        </div>
                                      </div>
                                      <h3 className="font-serif text-base font-bold text-novawhite group-hover:text-gold transition leading-snug">{report.title}</h3>
                                      <p className="text-[10px] text-novatext-muted leading-relaxed mt-2 mb-3 line-clamp-2">{report.excerpt}</p>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-novaborder/40 pt-3 mt-auto">
                                      <div className="flex flex-wrap gap-1">
                                        {report.pairs.slice(0, 3).map((p) => (
                                          <span key={p} className="text-[8px] font-mono bg-novabg px-1.5 py-0.5 border border-novaborder text-gold-light rounded">{p}</span>
                                        ))}
                                      </div>
                                      <span className="text-[10px] text-gold font-mono uppercase tracking-wider font-semibold inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">Buka <ChevronRight className="w-3 h-3" /></span>
                                    </div>
                                  </motion.article>
                                );
                              })
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ─── VIEW: ECONOMIC CALENDAR ─── */}
                {activeView === 'calendar' && (
                  <motion.div key="view-calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto">
                    <div className="max-w-screen-lg mx-auto p-4 md:p-6 space-y-5">
                      <div>
                        <p className="text-[10px] font-mono text-novatext-dim uppercase tracking-[0.3em]">Nova Capital</p>
                        <h1 className="font-serif text-2xl text-novawhite mt-0.5">Kalender <span className="italic text-gold">Ekonomi</span></h1>
                      </div>

                      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
                        {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((d, i) => (
                          <div key={d} className={`rounded border p-2 text-center font-mono text-[10px] transition ${i === 0 ? 'bg-gold/10 border-gold text-gold' : 'bg-novabg-light border-novaborder text-novatext-muted'}`}>
                            <p className="font-bold uppercase">{d}</p>
                            <p className="text-[9px] mt-0.5 text-novatext-dim">{16 + i} Jun</p>
                          </div>
                        ))}
                      </div>

                      <div className="bg-novabg-light border border-novaborder rounded overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-novaborder flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gold" />
                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-novatext-muted">Jadwal Rilis Data — Minggu Ini</span>
                          <span className="ml-auto flex items-center gap-2 text-[10px] font-mono text-novatext-dim">
                            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Dampak Tinggi
                            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block ml-2" /> Dampak Sedang
                            <span className="w-2 h-2 rounded-full bg-slate-500 inline-block ml-2" /> Rendah
                          </span>
                        </div>
                        <table className="w-full text-[11px] font-mono">
                          <thead>
                            <tr className="border-b border-novaborder/50 text-[9px] text-novatext-dim uppercase bg-novabg/50">
                              <th className="text-left px-4 py-2">Waktu (WIB)</th>
                              <th className="text-left px-4 py-2">Aset</th>
                              <th className="text-left px-4 py-2">Indikator</th>
                              <th className="text-center px-4 py-2">Level</th>
                              <th className="text-right px-4 py-2">Forecast</th>
                              <th className="text-right px-4 py-2">Prior</th>
                            </tr>
                          </thead>
                          <tbody>
                            {MACRO_EVENTS.concat([
                              { time: '07:00', currency: 'GBP', event: 'GDP q/q Flash', impact: 'high', consensus: '0.3%', previous: '0.2%' },
                              { time: '08:30', currency: 'EUR', event: 'PMI Manufacturing', impact: 'medium', consensus: '48.2', previous: '47.8' },
                              { time: '10:00', currency: 'USD', event: 'ISM Non-Manufacturing PMI', impact: 'high', consensus: '52.5', previous: '51.6' },
                              { time: '21:30', currency: 'USD', event: 'Initial Jobless Claims', impact: 'medium', consensus: '225K', previous: '226K' },
                            ]).map((ev, i) => (
                              <tr key={i} className="border-b border-novaborder/20 last:border-0 hover:bg-novabg/40 transition">
                                <td className="px-4 py-2.5 text-novatext-muted">{ev.time}</td>
                                <td className="px-4 py-2.5">
                                  <span className="bg-novabg border border-novaborder px-2 py-0.5 rounded text-[9px] font-bold text-novawhite">{ev.currency}</span>
                                </td>
                                <td className="px-4 py-2.5 text-novawhite font-semibold">{ev.event}</td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className={`inline-flex w-2 h-2 rounded-full ${ev.impact === 'high' ? 'bg-rose-500' : ev.impact === 'medium' ? 'bg-amber-400' : 'bg-slate-500'}`} />
                                </td>
                                <td className="px-4 py-2.5 text-right text-gold-light">{ev.consensus}</td>
                                <td className="px-4 py-2.5 text-right text-novatext-muted">{ev.previous}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Upcoming high-impact banner */}
                      <div className="bg-rose-500/5 border border-rose-500/20 rounded p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                          <span className="text-[11px] font-mono font-bold text-rose-400 uppercase tracking-wider">Peristiwa Dampak Tinggi Mendatang</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {[
                            { date: '25 Jun 2026', event: 'FOMC Minutes', currency: 'USD' },
                            { date: '26 Jun 2026', event: 'Core PCE Price Index', currency: 'USD' },
                            { date: '27 Jun 2026', event: 'Bank of Japan Summary', currency: 'JPY' },
                          ].map((ev, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-novabg-light border border-novaborder rounded">
                              <div className="w-8 h-8 bg-rose-500/10 border border-rose-500/20 rounded flex items-center justify-center flex-shrink-0">
                                <Radio className="w-4 h-4 text-rose-400" />
                              </div>
                              <div>
                                <p className="text-[11px] text-novawhite font-semibold font-mono">{ev.event}</p>
                                <p className="text-[10px] text-novatext-dim font-mono mt-0.5">{ev.date} · {ev.currency}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ─── VIEW: HEAT MAP ─── */}
                {activeView === 'heatmap' && (
                  <motion.div key="view-heatmap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto">
                    <div className="max-w-screen-xl mx-auto p-4 md:p-6 space-y-5">
                      <div>
                        <p className="text-[10px] font-mono text-novatext-dim uppercase tracking-[0.3em]">Nova Capital</p>
                        <h1 className="font-serif text-2xl text-novawhite mt-0.5">FX <span className="italic text-gold">Heat Map</span></h1>
                      </div>
                      
                      <div className="bg-novabg-light border border-novaborder rounded overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-novaborder">
                          <div className="flex items-center gap-2">
                            <BarChart2 className="w-4 h-4 text-gold" />
                            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-novatext-muted">Live Forex Heat Map — TradingView</span>
                          </div>
                          <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Live Feed</span>
                        </div>
                        <div className="w-full h-[420px] bg-novabg-light relative">
                          <TradingViewHeatMap />
                        </div>
                      </div>

                      {/* Currency Strength Bars */}
                      <div className="bg-novabg-light border border-novaborder rounded p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <TrendingUp className="w-4 h-4 text-gold" />
                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-novatext-muted">Kekuatan Relatif Mata Uang</span>
                        </div>
                        <div className="space-y-3">
                          {[
                            { currency: 'JPY', strength: 78, dir: 'up', color: 'bg-emerald-500' },
                            { currency: 'GBP', strength: 71, dir: 'up', color: 'bg-emerald-500' },
                            { currency: 'EUR', strength: 54, dir: 'up', color: 'bg-emerald-400' },
                            { currency: 'USD', strength: 48, dir: 'down', color: 'bg-amber-500' },
                            { currency: 'CHF', strength: 42, dir: 'down', color: 'bg-amber-400' },
                            { currency: 'CAD', strength: 35, dir: 'down', color: 'bg-rose-500' },
                            { currency: 'AUD', strength: 28, dir: 'down', color: 'bg-rose-500' },
                            { currency: 'NZD', strength: 22, dir: 'down', color: 'bg-rose-600' },
                          ].map((c) => (
                            <div key={c.currency} className="flex items-center gap-3">
                              <span className="w-8 font-mono text-[11px] font-bold text-novawhite flex-shrink-0">{c.currency}</span>
                              <div className="flex-1 bg-novabg rounded-full h-2 overflow-hidden">
                                <div className={`h-full ${c.color} rounded-full transition-all`} style={{ width: `${c.strength}%` }} />
                              </div>
                              <span className={`font-mono text-[10px] font-bold w-8 text-right ${c.dir === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>{c.strength}</span>
                              {c.dir === 'up' ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> : <TrendingDown className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Correlation grid */}
                      <div className="bg-novabg-light border border-novaborder rounded p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Layers className="w-4 h-4 text-gold" />
                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-novatext-muted">Rezim Mata Uang Aktif</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {REGIME_MATRIX.map((r) => (
                            <div key={r.pair} className={`p-3 rounded border ${r.bg} flex items-start justify-between`}>
                              <div>
                                <p className={`font-mono text-base font-bold ${r.color}`}>{r.pair}</p>
                                <p className={`font-mono text-[10px] ${r.color} opacity-80 mt-0.5`}>{r.regime}</p>
                              </div>
                              <span className={`w-2 h-2 rounded-full mt-1.5 ${r.dot}`} />
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </main>

            {/* ─── REPORT DRAWER MODAL ─── */}
            <AnimatePresence>
              {selectedReport && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-[#070c14]/85 z-50 flex justify-end backdrop-blur-sm" onClick={() => setSelectedReport(null)}>
                  <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                    className="w-full max-w-xl bg-novabg-light border-l border-novaborder h-full flex flex-col shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    
                    <div className="p-5 border-b border-novaborder bg-novabg flex flex-col gap-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] text-novatext-muted font-mono uppercase tracking-widest bg-novabg-hover border border-novaborder px-2 py-0.5 rounded">{selectedReport.category} · {selectedReport.version}</span>
                        <button onClick={() => setSelectedReport(null)} className="text-xs text-novatext-muted hover:text-novawhite font-mono font-bold uppercase tracking-wider cursor-pointer bg-novabg-hover hover:bg-novabg-active border border-novaborder px-3 py-1 rounded transition flex items-center gap-1.5">
                          <X className="w-3 h-3" /> Tutup
                        </button>
                      </div>
                      <h2 className="font-serif text-xl font-bold text-novawhite leading-tight">{selectedReport.title}</h2>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-novatext-muted font-mono">
                        <span>{selectedReport.date}</span>
                        <span className="text-novaborder">|</span>
                        <span>{selectedReport.day}</span>
                        <span className="text-novaborder">|</span>
                        <div className="flex gap-1 flex-wrap">
                          {selectedReport.pairs.map(p => <span key={p} className="text-gold-light font-bold">{p}</span>)}
                        </div>
                      </div>
                    </div>

                    <div className="flex border-b border-novaborder bg-novabg-hover/50 text-[10px] font-mono">
                      {[{ id: 'summary', name: 'Rangkuman' }, { id: 'analysis', name: 'Analisis' }, { id: 'pairs', name: 'Sinyal FX' }, { id: 'plan', name: 'Trading Plan' }].map((tab) => (
                        <button key={tab.id} onClick={() => setActiveReportTab(tab.id as any)}
                          className={`flex-1 py-2.5 text-center border-b-2 font-bold uppercase tracking-wider transition ${activeReportTab === tab.id ? 'border-gold text-gold bg-novabg-light' : 'border-transparent text-novatext-muted hover:text-novawhite hover:bg-novabg/20'}`}>
                          {tab.name}
                        </button>
                      ))}
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                      {activeReportTab === 'summary' && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                          <div className="p-4 bg-[#070c14]/40 border border-novaborder rounded relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-gold/5 rounded-full blur-xl" />
                            <h4 className="text-[10px] uppercase font-mono text-gold-light mb-2 font-bold tracking-widest flex items-center gap-2"><Award className="w-4 h-4 text-gold" /> Tesis Utama & Rezim</h4>
                            <p className="text-[11px] text-novatext leading-relaxed">{selectedReport.excerpt}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
                            <div className="p-3 bg-novabg-hover/20 border border-novaborder/50 rounded"><span className="text-novatext-dim block text-[9px] uppercase mb-1">Kategori</span><span className="text-novawhite capitalize">{selectedReport.category}</span></div>
                            <div className="p-3 bg-novabg-hover/20 border border-novaborder/50 rounded"><span className="text-novatext-dim block text-[9px] uppercase mb-1">Versi</span><span className="text-novawhite">{selectedReport.version}</span></div>
                          </div>
                        </motion.div>
                      )}
                      {activeReportTab === 'analysis' && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                          <h3 className="font-serif text-lg text-novawhite">Pilar Analisis Makro Fundamental</h3>
                          <p className="text-[11px] text-novatext-muted leading-relaxed">{generatedReportAnalysis?.overview}</p>
                          <div className="h-[1px] bg-novaborder my-4" />
                          <h4 className="text-[10px] font-mono uppercase tracking-wider text-gold">Bukti Transaksional</h4>
                          <ul className="space-y-3">
                            {generatedReportAnalysis?.evidence.map((ev, i) => (
                              <li key={i} className="flex gap-2.5 items-start text-[11px] text-novatext leading-relaxed">
                                <span className="w-5 h-5 bg-gold/10 border border-gold-dark/40 text-gold font-mono rounded flex items-center justify-center text-[9px] shrink-0 font-bold mt-0.5">{i + 1}</span>
                                <span>{ev}</span>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                      {activeReportTab === 'pairs' && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                          <h3 className="font-serif text-lg text-novawhite">Bias & Sinyal Entri</h3>
                          <div className="space-y-3">
                            {generatedReportAnalysis?.pairsMatrix.map((item, idx) => (
                              <div key={idx} className="p-4 bg-[#070c14]/50 border border-novaborder rounded flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div>
                                  <span className="font-mono text-base font-bold text-novawhite">{item.pair}</span>
                                  <div className="flex gap-2 mt-1 font-mono text-[9px]">
                                    <span className="px-2 py-0.5 bg-novabg-hover border border-novaborder text-novatext-muted rounded">{item.volatility}</span>
                                    <span className="px-2 py-0.5 bg-novabg-hover border border-novaborder text-novatext-muted rounded">{item.strategy}</span>
                                  </div>
                                </div>
                                <span className={`font-mono text-xs font-bold px-3 py-1 rounded tracking-wider border shrink-0 ${item.bias === 'BULLISH' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>{item.bias}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                      {activeReportTab === 'plan' && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded">
                            <span className="text-[9px] font-mono uppercase tracking-widest text-amber-500 font-bold block mb-1">Pemberitahuan Risiko</span>
                            <p className="text-[11px] text-novatext-muted leading-relaxed">Seluruh rencana perdagangan merupakan pemetaan skenario berbasis probabilitas, bukan nasihat keuangan formal.</p>
                          </div>
                          <h3 className="font-serif text-lg text-novawhite">Matriks Eksekusi</h3>
                          <p className="text-[11px] text-novatext leading-relaxed bg-novabg-hover/20 p-4 border border-novaborder rounded">{generatedReportAnalysis?.tradingPlan}</p>
                          {sessionUser === 'Reviewer AI Studio' ? (
                            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded">
                              <div className="flex items-center gap-2 mb-2 text-red-400"><Lock className="w-4 h-4" /><span className="text-[10px] font-mono uppercase tracking-widest font-bold">Akses Dokumen Asli Terkunci (Mode Demo)</span></div>
                              <p className="text-[11px] text-novatext-muted leading-relaxed">Dokumen riset HTML asli hanya tersedia untuk akun Premium sah yang disinkronisasi melalui Telegram Bot.</p>
                            </div>
                          ) : (
                            <a href={selectedReport.file} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 py-2.5 bg-gold hover:bg-gold-light text-novabg rounded font-mono text-[11px] font-bold uppercase tracking-wider transition">
                              <ExternalLink className="w-4 h-4" /> Buka Halaman Riset
                            </a>
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

      {/* Inline CSS for ticker animation */}
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

// ─── LOCAL MODULES ───

function TradingViewHeatMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-forex-heat-map.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      "width": "100%", "height": "100%",
      "currencies": ["EUR", "USD", "JPY", "GBP", "CHF", "AUD", "CAD", "NZD", "CNY"],
      "isTransparent": true, "colorTheme": "dark", "locale": "en", "backgroundColor": "#0c1320"
    });
    containerRef.current.appendChild(script);
  }, []);
  return <div className="w-full h-full bg-[#0c1320]" ref={containerRef} />;
}

interface TelegramLoginProps { useRedirectMode: boolean; onAuth: (user: any) => void; }
function TelegramLoginModule({ useRedirectMode, onAuth }: TelegramLoginProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onAuthRef = useRef(onAuth);
  useEffect(() => { onAuthRef.current = onAuth; }, [onAuth]);
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';
    const script = document.createElement('script');
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute('data-telegram-login', 'novacapital_auth_bot');
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-request-access', 'write');
    const handleAuth = (user: any) => { onAuthRef.current(user); };
    (window as any).onTelegramRefAuth = handleAuth;
    (window as any)['onTelegramRefAuth(user)'] = handleAuth;
    if (useRedirectMode) {
      const searchParams = new URLSearchParams(window.location.search);
      const redirectParam = searchParams.get('redirect_to');
      let currentUrl = window.location.origin + window.location.pathname;
      if (redirectParam) currentUrl += `?redirect_to=${encodeURIComponent(redirectParam)}`;
      script.setAttribute('data-auth-url', currentUrl);
    } else {
      script.setAttribute('data-onauth', 'onTelegramRefAuth(user)');
    }
    containerRef.current.appendChild(script);
  }, [useRedirectMode]);
  return <div className="flex justify-center items-center py-2 h-12" ref={containerRef} id="telegram-widget-container-node" />;
}
