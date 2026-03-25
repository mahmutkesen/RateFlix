import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaSignOutAlt, FaVideo, FaChevronDown, FaSearch, FaUserFriends, FaBars, FaTimes } from 'react-icons/fa';
import { searchMulti, getImageUrl, UNIFIED_CATEGORIES } from '../services/tmdb';
import api from '../services/api';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [movieSuggestions, setMovieSuggestions] = useState([]);
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Live Suggestions logic
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 1) {
        try {
          const [tmdbRes, authRes] = await Promise.all([
            searchMulti(searchQuery).catch(() => ({ data: { results: [] } })),
            api.get(`/auth/search?q=${searchQuery}`).catch(() => ({ data: [] }))
          ]);
          
          const movieTv = tmdbRes.data.results
            .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
            .slice(0, 8);
            
          const members = authRes.data.slice(0, 5);
            
          setMovieSuggestions(movieTv);
          setUserSuggestions(members);
          setShowSuggestions(true);
        } catch (err) {
          console.error(err);
        }
      } else {
        setMovieSuggestions([]);
        setUserSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim().length > 1) {
      // Just keep suggestions open don't navigate
      setShowSuggestions(true);
    }
  };

  const handleSuggestionClick = (item) => {
    navigate(`/${item.media_type}/${item.id}`);
    setShowSuggestions(false);
    setSearchQuery('');
    setIsMobileMenuOpen(false); // Close mobile menu too
  };

  const renderSuggestions = () => {
    if (!showSuggestions || (!movieSuggestions.length && !userSuggestions.length)) return null;

    return (
      <div className="search-suggestions glass-panel animate-fade-in shadow-xl">
        {/* Movies & Series Section */}
        {movieSuggestions.length > 0 && (
          <>
            <div className="suggestion-header">Filmler & Diziler</div>
            {movieSuggestions.map(item => (
              <div 
                key={item.id} 
                className="suggestion-item"
                onClick={() => {
                  navigate(`/${item.media_type}/${item.id}`);
                  setShowSuggestions(false);
                  setSearchQuery('');
                  setIsMobileMenuOpen(false);
                }}
              >
                <img 
                  src={getImageUrl(item.poster_path, 'w92')} 
                  alt={item.title || item.name} 
                />
                <div className="suggestion-info">
                  <span className="suggestion-title">{item.title || item.name}</span>
                  <span className="suggestion-meta">
                    {item.media_type === 'movie' ? 'Film' : 'Dizi'} 
                    {` • ${(item.release_date || item.first_air_date || '').split('-')[0]}`}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Members Section */}
        {userSuggestions.length > 0 && (
          <>
            <div className="suggestion-header">Üyeler</div>
            {userSuggestions.map(userItem => (
              <div 
                key={userItem._id} 
                className="suggestion-item"
                onClick={() => {
                  navigate(`/profile/${userItem.username}`);
                  setShowSuggestions(false);
                  setSearchQuery('');
                  setIsMobileMenuOpen(false);
                }}
              >
                <div className="user-suggestion-avatar">
                  {userItem.profilePic ? (
                    <img src={userItem.profilePic} alt={userItem.username} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                  ) : (
                    userItem.username.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="suggestion-info">
                  <span className="suggestion-title">{userItem.username}</span>
                  <span className="suggestion-meta" style={{ color: 'var(--primary-color)', fontSize: '0.7rem' }}>Üye</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    );
  };

  return (
    <nav className="navbar glass-panel">
      <div className="container nav-content">
        <Link to="/" className="brand">
          <div className="brand-logo">
             <FaVideo className="brand-icon" />
          </div>
          <span className="brand-text">Rate<span className="brand-highlight">Flix</span></span>
        </Link>

        {/* Search Bar - Now on the left side of nav items */}
        {/* Search Bar - Hidden on very small screens, shown in mobile menu instead */}
        <div className="nav-search-container desktop-search" ref={searchRef}>
          <form className="nav-search" onSubmit={handleSearchSubmit}>
              <FaSearch className="search-icon-min" />
                <input 
                  type="text" 
                  placeholder="Film, dizi ara..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length > 1 && setShowSuggestions(true)}
                />
          </form>
          {showSuggestions && searchQuery && renderSuggestions()}
        </div>


        {/* Mobile Toggle */}
        <button 
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        <div className={`nav-links ${isMobileMenuOpen ? 'mobile-active' : ''}`}>
            {/* Mobile Search Bar */}
            <div className="nav-search-container mobile-only-search">
              <form className="nav-search" onSubmit={handleSearchSubmit}>
                <FaSearch className="search-icon-min" />
                <input 
                  type="text" 
                  placeholder="Film, dizi ara..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length > 1 && setShowSuggestions(true)}
                />
              </form>
              {showSuggestions && searchQuery && renderSuggestions()}
            </div>

            <Link to="/" className="nav-item" onClick={() => setIsMobileMenuOpen(false)}>Keşfet</Link>
            
            <div className="dropdown" ref={dropdownRef}>
                <button 
                  className={`nav-item dropdown-btn ${showDropdown ? 'active' : ''}`}
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  Kategoriler <FaChevronDown className="dropdown-chevron" />
                </button>
                
                {showDropdown && (
                  <div className="dropdown-menu glass-panel animate-fade-in">
                    <div className="dropdown-section">
                      <h4>Filmler</h4>
                      <div className="genre-grid">
                        {UNIFIED_CATEGORIES.map(cat => (
                          <Link 
                            key={cat.id} 
                            to={`/category/movie?genre=${cat.id}`}
                            onClick={() => {
                              setShowDropdown(false);
                              setIsMobileMenuOpen(false);
                            }}
                            className="genre-link"
                          >
                            {cat.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div className="dropdown-divider"></div>
                    <div className="dropdown-section">
                      <h4>Diziler</h4>
                      <div className="genre-grid">
                        {UNIFIED_CATEGORIES.map(cat => (
                          <Link 
                            key={cat.id} 
                            to={`/category/tv?genre=${cat.id}`}
                            onClick={() => {
                              setShowDropdown(false);
                              setIsMobileMenuOpen(false);
                            }}
                            className="genre-link"
                          >
                            {cat.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
            </div>

            <Link to="/community" className="nav-item" onClick={() => setIsMobileMenuOpen(false)}>Topluluk</Link>
            
          {token ? (
             <div className="auth-nav">
               {user?.role === 'admin' && (
                  <Link to="/admin" className="nav-item admin-link" style={{ color: '#d4af37', fontWeight: 'bold' }} onClick={() => setIsMobileMenuOpen(false)}>Admin Paneli</Link>
               )}
               <Link to="/lists" className="nav-item" onClick={() => setIsMobileMenuOpen(false)}>Listeler</Link>
               <Link to="/profile" className="nav-item user-profile" onClick={() => setIsMobileMenuOpen(false)}>
                 <FaUser /> {user?.username}
               </Link>
               <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="btn-logout">
                 <FaSignOutAlt />
               </button>
             </div>
          ) : (
             <div className="auth-nav">
                <Link to="/login" className="nav-item" onClick={() => setIsMobileMenuOpen(false)}>Giriş Yap</Link>
                <Link to="/register" className="btn-primary" onClick={() => setIsMobileMenuOpen(false)}>Kayıt Ol</Link>
             </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
