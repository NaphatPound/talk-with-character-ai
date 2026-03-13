import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CharacterCard from '../../components/CharacterCard/CharacterCard';
import { getCharacters, deleteCharacter, saveCharacter, generateId, getSettings } from '../../store/store';
import { generateCharacter } from '../../services/ollamaService';
import './CharacterGallery.css';

export default function CharacterGallery() {
    const [characters, setCharacters] = useState([]);
    const [search, setSearch] = useState('');
    const [filterGenre, setFilterGenre] = useState('');

    // Batch Generation State
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [batchMode, setBatchMode] = useState('random'); // 'random' or 'prompts'
    const [randomCount, setRandomCount] = useState(5);
    const [promptsText, setPromptsText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [batchError, setBatchError] = useState('');

    useEffect(() => {
        setCharacters(getCharacters());
    }, []);

    function handleDelete(id) {
        if (window.confirm('Delete this character?')) {
            const updated = deleteCharacter(id);
            setCharacters(updated);
        }
    }

    async function handleBatchGenerate(e) {
        e.preventDefault();
        setBatchError('');

        const settings = getSettings();
        if (!settings.defaultModel) {
            setBatchError("No Ollama model selected. Please select a model in Settings first.");
            return;
        }

        let prompts = [];
        if (batchMode === 'random') {
            const count = Math.min(Math.max(parseInt(randomCount) || 1, 1), 20);
            for (let i = 0; i < count; i++) {
                prompts.push(`Create a completely random, highly unique, and interesting character. Make them different from typical tropes.`);
            }
        } else {
            prompts = promptsText.split('\n').map(p => p.trim()).filter(Boolean);
            if (prompts.length === 0) {
                setBatchError("Please enter at least one prompt.");
                return;
            }
            if (prompts.length > 20) {
                setBatchError("Maximum 20 prompts allowed at once.");
                return;
            }
        }

        setIsGenerating(true);
        setProgress({ current: 0, total: prompts.length });

        let currentChars = [...characters];

        for (let i = 0; i < prompts.length; i++) {
            try {
                const charData = await generateCharacter(settings.defaultModel, prompts[i]);
                const newChar = {
                    ...charData,
                    id: generateId(),
                    avatar: '' // Start without an avatar
                };
                saveCharacter(newChar);

                // Update local state list iteratively so user sees it grow
                currentChars = [newChar, ...currentChars];
                setCharacters(currentChars);
                setProgress({ current: i + 1, total: prompts.length });
            } catch (err) {
                console.error(`Error generating character ${i + 1}:`, err);
                // Continue to next prompt even if one fails
            }
        }

        setIsGenerating(false);
        setIsBatchModalOpen(false);
        setPromptsText('');
    }

    const filtered = characters.filter((c) => {
        const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
        const matchGenre = !filterGenre || c.genres?.includes(filterGenre);
        return matchSearch && matchGenre;
    });

    const allGenres = [...new Set(characters.flatMap((c) => c.genres || []))];

    return (
        <div className="page character-gallery-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">👥 Characters</h1>
                    <p className="page-subtitle">Your collection of AI-powered characters</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setIsBatchModalOpen(true)}
                    >
                        🎲 Batch Generate
                    </button>
                    <Link to="/characters/create" className="btn btn-primary">
                        ✨ Create Character
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="gallery-filters">
                <div className="search-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search characters..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                {allGenres.length > 0 && (
                    <div className="genre-filter">
                        <button
                            className={`chip ${!filterGenre ? 'active' : ''}`}
                            onClick={() => setFilterGenre('')}
                        >
                            All
                        </button>
                        {allGenres.map((g) => (
                            <button
                                key={g}
                                className={`chip ${filterGenre === g ? 'active' : ''}`}
                                onClick={() => setFilterGenre(g)}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Grid */}
            {filtered.length > 0 ? (
                <div className="grid grid-4">
                    {filtered.map((char) => (
                        <CharacterCard key={char.id} character={char} onDelete={handleDelete} />
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <div className="empty-state-icon">👥</div>
                    <h3 className="empty-state-title">No characters yet</h3>
                    <p className="empty-state-text">Create your first character to get started!</p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
                        <button className="btn btn-secondary btn-lg" onClick={() => setIsBatchModalOpen(true)}>
                            🎲 Batch Generate AI
                        </button>
                        <Link to="/characters/create" className="btn btn-primary btn-lg">
                            ✨ Manual Create
                        </Link>
                    </div>
                </div>
            )}

            {/* Batch Generation Modal */}
            {isBatchModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content glass-card batch-modal">
                        <h3>🎲 Batch Generate Characters</h3>
                        <p className="text-muted-sm" style={{ marginBottom: '16px' }}>
                            Automatically create multiple characters at once using AI.
                        </p>

                        <div className="batch-mode-toggle">
                            <button
                                type="button"
                                className={`batch-tab ${batchMode === 'random' ? 'active' : ''}`}
                                onClick={() => setBatchMode('random')}
                                disabled={isGenerating}
                            >
                                🎲 Random Spawns
                            </button>
                            <button
                                type="button"
                                className={`batch-tab ${batchMode === 'prompts' ? 'active' : ''}`}
                                onClick={() => setBatchMode('prompts')}
                                disabled={isGenerating}
                            >
                                📝 Custom Prompts
                            </button>
                        </div>

                        <form onSubmit={handleBatchGenerate}>
                            {batchMode === 'random' ? (
                                <div className="form-group" style={{ marginTop: '16px' }}>
                                    <label className="form-label">Number of Characters (1-20)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={randomCount}
                                        onChange={(e) => setRandomCount(e.target.value)}
                                        disabled={isGenerating}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px' }}
                                    />
                                    <p className="text-muted-sm" style={{ marginTop: '8px' }}>
                                        AI will invent completely randomized, unique characters.
                                    </p>
                                </div>
                            ) : (
                                <div className="form-group" style={{ marginTop: '16px' }}>
                                    <label className="form-label">Prompts (One per line, Max 20)</label>
                                    <textarea
                                        value={promptsText}
                                        onChange={(e) => setPromptsText(e.target.value)}
                                        placeholder="e.g.&#10;A grumpy space pirate captain&#10;A shy librarian reading forbidden spells&#10;A cyberpunk street kid"
                                        rows={6}
                                        disabled={isGenerating}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--bg-dark)' }}
                                    />
                                </div>
                            )}

                            {isGenerating && (
                                <div className="batch-progress" style={{ marginTop: '20px' }}>
                                    <div className="progress-bar-bg" style={{ width: '100%', height: '8px', background: 'var(--bg-dark)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div
                                            className="progress-bar-fill"
                                            style={{
                                                width: `${(progress.current / progress.total) * 100}%`,
                                                height: '100%',
                                                background: 'var(--accent-gradient)',
                                                transition: 'width 0.3s ease'
                                            }}
                                        />
                                    </div>
                                    <p className="text-muted-sm" style={{ marginTop: '8px', textAlign: 'center' }}>
                                        Generating {progress.current} of {progress.total} characters...
                                    </p>
                                </div>
                            )}

                            {batchError && (
                                <div className="status-message error" style={{ marginTop: '12px' }}>
                                    {batchError}
                                </div>
                            )}

                            <div className="form-actions" style={{ justifyContent: 'flex-end', marginTop: '24px' }}>
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => setIsBatchModalOpen(false)}
                                    disabled={isGenerating}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isGenerating}
                                >
                                    {isGenerating ? '⏳ Generating...' : '🚀 Start Batch creation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
