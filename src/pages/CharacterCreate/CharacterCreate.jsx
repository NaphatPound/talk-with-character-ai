import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCharacter, saveCharacter, generateId, GENRES, VOICE_STYLES, getSettings } from '../../store/store';
import { generateCharacter } from '../../services/ollamaService';
import './CharacterCreate.css';

export default function CharacterCreate() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = Boolean(id);

    const [form, setForm] = useState({
        name: '',
        avatar: '',
        personality: '',
        backstory: '',
        voiceStyle: '',
        genres: [],
    });

    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiError, setAiError] = useState('');

    useEffect(() => {
        if (id) {
            const existing = getCharacter(id);
            if (existing) {
                setForm({
                    name: existing.name || '',
                    avatar: existing.avatar || '',
                    personality: existing.personality || '',
                    backstory: existing.backstory || '',
                    voiceStyle: existing.voiceStyle || '',
                    genres: existing.genres || [],
                });
            }
        }
    }, [id]);

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

    async function handleAutoCreate(e) {
        e.preventDefault();
        if (!aiPrompt.trim()) return;

        setIsGenerating(true);
        setAiError('');

        try {
            const settings = getSettings();
            if (!settings.defaultModel) {
                throw new Error("No Ollama model selected. Please select a model in Settings first.");
            }

            const charData = await generateCharacter(settings.defaultModel, aiPrompt);

            // Merge generated data with existing form (preserving avatar if any)
            setForm(prev => ({
                ...prev,
                name: charData.name || prev.name,
                personality: charData.personality || prev.personality,
                backstory: charData.backstory || prev.backstory,
                voiceStyle: charData.voiceStyle || prev.voiceStyle,
                genres: Array.isArray(charData.genres) ? charData.genres : prev.genres,
            }));

            setIsAiModalOpen(false);
            setAiPrompt('');
        } catch (err) {
            setAiError(err.message);
        } finally {
            setIsGenerating(false);
        }
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (!form.name.trim()) return;

        saveCharacter({
            ...form,
            id: id || generateId(),
        });

        navigate('/characters');
    }

    return (
        <div className="page character-create-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">{isEditing ? '✏️ Edit Character' : '✨ Create Character'}</h1>
                    <p className="page-subtitle">
                        {isEditing ? 'Update your character\'s details' : 'Bring your character to life with a unique personality'}
                    </p>
                </div>
                {!isEditing && (
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setIsAiModalOpen(true)}
                        style={{ marginTop: '8px' }}
                    >
                        ✨ AI Auto-Create
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="character-form glass-card">
                <div className="character-form-layout">
                    {/* Avatar Preview */}
                    <div className="avatar-preview-section">
                        <div className="avatar-preview-large">
                            {form.avatar ? (
                                <img src={form.avatar} alt="Avatar" />
                            ) : (
                                <div className="avatar-preview-placeholder">
                                    {form.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                            )}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Avatar URL</label>
                            <input
                                type="url"
                                name="avatar"
                                placeholder="https://example.com/avatar.jpg"
                                value={form.avatar}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {/* Details */}
                    <div className="character-form-details">
                        <div className="form-group">
                            <label className="form-label">Character Name *</label>
                            <input
                                type="text"
                                name="name"
                                placeholder="e.g. Luna Nightshade"
                                value={form.name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Voice Style</label>
                            <select name="voiceStyle" value={form.voiceStyle} onChange={handleChange}>
                                <option value="">Select a voice style...</option>
                                {VOICE_STYLES.map((v) => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Personality</label>
                            <textarea
                                name="personality"
                                placeholder="Describe their personality traits, speaking quirks, mannerisms..."
                                value={form.personality}
                                onChange={handleChange}
                                rows={4}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Backstory</label>
                            <textarea
                                name="backstory"
                                placeholder="Their history, motivations, secrets..."
                                value={form.backstory}
                                onChange={handleChange}
                                rows={4}
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

                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary btn-lg">
                                {isEditing ? '💾 Save Changes' : '✨ Create Character'}
                            </button>
                            <button type="button" className="btn btn-ghost btn-lg" onClick={() => navigate(-1)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            {/* AI Auto-Create Modal */}
            {isAiModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content glass-card ai-create-modal">
                        <h3>✨ AI Auto-Create</h3>
                        <p className="text-muted-sm" style={{ marginBottom: '16px' }}>
                            Describe the character you want, and AI will generate their name, personality, backstory, and genres.
                        </p>
                        <form onSubmit={handleAutoCreate}>
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder="e.g., A grumpy old wizard who secretly loves rescuing stray cats, but pretends to hate everyone."
                                rows={4}
                                disabled={isGenerating}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--bg-dark)' }}
                            />
                            {aiError && (
                                <div className="status-message error" style={{ marginTop: '12px' }}>
                                    {aiError}
                                </div>
                            )}
                            <div className="form-actions" style={{ justifyContent: 'flex-end', marginTop: '16px' }}>
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => setIsAiModalOpen(false)}
                                    disabled={isGenerating}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isGenerating || !aiPrompt.trim()}
                                >
                                    {isGenerating ? '⏳ Generating...' : '🚀 Generate'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
