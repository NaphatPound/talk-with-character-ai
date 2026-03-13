import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getStory, getCharacters, saveStory, generateId, GENRES, getSettings } from '../../store/store';
import { generateStoryDialogues, listModels, checkConnection } from '../../services/ollamaService';
import './StoryCreate.css';

export default function StoryCreate() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = Boolean(id);

    const [allCharacters, setAllCharacters] = useState([]);
    const [form, setForm] = useState({
        title: '',
        cover: '',
        description: '',
        genres: [],
        characterIds: [],
        chapters: [{ title: 'Chapter 1', dialogues: [] }],
    });
    const [activeChapter, setActiveChapter] = useState(0);
    const [newDialogue, setNewDialogue] = useState({ characterId: '', text: '', isNarration: false });

    // AI Generation State
    const [showAIPanel, setShowAIPanel] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiDialogueCount, setAiDialogueCount] = useState(10);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiProgress, setAiProgress] = useState('');
    const [aiError, setAiError] = useState('');
    const [aiPreview, setAiPreview] = useState([]);
    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [ollamaConnected, setOllamaConnected] = useState(null);
    const abortRef = useRef(null);

    useEffect(() => {
        setAllCharacters(getCharacters());
        if (id) {
            const existing = getStory(id);
            if (existing) setForm(existing);
        }
        loadOllama();
    }, [id]);

    async function loadOllama() {
        try {
            const status = await checkConnection();
            setOllamaConnected(status.connected);
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
            setOllamaConnected(false);
        }
    }

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    function toggleGenre(genre) {
        setForm((prev) => ({
            ...prev,
            genres: prev.genres.includes(genre)
                ? prev.genres.filter((g) => g !== genre)
                : [...prev.genres, genre],
        }));
    }

    function toggleCharacter(charId) {
        setForm((prev) => ({
            ...prev,
            characterIds: prev.characterIds.includes(charId)
                ? prev.characterIds.filter((c) => c !== charId)
                : [...prev.characterIds, charId],
        }));
    }

    function addChapter() {
        setForm((prev) => ({
            ...prev,
            chapters: [...prev.chapters, { title: `Chapter ${prev.chapters.length + 1}`, dialogues: [] }],
        }));
        setActiveChapter(form.chapters.length);
    }

    function addDialogue() {
        if (!newDialogue.text.trim()) return;
        const chapters = [...form.chapters];
        chapters[activeChapter].dialogues.push({ ...newDialogue, id: generateId() });
        setForm({ ...form, chapters });
        setNewDialogue({ characterId: newDialogue.characterId, text: '', isNarration: false });
    }

    function removeDialogue(dialogueId) {
        const chapters = [...form.chapters];
        chapters[activeChapter].dialogues = chapters[activeChapter].dialogues.filter(
            (d) => d.id !== dialogueId
        );
        setForm({ ...form, chapters });
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (!form.title.trim()) return;
        saveStory({ ...form, id: id || generateId() });
        navigate('/stories');
    }

    // ── AI Generation ────────────────────

    async function handleAIGenerate() {
        if (!aiPrompt.trim() || !selectedModel || selectedCharacters.length === 0) return;

        setAiGenerating(true);
        setAiError('');
        setAiPreview([]);
        setAiProgress('🔄 Preparing...');

        abortRef.current = new AbortController();

        try {
            const dialogues = await generateStoryDialogues(
                selectedModel,
                selectedCharacters,
                aiPrompt,
                form.title,
                form.description,
                currentChapter?.dialogues || [],
                aiDialogueCount,
                (status) => setAiProgress(status),
                abortRef.current.signal
            );

            setAiPreview(dialogues);
            setAiProgress(`✅ Generated ${dialogues.length} dialogues!`);
        } catch (err) {
            if (err.name !== 'AbortError') {
                setAiError(err.message);
                setAiProgress('');
            }
        } finally {
            setAiGenerating(false);
        }
    }

    function handleStopGeneration() {
        abortRef.current?.abort();
        setAiGenerating(false);
        setAiProgress('⏹ Stopped');
    }

    function handleAcceptAI() {
        if (aiPreview.length === 0) return;
        const chapters = [...form.chapters];
        const newDialogues = aiPreview.map((d) => ({
            ...d,
            id: generateId(),
        }));
        chapters[activeChapter].dialogues = [
            ...chapters[activeChapter].dialogues,
            ...newDialogues,
        ];
        setForm({ ...form, chapters });
        setAiPreview([]);
        setAiProgress('');
        setShowAIPanel(false);
        setAiPrompt('');
    }

    function handleRegenerateAI() {
        setAiPreview([]);
        handleAIGenerate();
    }

    const selectedCharacters = allCharacters.filter((c) => form.characterIds.includes(c.id));
    const currentChapter = form.chapters[activeChapter];

    return (
        <div className="page story-create-page">
            <div className="page-header">
                <h1 className="page-title">{isEditing ? '✏️ Edit Story' : '📖 Create Story'}</h1>
                <p className="page-subtitle">Write an interactive chat-style story</p>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Story Details */}
                <div className="glass-card story-section">
                    <h3>📋 Story Details</h3>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Title *</label>
                            <input
                                type="text"
                                name="title"
                                placeholder="My Amazing Story"
                                value={form.title}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Cover Image URL</label>
                            <input
                                type="url"
                                name="cover"
                                placeholder="https://example.com/cover.jpg"
                                value={form.cover}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Synopsis</label>
                        <textarea
                            name="description"
                            placeholder="A brief description of your story..."
                            value={form.description}
                            onChange={handleChange}
                            rows={3}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Genres</label>
                        <div className="genre-chips">
                            {GENRES.map((g) => (
                                <button
                                    key={g}
                                    type="button"
                                    className={`chip ${form.genres.includes(g) ? 'active' : ''}`}
                                    onClick={() => toggleGenre(g)}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Characters */}
                <div className="glass-card story-section">
                    <h3>👥 Characters</h3>
                    {allCharacters.length === 0 ? (
                        <p className="text-muted">No characters created yet. <a href="/characters/create">Create one first!</a></p>
                    ) : (
                        <div className="character-picker">
                            {allCharacters.map((char) => (
                                <button
                                    key={char.id}
                                    type="button"
                                    className={`character-pick ${form.characterIds.includes(char.id) ? 'selected' : ''}`}
                                    onClick={() => toggleCharacter(char.id)}
                                >
                                    <div className="character-pick-avatar">
                                        {char.avatar ? (
                                            <img src={char.avatar} alt={char.name} />
                                        ) : (
                                            <span>{char.name?.charAt(0)}</span>
                                        )}
                                    </div>
                                    <span className="character-pick-name">{char.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Chapter Editor */}
                <div className="glass-card story-section">
                    <div className="chapter-header">
                        <h3>💬 Chapters</h3>
                        <div className="chapter-header-actions">
                            <button
                                type="button"
                                className={`btn btn-sm ${showAIPanel ? 'btn-primary' : 'btn-accent'}`}
                                onClick={() => setShowAIPanel(!showAIPanel)}
                                title="Auto-generate story dialogues with AI"
                            >
                                🤖 AI Generate
                            </button>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={addChapter}>
                                + Add Chapter
                            </button>
                        </div>
                    </div>

                    {/* ── AI Generation Panel ── */}
                    {showAIPanel && (
                        <div className="ai-panel animate-slideInUp">
                            <div className="ai-panel-header">
                                <h4>🤖 AI Story Generator</h4>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAIPanel(false)}>✕</button>
                            </div>

                            {/* Connection Status */}
                            {ollamaConnected === false && (
                                <div className="ai-warning">
                                    ⚠️ Ollama is not connected. Go to <a href="/settings">Settings</a> to configure.
                                </div>
                            )}

                            {ollamaConnected && (
                                <>
                                    {/* Model Selection */}
                                    <div className="ai-panel-row">
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label className="form-label">Model</label>
                                            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
                                                {models.map((m) => (
                                                    <option key={m.name} value={m.name}>{m.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group" style={{ width: 120 }}>
                                            <label className="form-label">Lines (~)</label>
                                            <input
                                                type="number"
                                                min={3}
                                                max={50}
                                                value={aiDialogueCount}
                                                onChange={(e) => setAiDialogueCount(Number(e.target.value))}
                                            />
                                        </div>
                                    </div>

                                    {/* Scene Prompt */}
                                    <div className="form-group">
                                        <label className="form-label">Scene / Story Instruction</label>
                                        <textarea
                                            placeholder="Describe the scene you want AI to write... e.g. 'Opening scene: Luna discovers a mysterious glowing book in the abandoned library at midnight'"
                                            value={aiPrompt}
                                            onChange={(e) => setAiPrompt(e.target.value)}
                                            rows={3}
                                            disabled={aiGenerating}
                                        />
                                    </div>

                                    {/* Characters info */}
                                    {selectedCharacters.length === 0 && (
                                        <div className="ai-warning">⚠️ Select at least one character above to use AI generation.</div>
                                    )}
                                    {selectedCharacters.length > 0 && (
                                        <div className="ai-characters-info">
                                            <span>Characters:</span>
                                            {selectedCharacters.map((c) => (
                                                <span key={c.id} className="chip chip-sm">{c.name}</span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Generate Button */}
                                    <div className="ai-actions">
                                        {!aiGenerating ? (
                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                onClick={handleAIGenerate}
                                                disabled={!aiPrompt.trim() || selectedCharacters.length === 0}
                                            >
                                                ✨ Generate Story
                                            </button>
                                        ) : (
                                            <button type="button" className="btn btn-secondary" onClick={handleStopGeneration}>
                                                ⏹ Stop
                                            </button>
                                        )}
                                    </div>

                                    {/* Progress */}
                                    {aiProgress && (
                                        <div className="ai-progress">
                                            {aiGenerating && <span className="ai-spinner"></span>}
                                            <span>{aiProgress}</span>
                                        </div>
                                    )}

                                    {/* Error */}
                                    {aiError && (
                                        <div className="ai-error">
                                            <strong>Error:</strong> {aiError}
                                        </div>
                                    )}

                                    {/* Preview */}
                                    {aiPreview.length > 0 && (
                                        <div className="ai-preview">
                                            <div className="ai-preview-header">
                                                <h5>📝 Preview ({aiPreview.length} lines)</h5>
                                                <div className="ai-preview-actions">
                                                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleRegenerateAI}>
                                                        🔄 Regenerate
                                                    </button>
                                                    <button type="button" className="btn btn-primary btn-sm" onClick={handleAcceptAI}>
                                                        ✅ Accept & Add
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="ai-preview-list">
                                                {aiPreview.map((d, i) => {
                                                    const char = allCharacters.find((c) => c.id === d.characterId);
                                                    return (
                                                        <div key={i} className={`ai-preview-item ${d.isNarration ? 'narration' : ''}`}>
                                                            {d.isNarration ? (
                                                                <em className="ai-preview-narration">{d.text}</em>
                                                            ) : (
                                                                <div>
                                                                    <span className="dialogue-char-name">{char?.name || 'Character'}:</span>
                                                                    <span>{d.text}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    <div className="chapter-tabs">
                        {form.chapters.map((ch, i) => (
                            <button
                                key={i}
                                type="button"
                                className={`chip ${activeChapter === i ? 'active' : ''}`}
                                onClick={() => setActiveChapter(i)}
                            >
                                {ch.title}
                            </button>
                        ))}
                    </div>

                    {/* Dialogue List */}
                    <div className="dialogue-list">
                        {currentChapter?.dialogues?.map((d) => {
                            const char = allCharacters.find((c) => c.id === d.characterId);
                            return (
                                <div key={d.id} className={`dialogue-item ${d.isNarration ? 'narration' : ''}`}>
                                    {d.isNarration ? (
                                        <div className="dialogue-narration">
                                            <em>{d.text}</em>
                                        </div>
                                    ) : (
                                        <div className="dialogue-message">
                                            <span className="dialogue-char-name">{char?.name || 'Unknown'}:</span>
                                            <span>{d.text}</span>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        className="dialogue-remove"
                                        onClick={() => removeDialogue(d.id)}
                                    >
                                        ✕
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Add Dialogue */}
                    <div className="add-dialogue">
                        <div className="add-dialogue-controls">
                            <label className="narration-toggle">
                                <input
                                    type="checkbox"
                                    checked={newDialogue.isNarration}
                                    onChange={(e) => setNewDialogue({ ...newDialogue, isNarration: e.target.checked })}
                                />
                                <span>Narration</span>
                            </label>
                            {!newDialogue.isNarration && (
                                <select
                                    value={newDialogue.characterId}
                                    onChange={(e) => setNewDialogue({ ...newDialogue, characterId: e.target.value })}
                                >
                                    <option value="">Select character...</option>
                                    {selectedCharacters.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div className="add-dialogue-input">
                            <input
                                type="text"
                                placeholder={newDialogue.isNarration ? 'Write narration text...' : 'Write dialogue...'}
                                value={newDialogue.text}
                                onChange={(e) => setNewDialogue({ ...newDialogue, text: e.target.value })}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDialogue(); } }}
                            />
                            <button type="button" className="btn btn-primary" onClick={addDialogue}>Add</button>
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <div className="form-actions">
                    <button type="submit" className="btn btn-primary btn-lg">
                        {isEditing ? '💾 Save Changes' : '📖 Create Story'}
                    </button>
                    <button type="button" className="btn btn-ghost btn-lg" onClick={() => navigate(-1)}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
