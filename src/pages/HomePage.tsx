import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { useGameInit } from "../hooks/useGameInit";
import { Typewriter } from "../components/Typewriter";
import { isRunningInDiscord, discordSdk } from "../lib/discord";
import { resolveExternalUrl } from "../lib/urls";
import { useMessages } from "../context/MessagesContext";
import SEO from "../components/SEO";

const LoadingDots = () => {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-block w-[3ch] text-left">{".".repeat(dotCount)}</span>
  );
};

const getCountdown = () => {
  const now = new Date();
  const etStr = now.toLocaleString("en-US", { timeZone: "America/Managua" });
  const etNow = new Date(etStr);
  const etMidnight = new Date(etStr);
  etMidnight.setHours(24, 0, 0, 0);

  const msDiff = etMidnight.getTime() - etNow.getTime();
  const hours = Math.floor(msDiff / (1000 * 60 * 60));
  const minutes = Math.floor((msDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((msDiff % (1000 * 60)) / 1000);

  return { hours, minutes, seconds };
};

const DonorsBoard = ({
  donors,
  rates,
}: {
  donors: any[];
  rates: Record<string, number>;
}) => {
  const processedDonors = (donors || [])
    .map((d) => {
      const currency = d.currency.toUpperCase();
      const rate = rates[currency] || 1;
      const amountInUsd = currency === "USD" ? d.amount : d.amount / rate;
      return { ...d, amountInUsd };
    })
    .sort((a, b) => {
      if (b.amountInUsd !== a.amountInUsd)
        return b.amountInUsd - a.amountInUsd;
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

  return (
    <div className="flex flex-col gap-2 bg-black/40 border-2 border-white/10 p-4">
      <div className="text-xs uppercase font-bold tracking-widest text-white/40 border-b border-white/10 pb-2 mb-1">
        RECENT_SUPPORTERS
      </div>
      <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-1">
        {processedDonors.length > 0 ? (
          processedDonors.map((donor, i) => (
            <div
              key={i}
              className="relative flex flex-col items-center flex-shrink-0 gap-1 px-3 py-2 border border-white/20 bg-white/5 min-w-[80px] overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
              <span className="text-xs md:text-sm uppercase truncate max-w-[100px] text-white/90">
                {donor.name || "ANONYMOUS"}
              </span>
              <span className="text-green-500 text-xs">
                $
                {donor.amountInUsd.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          ))
        ) : (
          <div className="py-4 w-full text-center border border-dashed border-white/10 opacity-50">
            <span className="text-xs tracking-widest uppercase">
              NO RECENT SUPPORTERS FOUND
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const HomePage = () => {
  const {
    loading: gameLoading,
    guessHistory,
    dailyStats,
    streak,
    donors,
    rates,
    refresh,
    dailyChanged,
    setDailyChanged,
  } = useGameInit();
  const navigate = useNavigate();
  const [titleFinished, setTitleFinished] = useState(false);
  const [diagnosticsStarted, setDiagnosticsStarted] = useState(false);
  const [countdown, setCountdown] = useState(getCountdown());
  const { hasUnread } = useMessages();

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
      if (
        current.hours === 0 &&
        current.minutes === 0 &&
        current.seconds === 0
      ) {
        refresh();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!gameLoading && titleFinished) {
      const timer = setTimeout(() => setDiagnosticsStarted(true), 200);
      return () => clearTimeout(timer);
    }
  }, [gameLoading, titleFinished]);

  const hasWon = guessHistory.some((g) => g.hint_data?.correct);
  const hasReachedLimit = guessHistory.length >= 5;
  const isGameOver = hasWon || hasReachedLimit;

  const statusText = hasWon
    ? "COMPLETED"
    : hasReachedLimit
      ? "FAILED"
      : "READY";
  const statusColor = hasWon
    ? "text-green-500"
    : hasReachedLimit
      ? "text-red-500"
      : "";

  return (
    <div className="flex flex-col w-full h-full min-h-0">
      <SEO
        title="Home"
        description="ULTRAKIDLE - The daily character guessing game for ULTRAKILL players."
      />
      <div className="flex flex-col gap-4 w-full mx-auto h-full min-h-0">
        <div className="flex flex-col gap-0 w-full lg:text-xl md:text-lg text-sm opacity-50 text-left flex-shrink-0">
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
                  initial={{ display: "none" }}
                  animate={{ display: "inline-block" }}
                  exit={{ display: "none" }}
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
              <div>
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
              <Typewriter text="DIAGNOSTICS... OK" speed={0.02} delay={1.8} />

              {isGameOver ? (
                <Typewriter text="NEXT CHALLENGE IN:" speed={0.02} delay={2.3} />
              ) : (
                <Typewriter text="STANDBY - WAIT FOR WAKE" speed={0.02} delay={2.3} />
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
            <DonorsBoard donors={donors} rates={rates} />

            {isGameOver ? (
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="xl"
                  disabled
                  className="cursor-default"
                >
                  {String(countdown.hours).padStart(2, "0")}:
                  {String(countdown.minutes).padStart(2, "0")}:
                  {String(countdown.seconds).padStart(2, "0")}
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => navigate("/play")}
                  className="opacity-50 hover:opacity-100"
                >
                  VIEW BOARD
                </Button>
                <Button
                  variant="outline"
                  size="xl"
                  onClick={() => navigate("/enemies")}
                  className="mt-2"
                >
                  ENEMIES
                </Button>
                <Button
                  variant="outline"
                  size="xl"
                  onClick={() => navigate("/levels")}
                  className="mt-2"
                >
                  LEVELS
                </Button>
                <Button
                  variant="outline"
                  size="xl"
                  onClick={() => navigate("/credits")}
                  className="mt-2"
                >
                  CREDITS
                </Button>
                <div className="flex h-fit gap-2 flex-row">
                  <Button
                    variant="outline"
                    className="flex-1"
                    size="xl"
                    onClick={() => navigate("/history")}
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
                      onClick={() => navigate("/messages")}
                    >
                      <svg
                        className="h-full w-full lucide lucide-mail-icon lucide-mail"
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                      </svg>
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
              <div className="flex flex-col gap-2">
                <Button
                  variant="primary"
                  size="xl"
                  onClick={() => navigate("/play")}
                >
                  {guessHistory.length > 0 ? "CONTINUE" : "PLAY"}
                </Button>
                <Button
                  variant="outline"
                  size="xl"
                  onClick={() => navigate("/enemies")}
                >
                  ENEMIES
                </Button>
                <Button
                  variant="outline"
                  size="xl"
                  onClick={() => navigate("/levels")}
                >
                  LEVELS
                </Button>
                <div className="flex w-full h-fit gap-2 flex-row">
                  <Button
                    variant="outline"
                    size="xl"
                    className="flex-1"
                    onClick={() => {
                      const url = "https://ko-fi.com/G2G41UYAX6";
                      if (isRunningInDiscord() && discordSdk) {
                        discordSdk.commands.openExternalLink({ url });
                      } else {
                        window.open(url, "_blank");
                      }
                    }}
                  >
                    DONATE
                    <img
                      className={`w-6 ml-3`}
                      src={resolveExternalUrl(
                        "/external/kofi/5c14e387dab576fe667689cf/670f5a01229bf8a18f97a3c1_favion.png",
                      )}
                      alt="Ko-fi"
                    />
                  </Button>
                  <Button
                    variant="outline"
                    size="xl"
                    onClick={() => navigate("/credits")}
                  >
                    CREDITS
                  </Button>
                </div>
                <div className="flex h-fit gap-2 flex-row">
                  <Button
                    variant="outline"
                    className="flex-1"
                    size="xl"
                    onClick={() => navigate("/history")}
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
                      onClick={() => navigate("/messages")}
                    >
                      <svg
                        className="h-full w-full lucide lucide-mail-icon lucide-mail"
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                      </svg>
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
            {!isRunningInDiscord() && (
              <div
                className={`grid grid-cols-1 ${isRunningInDiscord() ? "" : "md:grid-cols-1"} gap-2`}
              >
                <Button
                  variant="ghost"
                  className="flex items-center w-full"
                  onClick={() => navigate("/discord-install")}
                >
                  INSTALL ON DISCORD
                  <img
                    className="w-5 ml-2"
                    src="https://img.icons8.com/ios-filled/50/ffffff/discord-logo.png"
                    alt="Discord"
                  />
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
