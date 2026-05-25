import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GameProvider } from './context/GameContext';
import HomePage    from './pages/HomePage';
import LobbyPage   from './pages/LobbyPage';
import GamePage    from './pages/GamePage';
import EndGamePage from './pages/EndGamePage';

export default function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1A1A2E',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontFamily: "'Outfit', sans-serif",
              fontSize: '0.9rem',
            },
            success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
          }}
        />
        <Routes>
          <Route path="/"              element={<HomePage />} />
          <Route path="/lobby/:codigo" element={<LobbyPage />} />
          <Route path="/game/:codigo"  element={<GamePage />} />
          <Route path="/fin/:codigo"   element={<EndGamePage />} />
          <Route path="*"              element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GameProvider>
  );
}
