import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StoreProvider } from './store/useStore';
import NavBar from './components/NavBar';
import Aurora from './components/Aurora';
import Library from './views/Library';
import AddSearch from './views/AddSearch';
import Settings from './views/Settings';
import Stats from './views/Stats';

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Aurora />
        {/* z-index: 1 lifts content above the fixed aurora layer */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
          <NavBar />
          <Routes>
            <Route path="/" element={<Library />} />
            <Route path="/add" element={<AddSearch />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/stats" element={<Stats />} />
          </Routes>
        </div>
      </BrowserRouter>
    </StoreProvider>
  );
}
