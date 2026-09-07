import { useState } from 'react';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';

export default function App() {
  const [view, setView] = useState('landing'); // 'landing' | 'dashboard'

  return (
    <>
      {view === 'landing' && (
        <LandingPage onLaunch={() => setView('dashboard')} />
      )}
      {view === 'dashboard' && (
        <Dashboard onBack={() => setView('landing')} />
      )}
    </>
  );
}
