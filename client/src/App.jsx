import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { I18nProvider, useTranslation } from './i18n/I18nContext';
import LanguageSelector from './components/LanguageSelector';
import CreatePoll from './pages/CreatePoll';
import VotePage from './pages/VotePage';
import AdminPage from './pages/AdminPage';

function AppContent() {
  const { t } = useTranslation();

  return (
    <div className="app-layout">
      <header className="app-header">
        <a href="/" className="app-logo">
          <span className="logo-icon">🎬</span>
          <span className="logo-text">GuggeMeMol</span>
        </a>
        <p className="app-tagline">{t('app.tagline')}</p>
        <LanguageSelector />
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<CreatePoll />} />
          <Route path="/vote/:pollId" element={<VotePage />} />
          <Route path="/admin/:adminId" element={<AdminPage />} />
        </Routes>
      </main>
      <footer className="app-footer">
        <p>{t('app.footer')}</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </I18nProvider>
  );
}
