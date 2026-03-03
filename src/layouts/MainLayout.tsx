import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { isRunningInDiscord } from '../lib/discord';
import { ServerActivityFeed } from '../components/game/ServerActivityFeed';

const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isServerFeedOpen, setIsServerFeedOpen] = useState(false);

  const isHome = location.pathname === '/';
  const isPlay = location.pathname === '/play';
  const inDiscord = isRunningInDiscord();

  return (
    <div className="text-white overflow-hidden">
      <div className="fixed top-0 left-0 z-10 h-dvh w-dvw overflow-auto lg:px-10 px-5 lg:py-12 py-5">
        <div className="md:w-full flex-0 min-h-full min-h-0 flex flex-col" >
          <div className="z-20 max-w-[600px] flex-shrink-0">
            <h1 className="sr-only">Ultrakidle</h1>
            <div className="sr-only">wordle, ultrakilldle, ultrakidle, daily game, character guesser</div>
            <img
              className=" mx-auto"
              src="/images/ultrakidle-logo.png"
              alt="Ultrakidle Logo"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2 flex-shrink-0">
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
            {inDiscord && (
              <Button
                variant="ghost"
                size="md"
                onClick={() => setIsServerFeedOpen(true)}
                className="text-xl flex items-center gap-2 opacity-50 hover:opacity-100 text-yellow-500"
              >
                # SERVER_FEED
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
            {/* ... How To Play Content ... */}
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
                <ul className="list-disc [&>*]:text-left pl-4 list-outside  space-y-1 opacity-80 ">
                  <li>TYPE: ???, DEMON, MACHINE, HUSK, ANGEL OR PRIME SOUL</li>
                  <li>WEIGHT: LIGHT, MEDIUM, HEAVY OR SUPERHEAVY</li>
                  <li>HEALTH: NUMERIC COMPARISON. TARGET CAN BE HIGHER ▲ OR LOWER ▼. <span className="text-yellow-500">YELLOW</span> INDICATES VALUE IS WITHIN 10 HP OF TARGET</li>
                  <li>IS BOSS: ANY ENEMY THAT HAS APPEARED WITH A VISIBLE HEALTH BAR. IF AN ENEMY COUNTS AS A BOSS ITS HEALTH IS THAT OF THEIR BOSS APPEARANCE</li>
                  <li>REGISTERED AT: LEVEL OF FIRST ENCOUNTER. TARGET CAN BE LATER ▲ OR EARLIER ▼ (ORDERED ACCORDING TO <a href="https://www.speedrun.com/ultrakill/levels" target="_blank" className="underline hover:text-white/80">SPEEDRUN.COM</a>). <span className="text-yellow-500">YELLOW</span> INDICATES TARGET ENEMY ALSO APPEARS IN THIS LEVEL</li>
                </ul>
              </div>
            </div>
          </Modal>

          <Modal
            isOpen={isServerFeedOpen}
            onClose={() => setIsServerFeedOpen(false)}
            title="SYSTEM_LOGS: SERVER_ACTIVITY"
          >
            <ServerActivityFeed />
          </Modal>

          <div className="flex flex-col flex-1 min-h-0 w-full">
            <div className="flex-1 min-h-0 pb-10">
              <Outlet />
            </div>
            <div className="z-30  text-left lg:text-xl md:text-lg text-sm">
              <span className="opacity-50">
                INTO SOCIALS... OK
              </span>
              <div className="flex gap-3 lg:text-3xl md:text-xl text-lg">
                <a
                  target="_blank"
                  href="https://github.com/ikz87"
                  className="underline cursor-pointer"
                >GITHUB</a>
                <a
                  target="_blank"
                  href="https://www.youtube.com/@kz8785/"
                  className="underline cursor-pointer"
                >YOUTUBE</a>
                <a
                  target="_blank"
                  href="https://x.com/iikz87ii"
                  className="underline cursor-pointer"
                >TWITTER</a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className=" h-dvh w-dvw bg-black fixed top-0 left-0  overflow-hidden ">
        <img className="opacity-30 object-cover w-full h-full mx-auto scale-[1.04]" src="/images/main-menu.gif" />
      </div>
    </div>
  );
};

export default MainLayout;

