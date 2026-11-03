import React from 'react';
import { createRoot } from 'react-dom/client';
import TeamWorkspace from '../src/TeamWorkspace';
import '../src/styles.css';
import '../src/black-gold-theme.css';

// Only loaded by Playwright's local dev-server tests, never the production entry.
createRoot(document.getElementById('root')).render(<TeamWorkspace config={{ url: 'https://teamhub-test.supabase.co', publishableKey: 'sb_publishable_test_only' }} onDemo={() => { location.href = '/'; }}/>);
