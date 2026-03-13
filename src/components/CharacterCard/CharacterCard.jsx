import { useNavigate } from 'react-router-dom';
import './CharacterCard.css';

export default function CharacterCard({ character, onDelete }) {
    const navigate = useNavigate();

    return (
        <div className="character-card glass-card animate-fadeIn">
            {character.avatar ? (
                <img src={character.avatar} alt={character.name} className="character-card-image" />
            ) : (
                <div className="character-card-placeholder">
                    {character.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
            )}

            <div className="character-card-body">
                <div className="character-card-name">{character.name}</div>

                {character.voiceStyle && (
                    <div className="character-card-voice">
                        🎭 {character.voiceStyle}
                    </div>
                )}

                {character.personality && (
                    <div className="character-card-personality">{character.personality}</div>
                )}

                {character.genres?.length > 0 && (
                    <div className="character-card-tags">
                        {character.genres.slice(0, 3).map((g) => (
                            <span key={g} className="chip">{g}</span>
                        ))}
                    </div>
                )}

                <div className="character-card-actions">
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={(e) => { e.stopPropagation(); navigate(`/ai-chat?character=${character.id}`); }}
                    >
                        💬 Chat
                    </button>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => { e.stopPropagation(); navigate(`/characters/edit/${character.id}`); }}
                    >
                        ✏️ Edit
                    </button>
                    {onDelete && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={(e) => { e.stopPropagation(); onDelete(character.id); }}
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
