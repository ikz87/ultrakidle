import SEO from '../components/SEO';
import { ExternalLink } from '../components/ui/ExternalLink';

const ContactPage = () => {
    return (
        <div className="flex flex-col w-full pt-4 h-full justify-start items-start">
            <SEO title="Contact" description="Get in touch with the ULTRAKIDLE team for bug reports or feedback." />
            <div className="flex flex-col text-left gap-6 w-full max-w-2xl bg-black/40 border-2 border-white/10 p-8 uppercase font-bold tracking-widest">
                <h1 className="text-3xl text-white">CONTACT_SYSTEM</h1>
                <div className="flex flex-col gap-4 opacity-70 font-normal normal-case tracking-normal">
                    <p>For inquiries, bug reports, or feedback, please reach out via the following channels:</p>
                    <div className="flex flex-col gap-2 uppercase font-bold tracking-widest">
                        <span className="opacity-50">Email:</span>
                        <a href="mailto:iikz87ii@gmail.com" className="text-indigo-500 hover:text-red-400 transition-colors underline lowercase tracking-normal">iikz87ii@gmail.com</a>

                        <span className="opacity-50 mt-2">Socials:</span>
                        <div className="flex gap-4">
                            <ExternalLink href="https://x.com/iikz87ii" className="underline">Twitter</ExternalLink>
                            <ExternalLink href="https://github.com/ikz87" className="underline">GitHub</ExternalLink>
                            <ExternalLink href="https://discord.gg/6dsMavu6mH" className="underline">DISCORD</ExternalLink>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
