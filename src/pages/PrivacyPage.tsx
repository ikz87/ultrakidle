import SEO from '../components/SEO';
import { ExternalLink } from '../components/ui/ExternalLink';

const PrivacyPage = () => {
  return (
    <div className="flex flex-col w-full pt-4 h-full justify-start items-start">
      <SEO title="Privacy Policy" description="Privacy policy for ULTRAKIDLE." />
      <div className="flex flex-col gap-6 w-full max-w-2xl bg-black/40 border-2 border-white/10 p-4 uppercase font-bold tracking-widest">
        <h1 className="text-3xl text-white">PRIVACY_POLICY</h1>
        <div className="flex flex-col gap-4 opacity-70 font-normal text-left normal-case tracking-normal">
          <p>Last updated: March 8, 2026</p>

          <p className="font-bold uppercase">Data We Collect</p>
          <p>
            We use Google Analytics to collect anonymous usage data
            (pages visited, session duration, device type, approximate
            location). This data is used solely to improve the site.
          </p>
          <p>
            Game progress (such as guesses and results) is stored in
            our database. This data is not personally identifiable but
            does allow us to track gameplay activity.
          </p>

          <p className="font-bold uppercase">Discord Activity</p>
          <p>
            If you use the Discord Activity version, your Discord ID
            is used to associate your game progress. Your results may
            be shared with other members in any guild where you open
            the activity.
          </p>

          <p className="font-bold uppercase">Cookies</p>
          <p>
            Google Analytics uses cookies to distinguish users. You
            can disable cookies in your browser settings.
          </p>

          <p className="font-bold uppercase">Third-Party Services</p>
          <p>
            Google Analytics (
            <ExternalLink
              href="https://policies.google.com/privacy"
              className="underline"
            >
              Privacy Policy
            </ExternalLink>
            )
          </p>

          <p className="font-bold uppercase">Ads</p>
          <p>
            Third-party advertisements may be displayed on the web
            version of the site (ultrakidle.online) in the future. Ads are not
            shown in the Discord Activity version. The classic daily
            enemy guessing mode will remain ad-free. Ads may appear
            in additional future game modes.
          </p>

          <p className="font-bold uppercase">Changes</p>
          <p>
            We may update this policy at any time. Changes will be
            posted on this page.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
