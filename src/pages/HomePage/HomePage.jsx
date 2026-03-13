import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CharacterCard from '../../components/CharacterCard/CharacterCard';
import StoryCard from '../../components/StoryCard/StoryCard';
import { getCharacters, getStories } from '../../store/store';
import './HomePage.css';

export default function HomePage() {
    const [characters, setCharacters] = useState([]);
    const [stories, setStories] = useState([]);

    useEffect(() => {
        setCharacters(getCharacters());
        setStories(getStories());
    }, []);

    return (
        <div className="home-page">
            {/* Hero Section */}
            <section className="hero">
                <div className="hero-content animate-fadeIn">
                    <h1 className="hero-title">
                        <span className="hero-icon">✨</span>
                        Welcome to <span className="gradient-text">StoryAI</span>
                    </h1>
                    <p className="hero-subtitle">
                        Create characters, write interactive stories, and chat with AI-powered personas.
                        Your imagination brought to life.
                    </p>
                    <div className="hero-actions">
                        <Link to="/characters/create" className="btn btn-primary btn-lg">
                            👥 Create Character
                        </Link>
                        <Link to="/stories/create" className="btn btn-secondary btn-lg">
                            📖 Write Story
                        </Link>
                        <Link to="/ai-chat" className="btn btn-secondary btn-lg">
                            🤖 AI Chat
                        </Link>
                    </div>
                </div>
                <div className="hero-glow"></div>
            </section>

            {/* Features */}
            <section className="features-section animate-slideInUp">
                <div className="features-grid">
                    <div className="feature-card glass-card">
                        <div className="feature-icon">👥</div>
                        <h3>Create Characters</h3>
                        <p>Design unique characters with personalities, backstories, and voice styles</p>
                    </div>
                    <div className="feature-card glass-card">
                        <div className="feature-icon">📖</div>
                        <h3>Write Stories</h3>
                        <p>Craft interactive chat-style novels with your characters</p>
                    </div>
                    <div className="feature-card glass-card">
                        <div className="feature-icon">🤖</div>
                        <h3>AI Chat</h3>
                        <p>Have real-time conversations with your characters powered by Ollama</p>
                    </div>
                    <div className="feature-card glass-card">
                        <div className="feature-icon">💬</div>
                        <h3>Chat Reader</h3>
                        <p>Read stories in an immersive chat-style format, just like Joylada</p>
                    </div>
                </div>
            </section>

            {/* Characters Section */}
            {characters.length > 0 && (
                <section className="home-section">
                    <div className="section-header">
                        <h2>Your Characters</h2>
                        <Link to="/characters" className="btn btn-ghost btn-sm">View All →</Link>
                    </div>
                    <div className="grid grid-4">
                        {characters.slice(0, 4).map((char) => (
                            <CharacterCard key={char.id} character={char} />
                        ))}
                    </div>
                </section>
            )}

            {/* Stories Section */}
            {stories.length > 0 && (
                <section className="home-section">
                    <div className="section-header">
                        <h2>Your Stories</h2>
                        <Link to="/stories" className="btn btn-ghost btn-sm">View All →</Link>
                    </div>
                    <div className="grid grid-4">
                        {stories.slice(0, 4).map((story) => (
                            <StoryCard key={story.id} story={story} />
                        ))}
                    </div>
                </section>
            )}

            {/* Empty State */}
            {characters.length === 0 && stories.length === 0 && (
                <section className="home-empty">
                    <div className="empty-state">
                        <div className="empty-state-icon">🚀</div>
                        <h3 className="empty-state-title">Get Started!</h3>
                        <p className="empty-state-text">
                            Create your first character to start chatting with AI or write your first story.
                        </p>
                        <Link to="/characters/create" className="btn btn-primary btn-lg">
                            Create Your First Character
                        </Link>
                    </div>
                </section>
            )}
        </div>
    );
}
