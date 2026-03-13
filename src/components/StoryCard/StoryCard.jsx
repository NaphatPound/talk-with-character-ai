import { useNavigate } from 'react-router-dom';
import './StoryCard.css';

export default function StoryCard({ story, onDelete }) {
    const navigate = useNavigate();
    const chapterCount = story.chapters?.length || 0;

    return (
        <div className="story-card glass-card animate-fadeIn" onClick={() => navigate(`/stories/${story.id}`)}>
            {story.cover ? (
                <img src={story.cover} alt={story.title} className="story-card-cover" />
            ) : (
                <div className="story-card-cover-placeholder">📖</div>
            )}

            <div className="story-card-body">
                <div className="story-card-title">{story.title}</div>

                <div className="story-card-meta">
                    <span>📑 {chapterCount} chapter{chapterCount !== 1 ? 's' : ''}</span>
                </div>

                {story.description && (
                    <div className="story-card-desc">{story.description}</div>
                )}

                {story.genres?.length > 0 && (
                    <div className="story-card-tags">
                        {story.genres.slice(0, 3).map((g) => (
                            <span key={g} className="chip chip-purple">{g}</span>
                        ))}
                    </div>
                )}

                <div className="story-card-actions">
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={(e) => { e.stopPropagation(); navigate(`/stories/read/${story.id}`); }}
                    >
                        ▶ Read
                    </button>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => { e.stopPropagation(); navigate(`/stories/edit/${story.id}`); }}
                    >
                        ✏️ Edit
                    </button>
                    {onDelete && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={(e) => { e.stopPropagation(); onDelete(story.id); }}
                            title="Delete"
                        >
                            🗑️
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
