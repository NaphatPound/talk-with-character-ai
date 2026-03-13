import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ChatBubble from '../../components/ChatBubble/ChatBubble';
import { getStory, getCharacters } from '../../store/store';
import './StoryReader.css';

export default function StoryReader() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [story, setStory] = useState(null);
    const [characters, setCharacters] = useState([]);
    const [currentChapter, setCurrentChapter] = useState(0);
    const [visibleCount, setVisibleCount] = useState(0);
    const [autoPlay, setAutoPlay] = useState(false);
    const [autoSpeed, setAutoSpeed] = useState(1500);

    useEffect(() => {
        const s = getStory(id);
        if (!s) { navigate('/stories'); return; }
        setStory(s);
        setCharacters(getCharacters());
    }, [id, navigate]);

    const chapter = story?.chapters?.[currentChapter];
    const dialogues = chapter?.dialogues || [];
    const allRevealed = visibleCount >= dialogues.length;

    const advance = useCallback(() => {
        if (!allRevealed) {
            setVisibleCount((prev) => prev + 1);
        }
    }, [allRevealed]);

    // Auto-play
    useEffect(() => {
        if (!autoPlay || allRevealed) return;
        const timer = setInterval(advance, autoSpeed);
        return () => clearInterval(timer);
    }, [autoPlay, allRevealed, advance, autoSpeed]);

    // Keyboard
    useEffect(() => {
        function handleKey(e) {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                advance();
            }
        }
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [advance]);

    function goToChapter(index) {
        setCurrentChapter(index);
        setVisibleCount(0);
        setAutoPlay(false);
    }

    if (!story) return null;

    const getCharacter = (charId) => characters.find((c) => c.id === charId);
    const progress = dialogues.length > 0 ? (visibleCount / dialogues.length) * 100 : 0;

    return (
        <div className="story-reader" onClick={advance}>
            {/* Background */}
            <div className="reader-bg">
                {story.cover && <img src={story.cover} alt="" className="reader-bg-img" />}
                <div className="reader-bg-overlay"></div>
            </div>

            {/* Top Bar */}
            <div className="reader-topbar" onClick={(e) => e.stopPropagation()}>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back</button>
                <div className="reader-title">{story.title} — {chapter?.title}</div>
                <div className="reader-controls">
                    <button
                        className={`btn btn-sm ${autoPlay ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setAutoPlay(!autoPlay)}
                    >
                        {autoPlay ? '⏸ Pause' : '▶ Auto'}
                    </button>
                    {autoPlay && (
                        <input
                            type="range"
                            min="500"
                            max="4000"
                            step="250"
                            value={autoSpeed}
                            onChange={(e) => setAutoSpeed(Number(e.target.value))}
                            className="speed-slider"
                            title={`Speed: ${autoSpeed}ms`}
                        />
                    )}
                </div>
            </div>

            {/* Progress */}
            <div className="reader-progress">
                <div className="reader-progress-bar" style={{ width: `${progress}%` }}></div>
            </div>

            {/* Chat Area */}
            <div className="reader-chat">
                {dialogues.slice(0, visibleCount).map((d, i) => {
                    const char = getCharacter(d.characterId);
                    if (d.isNarration) {
                        return <ChatBubble key={d.id || i} message={d.text} isNarration />;
                    }
                    return (
                        <ChatBubble
                            key={d.id || i}
                            message={d.text}
                            character={char}
                            align={i % 2 === 0 ? 'left' : 'right'}
                        />
                    );
                })}

                {allRevealed && dialogues.length > 0 && (
                    <div className="reader-end">
                        {currentChapter < (story.chapters?.length || 1) - 1 ? (
                            <button className="btn btn-primary btn-lg" onClick={(e) => { e.stopPropagation(); goToChapter(currentChapter + 1); }}>
                                Next Chapter →
                            </button>
                        ) : (
                            <div className="reader-complete">
                                <span>🎉</span>
                                <p>Story complete!</p>
                                <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); navigate('/stories'); }}>
                                    Back to Stories
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {!allRevealed && dialogues.length > 0 && (
                    <div className="reader-tap-hint">Tap to continue...</div>
                )}
            </div>

            {/* Chapter Nav */}
            {story.chapters?.length > 1 && (
                <div className="reader-chapters" onClick={(e) => e.stopPropagation()}>
                    {story.chapters.map((ch, i) => (
                        <button
                            key={i}
                            className={`chip ${currentChapter === i ? 'active' : ''}`}
                            onClick={() => goToChapter(i)}
                        >
                            {ch.title}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
