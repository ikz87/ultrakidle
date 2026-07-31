import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { isRunningInDiscord, getGuildId } from '../lib/discord';
import { supabase } from '../lib/supabaseClient';
import { LeaderboardTabs } from '../components/game/LeaderboardTabs';
import { CybergrindLeaderboard } from '../components/game/CybergrindLeaderboard';
import { IGCybergrindLeaderboard } from '../components/game/IGCybergrindLeaderboard';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink } from '../components/ui/ExternalLink';
import { useSession } from '../hooks/useSession';

const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const guildId = getGuildId();
  const { settings } = useSettings();
  const showIcons = settings.showHintIcons || settings.cellColors === 'colorblind';
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isCGLeaderboardOpen, setIsCGLeaderboardOpen] = useState(false);
  const [isRankingOpen, setIsRankingOpen] = useState(true);

  const getLegendStyles = (logicalColor: 'green' | 'yellow' | 'red') => {
    if (settings.cellColors === 'custom') {
      const rgb =
        logicalColor === 'green' ? settings.customColors.correct :
          logicalColor === 'yellow' ? settings.customColors.partial :
            settings.customColors.incorrect;
      const rgbString = `${Math.round(rgb.r * 255)}, ${Math.round(rgb.g * 255)}, ${Math.round(rgb.b * 255)}`;
      return {
        wrapperClassName: "w-4 h-4 border flex items-center justify-center shrink-0",
        wrapperStyle: { backgroundColor: `rgba(${rgbString}, 0.2)`, borderColor: `rgb(${rgbString})` },
        textClassName: "text-[10px] font-bold",
        textStyle: { color: `rgb(${rgbString})` }
      };
    }

    let wClass = "w-4 h-4 border flex items-center justify-center shrink-0 ";
    let tClass = "text-[10px] font-bold ";

    if (logicalColor === 'green') { wClass += "bg-green-500/20 border-green-500"; tClass += "text-green-500"; }
    else if (logicalColor === 'yellow') {
      if (settings.cellColors === 'colorblind') { wClass += "bg-blue-500/20 border-blue-500"; tClass += "text-blue-500"; }
      else { wClass += "bg-yellow-500/20 border-yellow-500"; tClass += "text-yellow-500"; }
    } else { wClass += "bg-red-500/20 border-red-500"; tClass += "text-red-500"; }

    return { wrapperClassName: wClass, wrapperStyle: {}, textClassName: tClass, textStyle: {} };
  };
  const [hasNeverPlayedClassic, setHasNeverPlayedClassic] = useState(false);
  const [hasNeverPlayedInferno, setHasNeverPlayedInferno] = useState(false);
  const [hasNeverPlayedCG, setHasNeverPlayedCG] = useState(false);
  const [hasSeenClassicGuide, setHasSeenClassicGuide] = useState(() => {
    return localStorage.getItem('ultrakilldle_seen_classic_guide') === 'true';
  });
  const [hasSeenInfernoGuide, setHasSeenInfernoGuide] = useState(() => {
    return localStorage.getItem('ultrakilldle_seen_inferno_guide') === 'true';
  });
  const [hasSeenCGGuide, setHasSeenCGGuide] = useState(() => {
    return localStorage.getItem('ultrakilldle_seen_cg_guide') === 'true';
  });
  const [hasSeenCGInfernoGuide, setHasSeenCGInfernoGuide] = useState(() => {
    return localStorage.getItem('ultrakilldle_seen_cg_inferno_guide') === 'true';
  });
  const [hasNeverPlayedCGInferno, setHasNeverPlayedCGInferno] = useState(false);

  const { session } = useSession()

  useEffect(() => {
    const container = document.getElementById('main-scroll-container');
    if (container) {
      container.scrollTo(0, 0);
    }
  }, [location.pathname]);

  useEffect(() => {
    const checkNewPlayer = async () => {
      if (!session?.user) {
        return;
      }

      const uid = session.user.id;
      const classicKey = `ultrakilldle_has_played_classic_${uid}`;
      const infernoKey = `ultrakilldle_has_played_inferno_${uid}`;
      const cgKey = `ultrakilldle_has_played_cg_${uid}`;
      const cgInfernoKey = `ultrakilldle_has_played_cg_inferno_${uid}`;

      if (location.pathname === '/play/classic' && !hasSeenClassicGuide) {
        const cached = localStorage.getItem(classicKey);

        if (cached === 'true') {
          setHasNeverPlayedClassic(false);
        } else {
          const { data, error } = await supabase.rpc('has_never_played');
          if (!error) {
            setHasNeverPlayedClassic(data);
            if (!data) localStorage.setItem(classicKey, 'true');
          }
        }
      }

      if (location.pathname === '/play/infernoguessr' && !hasSeenInfernoGuide) {
        const cached = localStorage.getItem(infernoKey);

        if (cached === 'true') {
          setHasNeverPlayedInferno(false);
        } else {
          const { data, error } = await supabase
            .from('inferno_guesses')
            .select('id')
            .eq('user_id', uid)
            .limit(1);
          if (!error) {
            const neverPlayed = !data || data.length === 0;
            setHasNeverPlayedInferno(neverPlayed);
            if (!neverPlayed) localStorage.setItem(infernoKey, 'true');
          }
        }
      }

      if (location.pathname === '/cybergrind/classic' && !hasSeenCGGuide) {
        const cached = localStorage.getItem(cgKey);

        if (cached === 'true') {
          setHasNeverPlayedCG(false);
        } else {
          const { count, error } = await supabase
            .from('cybergrind_runs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', uid);

          if (!error) {
            const neverPlayed = count === 0;
            setHasNeverPlayedCG(neverPlayed);
            if (!neverPlayed) localStorage.setItem(cgKey, 'true');
          }
        }
      }

      if (location.pathname === '/cybergrind/infernoguessr' && !hasSeenCGInfernoGuide) {
        const cached = localStorage.getItem(cgInfernoKey);

        if (cached === 'true') {
          setHasNeverPlayedCGInferno(false);
          console.log("cache says this user has played")
        } else {
          console.log("cache says this user has NOT played")
          const { count, error } = await supabase
            .from('ig_cybergrind_runs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', uid);

          if (!error) {
            const neverPlayed = count === 0;
            console.log("from db: ", neverPlayed);
            setHasNeverPlayedCGInferno(neverPlayed);
            if (!neverPlayed) localStorage.setItem(cgInfernoKey, 'true');
          }
        }
      }
    };

    checkNewPlayer();
  }, [location.pathname, session]);

  const isHome = location.pathname === '/';
  const isPlay = location.pathname.startsWith('/play') || location.pathname.startsWith('/cybergrind');
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
              <LeaderboardTabs layout="horizontal" guildId={guildId} />
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
                  className="cursor-pointer mx-auto lg:mx-0"
                  onClick={() => {navigate("/")}}
                  src={`${import.meta.env.BASE_URL}images/ultrakidle-logo.png`}
                  alt="ULTRAKIDLE - The Daily ULTRAKILL Guessing Game"
                />
              </div>
              <div className="flex flex-wrap justify-start md:justify-start items-center gap-2 mt-2 flex-shrink-0">
                {!isHome && (
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={() => {
                        // If key is 'default', the user landed here directly (refresh or URL entry)
                        if (location.key !== "default") {
                          navigate(-1);
                        } else {
                          navigate("/");
                        }
                      }}
                      className="text-xl flex items-center gap-2 opacity-50 hover:opacity-100 uppercase"
                    >
                      &lt; Return
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
                          } else if (location.pathname === '/cybergrind/classic' && !hasSeenCGGuide) {
                            setHasSeenCGGuide(true);
                            localStorage.setItem('ultrakilldle_seen_cg_guide', 'true');
                          } else if (location.pathname === '/cybergrind/infernoguessr' && !hasSeenCGInfernoGuide) {
                            setHasSeenCGInfernoGuide(true);
                            localStorage.setItem('ultrakilldle_seen_cg_inferno_guide', 'true');
                          }
                        }}
                        className="text-xl flex items-center gap-2 opacity-50 hover:opacity-100"
                      >
                        ? HOW TO PLAY
                      </Button>
                        {((location.pathname === '/play/classic' && hasNeverPlayedClassic && !hasSeenClassicGuide) ||
                        (location.pathname === '/play/infernoguessr' && hasNeverPlayedInferno && !hasSeenInfernoGuide) ||
                        (location.pathname === '/cybergrind/classic' && hasNeverPlayedCG && !hasSeenCGGuide) ||
                        (location.pathname === '/cybergrind/infernoguessr' && hasNeverPlayedCGInferno && !hasSeenCGInfernoGuide)) && (
                          <div className="absolute top-0 right-0 z-30 pointer-events-none">
                            <div className="relative w-3 h-3 translate-x-1/4 -translate-y-1/4">
                              <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                              <div className="absolute inset-0 w-3 h-3 scale-[1.5] animate-ping bg-green-500 rounded-full" />
                            </div>
                          </div>
                        )}
                    </div>
                        {location.pathname.startsWith('/cybergrind') && (
                        <Button
                          variant="ghost"
                          size="md"
                          onClick={() => setIsCGLeaderboardOpen(true)}
                          className="text-xl flex items-center gap-2 opacity-50 hover:opacity-100"
                        >
                          <svg
                            className="mr-2"
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978" />
                            <path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978" />
                            <path d="M18 9h1.5a1 1 0 0 0 0-5H18" />
                            <path d="M4 22h16" />
                            <path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" />
                            <path d="M6 9H4.5a1 1 0 0 1 0-5H6" />
                          </svg>
                          LEADERBOARDS
                        </Button>
                      )}
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
                        <div className={getLegendStyles('green').wrapperClassName} style={getLegendStyles('green').wrapperStyle}>
                          {showIcons && <span className={getLegendStyles('green').textClassName} style={getLegendStyles('green').textStyle}>✓</span>}
                        </div>
                        <span>CORRECT PROPERTY MATCH {showIcons && <span className="opacity-50">(✓)</span>}</span>
                      </div>
                      <div className="flex gap-3 items-center">
                        <div className={getLegendStyles('yellow').wrapperClassName} style={getLegendStyles('yellow').wrapperStyle}>
                          {showIcons && <span className={getLegendStyles('yellow').textClassName} style={getLegendStyles('yellow').textStyle}>ǃ</span>}
                        </div>
                        <span>APPROX. PROPERTY MATCH {showIcons && <span className="opacity-50">(ǃ)</span>}</span>
                      </div>
                      <div className="flex gap-3 items-center">
                        <div className={getLegendStyles('red').wrapperClassName} style={getLegendStyles('red').wrapperStyle}>
                          {showIcons && <span className={getLegendStyles('red').textClassName} style={getLegendStyles('red').textStyle}>⨯</span>}
                        </div>
                        <span>INCORRECT PROPERTY MATCH {showIcons && <span className="opacity-50">(⨯)</span>}</span>
                      </div>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <p className="opacity-50 underline uppercase">Properties Tracked:</p>
                      <ul className="list-disc [&>*]:text-left pl-4 list-outside space-y-1 opacity-80">
                        <li>TYPE: ???, DEMON, MACHINE, HUSK, ANGEL OR PRIME SOUL</li>
                        <li>WEIGHT: LIGHT, MEDIUM, HEAVY OR SUPERHEAVY</li>
                        <li>HEALTH: NUMERIC COMPARISON. TARGET CAN BE HIGHER ▲ OR LOWER ▼. <span className={settings.cellColors === 'colorblind' ? "text-blue-500" : (settings.cellColors === 'custom' ? "text-[rgb(234,179,8)]" : "text-yellow-500")}>{settings.cellColors === 'colorblind' ? "BLUE" : (settings.cellColors === 'custom' ? "APPROX." : "YELLOW")}</span> INDICATES VALUE IS WITHIN 10 HP OF TARGET. FOR ENEMIES WITH MULTIPLE VARIANTS, THE HIGHEST VARIANT'S HEALTH IS USED. FOR ENEMIES WITH MULTIPLE PHASES, HEALTH IS THE SUM OF ALL PHASES</li>
                        <li>TOTAL LEVELS: NUMBER OF LEVELS THE ENEMY APPEARS IN. TARGET CAN BE HIGHER ▲ OR LOWER ▼. <span className={settings.cellColors === 'colorblind' ? "text-blue-500" : (settings.cellColors === 'custom' ? "text-[rgb(234,179,8)]" : "text-yellow-500")}>{settings.cellColors === 'colorblind' ? "BLUE" : (settings.cellColors === 'custom' ? "APPROX." : "YELLOW")}</span> INDICATES VALUE IS WITHIN 3 LEVELS OF TARGET</li>
                        <li>REGISTERED AT: LEVEL OF FIRST ENCOUNTER. TARGET CAN BE ◄ EARLIER OR LATER ► (ORDERED ACCORDING TO OUR <a href="/levels" target="_blank" className="underline hover:text-white/80">LEVEL LIST</a>). <span className={settings.cellColors === 'colorblind' ? "text-blue-500" : (settings.cellColors === 'custom' ? "text-[rgb(234,179,8)]" : "text-yellow-500")}>{settings.cellColors === 'colorblind' ? "BLUE" : (settings.cellColors === 'custom' ? "APPROX." : "YELLOW")}</span> INDICATES THE TARGET IS WITHIN 10 POSITIONS IN THE LEVEL LIST</li>
                      </ul>
                    </div>
                  </div>
                ) : location.pathname === '/cybergrind/classic' ? (
                  <div className="space-y-4 text-sm uppercase">
                    <p>An endless gauntlet. Identify enemies wave after wave until you fall.</p>

                    <div className="space-y-1">
                      <p className="opacity-50 underline uppercase">MECHANICS:</p>
                      <ul className="uppercase list-disc [&>*]:text-left pl-4 list-outside space-y-1 opacity-80">
                        <li>Each wave presents a random target enemy. You have <span className="text-white font-bold">6 guesses</span> to identify it.</li>
                        <li>Guess correctly to advance to the next wave. Fail to identify the target in 6 guesses and your run ends.</li>
                        <li>Hints work the same as Classic mode: type, weight, health, total levels, and first appearance. </li>
                        <li>Thresholds for <span className={settings.cellColors === 'colorblind' ? "text-blue-500" : (settings.cellColors === 'custom' ? "text-[rgb(234,179,8)]" : "text-yellow-500")}>{settings.cellColors === 'colorblind' ? "BLUE" : (settings.cellColors === 'custom' ? "APPROX." : "YELLOW")}</span> hints are also the same: 10 health, 3 total levels, and 10 level positions</li>
                      </ul>
                    </div>

                    <div className="space-y-2 uppercase">
                      <p className="opacity-50 underline uppercase">COLOR INDICATORS:</p>
                      <div className="flex gap-3 items-center">
                        <div className={getLegendStyles('green').wrapperClassName} style={getLegendStyles('green').wrapperStyle}>
                          {showIcons && <span className={getLegendStyles('green').textClassName} style={getLegendStyles('green').textStyle}>✓</span>}
                        </div>
                        <span>CORRECT PROPERTY MATCH {showIcons && <span className="opacity-50">(✓)</span>}</span>
                      </div>
                      <div className="flex gap-3 items-center">
                        <div className={getLegendStyles('yellow').wrapperClassName} style={getLegendStyles('yellow').wrapperStyle}>
                          {showIcons && <span className={getLegendStyles('yellow').textClassName} style={getLegendStyles('yellow').textStyle}>ǃ</span>}
                        </div>
                        <span>APPROX. PROPERTY MATCH {showIcons && <span className="opacity-50">(ǃ)</span>}</span>
                      </div>
                      <div className="flex gap-3 items-center">
                        <div className={getLegendStyles('red').wrapperClassName} style={getLegendStyles('red').wrapperStyle}>
                          {showIcons && <span className={getLegendStyles('red').textClassName} style={getLegendStyles('red').textStyle}>⨯</span>}
                        </div>
                        <span>INCORRECT PROPERTY MATCH {showIcons && <span className="opacity-50">(⨯)</span>}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="opacity-50 underline uppercase">MODIFIERS:</p>
                      <ul className="list-disc [&>*]:text-left pl-4 list-outside space-y-1 opacity-80">
                        <li>Starting at wave 3, random modifiers are applied to each round to make things harder.</li>
                        <li>The number of active modifiers increases as you progress.</li>
                        <li>Active modifiers are displayed above the board. Hover over (or tap) any modifier to see exactly what it does.</li>
                        <li>Modifiers highlighted in <span className="text-yellow-400 font-bold">yellow</span> with a <span className="text-purple-400 font-bold">×2</span> marker are being amplified by <span className="text-purple-400 font-black italic tracking-widest">RADIANCE</span>.</li>
                      </ul>
                    </div>

                    <div className="space-y-1">
                      <p className="opacity-50 underline uppercase">RECORDS:</p>
                      <ul className="list-disc [&>*]:text-left pl-4 list-outside space-y-1 opacity-80">
                        <li>Your best run is determined by waves cleared, then fewest total guesses, then highest guess accuracy as a tiebreaker.</li>
                        <li>Guess accuracy is a score based on how close each of your guesses was to the target across the entire run.</li>
                        <li>Abandoning a run still counts toward your record.</li>
                      </ul>
                    </div>
                  </div>
                ) : location.pathname === '/cybergrind/infernoguessr' ? (
                  <div className="space-y-4 text-sm uppercase">
                    <p>AN ENDLESS GAUNTLET. IDENTIFY THE TARGET LEVEL BEFORE YOUR HP RUNS OUT.</p>

                    <div className="space-y-1">
                      <p className="opacity-50 underline">MECHANICS:</p>
                      <ul className="list-disc [&>*]:text-left pl-4 list-outside space-y-1 opacity-80">
                        <li>Each wave presents a screenshot from a random level. You have <span className="text-white font-bold">one attempt</span> at identifying it</li>
                        <li>A CORRECT GUESS HEALS YOU <span className="text-green-500 font-bold">+20 HP</span></li>
                        <li>A GUESS THAT'S OFF BY ONE NEITHER HEALS NOR HURTS YOU</li>
                        <li>A WRONG GUESS DEPLETES YOUR HEALTH UP TO <span className="text-red-500 font-bold">-50 HP</span>. THE AMOUNT OF HEALTH DEPLETED INCREASES EXPONENTIALLY THE FURTHER AWAY YOUR GUESS IS FROM THE TARGET LEVEL</li>
                        <li>YOUR HEALTH DEPLETES OVER TIME, THE DEPLETION RATE GROWS AS YOU PROGRESS THROUGH WAVES</li>
                      </ul>
                    </div>

                    <div className="space-y-1">
                      <p className="opacity-50 underline">RECORDS</p>
                      <ul className="list-disc [&>*]:text-left pl-4 list-outside space-y-1 opacity-80">
                        <li>YOUR BEST RUN IS DETERMINED BY WAVES CLEARED, THEN BY ACCURACY ON YOUR GUESSES AS A TIEBREAKER.</li>
                        <li>ACCURACY IS A SCORE BASED ON HOW CLOSE YOUR GUESSES ARE TO THE TARGET LEVEL IN EACH WAVE.</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="uppercase space-y-4 text-sm">
                    <p>IDENTIFY THE TARGET LEVEL FROM A SCREENSHOT FOR <span className="text-white font-bold">5 ROUNDS</span>.</p>
                    <div className="space-y-2">
                      <p className="opacity-50 underline uppercase">Mechanics:</p>
                      <ul className="list-disc [&>*]:text-left pl-4 list-outside space-y-1 opacity-80">
                        <li>You get <span className="text-white">one attempt</span> per round.</li>
                        <li>Distance is calculated based on the position of your guess relative to the correct answer in our <button onClick={() => { setIsHowToPlayOpen(false); navigate("/levels"); }} className="underline hover:text-white/80 cursor-pointer">Levels</button> page list.</li>
                        <li>A guess of 0-3 while the answer is 0-5 results in a <span className="text-white font-bold">distance of 2</span>.</li>
                        <li>The base score for a round is 100pts. This base score decreases exponentially the further away your guess is from the target level.</li>
                      </ul>
                    </div>
                  </div>
                )}
              </Modal>

              <Modal
                isOpen={isCGLeaderboardOpen}
                showCloseButton={false}
                footerButtonText="CLOSE"
                footerText="* Rankings apply only to users playing via the Discord activity"
                onClose={() => setIsCGLeaderboardOpen(false)}
                title={`CG LEADERBOARD ${location.pathname === '/cybergrind/infernoguessr' ? "(INFERNOGUESSR)" : "(CLASSIC)"}`}
              >
                {location.pathname === '/cybergrind/infernoguessr' ? (
                  <IGCybergrindLeaderboard />
                ) : (
                  <CybergrindLeaderboard />
                )}
              </Modal>

              <div className="flex flex-col justify-between h-full w-full ">
                <div className="pb-4">
                  <Outlet />
                </div>

                {/* ... (inside MainLayout) */}

                <div className="z-10 text-left lg:text-xl md:text-lg text-sm border-t border-white/5 pb-4">
                  <span className="opacity-50 uppercase ">
                    INIT SOCIALS... OK
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
                  <LeaderboardTabs layout="vertical" guildId={guildId} />
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
