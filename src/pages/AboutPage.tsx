import SEO from '../components/SEO';

const AboutPage = () => {
    return (
        <div className="flex flex-col w-full pt-4 h-full justify-start items-start">
            <SEO title="About" description="Learn more about ULTRAKIDLE, the daily character guessing game for fans of ULTRAKILL." />
            <div className="flex flex-col gap-6 w-full max-w-2xl bg-black/40 border-2 border-white/10 p-4 uppercase font-bold tracking-widest">
                <h1 className="text-3xl text-white">ABOUT_ULTRAKIDLE</h1>
                <div className="flex flex-col gap-4 opacity-70 font-normal text-left normal-case tracking-normal">
                    <p>
                        ULTRAKIDLE is a daily web-based game inspired by <a className="underline" href="https://www.nytimes.com/games/wordle/index.html">Wordle</a> and similar websites like <a className="underline" href="https://silksongdle.com/">Silksongdle</a>.
                        Test your knowledge of ULTRAKILL's enemies and levels in a series of
                        challenging guessing modes.
                    </p>

                    <p className="font-bold uppercase">Our Mission</p>
                    <p>
                        The goal of this project is to provide a fun, community-driven experience for fans
                        of ULTRAKILL.
                    </p>

                    <p className="font-bold uppercase">How It Works</p>
                    <p>
                        Every day, a new enemy (and more things to come!) is selected as the target. Players must use clues
                        provided by their guesses, such as type, weight, health, and more, to identify the
                        correct answer within a limited number of attempts.
                    </p>

                    <p className="font-bold uppercase">The Team</p>
                    <p>
                        ULTRAKIDLE is developed and maintained by ikz87, a dedicated fan, with the help of the <a className="text-indigo-500 underline" href="https://discord.gg/6dsMavu6mH">official ULTRAKIDLE discord server</a>. We are dedicated to
                        polishing the experience and adding new content regularly based on community feedback.
                    </p>

                    <p className="font-bold uppercase">Support the Project</p>
                    <p>
                        As a fan-made project, we rely on the support of the community. You can support
                        us by playing the game, sharing it with friends, and providing feedback on our
                        social channels.
                    </p>

                    <p className="font-bold uppercase">Credits</p>
                    <p>
                        Original game "ULTRAKILL" created by Arsi "Hakita" Patala and published by New
                        Blood Interactive. All assets used are for fan purposes and remain the property
                        of their respective owners.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AboutPage;
