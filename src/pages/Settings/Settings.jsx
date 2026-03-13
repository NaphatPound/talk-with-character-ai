import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../../store/store';
import { checkConnection, listModels } from '../../services/ollamaService';
import './Settings.css';

export default function Settings() {
    const [settings, setSettings] = useState(getSettings());
    const [status, setStatus] = useState({ type: '', message: '' });
    const [models, setModels] = useState([]);
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        testAndLoad();
    }, []);

    async function testAndLoad() {
        setTesting(true);
        setStatus({ type: '', message: '' });
        try {
            const result = await checkConnection();
            if (result.connected) {
                setStatus({ type: 'success', message: '✅ Connected to Ollama successfully' });
                const m = await listModels();
                setModels(m);
                // Auto-select first model if none selected
                if (!settings.defaultModel && m.length > 0) {
                    handleChange('defaultModel', m[0].name);
                }
            } else {
                setStatus({ type: 'error', message: `❌ Cannot connect: ${result.message}` });
                setModels([]);
            }
        } catch (err) {
            setStatus({ type: 'error', message: `❌ Error: ${err.message}` });
            setModels([]);
        }
        setTesting(false);
    }

    function handleChange(key, value) {
        const updated = updateSettings({ [key]: value });
        setSettings(updated);
    }

    async function handleTestConnection() {
        await testAndLoad();
    }

    return (
        <div className="page settings-page">
            <div className="page-header">
                <h1 className="page-title">⚙️ Settings</h1>
                <p className="page-subtitle">Configure your Ollama AI integration</p>
            </div>

            <div className="glass-card settings-section">
                <h3>🔗 Ollama Connection</h3>
                <p className="text-muted-sm" style={{ marginBottom: '16px' }}>
                    Connect to your local Ollama instance to power the AI conversations.
                </p>

                <div className="form-group">
                    <label className="form-label">API URL</label>
                    <div className="input-with-action">
                        <input
                            type="url"
                            value={settings.ollamaUrl}
                            onChange={(e) => handleChange('ollamaUrl', e.target.value)}
                            placeholder="http://localhost:11434"
                        />
                        <button
                            className="btn btn-primary"
                            onClick={handleTestConnection}
                            disabled={testing}
                        >
                            {testing ? '⏳ Testing...' : '🔍 Test Connection'}
                        </button>
                    </div>
                    {status.message && (
                        <div className={`status-message ${status.type}`}>
                            {status.message}
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label className="form-label">Default Model</label>
                    <select
                        value={settings.defaultModel}
                        onChange={(e) => handleChange('defaultModel', e.target.value)}
                    >
                        <option value="">Select a model...</option>
                        {models.map((m) => (
                            <option key={m.name} value={m.name}>
                                {m.name} {(m.size ? `(${(m.size / 1e9).toFixed(1)}GB)` : '')}
                            </option>
                        ))}
                    </select>
                    {models.length === 0 && (
                        <p className="text-muted-sm" style={{ marginTop: '8px' }}>
                            No models found. Make sure Ollama is running and you have pulled a model (e.g., <code>ollama pull llama3.2</code>).
                        </p>
                    )}
                </div>
            </div>

            <div className="glass-card settings-section">
                <h3>📘 How to Connect</h3>
                <div className="how-to-steps">
                    <div className="how-to-step">
                        <span className="step-number">1</span>
                        <div>
                            <strong>Install Ollama</strong>
                            <p>Visit <a href="https://ollama.com" target="_blank" rel="noopener noreferrer">ollama.com</a> and install the application for your OS.</p>
                        </div>
                    </div>
                    <div className="how-to-step">
                        <span className="step-number">2</span>
                        <div>
                            <strong>Start the Server</strong>
                            <p>Run <code>ollama serve</code> in your terminal/command prompt to make the API available.</p>
                        </div>
                    </div>
                    <div className="how-to-step">
                        <span className="step-number">3</span>
                        <div>
                            <strong>Pull a Model</strong>
                            <p>Run <code>ollama pull llama3.2</code> (or another model) to download an AI model for chatting.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-card settings-section">
                <h3>ℹ️ About StoryAI</h3>
                <p className="text-muted-sm">
                    StoryAI is an interactive story novel platform inspired by <a href="https://www.joylada.com" target="_blank" rel="noopener noreferrer">Joylada</a>.
                    Create characters, write chat-style stories, and have AI-powered conversations.
                </p>
                <p className="text-muted-sm" style={{ marginTop: '8px' }}>
                    Version 1.0.0 • Built with React + Vite + Ollama
                </p>
            </div>
        </div>
    );
}
