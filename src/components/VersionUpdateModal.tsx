import Modal from './ui/Modal';

interface VersionUpdateModalProps {
    isOpen: boolean;
}

export default function VersionUpdateModal({ isOpen }: VersionUpdateModalProps) {
    const handleRefresh = () => {
        window.location.reload();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => { }}
            title="Update Available"
            showCloseButton={false}
            allowBackdropClose={false}
            showFooterButton={false}
        >
            <div className="space-y-4">
                <p className="text-white/80">
                    A new version of <span className="text-white font-bold tracking-tighter">ULTRAKIDLE</span> is available!
                </p>
                <p className="text-zinc-400 text-sm">
                    Please refresh your browser tab to get the latest features and bug fixes.
                </p>
                <button
                    onClick={handleRefresh}
                    className="w-full cursor-pointer bg-white text-black font-bold py-3 uppercase hover:bg-zinc-200 transition-colors mt-4"
                >
                    Refresh Now
                </button>
            </div>
        </Modal>
    );
}
