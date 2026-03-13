import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);

    const links = [
        { to: '/', label: 'Home', icon: '🏠' },
        { to: '/characters', label: 'Characters', icon: '👥' },
        { to: '/stories', label: 'Stories', icon: '📖' },
        { to: '/ai-chat', label: 'AI Chat', icon: '🤖' },
        { to: '/settings', label: 'Settings', icon: '⚙️' },
    ];

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <Link to="/" className="navbar-brand">
                    <span className="navbar-brand-icon">✨</span>
                    StoryAI
                </Link>

                <ul className={`navbar-links ${menuOpen ? 'open' : ''}`}>
                    {links.map((link) => (
                        <li key={link.to}>
                            <Link
                                to={link.to}
                                className={`navbar-link ${location.pathname === link.to ? 'active' : ''}`}
                                onClick={() => setMenuOpen(false)}
                            >
                                <span className="navbar-link-icon">{link.icon}</span>
                                {link.label}
                            </Link>
                        </li>
                    ))}
                </ul>

                <div className="navbar-actions">
                    <button
                        className="navbar-toggle"
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Toggle menu"
                    >
                        {menuOpen ? '✕' : '☰'}
                    </button>
                </div>
            </div>
        </nav>
    );
}
