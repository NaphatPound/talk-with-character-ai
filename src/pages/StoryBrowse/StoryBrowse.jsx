import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StoryCard from '../../components/StoryCard/StoryCard';
import { getStories, deleteStory } from '../../store/store';

export default function StoryBrowse() {
    const [stories, setStories] = useState([]);
    const [search, setSearch] = useState('');
    const [filterGenre, setFilterGenre] = useState('');

    useEffect(() => {
        setStories(getStories());
    }, []);

    function handleDelete(id) {
        if (window.confirm('Delete this story?')) {
            setStories(deleteStory(id));
        }
    }

    const filtered = stories.filter((s) => {
        const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase());
        const matchGenre = !filterGenre || s.genres?.includes(filterGenre);
        return matchSearch && matchGenre;
    });

    const allGenres = [...new Set(stories.flatMap((s) => s.genres || []))];

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">📖 Stories</h1>
                <p className="page-subtitle">Browse and read your interactive stories</p>
            </div>

            <div className="gallery-filters" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div className="search-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search stories..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                {allGenres.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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

            {filtered.length > 0 ? (
                <div className="grid grid-4">
                    {filtered.map((story) => (
                        <StoryCard key={story.id} story={story} onDelete={handleDelete} />
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <div className="empty-state-icon">📖</div>
                    <h3 className="empty-state-title">No stories yet</h3>
                    <p className="empty-state-text">Write your first interactive story!</p>
                    <Link to="/stories/create" className="btn btn-primary btn-lg">📖 Create Story</Link>
                </div>
            )}

            <Link to="/stories/create" className="fab" title="Create Story">+</Link>
        </div>
    );
}
