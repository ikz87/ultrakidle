import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useGameInit } from '../hooks/useGameInit';
import { Typewriter } from '../components/Typewriter';
import { isRunningInDiscord, discordSdk } from '../lib/discord';
import { resolveExternalUrl } from '../lib/urls';
import { useMessages } from '../context/MessagesContext';
import SEO from '../components/SEO';


const LoadingDots = () => {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return <span className="inline-block w-[3ch] text-left">{'.'.repeat(dotCount)}</span>;
};

const getCountdown = () => {
  const now = new Date();

  // Get current time string in Nicaragua Time
  const etStr = now.toLocaleString("en-US", { timeZone: "America/Managua" });
  const etNow = new Date(etStr);

  // Get next midnight in Eastern Time
  const etMidnight = new Date(etStr);
  etMidnight.setHours(24, 0, 0, 0);

  const msDiff = etMidnight.getTime() - etNow.getTime();

  const hours = Math.floor(msDiff / (1000 * 60 * 60));
  const minutes = Math.floor((msDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((msDiff % (1000 * 60)) / 1000);

  return { hours, minutes, seconds };
};

const HomePage = () => {
  const { loading: gameLoading, guessHistory, dailyStats, streak, refresh, dailyChanged, setDailyChanged } = useGameInit();
  const navigate = useNavigate();
  const [titleFinished, setTitleFinished] = useState(false);
  const [diagnosticsStarted, setDiagnosticsStarted] = useState(false);
  const [countdown, setCountdown] = useState(getCountdown());
  const { hasUnread } = useMessages();

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    if (isRunningInDiscord() && discordSdk) {
      e.preventDefault();
      discordSdk.commands.openExternalLink({ url });
    }
  };

  useEffect(() => {
    if (dailyChanged) {
      setDailyChanged(false);
      refresh();
    }
  }, [dailyChanged, setDailyChanged, refresh]);

  useEffect(() => {
    const timer = setInterval(() => {
      const current = getCountdown();
      setCountdown(current);

      // If the countdown reaches zero, refresh is handled by the subscription now,
      // but keeping this as a fallback won't hurt.
      if (current.hours === 0 && current.minutes === 0 && current.seconds === 0) {
        refresh();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [refresh]);

  // Diagnostics should only start once loading is finished AND the title has finished typing
  useEffect(() => {
    if (!gameLoading && titleFinished) {
      // Small delay before starting the rest of the text
      const timer = setTimeout(() => setDiagnosticsStarted(true), 200);
      return () => clearTimeout(timer);
    }
  }, [gameLoading, titleFinished]);

  const hasWon = guessHistory.some(g => g.hint_data?.correct);
  const hasReachedLimit = guessHistory.length >= 5;
  const isGameOver = hasWon || hasReachedLimit;

  const statusText = hasWon ? "COMPLETED" : hasReachedLimit ? "FAILED" : "READY";
  const statusColor = hasWon ? "text-green-500" : hasReachedLimit ? "text-red-500" : "";

  return (
    <div className="flex flex-col w-full h-full min-h-0">
      <SEO
        title="Home"
        description="ULTRAKIDLE - The daily character guessing game for ULTRAKILL players. Test your knowledge of enemies, levels, and more."
      />
      <div className="flex flex-col gap-4 w-full mx-auto h-full min-h-0">
        <div className="flex flex-col gap-0  w-full lg:text-xl md:text-lg text-sm opacity-50 text-left flex-shrink-0">
          <div className="flex gap-1 items-baseline">
            <h1 className="contents">
              <Typewriter
                text="DAILY_CHALLENGE "
                speed={0.03}
                onComplete={() => setTitleFinished(true)}
              />
            </h1>
            <AnimatePresence mode="wait">
              {titleFinished && gameLoading && (
                <motion.div
                  key="dots"
                  initial={{ display: 'none' }}
                  animate={{ display: 'inline-block' }}
                  exit={{ display: 'none' }}
                >
                  <LoadingDots />
                </motion.div>
              )}
              {diagnosticsStarted && (
                <motion.div
                  key="ready"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {statusText !== "READY" ? (
                    <span className={statusColor}>
                      <Typewriter text={statusText} speed={0.03} />
                    </span>
                  ) : (
                    <Typewriter text={statusText} speed={0.03} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {diagnosticsStarted && (
            <>
              <div className="">
                <Typewriter
                  text={`CURRENT_STREAK ${streak}`}
                  speed={0.03}
                  delay={0.2}
                />
              </div>

              {dailyStats && (
                <Typewriter
                  text={`NETWORK_SYNC: ${dailyStats.total_wins} MACHINES SUCCEEDED | ${dailyStats.total_players - dailyStats.total_wins} TERMINATED`}
                  speed={0.02}
                  delay={0.7}
                />
              )}

              <Typewriter
                text="SYSTEM V1 INITIALIZED"
                speed={0.02}
                delay={1.4}
                className="mt-5"
              />
              <Typewriter
                text="DIAGNOSTICS... OK"
                speed={0.02}
                delay={1.8}
              />

              {isGameOver ? (
                <Typewriter
                  text="NEXT CHALLENGE IN:"
                  speed={0.02}
                  delay={2.3}
                />
              ) : (
                <Typewriter
                  text="STANDBY - WAIT FOR WAKE"
                  speed={0.02}
                  delay={2.3}
                />
              )}
            </>
          )}
        </div>

        {diagnosticsStarted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-4 w-full max-w-[450px] overflow-show min-h-0 pb-4"
          >
            {isGameOver ? (
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="xl"
                  disabled
                  className="cursor-default"
                >
                  {String(countdown.hours).padStart(2, '0')}:
                  {String(countdown.minutes).padStart(2, '0')}:
                  {String(countdown.seconds).padStart(2, '0')}
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => navigate('/play')}
                  className="opacity-50 hover:opacity-100"
                >
                  VIEW BOARD
                </Button>
                <Button
                  variant="outline"
                  size="xl"
                  onClick={() => navigate('/enemies')}
                  className="mt-2"
                >
                  ENEMIES
                </Button>
                <Button
                  variant="outline"
                  size="xl"
                  onClick={() => navigate('/levels')}
                  className="mt-2"
                >
                  LEVELS
                </Button>
                <Button
                  variant="outline"
                  size="xl"
                  onClick={() => navigate('/credits')}
                  className="mt-2"
                >
                  CREDITS
                </Button>
                <div className="flex h-fit gap-2 flex-row">
                  <Button
                    variant="outline"
                    className="flex-1"
                    size="xl"
                    onClick={() => navigate('/history')}
                  >
                    LOGS
                  </Button>
                  <div className="relative overflow-visible h-full aspect-square">
                    <Button
                      variant="outline"
                      className="h-full w-full"
                      px="px-2"
                      py="py-2"
                      size="xl"
                      onClick={() => navigate('/messages')}
                    >
                      <svg className="h-full w-full lucide lucide-mail-icon lucide-mail" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" /><rect x="2" y="4" width="20" height="16" rx="2" /></svg>
                    </Button>
                    <AnimatePresence>
                      {hasUnread && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="absolute top-0 right-0 z-30 pointer-events-none"
                        >
                          <div className="relative w-3 h-3 ">
                            <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full" />
                            <div className="absolute inset-0 w-3 h-3 scale-[1.5] animate-ping bg-green-500 rounded-full" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <Button
                  variant="primary"
                  size="xl"
                  onClick={() => navigate('/play')}
                >
                  {guessHistory.length > 0 ? 'CONTINUE' : 'PLAY'}
                </Button>
                <Button
                  variant="outline"
                  size="xl"
                  onClick={() => navigate('/enemies')}
                >
                  ENEMIES
                </Button>
                <Button
                  variant="outline"
                  size="xl"
                  onClick={() => navigate('/levels')}
                >
                  LEVELS
                </Button>
                <Button
                  variant="outline"
                  size="xl"
                  onClick={() => navigate('/credits')}
                >
                  CREDITS
                </Button>
                <div className="flex h-fit gap-2 flex-row">
                  <Button
                    variant="outline"
                    className="flex-1"
                    size="xl"
                    onClick={() => navigate('/history')}
                  >
                    LOGS
                  </Button>
                  <div className="relative overflow-visible h-full aspect-square">
                    <Button
                      variant="outline"
                      className="h-full w-full"
                      px="px-2"
                      py="py-2"
                      size="xl"
                      onClick={() => navigate('/messages')}
                    >
                      <svg className="h-full w-full lucide lucide-mail-icon lucide-mail" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" /><rect x="2" y="4" width="20" height="16" rx="2" /></svg>
                    </Button>
                    <AnimatePresence>
                      {hasUnread && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="absolute top-0 right-0 z-30 pointer-events-none"
                        >
                          <div className="relative w-3 h-3 ">
                            <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full" />
                            <div className="absolute inset-0 w-3 h-3 scale-[1.5] animate-ping bg-green-500 rounded-full" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            )}
            <div className={`grid grid-cols-1 ${isRunningInDiscord() ? "" : "md:grid-cols-2"} gap-2`}>
              {!isRunningInDiscord() && (
                <Button
                  variant="ghost"
                  className="flex items-center w-full"
                  onClick={() => navigate('/discord-install')}
                >
                  INSTALL ON DISCORD
                  <img
                    className="w-5 ml-2"
                    src="https://img.icons8.com/ios-filled/50/ffffff/discord-logo.png"
                    alt="Discord"
                  />
                </Button>
              )}
              <div
                className="w-full"
              >
                <a
                  href='https://ko-fi.com/G2G41UYAX6'
                  target='_blank'
                  onClick={(e) => handleLinkClick(e, 'https://ko-fi.com/G2G41UYAX6')}
                  className="w-full"
                >
                  <Button
                    variant="ghost"
                    className="flex w-full items-center"
                  >
                    Support me on ko-fi
                    <img
                      className={`w-5 ml-2`}
                      src={resolveExternalUrl("/external/kofi/5c14e387dab576fe667689cf/670f5a01229bf8a18f97a3c1_favion.png")}
                      alt="Ko-fi"
                    />
                  </Button>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
