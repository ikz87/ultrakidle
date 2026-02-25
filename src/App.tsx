import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import PlayPage from './pages/PlayPage';
import CreditsPage from './pages/CreditsPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="play" element={<PlayPage />} />
          <Route path="credits" element={<CreditsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
