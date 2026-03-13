import './ChatBubble.css';

export default function ChatBubble({ message, character, align = 'left', isNarration = false }) {
    if (isNarration) {
        return <div className="chat-bubble-narration">{message}</div>;
    }

    const initial = character?.name?.charAt(0)?.toUpperCase() || '?';

    return (
        <div className={`chat-bubble-wrapper ${align}`}>
            {character?.avatar ? (
                <img src={character.avatar} alt={character.name} className="chat-bubble-avatar" />
            ) : (
                <div className="chat-bubble-avatar-placeholder">{initial}</div>
            )}

            <div className="chat-bubble-content">
                <span className="chat-bubble-name">{character?.name || 'Unknown'}</span>
                <div className="chat-bubble">{message}</div>
            </div>
        </div>
    );
}
