import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DiscordRedirect } from "./lib/discord";
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import PlayPage from './pages/PlayPage';
import CreditsPage from './pages/CreditsPage';
import HistoryPage from './pages/HistoryPage';
import './App.css';

import { VersionProvider, useVersion } from './context/VersionContext';
import VersionUpdateModal from './components/VersionUpdateModal';

function AppContent() {
  const { updateAvailable } = useVersion();

  return (
    <>
      <VersionUpdateModal isOpen={updateAvailable} />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="play" element={<PlayPage />} />
            <Route path="credits" element={<CreditsPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="discord-install" element={<DiscordRedirect />} />
            {/* Redirect any unknown routes to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

function App() {
  return (
    <VersionProvider>
      <AppContent />
    </VersionProvider>
  );
}

export default App;
