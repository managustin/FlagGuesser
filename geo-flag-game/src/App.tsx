import { useState, useEffect, useRef } from 'react';
// Agrega la palabra clave 'type' antes de Country
import { countries, type Country } from './data/countries';
import leavenstein from 'fast-levenshtein';

// --- CONFIGURACIÓN ---
const GAME_MODES = {
  easy: { count: 20, label: 'Fácil' },
  medium: { count: 50, label: 'Intermedio' },
  hard: { count: 100, label: 'Avanzado' },
  expert: { count: countries.length, label: 'Experto' },
};

const INITIAL_TIME = 20;

function App() {
  // --- ESTADOS ---
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'finished'>('menu');
  const [language, setLanguage] = useState<'es' | 'en'>('es');
  const [gameQueue, setGameQueue] = useState<Country[]>([]);
  const [currentCountry, setCurrentCountry] = useState<Country | null>(null);
  const [inputVal, setInputVal] = useState('');
  
  // Puntajes y Contadores
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  
  // Tiempo y Feedback
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [isPaused, setIsPaused] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'timeout', text: string } | null>(null);

  // Referencias para timers
  const timerRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);

  // --- LOGICA DEL TIMER ---
  useEffect(() => {
    if (gameState === 'playing' && !isPaused && !feedback && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !feedback) {
      handleTimeOut();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, isPaused, feedback, timeLeft]);

  // --- FUNCIONES DEL JUEGO ---

  const startGame = (modeKey: keyof typeof GAME_MODES) => {
    const count = GAME_MODES[modeKey].count;
    // Mezclar y recortar array
    const shuffled = [...countries].sort(() => 0.5 - Math.random()).slice(0, count);
    
    setGameQueue(shuffled);
    setScore(0);
    setCorrectCount(0);
    setErrorCount(0);
    setGameState('playing');
    nextRound(shuffled);
  };

  const nextRound = (queue: Country[] = gameQueue) => {
    if (queue.length === 0) {
      setGameState('finished');
      return;
    }
    const next = queue[0];
    const remaining = queue.slice(1);
    
    setGameQueue(remaining);
    setCurrentCountry(next);
    setTimeLeft(INITIAL_TIME);
    setFeedback(null);
    setInputVal('');
    setIsPaused(false);
  };

  const calculatePoints = (secondsRemaining: number) => {
    const timeSpent = INITIAL_TIME - secondsRemaining;
    if (timeSpent < 5) return 5;
    if (timeSpent < 8) return 4;
    if (timeSpent < 11) return 3;
    if (timeSpent < 15) return 2;
    return 1;
  };

  const checkAnswer = () => {
    if (!currentCountry || feedback) return;

    const correctName = language === 'es' ? currentCountry.nameEs : currentCountry.nameEn;
    const userInput = inputVal.trim().toLowerCase();
    
    // Chequeamos ambos idiomas
    const distEs = leavenstein.get(userInput, currentCountry.nameEs.toLowerCase());
    const distEn = leavenstein.get(userInput, currentCountry.nameEn.toLowerCase());
    
    // Permitimos hasta 2 errores tipográficos para palabras de mas de 4 letras, sino 1.
    const threshold = correctName.length > 4 ? 2 : 1;
    const isCorrect = distEs <= threshold || distEn <= threshold;

    if (isCorrect) {
      const points = calculatePoints(timeLeft);
      setScore(s => s + points);
      setCorrectCount(c => c + 1);
      showFeedback('success', correctName);
    } else {
      setErrorCount(c => c + 1);
      showFeedback('error', correctName);
    }
  };

  const handleTimeOut = () => {
    if (!currentCountry) return;
    setErrorCount(c => c + 1);
    const correctName = language === 'es' ? currentCountry.nameEs : currentCountry.nameEn;
    showFeedback('timeout', correctName);
  };

  const showFeedback = (type: 'success' | 'error' | 'timeout', correctText: string) => {
    setFeedback({ type, text: correctText });
    
    // Esperar 5 segundos antes de la siguiente bandera
    feedbackTimeoutRef.current = setTimeout(() => {
      nextRound();
    }, 3200);
  };

  // --- RENDERIZADO ---

  return (
    <div className="min-h-screen flex flex-col items-center p-4 selection:bg-english-violet selection:text-white">
      
      {/* HEADER / TOP BAR */}
      <header className="w-full max-w-4xl flex justify-between items-center mb-8 p-4 bg-english-violet/30 rounded-xl backdrop-blur-sm border border-white/10">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Flag<span className="text-purple-300">Guesser</span>
        </h1>
        
        <div className="flex gap-4 items-center">
            {/* Toggle Idioma */}
            <button 
                onClick={() => setLanguage(l => l === 'es' ? 'en' : 'es')}
                className="flex items-center gap-2 px-3 py-1 rounded bg-dark-bg border border-white/20 hover:border-white/50 transition"
            >
                <img 
                    src={language === 'es' ? "https://flagcdn.com/w40/ar.png" : "https://flagcdn.com/w40/us.png"} 
                    alt="Lang" 
                    className="w-6 h-4 object-cover rounded-sm"
                />
                <span className="text-sm font-semibold">{language.toUpperCase()}</span>
            </button>

            {gameState === 'playing' && (
                <button 
                    onClick={() => setGameState('menu')}
                    className="text-sm text-red-300 hover:text-red-100 underline decoration-red-300/30"
                >
                    {language === 'es' ? 'Reiniciar' : 'Restart'}
                </button>
            )}
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="w-full max-w-2xl flex-1 flex flex-col items-center justify-center">
        
        {/* MENU */}
        {gameState === 'menu' && (
          <div className="text-center w-full animate-in fade-in zoom-in duration-300">
            <h2 className="text-4xl font-bold mb-8">
              {language === 'es' ? 'Elige la dificultad' : 'Choose difficulty'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(Object.keys(GAME_MODES) as Array<keyof typeof GAME_MODES>).map((mode) => (
                <button
                  key={mode}
                  onClick={() => startGame(mode)}
                  className="p-6 rounded-xl bg-english-violet hover:bg-[#4a3e60] transition transform hover:-translate-y-1 border border-white/5 shadow-lg group"
                >
                  <h3 className="text-xl font-bold mb-1">{GAME_MODES[mode].label}</h3>
                  <p className="text-white/60 text-sm">
                    {GAME_MODES[mode].count} {language === 'es' ? 'Banderas' : 'Flags'}
                  </p>
                </button>
              ))}
            </div>
            <div className="mt-8 text-white/30 text-sm">
                 {/* Placeholder para futura implementación de continentes */}
                 {language === 'es' ? 'Modo Continentes: Próximamente' : 'Continents Mode: Coming Soon'}
            </div>
          </div>
        )}

        {/* JUEGO */}
        {gameState === 'playing' && currentCountry && (
          <div className="w-full flex flex-col items-center">
            
            {/* HUD */}
            <div className="w-full flex justify-between mb-6 text-lg font-mono">
                <div className="flex gap-4">
                    <span className="text-green-400">✓ {correctCount}</span>
                    <span className="text-red-400">✗ {errorCount}</span>
                </div>
                <div className="text-yellow-300 font-bold">
                    Score: {score}
                </div>
            </div>

            {/* BANDERA Y PAUSA */}
            <div className="relative w-full aspect-video bg-black/20 rounded-2xl overflow-hidden shadow-2xl mb-8 flex items-center justify-center border border-white/10">
                {isPaused ? (
                    <div className="text-4xl font-bold text-white/20 tracking-widest">
                        PAUSED
                    </div>
                ) : (
                    <img 
                        src={`https://flagcdn.com/w640/${currentCountry.code}.png`}
                        alt="Flag"
                        className="w-full h-full object-cover"
                    />
                )}
                
                {/* Timer Overlay */}
                <div className="absolute top-4 right-4 bg-dark-bg/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 font-mono text-xl font-bold">
                    {timeLeft}s
                </div>
            </div>

            {/* FEEDBACK OVERLAY (Si respondio o perdio) */}
            {feedback ? (
                <div className={`w-full p-6 rounded-xl text-center mb-6 animate-in fade-in slide-in-from-bottom-4 ${
                    feedback.type === 'success' ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'bg-red-500/20 border-red-500/50 text-red-300'
                } border`}>
                    <p className="text-sm uppercase tracking-widest mb-1">
                        {feedback.type === 'success' ? (language === 'es' ? '¡Correcto!' : 'Correct!') : (language === 'es' ? 'Respuesta:' : 'Answer:')}
                    </p>
                    <h2 className="text-3xl font-bold text-white">{feedback.text}</h2>
                </div>
            ) : (
                /* INPUT AREA */
                <div className="w-full flex gap-2">
                    <input 
                        type="text" 
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
                        placeholder={language === 'es' ? "Nombre del país..." : "Country name..."}
                        className="flex-1 bg-english-violet/50 border border-white/10 rounded-lg px-6 py-4 text-xl focus:outline-none focus:ring-2 focus:ring-english-violet focus:border-transparent transition placeholder:text-white/20"
                        autoFocus
                        disabled={isPaused}
                    />
                    <button 
                        onClick={() => setIsPaused(!isPaused)}
                        className="px-6 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition"
                    >
                        {isPaused ? '▶' : '⏸'}
                    </button>
                </div>
            )}
            
            <p className="mt-4 text-white/30 text-sm">
                {language === 'es' ? 'Presiona Enter para enviar' : 'Press Enter to submit'}
            </p>
          </div>
        )}

        {/* FIN DEL JUEGO */}
        {gameState === 'finished' && (
           <div className="text-center animate-in zoom-in duration-500">
               <h2 className="text-5xl font-bold mb-4">{language === 'es' ? '¡Partida Terminada!' : 'Game Over!'}</h2>
               <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-english-violet mb-8">
                   {score} pts
               </div>
               <div className="grid grid-cols-2 gap-8 text-xl mb-12">
                   <div className="text-green-400">
                       <div className="text-4xl font-bold">{correctCount}</div>
                       <div className="text-sm opacity-70">{language === 'es' ? 'Aciertos' : 'Correct'}</div>
                   </div>
                   <div className="text-red-400">
                       <div className="text-4xl font-bold">{errorCount}</div>
                       <div className="text-sm opacity-70">{language === 'es' ? 'Errores' : 'Errors'}</div>
                   </div>
               </div>
               <button 
                   onClick={() => setGameState('menu')}
                   className="px-8 py-4 bg-white text-english-violet font-bold text-lg rounded-full hover:bg-gray-200 transition shadow-lg hover:shadow-xl hover:-translate-y-1"
               >
                   {language === 'es' ? 'Jugar de nuevo' : 'Play again'}
               </button>
           </div>
        )}

      </main>

      <footer className="w-full py-8 mt-auto flex justify-center items-center border-t border-white/5">
        <p className="text-xs text-white/30 tracking-widest uppercase">
          © 2026 – <a 
            href="https://managustin.vercel.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-purple-300 transition-colors duration-300 font-semibold"
          >
            Agustín Mango
          </a>
        </p>
      </footer>

    </div>
  );
}

export default App;