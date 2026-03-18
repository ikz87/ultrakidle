import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { isRunningInDiscord, discordSdk, getGuildId } from '../lib/discord';
import { supabase } from '../lib/supabaseClient';
import { Leaderboard } from '../components/game/Leaderboard';
import { motion, AnimatePresence } from 'framer-motion';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { ExternalLink } from '../components/ui/ExternalLink';

const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const guildId = getGuildId();
  const { users, loading } = useLeaderboard(guildId);
  const { colorblindMode, toggleColorblindMode } = useSettings();
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isRankingOpen, setIsRankingOpen] = useState(true);
  const [hasNeverPlayedClassic, setHasNeverPlayedClassic] = useState(false);
  const [hasNeverPlayedInferno, setHasNeverPlayedInferno] = useState(false);
  const [hasSeenClassicGuide, setHasSeenClassicGuide] = useState(() => {
    return localStorage.getItem('ultrakilldle_seen_classic_guide') === 'true';
  });
  const [hasSeenInfernoGuide, setHasSeenInfernoGuide] = useState(() => {
    return localStorage.getItem('ultrakilldle_seen_inferno_guide') === 'true';
  });

  useEffect(() => {
    const checkNewPlayer = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Check classic mode (using the RPC)
        const { data: neverPlayedClassic, error: classicError } = await supabase.rpc('has_never_played');
        if (!classicError) {
          setHasNeverPlayedClassic(neverPlayedClassic);
        }

        // Check inferno mode (checking the table)
        const { data: infernoData, error: infernoError } = await supabase
          .from('inferno_guesses')
          .select('id')
          .eq('user_id', session.user.id)
          .limit(1);

        if (!infernoError) {
          setHasNeverPlayedInferno(!infernoData || infernoData.length === 0);
        }
      }
    };

    checkNewPlayer();
  }, []);

  const isHome = location.pathname === '/';
  const isPlay = location.pathname.startsWith('/play');
  const inDiscord = isRunningInDiscord();

  return (
    <div className="text-white overflow-hidden w-full h-dvh flex flex-col relative">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-black h-screen w-screen">
      </div>
      {/* Background Layer */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <img className="opacity-30 object-cover w-full h-full scale-[1.04]" src={`${import.meta.env.BASE_URL}images/main-menu.gif`} alt="Background" />
      </div>

      <div className="fixed top-0 left-0 z-10 h-dvh w-full flex flex-col pointer-events-none overflow-x-hidden">
        {/* Mobile Top Panel */}
        {inDiscord && (
          <div className="lg:hidden flex-shrink-0 bg-black/60 border-b border-white/10 mb-0 z-20 pointer-events-auto">
            <button
              onClick={() => setIsRankingOpen(prev => !prev)}
              className="w-full flex pt-16 items-center justify-between py-2 px-3 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-indigo-400 font-bold tracking-widest text-xs uppercase">SERVER_RANKINGS</span>
                <span className="text-[10px] opacity-30 uppercase">LIVE</span>
              </div>
              <motion.span
                animate={{ rotate: isRankingOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-white/50 text-sm"
              >
                ▼
              </motion.span>
            </button>
            <div
              className={`transition-all duration-300 overflow-hidden ${isRankingOpen ? 'p-2' : 'h-0 pointer-events-none'
                }`}
              aria-hidden={!isRankingOpen}
            >
              <Leaderboard layout="horizontal" users={users} loading={loading} />
            </div>
          </div>
        )}

        {/* Desktop: 2-column layout */}
        <div className="flex flex-1 min-h-0 w-full z-10 relative overflow-x-hidden">

          {/* Column 1: Main Content (Scrollable) */}
          <div id="main-scroll-container" className="flex-1 min-w-0 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar pointer-events-auto items-center lg:items-stretch lg:px-10 px-5 lg:py-12 py-5">
            <div className="md:w-full flex flex-col min-h-full max-w-[800px] lg:max-w-none mx-auto w-full">
              <div className="z-20 max-w-[600px] flex-shrink-0">
                <img
                  className=" mx-auto lg:mx-0"
                  src={`${import.meta.env.BASE_URL}images/ultrakidle-logo.png`}
                  alt="ULTRAKIDLE - The Daily ULTRAKILL Guessing Game"
                />
              </div>
              <div className="flex flex-wrap justify-start md:justify-start items-center gap-2 mt-2 flex-shrink-0">
                {!isHome && (
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => navigate('/')}
                    className="text-xl flex items-center gap-2 opacity-50 hover:opacity-100"
                  >
                    &lt; RETURN TO HOME
                  </Button>
                )}
                {isPlay && (
                  <>
                    <div className="relative inline-flex items-center">
                      <Button
                        variant="ghost"
                        size="md"
                        onClick={() => {
                          setIsHowToPlayOpen(true);
                          if (location.pathname === '/play/classic' && !hasSeenClassicGuide) {
                            setHasSeenClassicGuide(true);
                            localStorage.setItem('ultrakilldle_seen_classic_guide', 'true');
                          } else if (location.pathname === '/play/infernoguessr' && !hasSeenInfernoGuide) {
                            setHasSeenInfernoGuide(true);
                            localStorage.setItem('ultrakilldle_seen_inferno_guide', 'true');
                          }
                        }}
                        className="text-xl flex items-center gap-2 opacity-50 hover:opacity-100"
                      >
                        ? HOW TO PLAY
                      </Button>
                      {((location.pathname === '/play/classic' && hasNeverPlayedClassic && !hasSeenClassicGuide) ||
                        (location.pathname === '/play/infernoguessr' && hasNeverPlayedInferno && !hasSeenInfernoGuide)) && (
                          <div className="absolute top-0 right-0 z-30 pointer-events-none">
                            <div className="relative w-3 h-3 translate-x-1/4 -translate-y-1/4">
                              <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                              <div className="absolute inset-0 w-3 h-3 scale-[1.5] animate-ping bg-green-500 rounded-full" />
                            </div>
                          </div>
                        )}
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer group px-2">
                      <input
                        type="checkbox"
                        checked={colorblindMode}
                        onChange={toggleColorblindMode}
                        className="w-4 h-4 bg-black border border-white/20 rounded accent-indigo-500 cursor-pointer"
                      />
                      <span className="text-xs uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Colorblind Mode
                      </span>
                    </label>
                  </>
                )}
              </div>

              <Modal
                isOpen={isHowToPlayOpen}
                onClose={() => setIsHowToPlayOpen(false)}
                title="SYSTEM_GUIDE: HOW TO PLAY"
              >
                {location.pathname === '/play/classic' ? (
                  <div className="space-y-4 text-sm">
                    <p>IDENTIFY THE TARGET ENEMY IN <span className="text-white font-bold">5 ATTEMPTS</span>.</p>
                    <div className="space-y-2">
                      <p className="opacity-50 underline uppercase">Color Indicators:</p>
                      <div className="flex gap-3 items-center">
                        <div className="w-4 h-4 bg-green-500/20 border border-green-500" />
                        <span>CORRECT PROPERTY MATCH</span>
                      </div>
                      <div className="flex gap-3 items-center">
                        <div className={`w-4 h-4 border ${colorblindMode ? 'bg-blue-500/20 border-blue-500' : 'bg-yellow-500/20 border-yellow-500'}`} />
                        <span>PARTIAL PROPERTY MATCH</span>
                      </div>
                      <div className="flex gap-3 items-center">
                        <div className="w-4 h-4 bg-red-500/20 border border-red-500" />
                        <span>INCORRECT PROPERTY MATCH</span>
                      </div>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <p className="opacity-50 underline uppercase">Properties Tracked:</p>
                      <ul className="list-disc [&>*]:text-left pl-4 list-outside space-y-1 opacity-80">
                        <li>TYPE: ???, DEMON, MACHINE, HUSK, ANGEL OR PRIME SOUL</li>
                        <li>WEIGHT: LIGHT, MEDIUM, HEAVY OR SUPERHEAVY</li>
                        <li>HEALTH: NUMERIC COMPARISON. TARGET CAN BE HIGHER ▲ OR LOWER ▼. <span className={colorblindMode ? "text-blue-500" : "text-yellow-500"}>{colorblindMode ? "BLUE" : "YELLOW"}</span> INDICATES VALUE IS WITHIN 10 HP OF TARGET. FOR ENEMIES WITH MULTIPLE VARIANTS, THE HIGHEST VARIANT'S HEALTH IS USED. FOR ENEMIES WITH MULTIPLE PHASES, HEALTH IS THE SUM OF ALL PHASES</li>
                        <li>TOTAL LEVELS: NUMBER OF LEVELS THE ENEMY APPEARS IN. TARGET CAN BE HIGHER ▲ OR LOWER ▼. <span className={colorblindMode ? "text-blue-500" : "text-yellow-500"}>{colorblindMode ? "BLUE" : "YELLOW"}</span> INDICATES VALUE IS WITHIN 3 LEVELS OF TARGET</li>
                        <li>REGISTERED AT: LEVEL OF FIRST ENCOUNTER. TARGET CAN BE LATER ▲ OR EARLIER ▼ (ORDERED ACCORDING TO OUR <button onClick={() => { setIsHowToPlayOpen(false); navigate("/levels"); }} className="underline hover:text-white/80 cursor-pointer">LEVEL LIST</button>). <span className={colorblindMode ? "text-blue-500" : "text-yellow-500"}>{colorblindMode ? "BLUE" : "YELLOW"}</span> INDICATES TARGET ENEMY ALSO APPEARS IN THIS LEVEL</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-sm">
                    <p>IDENTIFY THE TARGET LEVEL FROM A SCREENSHOT IN <span className="text-white font-bold">3 ROUNDS</span>.</p>
                    <div className="space-y-2">
                      <p className="opacity-50 underline uppercase">Mechanics:</p>
                      <ul className="list-disc [&>*]:text-left pl-4 list-outside space-y-1 opacity-80">
                        <li>You get <span className="text-white">one attempt</span> per round.</li>
                        <li>Distance is calculated based on the position of your guess relative to the correct answer in our <button onClick={() => { setIsHowToPlayOpen(false); navigate("/levels"); }} className="underline hover:text-white/80 cursor-pointer">Levels</button> page list.</li>
                        <li>A guess of 0-3 while the answer is 0-5 results in a <span className="text-white font-bold">distance of 2</span>.</li>
                      </ul>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <p className="opacity-50 underline uppercase">Scoring Formula:</p>
                      <div className="font-mono bg-white/5 p-3 rounded text-center text-cyan-300">
                        score = round(100 * (0.85 ^ distance))
                      </div>
                      <p className="opacity-80">The closer your guess is in level progression, the higher your score!</p>
                    </div>
                  </div>
                )}
              </Modal>

              <div className="flex flex-col justify-between h-full w-full ">
                <div className="pb-4">
                  <Outlet />
                </div>

                {/* ... (inside MainLayout) */}

                <div className="z-10 text-left lg:text-xl md:text-lg text-sm border-t border-white/5 ">
                  <span className="opacity-50 uppercase ">
                    INTO SOCIALS... OK
                  </span>
                  <div className="flex gap-3 lg:text-3xl md:text-xl text-lg flex-wrap">
                    <ExternalLink href="https://github.com/ikz87" className="underline hover:opacity-80 transition-colors">GITHUB</ExternalLink>
                    <ExternalLink href="https://www.youtube.com/@kz8785/" className="underline hover:opacity-80 transition-colors">YOUTUBE</ExternalLink>
                    <ExternalLink href="https://x.com/iikz87ii" className="underline hover:opacity-80 transition-colors">TWITTER</ExternalLink>
                    <ExternalLink href="https://discord.gg/6dsMavu6mH" className="underline hover:opacity-80 transition-colors">DISCORD</ExternalLink>
                  </div>
                  {/* Secondary Footer */}
                  <div className="flex gap-2 lg:gap-4 mt-2 lg:text-base text-sm opacity-30 uppercase tracking-tighter">
                    <button onClick={() => navigate('/tos')} className="hover:opacity-100 underline transition-opacity hover:cursor-pointer">TERMS OF SERVICE</button>
                    <button onClick={() => navigate('/privacy')} className="hover:opacity-100 underline transition-opacity hover:cursor-pointer">PRIVACY POLICY</button>
                    <button onClick={() => navigate('/about')} className="hover:opacity-100 underline transition-opacity hover:cursor-pointer">ABOUT</button>
                    <button onClick={() => navigate('/contact')} className="hover:opacity-100 underline transition-opacity hover:cursor-pointer">CONTACT</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Desktop Ranking Panel (collapsible, own scroll, fixed header) */}
          {inDiscord && (
            <div
              className={`hidden lg:flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out bg-black/60 border-l border-white/10 pointer-events-auto z-20 ${isRankingOpen ? 'w-[170px]' : 'w-[45px]'
                }`}
            >
              <button
                onClick={() => setIsRankingOpen(prev => !prev)}
                className={`flex items-center bg-white/5 border-b border-white/10 hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0 h-[53px] ${isRankingOpen ? 'justify-between px-2' : 'justify-center px-0'
                  }`}
              >
                {isRankingOpen && (
                  <span className="text-indigo-400 font-bold tracking-widest text-xs uppercase whitespace-nowrap overflow-hidden">SERVER_RANKINGS</span>
                )}
                <motion.span
                  animate={{ rotate: isRankingOpen ? 0 : 180 }}
                  transition={{ duration: 0.2 }}
                  className="text-white/50 text-lg flex-shrink-0"
                >
                  ▶
                </motion.span>
              </button>

              <AnimatePresence>
                {!isRankingOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0 }}
                    className="flex-1 flex items-center justify-center opacity-20 pointer-events-none"
                  >
                    <span className="text-xl text-center text-indigo-400 font-black whitespace-nowrap -rotate-90">
                      SERVER_RANKINGS
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Scrollable rank list container */}
              <div
                className={`flex-1 transition-all duration-300 overflow-hidden flex flex-col items-start justify-center ${isRankingOpen ? 'opacity-100' : 'opacity-0 invisible h-0'
                  }`}
              >
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                  <Leaderboard layout="vertical" users={users} loading={loading} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
