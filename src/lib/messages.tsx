import type { ReactNode } from 'react';

export interface Message {
    id: string;
    content: ReactNode;
    date?: string;
}

export const MESSAGES: Message[] = [
    {
        id: 'discord-invite',
        date: '2026-03-09',
        content: (
            <div className="space-y-2">
                <p className="text-zinc-400 text-sm">NETWORK INVITE</p>
                <p className="text-white/70 text-sm ">
                    Hey ULTRAKIDLE players, may I interest you in joining the <a className="text-indigo-500 underline" href="https://discord.gg/QF8wqypuBb">official ULTRAKIDLE discord server</a>?
                </p>
                <p className="text-white/70 text-sm ">
                    You can do it right here but I also changed the DISCORD link in the footer of the site, previously it pointed to my personal discord profile, now it goes to the invite link for the official server.
                </p>
                <p className="text-white-70 text-sm ">
                    That's all, have fun!
                </p>
            </div>
        ),
    },
    {
        id: 'v-mail-update',
        date: '2026-03-09',
        content: (
            <div className="space-y-2">
                <p className="text-zinc-400 text-sm">SYSTEM UPDATE LOG // [09-MAR-2026]</p>
                <ul className="list-disc list-inside text-white/70 text-sm space-y-1">
                    <li>Integrated V-MAIL interface.</li>
                </ul>
            </div>
        ),
    },
];
