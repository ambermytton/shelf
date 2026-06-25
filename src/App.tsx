import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StoreProvider } from './store/useStore';
import NavBar from './components/NavBar';
import Library from './views/Library';
import AddSearch from './views/AddSearch';
import Settings from './views/Settings';
import Stats from './views/Stats';
import IntroLoader from './components/IntroLoader';

export default function App() {
  const [loaderDone, setLoaderDone] = useState(false);
  const handleLoaderDone = useCallback(() => setLoaderDone(true), []);

  return (
    <StoreProvider>
      <BrowserRouter>
        <NavBar />
        <Routes>
          <Route path="/" element={<Library />} />
          <Route path="/add" element={<AddSearch />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/stats" element={<Stats />} />
        </Routes>
        {!loaderDone && <IntroLoader onDone={handleLoaderDone} />}
      </BrowserRouter>
    </StoreProvider>
  );
}
