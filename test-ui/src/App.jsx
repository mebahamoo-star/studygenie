import { useState } from 'react';
import { javaApi, aiApi } from './api';

export default function App() {
  const [currentView, setCurrentView] = useState('auth');

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow border border-gray-200">
        <header className="flex justify-between items-center mb-8 border-b pb-4">
          <h1 className="text-2xl font-bold text-blue-600">StudyGenie Test UI</h1>
          <nav className="space-x-4">
            <button onClick={() => setCurrentView('auth')} className="text-gray-600 hover:text-blue-600 font-medium">Auth</button>
            <button onClick={() => setCurrentView('syllabus')} className="text-gray-600 hover:text-blue-600 font-medium">Syllabus</button>
            <button onClick={() => setCurrentView('planner')} className="text-gray-600 hover:text-blue-600 font-medium">Planner</button>
          </nav>
        </header>

        {currentView === 'auth' && <AuthView />}
        {currentView === 'syllabus' && <SyllabusView />}
        {currentView === 'planner' && <PlannerView />}
      </div>
    </div>
  );
}

function AuthView() {
  const [email, setEmail] = useState('student@studygenie.local');
  const [password, setPassword] = useState('Password123!');
  const [log, setLog] = useState('');

  const handleAction = async (e, action) => {
    e.preventDefault();
    setLog(`${action === 'login' ? 'Logging in' : 'Registering'}...`);
    try {
      const endpoint = action === 'login' ? '/auth/login' : '/auth/register';
      const body = action === 'login' ? { email, password } : { email, password, name: "Test Student" };
      
      const data = await javaApi.post(endpoint, body);
      
      if (action === 'login' && data.accessToken) {
        localStorage.setItem('jwt', data.accessToken);
      }
      setLog(`SUCCESS:\n\n${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      setLog(`ERROR: ${err.message || 'Failed'}\n\n${JSON.stringify(err.errors || err, null, 2)}`);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Auth Test (Spring Boot)</h2>
      <form className="space-y-4 mb-4 max-w-sm">
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="block w-full border p-2 rounded bg-gray-50 focus:ring-2 focus:ring-blue-500" placeholder="Email" />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="block w-full border p-2 rounded bg-gray-50 focus:ring-2 focus:ring-blue-500" placeholder="Password" />
        <div className="flex space-x-2">
          <button onClick={(e) => handleAction(e, 'login')} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Login</button>
          <button onClick={(e) => handleAction(e, 'register')} className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300">Register</button>
        </div>
      </form>
      <pre className="bg-gray-100 p-4 rounded text-sm text-gray-800 overflow-x-auto h-48 whitespace-pre-wrap border">{log}</pre>
    </div>
  );
}

function SyllabusView() {
  const [file, setFile] = useState(null);
  const [log, setLog] = useState('');

  const handleUpload = async () => {
    if (!file) return setLog('Please select a PDF file first.');
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setLog('Uploading PDF to AI Engine...');
      const data = await aiApi.post('/parse-syllabus', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setLog(`SUCCESS (Topics Extracted):\n\n${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      setLog(`ERROR: ${err.message || 'Upload Failed'}\n\n${JSON.stringify(err.errors || err, null, 2)}`);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Syllabus PDF Parser (FastAPI)</h2>
      <div className="space-y-4 mb-4">
        <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files[0])} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700" />
        <button onClick={handleUpload} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Upload & Parse</button>
      </div>
      <pre className="bg-gray-100 p-4 rounded text-sm text-gray-800 overflow-x-auto h-64 whitespace-pre-wrap border">{log}</pre>
    </div>
  );
}

function PlannerView() {
  const [mode, setMode] = useState('NORMAL');
  const [log, setLog] = useState('');

  const handleGenerate = async () => {
    try {
      setLog(`Running deterministic planner algorithm in ${mode} mode...`);
      const payload = {
        start_date: "2024-10-01",
        exam_date: "2024-10-14",
        daily_hours: 2.0,
        mode: mode,
        topics: [
          { ref: "T1", chapter_title: "Chapter 1: Intro", order_index: 1, estimated_hours: 2, importance: 3 },
          { ref: "T2", chapter_title: "Chapter 2: Variables", order_index: 2, estimated_hours: 4, importance: 4 },
          { ref: "T3", chapter_title: "Chapter 3: Advanced Pointers", order_index: 3, estimated_hours: 8, importance: 5 }
        ]
      };
      
      const data = await aiApi.post('/generate-plan', payload);
      setLog(`SUCCESS (Plan Generated):\n\n${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      setLog(`ERROR: ${err.message || 'Generation Failed'}\n\n${JSON.stringify(err.errors || err, null, 2)}`);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Study Planner (FastAPI)</h2>
      <div className="flex items-center space-x-4 mb-4">
        <select value={mode} onChange={e => setMode(e.target.value)} className="border p-2 rounded bg-gray-50 focus:ring-2 focus:ring-blue-500">
          <option value="NORMAL">NORMAL (Spaced Repetition)</option>
          <option value="SURVIVAL">SURVIVAL (Cramming Mode)</option>
        </select>
        <button onClick={handleGenerate} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Generate Plan</button>
      </div>
      <p className="text-sm text-gray-500 mb-4">Simulates 3 topics (14 hours total) across a 14-day study window.</p>
      <pre className="bg-gray-100 p-4 rounded text-sm text-gray-800 overflow-x-auto h-64 whitespace-pre-wrap border">{log}</pre>
    </div>
  );
}
