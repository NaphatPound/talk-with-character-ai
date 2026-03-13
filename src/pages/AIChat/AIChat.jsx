import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import ChatBubble from '../../components/ChatBubble/ChatBubble';
import { getCharacters, getCharacter, getChatHistory, saveChatHistory, clearChatHistory, getSettings } from '../../store/store';
import { chat as ollamaChat, listModels, buildSystemPrompt, checkConnection } from '../../services/ollamaService';
import './AIChat.css';

export default function AIChat() {
    const [searchParams] = useSearchParams();
    const preselectedId = searchParams.get('character');

    const [characters, setCharacters] = useState([]);
    const [selectedCharId, setSelectedCharId] = useState(preselectedId || '');
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [connected, setConnected] = useState(null);

    // Speech states
    const [isAutoSpeakEnabled, setIsAutoSpeakEnabled] = useState(false);
    const [isListening, setIsListening] = useState(false);

    const chatEndRef = useRef(null);
    const abortRef = useRef(null);
    const recognitionRef = useRef(null);

    useEffect(() => {
        setCharacters(getCharacters());
        loadModels();
    }, []);

    useEffect(() => {
        if (selectedCharId) {
            const history = getChatHistory(selectedCharId);
            setMessages(history);
        }
    }, [selectedCharId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingText]);

    // Cleanup speech synthesis on unmount
    useEffect(() => {
        return () => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    async function loadModels() {
        try {
            const status = await checkConnection();
            setConnected(status.connected);
            if (status.connected) {
                const m = await listModels();
                setModels(m);
                const settings = getSettings();
                if (settings.defaultModel) {
                    setSelectedModel(settings.defaultModel);
                } else if (m.length > 0) {
                    setSelectedModel(m[0].name);
                }
            }
        } catch {
            setConnected(false);
        }
    }

    async function handleSend() {
        if (!input.trim() || !selectedCharId || !selectedModel || isLoading) return;

        const character = getCharacter(selectedCharId);
        if (!character) return;

        const userMessage = { role: 'user', content: input.trim() };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);
        setStreamingText('');

        try {
            const systemPrompt = buildSystemPrompt(character);
            const apiMessages = [
                { role: 'system', content: systemPrompt },
                ...newMessages,
            ];

            abortRef.current = new AbortController();

            const fullResponse = await ollamaChat(
                selectedModel,
                apiMessages,
                (token, full) => setStreamingText(full),
                abortRef.current.signal
            );

            const assistantMessage = { role: 'assistant', content: fullResponse };
            const updatedMessages = [...newMessages, assistantMessage];
            setMessages(updatedMessages);
            saveChatHistory(selectedCharId, updatedMessages);
            setStreamingText('');

            // Speak the response if enabled
            if (isAutoSpeakEnabled && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel(); // Cancel any ongoing speech
                const utterance = new SpeechSynthesisUtterance(fullResponse);

                // Detect Thai characters in the response to set the correct language voice
                const hasThai = /[\u0E00-\u0E7F]/.test(fullResponse);
                if (hasThai) {
                    utterance.lang = 'th-TH';
                } else {
                    utterance.lang = 'en-US'; // Fallback to English
                }

                window.speechSynthesis.speak(utterance);
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                const errorMessage = { role: 'assistant', content: `⚠️ Error: ${err.message}` };
                setMessages([...newMessages, errorMessage]);
            }
        } finally {
            setIsLoading(false);
            setStreamingText('');
            abortRef.current = null;
        }
    }

    function handleNewChat() {
        if (selectedCharId) {
            clearChatHistory(selectedCharId);
            setMessages([]);
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        }
    }

    function handleStop() {
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }

    function toggleListening() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition is not supported in your browser.");
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'th-TH'; // Support Thai speech-to-text

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            setIsListening(false);
        };
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInput((prev) => prev + (prev ? ' ' : '') + transcript);
        };

        recognitionRef.current = recognition;
        recognition.start();
    }

    const selectedChar = characters.find((c) => c.id === selectedCharId);

    return (
        <div className="ai-chat-page">
            {/* Sidebar */}
            <div className="chat-sidebar glass-card">
                <h3 className="sidebar-title">🤖 AI Chat</h3>

                {/* Connection Status */}
                <div className={`connection-status ${connected === true ? 'online' : connected === false ? 'offline' : 'checking'}`}>
                    <span className="status-dot"></span>
                    {connected === true ? 'Connected to Ollama' : connected === false ? 'Disconnected' : 'Checking...'}
                </div>

                {/* Model Selector */}
                <div className="form-group">
                    <label className="form-label">Model</label>
                    <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
                        {models.length === 0 && <option value="">No models available</option>}
                        {models.map((m) => (
                            <option key={m.name} value={m.name}>{m.name}</option>
                        ))}
                    </select>
                </div>

                {/* Auto-Speak Toggle */}
                <div className="auto-speak-toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                    <label className="switch">
                        <input
                            type="checkbox"
                            checked={isAutoSpeakEnabled}
                            onChange={(e) => {
                                setIsAutoSpeakEnabled(e.target.checked);
                                if (!e.target.checked && 'speechSynthesis' in window) {
                                    window.speechSynthesis.cancel();
                                }
                            }}
                        />
                        <span className="slider round"></span>
                    </label>
                    <span className="text-muted-sm">🔊 Auto-Speak Replies</span>
                </div>

                {/* Character Selector */}
                <div className="form-group">
                    <label className="form-label">Character</label>
                    <div className="character-list">
                        {characters.length === 0 ? (
                            <p className="text-muted-sm">No characters. Create one first!</p>
                        ) : (
                            characters.map((c) => (
                                <button
                                    key={c.id}
                                    className={`character-select-item ${selectedCharId === c.id ? 'active' : ''}`}
                                    onClick={() => setSelectedCharId(c.id)}
                                >
                                    <div className="character-select-avatar">
                                        {c.avatar ? (
                                            <img src={c.avatar} alt={c.name} />
                                        ) : (
                                            <span>{c.name?.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div className="character-select-info">
                                        <span className="character-select-name">{c.name}</span>
                                        <span className="character-select-voice">{c.voiceStyle}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <button className="btn btn-secondary btn-sm" onClick={handleNewChat} style={{ width: '100%' }}>
                    🔄 New Conversation
                </button>
            </div>

            {/* Chat Area */}
            <div className="chat-main">
                {!selectedCharId ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">💬</div>
                        <h3 className="empty-state-title">Select a Character</h3>
                        <p className="empty-state-text">Choose a character from the sidebar to start chatting</p>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div className="chat-header">
                            <div className="chat-header-avatar">
                                {selectedChar?.avatar ? (
                                    <img src={selectedChar.avatar} alt={selectedChar.name} className="avatar" />
                                ) : (
                                    <div className="avatar avatar-placeholder">{selectedChar?.name?.charAt(0)}</div>
                                )}
                            </div>
                            <div>
                                <div className="chat-header-name">{selectedChar?.name}</div>
                                <div className="chat-header-status">
                                    {isLoading ? 'Typing...' : selectedChar?.voiceStyle || 'Online'}
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="chat-messages">
                            {messages.length === 0 && (
                                <div className="chat-welcome">
                                    <p>Start a conversation with <strong>{selectedChar?.name}</strong>!</p>
                                    <p className="text-muted-sm">They will respond in character based on their personality.</p>
                                </div>
                            )}

                            {messages.map((msg, i) => (
                                <ChatBubble
                                    key={i}
                                    message={msg.content}
                                    character={msg.role === 'assistant' ? selectedChar : { name: 'You' }}
                                    align={msg.role === 'user' ? 'right' : 'left'}
                                />
                            ))}

                            {streamingText && (
                                <ChatBubble
                                    message={streamingText}
                                    character={selectedChar}
                                    align="left"
                                />
                            )}

                            {isLoading && !streamingText && (
                                <div className="typing-indicator">
                                    <span></span><span></span><span></span>
                                </div>
                            )}

                            <div ref={chatEndRef}></div>
                        </div>

                        {/* Input */}
                        <div className="chat-input-area">
                            <button
                                className={`btn microphone-btn ${isListening ? 'listening' : ''}`}
                                onClick={toggleListening}
                                disabled={!connected || isLoading}
                                title="Speech to Text"
                            >
                                {isListening ? '🛑' : '🎤'}
                            </button>
                            <input
                                type="text"
                                placeholder={connected ? (isListening ? 'Listening...' : 'Type a message...') : 'Connect to Ollama first (Settings)'}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                                disabled={!connected || isLoading}
                            />
                            {isLoading ? (
                                <button className="btn btn-secondary" onClick={handleStop}>⏹ Stop</button>
                            ) : (
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSend}
                                    disabled={!input.trim() || !connected}
                                >
                                    Send ↑
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
