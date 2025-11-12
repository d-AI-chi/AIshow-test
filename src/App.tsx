import { useState, useEffect } from 'react';
import { LandingPage } from './pages/LandingPage';
import { SurveyPage } from './pages/SurveyPage';
import { WaitingPage } from './pages/WaitingPage';
import { ResultsPage } from './pages/ResultsPage';
import { AdminPage } from './pages/AdminPage';

type AppState = 'landing' | 'survey' | 'waiting' | 'results' | 'admin';

function App() {
  const [state, setState] = useState<AppState>('landing');
  const [eventId, setEventId] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/admin') {
      setState('admin');
    }
  }, []);

  const handleJoinEvent = (newEventId: string, newParticipantId: string) => {
    setEventId(newEventId);
    setParticipantId(newParticipantId);
    setState('survey');
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
    return <LandingPage onJoinEvent={handleJoinEvent} />;
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

  return <LandingPage onJoinEvent={handleJoinEvent} />;
}

export default App;
