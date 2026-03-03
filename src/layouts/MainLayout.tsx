import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { isRunningInDiscord, discordSdk } from '../lib/discord';
import { Leaderboard } from '../components/game/Leaderboard';
import { motion, AnimatePresence } from 'framer-motion';

const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isRankingOpen, setIsRankingOpen] = useState(true);

  const isHome = location.pathname === '/';
  const isPlay = location.pathname === '/play';
  const inDiscord = isRunningInDiscord();

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    if (inDiscord && discordSdk) {
      e.preventDefault();
      discordSdk.commands.openExternalLink({ url });
    }
  };

  return (
    <div className="text-white overflow-hidden w-full h-dvh flex flex-col relative">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-black h-screen w-screen">
      </div>
      {/* Background Layer */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <img className="opacity-30 object-cover w-full h-full scale-[1.04]" src="/images/main-menu.gif" alt="Background" />
      </div>

      <div className="fixed top-0 left-0 z-10 h-dvh w-full flex flex-col pointer-events-none overflow-x-hidden">
        {/* Mobile Top Panel */}
        {inDiscord && (
          <div className="lg:hidden flex-shrink-0 bg-black/60 border-b border-white/10 mb-0 z-20 pointer-events-auto">
            <button
              onClick={() => setIsRankingOpen(prev => !prev)}
              className="w-full flex items-center justify-between py-2 px-3 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
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
              <Leaderboard layout="horizontal" />
            </div>
          </div>
        )}

        {/* Desktop: 2-column layout */}
        <div className="flex flex-1 min-h-0 w-full z-10 relative overflow-x-hidden">

          {/* Column 1: Main Content (Scrollable) */}
          <div className="flex-1 min-w-0 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar pointer-events-auto items-center lg:items-stretch lg:px-10 px-5 lg:py-12 py-5">
            <div className="md:w-full flex flex-col min-h-full max-w-[800px] lg:max-w-none mx-auto w-full">
              <div className="z-20 max-w-[600px] flex-shrink-0">
                <h1 className="sr-only">Ultrakidle</h1>
                <div className="sr-only">wordle, ultrakilldle, ultrakidle, daily game, character guesser</div>
                <img
                  className=" mx-auto lg:mx-0"
                  src="/images/ultrakidle-logo.png"
                  alt="Ultrakidle Logo"
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
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => setIsHowToPlayOpen(true)}
                    className="text-xl flex items-center gap-2 opacity-50 hover:opacity-100"
                  >
                    ? HOW TO PLAY
                  </Button>
                )}
              </div>

              <Modal
                isOpen={isHowToPlayOpen}
                onClose={() => setIsHowToPlayOpen(false)}
                title="SYSTEM_GUIDE: HOW TO PLAY"
              >
                <div className="space-y-4 text-sm">
                  <p>IDENTIFY THE TARGET ENEMY IN <span className="text-white font-bold">5 ATTEMPTS</span>.</p>
                  <div className="space-y-2">
                    <p className="opacity-50 underline uppercase">Color Indicators:</p>
                    <div className="flex gap-3 items-center">
                      <div className="w-4 h-4 bg-green-500/20 border border-green-500" />
                      <span>CORRECT PROPERTY MATCH</span>
                    </div>
                    <div className="flex gap-3 items-center">
                      <div className="w-4 h-4 bg-yellow-500/20 border border-yellow-500" />
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
                      <li>HEALTH: NUMERIC COMPARISON. TARGET CAN BE HIGHER ▲ OR LOWER ▼. <span className="text-yellow-500">YELLOW</span> INDICATES VALUE IS WITHIN 10 HP OF TARGET</li>
                      <li>IS BOSS: ANY ENEMY THAT HAS APPEARED WITH A VISIBLE HEALTH BAR. IF AN ENEMY COUNTS AS A BOSS ITS HEALTH IS THAT OF THEIR BOSS APPEARANCE</li>
                      <li>REGISTERED AT: LEVEL OF FIRST ENCOUNTER. TARGET CAN BE LATER ▲ OR EARLIER ▼ (ORDERED ACCORDING TO <a href="https://www.speedrun.com/ultrakill/levels" target="_blank" className="underline hover:text-white/80">SPEEDRUN.COM</a>). <span className="text-yellow-500">YELLOW</span> INDICATES TARGET ENEMY ALSO APPEARS IN THIS LEVEL</li>
                    </ul>
                  </div>
                </div>
              </Modal>

              <div className="flex flex-col justify-between h-full w-full ">
                <div className="pb-4">
                  <Outlet />
                </div>
                <div className="z-30 text-left lg:text-xl md:text-lg text-sm border-t border-white/5 ">
                  <span className="opacity-50 uppercase ">
                    INTO SOCIALS... OK
                  </span>
                  <div className="flex gap-3 lg:text-3xl md:text-xl text-lg flex-wrap">
                    <a onClick={(e) => handleLinkClick(e, 'https://github.com/ikz87')} target="_blank" href="https://github.com/ikz87" className="underline hover:opacity-80 transition-colors">GITHUB</a>
                    <a onClick={(e) => handleLinkClick(e, 'https://www.youtube.com/@kz8785/')} target="_blank" href="https://www.youtube.com/@kz8785/" className="underline hover:opacity-80 transition-colors">YOUTUBE</a>
                    <a onClick={(e) => handleLinkClick(e, 'https://x.com/iikz87ii')} target="_blank" href="https://x.com/iikz87ii" className="underline hover:opacity-80 transition-colors">TWITTER</a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Desktop Ranking Panel (collapsible, own scroll, fixed header) */}
          {inDiscord && (
            <div
              className={`hidden lg:flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out bg-black/60 border-l border-white/10 pointer-events-auto z-20 ${isRankingOpen ? 'w-[320px]' : 'w-[45px]'
                }`}
            >
              <button
                onClick={() => setIsRankingOpen(prev => !prev)}
                className={`flex items-center bg-white/5 border-b border-white/10 hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0 h-[53px] ${isRankingOpen ? 'justify-between px-4' : 'justify-center px-0'
                  }`}
              >
                {isRankingOpen && (
                  <span className="text-indigo-400 font-bold tracking-widest text-sm uppercase whitespace-nowrap overflow-hidden">SERVER_RANKINGS</span>
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
                className={`flex-1 transition-all duration-300 overflow-hidden flex flex-col ${isRankingOpen ? 'opacity-100' : 'opacity-0 invisible h-0'
                  }`}
              >
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                  <Leaderboard layout="vertical" />
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
