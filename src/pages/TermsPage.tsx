import SEO from '../components/SEO';

const TermsPage = () => {
  return (
    <div className="flex flex-col w-full pt-4 h-full justify-start items-start">
      <SEO title="Terms of Service" description="Terms of service for ULTRAKIDLE." />
      <div className="flex flex-col gap-6 w-full max-w-2xl bg-black/40 border-2 border-white/10 p-8 uppercase font-bold tracking-widest">
        <h1 className="text-3xl text-white">TERMS_OF_SERVICE</h1>
        <div className="flex text-left flex-col gap-4 opacity-70 font-normal normal-case tracking-normal">
          <p>Last updated: March 8, 2026</p>
          <p>
            By using ULTRAKIDLE (ultrakidle.online or the Discord
            Activity), you agree to the following terms.
          </p>

          <p className="font-bold uppercase">Fan Project</p>
          <p>
            ULTRAKIDLE is an unofficial fan-made project and is not
            affiliated with, endorsed by, or associated with Arsi
            "Hakita" Patala or New Blood Interactive. All rights to
            ULTRAKILL and its characters belong to their respective
            owners.
          </p>

          <p className="font-bold uppercase">Use of the Service</p>
          <p>
            You may use ULTRAKIDLE for personal, non-commercial
            purposes. You agree not to exploit, manipulate, or
            interfere with the service or its infrastructure in any
            way. We reserve the right to restrict or terminate access
            to any user at our discretion.
          </p>

          <p className="font-bold uppercase">Accounts</p>
          <p>
            The web version currently uses anonymous accounts. The
            Discord Activity version uses your Discord ID. Account
            systems may change in the future. We do not guarantee
            the preservation of game data or progress.
          </p>

          <p className="font-bold uppercase">Advertisements</p>
          <p>
            The web version of ULTRAKIDLE may display third-party
            advertisements in future game modes. By using the
            service, you acknowledge and accept the presence of ads.
          </p>

          <p className="font-bold uppercase">Availability</p>
          <p>
            The service is provided "as is" with no guarantees of
            uptime or availability. We may modify, suspend, or
            discontinue the service at any time without notice.
          </p>

          <p className="font-bold uppercase">Liability</p>
          <p>
            ULTRAKIDLE is provided without warranties of any kind.
            We are not liable for any damages arising from your use
            of the service.
          </p>

          <p className="font-bold uppercase">Changes</p>
          <p>
            We may update these terms at any time. Continued use of
            the service constitutes acceptance of any changes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
