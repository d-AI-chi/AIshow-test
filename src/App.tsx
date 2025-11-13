import { useState, useEffect } from 'react';
import { LandingPage } from './pages/LandingPage';
import { SurveyPage } from './pages/SurveyPage';
import { WaitingPage } from './pages/WaitingPage';
import { ResultsPage } from './pages/ResultsPage';
import { AdminPage } from './pages/AdminPage';
import { DisplayPage } from './pages/DisplayPage';

type AppState = 'landing' | 'survey' | 'waiting' | 'results' | 'admin' | 'display';

function App() {
  const [state, setState] = useState<AppState>('landing');
  const [eventId, setEventId] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/admin') {
      setState('admin');
    } else if (path.startsWith('/display/')) {
      const eventIdFromPath = path.split('/display/')[1];
      if (eventIdFromPath) {
        setEventId(eventIdFromPath);
        setState('display');
      }
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/admin') {
        setState('admin');
      } else if (path.startsWith('/display/')) {
        const eventIdFromPath = path.split('/display/')[1];
        if (eventIdFromPath) {
          setEventId(eventIdFromPath);
          setState('display');
        }
      } else if (state === 'admin' || state === 'display') {
        setState('landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [state]);

  const handleJoinEvent = (newEventId: string, newParticipantId: string) => {
    setEventId(newEventId);
    setParticipantId(newParticipantId);
    setState('survey');
  };

  const handleOpenAdmin = () => {
    setState('admin');
    if (window.location.pathname !== '/admin') {
      window.history.pushState(null, '', '/admin');
    }
  };

  const handleSurveyComplete = () => {
    setState('waiting');
  };

  const handleResultsReady = () => {
    setState('results');
  };

  if (state === 'admin') {
    return <AdminPage />;
  }

  if (state === 'landing') {
    return <LandingPage onJoinEvent={handleJoinEvent} onOpenAdmin={handleOpenAdmin} />;
  }

  if (state === 'survey' && eventId && participantId) {
    return (
      <SurveyPage
        eventId={eventId}
        participantId={participantId}
        onComplete={handleSurveyComplete}
      />
    );
  }

  if (state === 'waiting' && eventId) {
    return <WaitingPage eventId={eventId} onResultsReady={handleResultsReady} />;
  }

  if (state === 'results' && participantId) {
    return <ResultsPage participantId={participantId} />;
  }

  if (state === 'display' && eventId) {
    return <DisplayPage eventId={eventId} />;
  }

  return <LandingPage onJoinEvent={handleJoinEvent} onOpenAdmin={handleOpenAdmin} />;
}

export default App;
