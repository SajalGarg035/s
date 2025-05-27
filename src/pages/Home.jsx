import React, { useState, useEffect } from 'react';
import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { 
    FiGithub, FiCode, FiUsers, FiZap, FiShield, FiGlobe, FiArrowRight, 
    FiPlay, FiStar, FiUser, FiLogOut, FiMonitor, FiCpu, FiLayers,
    FiTrendingUp, FiAward, FiCheckCircle, FiHeart, FiCoffee , FiMail, FiMenu, FiX 
} from 'react-icons/fi';
import { useRecoilState } from 'recoil';
import { darkMode } from '../atoms';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const Home = () => {
    const navigate = useNavigate();
    const [isDark, setIsDark] = useRecoilState(darkMode);
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { user, isAuthenticated, logout } = useAuth();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    
    const codingImages = [
        "https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % codingImages.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const createNewRoom = (e) => {
        e.preventDefault();
        if (!isAuthenticated) {
            toast.error('Please login to create a room');
            navigate('/login');
            return;
        }
        const id = uuidV4();
        setRoomId(id);
        setUsername(user.username);
        joinRoom(id, user.username);
    };

    const joinRoom = (roomId, username) => {
        if (!roomId || !username) {
            toast.error('Room ID & username are required');
            return;
        }
        navigate(`/editor/${roomId}`, {
            state: { username },
        });
    };

    const handleJoinRoom = () => {
        if (!isAuthenticated) {
            toast.error('Please login to join a room');
            navigate('/login');
            return;
        }
        setShowJoinModal(true);
        setUsername(user.username);
    };

    const handleJoinSubmit = () => {
        joinRoom(roomId, username);
    };

    const handleInputEnter = (e) => {
        if (e.code === 'Enter') {
            handleJoinSubmit();
        }
    };

    const features = [
        {
            icon: FiCode,
            title: 'Real-time Collaboration',
            description: 'Code together with your team in real-time with instant synchronization across all devices.',
            color: 'blue',
            image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
        },
        {
            icon: FiZap,
            title: 'Lightning Performance',
            description: 'Optimized for speed with intelligent caching and minimal latency for seamless coding.',
            color: 'yellow',
            image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
        },
        {
            icon: FiShield,
            title: 'Enterprise Security',
            description: 'Bank-level encryption and security protocols to protect your intellectual property.',
            color: 'green',
            image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
        },
        {
            icon: FiGlobe,
            title: 'Global Infrastructure',
            description: 'Distributed servers worldwide ensuring 99.9% uptime and optimal performance.',
            color: 'purple',
            image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
        }
    ];

    const technologies = [
        { name: 'React', icon: '⚛️', color: '#61DAFB' },
        { name: 'Node.js', icon: '🟢', color: '#339933' },
        { name: 'Python', icon: '🐍', color: '#3776AB' },
        { name: 'JavaScript', icon: '🟨', color: '#F7DF1E' },
        { name: 'TypeScript', icon: '🔷', color: '#3178C6' },
        { name: 'MongoDB', icon: '🍃', color: '#47A248' }
    ];

    const testimonials = [
        {
            name: "Alex Chen",
            role: "Senior Developer at Google",
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80",
            quote: "CodeSync Pro has revolutionized how our team collaborates. The real-time features are incredible!"
        },
        {
            name: "Sarah Johnson",
            role: "Tech Lead at Microsoft",
            avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80",
            quote: "Best collaborative coding platform I've ever used. Security and performance are top-notch."
        },
        {
            name: "David Kim",
            role: "CTO at StartupXYZ",
            avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80",
            quote: "Scaled our development team 10x with CodeSync Pro. Absolutely game-changing!"
        }
    ];

    return (
        <div className={`enterprise-landing ${isDark ? 'dark' : ''}`}>
            {/* Navigation Header */}
            <nav className="enterprise-nav">
                <div className="nav-container">
                    <div className="nav-brand">
                        <div className="brand-icon">
                            <FiCode size={24} />
                        </div>
                        <span className="brand-text">CodeSync Pro</span>
                    </div>
                    
                    {/* Desktop Navigation */}
                    <div className="nav-actions desktop-nav">
                        <button
                            onClick={() => setIsDark(!isDark)}
                            className="theme-toggle"
                            aria-label="Toggle theme"
                        >
                            {isDark ? '☀️' : '🌙'}
                        </button>
                        
                        {isAuthenticated ? (
                            <div className="auth-section">
                                <Link to="/profile" className="profile-link">
                                    <div className="profile-avatar">
                                        {user?.profilePicture ? (
                                            <img src={user.profilePicture} alt={user.username} />
                                        ) : (
                                            <FiUser size={20} />
                                        )}
                                    </div>
                                    <span className="username-text">{user?.username}</span>
                                </Link>
                                <button onClick={logout} className="logout-btn" title="Logout">
                                    <FiLogOut size={20} />
                                </button>
                            </div>
                        ) : (
                            <div className="auth-buttons">
                                <Link to="/login" className="nav-link">
                                    Sign In
                                </Link>
                                <Link to="/signup" className="signup-btn">
                                    Sign Up
                                </Link>
                            </div>
                        )}
                        
                        <a 
                            href="https://github.com/sajalgarg035" 
                            className="github-link"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <FiGithub size={20} />
                            <span className="github-text">GitHub</span>
                        </a>
                    </div>

                    {/* Mobile Navigation */}
                    <div className="mobile-nav">
                        <button
                            onClick={() => setIsDark(!isDark)}
                            className="theme-toggle mobile-theme"
                            aria-label="Toggle theme"
                        >
                            {isDark ? '☀️' : '🌙'}
                        </button>
                        
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="mobile-menu-toggle"
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                {isMobileMenuOpen && (
                    <div className="mobile-menu-overlay">
                        <div className="mobile-menu-content">
                            {isAuthenticated ? (
                                <div className="mobile-auth-section">
                                    <div className="mobile-profile">
                                        <div className="profile-avatar">
                                            {user?.profilePicture ? (
                                                <img src={user.profilePicture} alt={user.username} />
                                            ) : (
                                                <FiUser size={24} />
                                            )}
                                        </div>
                                        <div className="profile-info">
                                            <span className="profile-name">{user?.username}</span>
                                            <span className="profile-email">{user?.email}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="mobile-menu-actions">
                                        <Link 
                                            to="/profile" 
                                            className="mobile-menu-item"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            <FiUser size={20} />
                                            <span>Profile</span>
                                        </Link>
                                        
                                        <button 
                                            onClick={() => {
                                                logout();
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className="mobile-menu-item logout"
                                        >
                                            <FiLogOut size={20} />
                                            <span>Sign Out</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mobile-auth-buttons">
                                    <Link 
                                        to="/login" 
                                        className="mobile-auth-btn signin"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        Sign In
                                    </Link>
                                    <Link 
                                        to="/signup" 
                                        className="mobile-auth-btn signup"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        Sign Up
                                    </Link>
                                </div>
                            )}
                            
                            <div className="mobile-menu-links">
                                <a 
                                    href="https://github.com/sajalgarg035" 
                                    className="mobile-menu-item"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <FiGithub size={20} />
                                    <span>GitHub</span>
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-background">
                    <div className="floating-elements">
                        <div className="floating-element" style={{top: '10%', left: '10%'}}>⚛️</div>
                        <div className="floating-element" style={{top: '20%', right: '15%'}}>🚀</div>
                        <div className="floating-element" style={{bottom: '30%', left: '5%'}}>💻</div>
                        <div className="floating-element" style={{bottom: '10%', right: '10%'}}>🔥</div>
                    </div>
                </div>
                
                <div className="hero-container">
                    <div className="hero-content">
                        <div className="hero-badge">
                            <FiStar size={16} />
                            <span>Enterprise-Grade Development Platform</span>
                            <div className="badge-glow"></div>
                        </div>
                        
                        <h1 className="hero-title">
                            Code <span className="gradient-text">Together</span>
                            <br />Build <span className="gradient-text">Faster</span>
                        </h1>
                        
                        <p className="hero-description">
                            Transform your development workflow with our enterprise-grade collaborative 
                            code editor. Built for teams that demand excellence, security, and performance.
                        </p>

                        <div className="hero-actions">
                            <button 
                                onClick={createNewRoom}
                                className="cta-primary"
                            >
                                <FiPlay size={18} />
                                <span>Start Coding</span>
                                <div className="button-glow"></div>
                            </button>
                            
                            <button 
                                onClick={handleJoinRoom}
                                className="cta-secondary"
                            >
                                <FiUsers size={18} />
                                <span>Join Room</span>
                            </button>
                        </div>

                        <div className="social-proof">
                            <div className="proof-item">
                                <span className="proof-number">10K+</span>
                                <span className="proof-label">Developers</span>
                            </div>
                            <div className="proof-item">
                                <span className="proof-number">500+</span>
                                <span className="proof-label">Companies</span>
                            </div>
                            <div className="proof-item">
                                <span className="proof-number">99.9%</span>
                                <span className="proof-label">Uptime</span>
                            </div>
                        </div>

                        {/* Technology Stack */}
                        <div className="tech-stack">
                            <span className="tech-label">Powered by:</span>
                            <div className="tech-icons">
                                {technologies.map((tech, index) => (
                                    <div key={index} className="tech-item" title={tech.name}>
                                        <span className="tech-icon">{tech.icon}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="hero-visual">
                        <div className="code-editor-mockup">
                            <div className="editor-header">
                                <div className="editor-tabs">
                                    <div className="tab active">main.js</div>
                                    <div className="tab">utils.js</div>
                                    <div className="tab">+</div>
                                </div>
                                <div className="editor-actions">
                                    <div className="action-btn">▶️</div>
                                    <div className="action-btn">🔄</div>
                                </div>
                            </div>
                            
                            <div className="editor-content">
                                <div className="line-numbers">
                                    {[1,2,3,4,5,6,7,8].map(num => (
                                        <span key={num}>{num}</span>
                                    ))}
                                </div>
                                <div className="code-area">
                                    <div className="code-line">
                                        <span className="keyword">import</span> <span className="string">CodeSync</span> <span className="keyword">from</span> <span className="string">'./pro'</span>;
                                    </div>
                                    <div className="code-line">
                                        <span className="keyword">const</span> <span className="variable">team</span> = <span className="keyword">new</span> <span className="function">Team</span>();
                                    </div>
                                    <div className="code-line">
                                        <span className="variable">team</span>.<span className="function">collaborate</span>(<span className="string">"realtime"</span>);
                                    </div>
                                    <div className="code-line">
                                        <span className="comment">// Magic happens here ✨</span>
                                    </div>
                                    <div className="code-line">
                                        <span className="keyword">export</span> <span className="keyword">default</span> <span className="variable">CodeSync</span>;
                                    </div>
                                </div>
                            </div>
                            
                            <div className="collaboration-avatars">
                                <div className="avatar online" title="Alex is coding">
                                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face" alt="Alex" />
                                    <div className="status-dot"></div>
                                </div>
                                <div className="avatar online" title="Sarah joined">
                                    <img src="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face" alt="Sarah" />
                                    <div className="status-dot"></div>
                                </div>
                                <div className="avatar-count">+3</div>
                            </div>
                        </div>
                        
                        <div className="hero-image-carousel">
                            {codingImages.map((image, index) => (
                                <div 
                                    key={index}
                                    className={`carousel-image ${index === currentImageIndex ? 'active' : ''}`}
                                    style={{backgroundImage: `url(${image})`}}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <div className="section-container">
                    <div className="section-header">
                        <h2 className="section-title">
                            Why Choose <span className="gradient-text">CodeSync Pro</span>?
                        </h2>
                        <p className="section-description">
                            Built with the same standards as Google, Microsoft, and other tech giants
                        </p>
                    </div>
                    
                    <div className="features-grid">
                        {features.map((feature, index) => (
                            <div key={index} className={`feature-card feature-${feature.color}`}>
                                <div className="feature-image">
                                    <img src={feature.image} alt={feature.title} />
                                    <div className="feature-overlay">
                                        <feature.icon size={32} />
                                    </div>
                                </div>
                                <div className="feature-content">
                                    <h3 className="feature-title">{feature.title}</h3>
                                    <p className="feature-description">{feature.description}</p>
                                    <div className="feature-arrow">
                                        <FiArrowRight size={16} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="testimonials-section">
                <div className="section-container">
                    <div className="section-header">
                        <h2 className="section-title">Loved by Developers Worldwide</h2>
                        <p className="section-description">
                            Join thousands of developers who trust CodeSync Pro
                        </p>
                    </div>
                    
                    <div className="testimonials-grid">
                        {testimonials.map((testimonial, index) => (
                            <div key={index} className="testimonial-card">
                                <div className="testimonial-content">
                                    <div className="quote-icon">"</div>
                                    <p className="testimonial-quote">{testimonial.quote}</p>
                                </div>
                                <div className="testimonial-author">
                                    <img src={testimonial.avatar} alt={testimonial.name} />
                                    <div className="author-info">
                                        <h4>{testimonial.name}</h4>
                                        <p>{testimonial.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="stats-section">
                <div className="section-container">
                    <div className="stats-grid">
                        <div className="stat-item">
                            <FiUsers className="stat-icon" />
                            <h3>10,000+</h3>
                            <p>Active Developers</p>
                        </div>
                        <div className="stat-item">
                            <FiCode className="stat-icon" />
                            <h3>1M+</h3>
                            <p>Lines of Code</p>
                        </div>
                        <div className="stat-item">
                            <FiGlobe className="stat-icon" />
                            <h3>150+</h3>
                            <p>Countries</p>
                        </div>
                        <div className="stat-item">
                            <FiHeart className="stat-icon" />
                            <h3>99.9%</h3>
                            <p>Satisfaction Rate</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="section-container">
                    <div className="cta-content">
                        <h2>Ready to Transform Your Development?</h2>
                        <p>Join thousands of developers who are already coding smarter, not harder.</p>
                        <div className="cta-actions">
                            <button onClick={createNewRoom} className="cta-primary">
                                <FiPlay size={18} />
                                Start Your Journey
                            </button>
                            <button onClick={handleJoinRoom} className="cta-secondary">
                                <FiUsers size={18} />
                                Join a Room
                            </button>
                        </div>
                    </div>
                    <div className="cta-background">
                        <img src="https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Team coding" />
                    </div>
                </div>
            </section>

            {/* Join Modal */}
            {showJoinModal && (
                <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Join Coding Room</h3>
                            <button 
                                className="modal-close"
                                onClick={() => setShowJoinModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="input-group">
                                <label className="input-label">Room ID</label>
                                <input
                                    type="text"
                                    className="enterprise-input"
                                    placeholder="Enter room ID"
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value)}
                                    onKeyUp={handleInputEnter}
                                />
                            </div>
                            
                            <div className="input-group">
                                <label className="input-label">Username</label>
                                <input
                                    type="text"
                                    className="enterprise-input"
                                    placeholder="Your username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    onKeyUp={handleInputEnter}
                                    readOnly={isAuthenticated}
                                />
                            </div>
                        </div>
                        
                        <div className="modal-footer">
                            <button 
                                onClick={() => setShowJoinModal(false)}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleJoinSubmit}
                                className="btn-primary"
                                disabled={!roomId || !username}
                            >
                                Join Room
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="enterprise-footer">
                <div className="footer-container">
                    <div className="footer-brand">
                        <div className="brand-icon">
                            <FiCode size={20} />
                        </div>
                        <span>CodeSync Pro</span>
                    </div>
                    
                    <div className="footer-links">
                        <a href="https://github.com/sajalgarg035" target="_blank" rel="noopener noreferrer">
                            <FiGithub size={16} style={{marginRight: '0.5rem'}} />
                            GitHub
                        </a>
                        <a href="mailto:sajalgarg035@gmail.com">
                            Contact
                        </a>
                        <a href="#" onClick={(e) => e.preventDefault()}>
                            Privacy Policy
                        </a>
                        <a href="#" onClick={(e) => e.preventDefault()}>
                            Terms of Service
                        </a>
                        <a href="#" onClick={(e) => e.preventDefault()}>
                            Documentation
                        </a>
                    </div>
                    
                    <div className="footer-copyright">
                        <div className="made-with-love">
                            Made with <FiHeart className="love-icon" size={14} /> by sajalgarg035
                        </div>
                        <div style={{marginTop: '0.25rem', fontSize: '0.75rem'}}>
                            © 2024 CodeSync Pro. All rights reserved.
                        </div>
                    </div>
                </div>
                
                <div className="footer-extended">
                    <div className="section-container">
                        <div className="footer-sections">
                            <div className="footer-section">
                                <h4>Platform</h4>
                                <ul>
                                    <li><a href="#" onClick={(e) => e.preventDefault()}>Code Editor</a></li>
                                    <li><a href="#" onClick={(e) => e.preventDefault()}>Real-time Collaboration</a></li>
                                    <li><a href="#" onClick={(e) => e.preventDefault()}>Code Compilation</a></li>
                                    <li><a href="#" onClick={(e) => e.preventDefault()}>Team Management</a></li>
                                </ul>
                            </div>
                            
                            <div className="footer-section">
                                <h4>Resources</h4>
                                <ul>
                                    <li><a href="#" onClick={(e) => e.preventDefault()}>Documentation</a></li>
                                    <li><a href="#" onClick={(e) => e.preventDefault()}>API Reference</a></li>
                                    <li><a href="#" onClick={(e) => e.preventDefault()}>Tutorials</a></li>
                                    <li><a href="#" onClick={(e) => e.preventDefault()}>Community</a></li>
                                </ul>
                            </div>
                            
                            <div className="footer-section">
                                <h4>Company</h4>
                                <ul>
                                    <li><a href="#" onClick={(e) => e.preventDefault()}>About Us</a></li>
                                    <li><a href="#" onClick={(e) => e.preventDefault()}>Blog</a></li>
                                    <li><a href="#" onClick={(e) => e.preventDefault()}>Careers</a></li>
                                    <li><a href="mailto:sajalgarg035@gmail.com">Contact</a></li>
                                </ul>
                            </div>
                            
                            <div className="footer-section">
                                <h4>Connect</h4>
                                <p style={{color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem'}}>
                                    Stay updated with the latest features and announcements.
                                </p>
                                <div className="footer-social">
                                    <a href="https://github.com/sajalgarg035" className="social-icon" target="_blank" rel="noopener noreferrer">
                                        <FiGithub size={18} />
                                    </a>
                                    <a href="mailto:sajalgarg035@gmail.com" className="social-icon">
                                        <FiMail size={18} />
                                    </a>
                                    <a href="#" className="social-icon" onClick={(e) => e.preventDefault()}>
                                        <FiGlobe size={18} />
                                    </a>
                                </div>
                            </div>
                        </div>
                        
                        <div className="footer-bottom">
                            <div className="footer-bottom-left">
                                <span style={{color: 'var(--text-muted)', fontSize: '0.875rem'}}>
                                    Built with React, Node.js, and Socket.io
                                </span>
                            </div>
                            <div className="footer-bottom-right">
                                <span style={{color: 'var(--text-muted)', fontSize: '0.875rem'}}>
                                    Version 1.0.0
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;