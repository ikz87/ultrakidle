import type { ReactNode } from 'react';

export interface Message {
    id: string;
    content: ReactNode;
    date?: string;
}

export const MESSAGES: Message[] = [
  {
  id: 'back-online',
  date: '2026-03-16',
  content: (
    <div className="space-y-4 lg:space-y-6 text-justify">
      <p className="text-zinc-400 text-sm">
        SYSTEM STATUS // [16-MAR-2026]
      </p>
      <p className="text-green-400 lg:text-base text-sm font-semibold">
        ✓ ALL SYSTEMS OPERATIONAL
      </p>
      <p className="text-white/70 lg:text-base text-sm">
        We're back. Servers have been upgraded to handle the new
        traffic + I optimized some queries. Everything should be running smoothly now and initial load for the page should be even faster than before. If you
        notice any lingering issues, let me know in the{" "}
        <a
          className="text-indigo-500 underline"
          href="https://discord.gg/6dsMavu6mH"
        >
          discord server
        </a>
        .
      </p>
      <p className="text-white/70 lg:text-base text-sm">
        Thanks for your patience
      </p>
    </div>
  ),
},
  {
  id: 'downtime-activity-spike',
  date: '2026-03-16',
  content: (
    <div className="space-y-4 lg:space-y-6 text-justify">
      <p className="text-zinc-400 text-sm">
        SYSTEM STATUS // [16-MAR-2026]
      </p>
      <p className="text-red-500 lg:text-base text-sm font-semibold">
        ⚠ CAPACITY EXCEEDED — INTERMITTENT DOWNTIME
      </p>
      <p className="text-white/70 lg:text-base text-sm">
        Hakita tweeted about ULTRAKIDLE and, well... the servers
        weren't exactly ready what came next.
        We've been experiencing intermittent downtime and degraded
        performance due to the massive influx of new players.
      </p>
      <p className="text-white/70 lg:text-base text-sm">
        I'm actively working on scaling things up to handle the
        load. In the meantime, if the site is slow or unresponsive,
        please be patient and try again in a few minutes — your
        progress is safe.
      </p>
      <p className="text-cyan-300 lg:text-base text-sm">
        On a brighter note: welcome to all the new players. Glad to
          have you here :).
      </p>
    </div>
  ),
},
  {
    id: 'changelog-2026-03-16',
    date: '2026-03-16',
    content: (
      <div className="space-y-4 lg:space-y-6 text-justify">
        <p className="text-zinc-400 text-sm">
          SYSTEM UPDATE LOG // [16-MAR-2026]
        </p>
        <p className="text-cyan-300 lg:text-base text-sm">
          TLDR: Small bug fixes and new level ordering, read the how to
          play section (again)
        </p>
        <ul className="list-disc list-outside pl-4 text-white/70 text-sm space-y-1">
          <li>Reordered levels to follow our <span className="text-white">Levels</span> page ordering instead of the one used in speedrun.com</li>
          <li>
            Updated{" "}
            <span className="text-white">How to Play</span>{" "}
            section with new details
          </li>
          <li>Fixed streaks showing as 0 or 1 for discord members who joined the leaderboard mid-activity</li>
          <li>Fixed clicking entries in the <span className="text-white">Enemies</span> and <span className="text-white">Levels</span> pages not redirecting to the official wiki in the discord activity</li>
          <li>Added <span className="text-white">Longest Streak</span> to the information present in the <span className="text-white">Logs</span> page</li>
          <li>Changed home page layout to make <span className="text-white">Donate</span> button more prominent</li>
        </ul>
      </div>
    ),
  },
    {
        id: 'infernoguessr-submission',
        date: '2026-03-11',
        content: (
            <div className="space-y-4 lg:space-y-6 text-justify">
    <p className="text-white lg:text-base text-sm">
      NEW CHALLENGE APPROACHING:{" "}
      <span className="text-red-500">INFERNOGUESSR</span>
      <br />
      (accepting submissions!)
    </p>
    <p className="text-cyan-300 lg:text-base text-sm">
      Wanna help development while ALSO getting credited in this website?
    </p>
    <p className="text-white/70 lg:text-base text-sm">
      Hey all, I've been busy with IRL stuff but I've had this idea in
      mind to implement different gamemodes; one of these being
      InfernoGuessr (GeoGuessr for ULTRAKILL). Basically you'd have to
      guess a given level from a single screenshot taken in that level.
      Specifics of how exactly this will work are still TBD.
    </p>
    <p className="text-white/70 lg:text-base text-sm">
      For this to be possible, I'd need <em>quite</em> the amount of
      screenshots, an amount I cannot gather alone. That's why I have
      opened community submissions!
    </p>
    <p className="text-white/70 lg:text-base text-sm">
      Want to participate in sending images and/or voting which images
      get in? Join the{" "}
      <a
        className="text-indigo-500 underline"
        href="https://discord.gg/6dsMavu6mH"
      >
        official ULTRAKIDLE discord server
      </a>{" "}
      and check the{" "}
      <span className="bg-indigo-900/50 rounded-sm px-1">
        #infernoguessr-submissions
      </span>{" "}
      forum!
    </p>
    <p className="text-white/70 lg:text-base text-sm">
        When the gamemode goes live, whenever your image appears in the game, it will be credited to your discord tag/nickname at time of submission approval.
    </p>
  </div>
        ),
    },
    {
        id: 'discord-invite',
        date: '2026-03-09',
        content: (
            <div className="space-y-4 lg:space-y-6 text-justify">
                <p className="text-zinc-400 text-sm">NETWORK INVITE</p>
                <p className="text-white/70 lg:text-base text-sm">
                    Hello machines, may I interest you in joining the <a className="text-indigo-500 underline" href="https://discord.gg/6dsMavu6mH">official ULTRAKIDLE discord server</a>?
                </p>
                <p className="text-white/70 lg:text-base text-sm">
                    You can do it right here but I also changed the DISCORD link in the footer of the site, previously it pointed to my personal discord profile, now it goes to the invite link for the official server.
                </p>
                <p className="text-white/70 lg:text-base text-sm">
                    That's all, have fun!
                </p>
            </div>
        ),
    },
    {
        id: 'v-mail-update',
        date: '2026-03-09',
        content: (
            <div className="space-y-4 lg:space-y-6 text-justify">
                <p className="text-zinc-400 text-sm">SYSTEM UPDATE LOG // [09-MAR-2026]</p>
                <ul className="list-disc list-inside text-white/70 text-sm space-y-1">
                    <li>Integrated V-MAIL interface.</li>
                </ul>
            </div>
        ),
    },
];
