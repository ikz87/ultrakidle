import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useEffect } from "react";
import ReactGA from "react-ga4";
import { DiscordRedirect } from "./lib/discord";
import MainLayout from "./layouts/MainLayout";
import HomePage from "./pages/HomePage";
import ClassicPlayPage from "./pages/play/ClassicPlayPage";
import InfernoPlayPage from "./pages/play/InfernoPlayPage";
import CybergrindClassicPage from "./pages/play/CybergrindClassicPage";
import CreditsPage from "./pages/CreditsPage";
import HistoryPage from "./pages/HistoryPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import ContactPage from "./pages/ContactPage";
import AboutPage from "./pages/AboutPage";
import EnemiesPage from "./pages/EnemiesPage";
import LevelsPage from "./pages/LevelsPage";
import MessagesPage from "./pages/MessagesPage";
import FaqPage from "./pages/FaqPage";
import SettingsPage from "./pages/SettingsPage";
import "./App.css";

import { VersionProvider, useVersion } from "./context/VersionContext";
import { SettingsProvider } from "./context/SettingsContext";
import { MessagesProvider } from "./context/MessagesContext";
import { SessionContext, useSessionProvider } from "./hooks/useSession";
import VersionUpdateModal from "./components/VersionUpdateModal";

const SHOW_EXPERIMENTAL_MESSAGE = false;

function AppContent() {
  const { updateAvailable } = useVersion();
  const location = useLocation();

  useEffect(() => {
    ReactGA.send({
      hitType: "pageview",
      page: location.pathname + location.search,
    });
  }, [location]);

  if (SHOW_EXPERIMENTAL_MESSAGE) {
    return (
      <div className="fixed top-0 left-0 bg-black h-dvh w-dvw"
      >
        <div style={{ maxWidth: '800px', lineHeight: '1.6' }}>
          Not testing any experimental features currently, go to <a href="https://ultrakidle.online/" style={{ color: 'white', textDecoration: 'underline' }}>https://ultrakidle.online/</a> now!
        </div>
      </div>
    );
  }

  return (
    <>
      <VersionUpdateModal isOpen={updateAvailable} />
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route
            path="play"
            element={<Navigate to="/play/classic" replace />}
          />
          <Route path="play/classic" element={<ClassicPlayPage />} />
          <Route path="play/infernoguessr" element={<InfernoPlayPage />} />
          <Route
            path="cybergrind/classic"
            element={<CybergrindClassicPage />}
          />
          <Route path="credits" element={<CreditsPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="tos" element={<TermsPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="enemies" element={<EnemiesPage />} />
          <Route path="levels" element={<LevelsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="discord-install" element={<DiscordRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}

function App() {
  const sessionCtx = useSessionProvider();

  return (
    <BrowserRouter>
      <SessionContext.Provider value={sessionCtx}>
        <VersionProvider>
          <SettingsProvider>
            <MessagesProvider>
              <AppContent />
            </MessagesProvider>
          </SettingsProvider>
        </VersionProvider>
      </SessionContext.Provider>
    </BrowserRouter>
  );
}

export default App;
