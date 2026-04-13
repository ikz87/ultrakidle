import type { ReactNode } from 'react';
import { ExternalLink } from '../components/ui/ExternalLink';

export interface Message {
  id: string;
  content: ReactNode;
  date?: string;
}

export const MESSAGES: Message[] = [
  {
  id: 'dog-token-disclaimer',
  date: '2026-04-13',
  content: (
    <div className="space-y-4 lg:space-y-6 text-justify">
      <p className="text-zinc-400 text-sm">
        SYSTEM STATUS // [13-APR-2026]
      </p>
      <p className="text-yellow-400 lg:text-xl text-base font-bold tracking-wide">
        ⚠ PUBLIC NOTICE
      </p>
      <p className="text-white/70 lg:text-base text-sm">
        Some of you may be aware that a cryptocurrency token was
        recently created on pump.fun by community members themed
        around my dog. I did receive support through it towards
        her treatment, and{" "}
        <span className="text-white font-semibold">
          I'm genuinely grateful to everyone who contributed
        </span>
        . It means more than you know.
      </p>
      <p className="text-white/70 lg:text-base text-sm">
        That said, I want to be transparent:{" "}
        <span className="text-white font-semibold">
          I did not create this token, and I do not endorse it
        </span>
        . I have no involvement with it and no plans to be. Please
        do not buy or invest in it expecting any association with
        me or ULTRAKIDLE.
      </p>
      <p className="text-white/70 lg:text-base text-sm">
        ULTRAKIDLE will never have any cryptocurrency or token
        associated with it. If you want to support the project,
        Ko-fi remains the only official way to do so.
      </p>
    </div>
  ),
},
  {
  id: 'settings-page',
  date: '2026-04-06',
  content: (
    <div className="space-y-4 lg:space-y-6 text-justify">
      <p className="text-zinc-400 text-sm">
        SYSTEM UPDATE LOG // [06-APR-2026]
      </p>
      <p className="text-green-500 lg:text-xl text-base font-bold tracking-wide">
        SETTINGS PAGE DEPLOYED
      </p>
      <p className="text-white/70 lg:text-base text-sm">
        A dedicated settings page has been added to the site. It's accessible from the home page.
      </p>
      <p className="text-white/70 lg:text-base text-sm">
        <span className="text-white font-semibold">
          Colorblind mode
        </span>{" "}
        has been relocated here from its previous location.
        Additionally, you can now configure{" "}
        <span className="text-white font-semibold">
          custom color schemes
        </span>{" "}
        for the hint tiles to your liking.
      </p>
      <p className="text-white/70 lg:text-base text-sm">
        The guessboard columns can now be{" "}
        <span className="text-white font-semibold">reordered</span>{" "}
        to match your preferred layout.
      </p>
      <p className="text-white/70 lg:text-base text-sm">
        All gamemodes now have small
         small{" "}
        <span className="text-white font-semibold">
          tweakable behavior options
        </span>
        . Check them out and adjust things to how you like to play.
      </p>
    </div>
  ),
},
  {
    id: 'cybergrind-release',
    date: '2026-04-02',
    content: (
      <div className="space-y-4 lg:space-y-6 text-justify">
        <p className="text-zinc-400 text-sm">
          SYSTEM UPDATE LOG // [02-APR-2026]
        </p>
        <p className="text-green-500 lg:text-xl text-base font-bold tracking-wide">
          CYBERGRIND HAS BEEN DEPLOYED
        </p>
        <p className="text-white/70 lg:text-base text-sm">
          A new endless gamemode has been added to ULTRAKIDLE. Identify
          enemies wave after wave, each correct guess advances you to
          the next round. Fail to identify the target in 6 guesses and
          your run is over.
        </p>
        <p className="text-white/70 lg:text-base text-sm">
          As you progress, random{" "}
          <span className="text-red-500 font-bold">modifiers</span>{" "}
          are introduced to mess with your hints. Hover over (or tap) them
          in-game to see what each one does. Later waves can stack up
          to 5 modifiers at once, with{" "}
          <span className="text-purple-400 font-bold">RADIANCE</span>{" "}
          amplifying others for extra difficulty.
        </p>
        <p className="text-white/70 lg:text-base text-sm">
          Your best run is tracked by waves cleared, total guesses, and
          guess accuracy. See how far you can get.
        </p>
      </div>
    ),
  },
  {
  id: 'earthmover-grouping',
  date: '2026-03-26',
  content: (
    <div className="space-y-4 lg:space-y-6 text-justify">
      <p className="text-zinc-400 text-sm">
        SYSTEM UPDATE LOG // [26-MAR-2026]
      </p>
      <p className="text-cyan-300 lg:text-base text-sm">
        BALANCE CHANGE: EARTHMOVER DEFENSE SYSTEM
      </p>
      <p className="text-white/70 lg:text-base text-sm">
        The Earthmover's defense system enemies that shared
        identical stats have been grouped into pairs. This
        means they now appear as a single entry rather than
        separate duplicates.
      </p>
    </div>
  ),
},
  {
  id: 'infernoguessr-release',
  date: '2026-03-18',
  content: (
    <div className="space-y-4 lg:space-y-6 text-justify">
      <p className="text-zinc-400 text-sm">
        SYSTEM UPDATE LOG // [18-MAR-2026]
      </p>
      <p className="text-green-500 lg:text-xl text-base font-bold tracking-wide">
        INFERNOGUESSR HAS BEEN DEPLOYED
      </p>
      <p className="text-white/70 lg:text-base text-sm">
        A new gamemode has been added to ULTRAKIDLE. You are shown a
        screenshot from an ULTRAKILL level. You guess the level. You are
        scored based on how close you get. There will be 5 rounds daily with a maximum of 500 points to get.
      </p>
      <p className="text-white/70 lg:text-base text-sm">
        When the daily challenge refreshed, there might have been some jank on the site or the discord
        activity, that was me messing things up while trying to finish this new feature before going to bed. Everything should be back to normal now, sorry for the inconveniences.
      </p>
      <p className="text-white/70 lg:text-base text-sm">
        Big shoutouts to everyone who submitted screenshots in the discord!
        You guys made this possible. Your tag is shown in-game whenever one
        of your images comes up.
      </p>
      <p className="text-white/70 lg:text-base text-sm">
          Interested in submitting your own screenshots? Join the           <ExternalLink
            className="text-indigo-500 underline"
            href="https://discord.gg/6dsMavu6mH"
          >
            discord server
          </ExternalLink>
!
      </p>
    </div>
  ),
},
    {
    id: 'changelog-2026-03-18',
    date: '2026-03-18',
    content: (
      <div className="space-y-4 lg:space-y-6 text-justify">
        <p className="text-zinc-400 text-sm">
          SYSTEM UPDATE LOG // [18-MAR-2026]
        </p>
        <p className="text-cyan-300 lg:text-base text-sm">
          BALANCE CHANGE: DEBUT LEVEL HINTS
        </p>
        <p className="text-cyan-300 lg:text-base text-sm">
          TLDR: Read the how to play section (again)
        </p>
        <p className="text-white/70 lg:text-base text-sm">
          The <span className="text-yellow-400">yellow</span> hint
          for the <span className="text-white">registered at</span>{" "}
          column has been reworked. Previously, it indicated that the
          target enemy appeared in the guessed enemy's debut
          level, meaning that seeing someone else's grid with yellow
          on their last column immediately spoiled that the daily enemy 
          had more than one appearance.
        </p>
        <p className="text-white/70 lg:text-base text-sm">
          Now, <span className="text-yellow-400">yellow</span> means
          the correct debut level is{" "}
          <span className="text-white">within 10 levels</span> of
          your guess (based on level ordering). This should make the hint still
          useful while not spoiling anything about the enemy for other players
        </p>
      </div>
    ),
  },
  {
    id: 'supporters-board',
    date: '2026-03-17',
    content: (
      <div className="space-y-4 lg:space-y-6 text-justify">
        <p className="text-zinc-400 text-sm">
          SYSTEM UPDATE LOG // [17-MAR-2026]
        </p>
        <p className="text-cyan-300 lg:text-base text-sm">
          NEW: SUPPORTER'S BOARD
        </p>
        <p className="text-white/70 lg:text-base text-sm">
          To show some love back to those who keep the servers running,
          there's now a{" "}
          <span className="text-white">Supporter's Board</span> on
          the home page. If you donate through Ko-fi,
          your name and donation amount will be showcased on the
          board for 7 days after your contribution.
        </p>
        <p className="text-white/70 lg:text-base text-sm">
          It's a small gesture, but I wanted donors to get some
          visibility for supporting my work on ULTRAKIDLE :)
        </p>
      </div>
    ),
  },
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
          <ExternalLink
            className="text-indigo-500 underline"
            href="https://discord.gg/6dsMavu6mH"
          >
            discord server
          </ExternalLink>
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
          were't exactly ready what came next.
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
          <ExternalLink
            className="text-indigo-500 underline"
            href="https://discord.gg/6dsMavu6mH"
          >
            official ULTRAKIDLE discord server
          </ExternalLink>{" "}
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
          Hello machines, may I interest you in joining the <ExternalLink className="text-indigo-500 underline" href="https://discord.gg/6dsMavu6mH">official ULTRAKIDLE discord server</ExternalLink>?
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
