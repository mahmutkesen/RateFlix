import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaUser, FaSignOutAlt, FaVideo, FaChevronDown, FaSearch, 
  FaUsers, FaBars, FaTimes, FaFilm, FaList, FaCrown 
} from 'react-icons/fa';
import { searchMulti, getImageUrl, UNIFIED_CATEGORIES } from '../services/tmdb';
import api from '../services/api';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const hamburgerRef = useRef(null);
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [movieSuggestions, setMovieSuggestions] = useState([]);
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (hamburgerRef.current && !hamburgerRef.current.contains(event.target)) {
        setIsMenuOpen(false);
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
    setIsMenuOpen(false);
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
                onMouseDown={(e) => {
                  e.preventDefault();
                  navigate(`/${item.media_type}/${item.id}`);
                  setShowSuggestions(false);
                  setSearchQuery('');
                  setIsMenuOpen(false);
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
                onMouseDown={(e) => {
                  e.preventDefault();
                  navigate(`/profile/${userItem.username}`);
                  setShowSuggestions(false);
                  setSearchQuery('');
                  setIsMenuOpen(false);
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
        {/* Brand Logo */}
        <Link to="/" className="brand">
          <div className="brand-logo">
             <FaVideo className="brand-icon" />
          </div>
          <span className="brand-text">Rate<span className="brand-highlight">Flix</span></span>
        </Link>

        {/* Expanded Search Bar with Integrated Category Toggle */}
        <div className="nav-search-container" ref={searchRef}>
          <form className="nav-search" onSubmit={handleSearchSubmit}>
            <FaSearch className="search-icon-min" />
            <input 
              type="text" 
              placeholder="Film, dizi, kullanıcı ara..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length > 1 && setShowSuggestions(true)}
            />

            {/* Category toggle button inside search bar right edge */}
            <div className="search-category-trigger-wrap" ref={dropdownRef}>
              <button 
                type="button" 
                className={`search-category-btn ${showDropdown ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdown(!showDropdown);
                }}
                title="Kategoriler"
                aria-label="Kategorileri Göster"
              >
                <FaFilm className="search-cat-icon" />
                <FaChevronDown className="search-cat-chevron" />
              </button>

              {/* Categories Dropdown right below search bar */}
              {showDropdown && (
                <div className="dropdown-menu glass-panel animate-fade-in" onClick={(e) => e.stopPropagation()}>
                  <div className="dropdown-columns">
                    <div className="dropdown-section">
                      <div className="dropdown-section-header">
                        <span className="dropdown-badge">🎬 Filmler</span>
                      </div>
                      <div className="genre-chips-container">
                        {UNIFIED_CATEGORIES.map(cat => (
                          <Link 
                            key={`movie-${cat.id}`} 
                            to={`/category/movie?genre=${cat.id}`}
                            onClick={() => setShowDropdown(false)}
                            className="genre-chip"
                          >
                            {cat.name}
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div className="dropdown-section">
                      <div className="dropdown-section-header">
                        <span className="dropdown-badge">📺 Diziler</span>
                      </div>
                      <div className="genre-chips-container">
                        {UNIFIED_CATEGORIES.map(cat => (
                          <Link 
                            key={`tv-${cat.id}`} 
                            to={`/category/tv?genre=${cat.id}`}
                            onClick={() => setShowDropdown(false)}
                            className="genre-chip"
                          >
                            {cat.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </form>

          {showSuggestions && searchQuery && renderSuggestions()}
        </div>

        {/* Right Navigation Actions: Keşfet | Topluluk | Hamburger */}
        <div className="nav-right-actions">
          {/* Keşfet Link */}
          <Link to="/" className="nav-link-item">
            <span>Keşfet</span>
          </Link>

          <span className="nav-divider" />

          {/* Topluluk Link */}
          <Link to="/community" className="nav-link-item">
            <FaUsers className="nav-link-icon" />
            <span>Topluluk</span>
          </Link>

          <span className="nav-divider" />

          {/* Hamburger Menu Container (Profil, Listeler, Admin, Çıkış) */}
          <div className="hamburger-container" ref={hamburgerRef}>
            <button 
              type="button"
              className={`hamburger-toggle-btn ${isMenuOpen ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Kullanıcı Menüsü"
              title="Menü"
            >
              {token && user ? (
                <div className="hamburger-user-preview">
                  <div className="hamburger-avatar-mini">
                    {user.profilePic ? (
                      <img src={user.profilePic} alt={user.username} />
                    ) : (
                      user.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  {isMenuOpen ? <FaTimes className="hamburger-bars-icon" /> : <FaBars className="hamburger-bars-icon" />}
                </div>
              ) : (
                isMenuOpen ? <FaTimes className="hamburger-bars-icon" /> : <FaBars className="hamburger-bars-icon" />
              )}
            </button>

            {/* Hamburger Dropdown Drawer */}
            {isMenuOpen && (
              <div className="hamburger-menu-dropdown glass-panel animate-scale-up">
                {token && user ? (
                  <>
                    {/* User Summary Header */}
                    <Link 
                      to="/profile" 
                      className="hamburger-user-header"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className="hamburger-avatar-large">
                        {user.profilePic ? (
                          <img src={user.profilePic} alt={user.username} />
                        ) : (
                          user.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="hamburger-user-info">
                        <span className="hamburger-user-name">{user.username}</span>
                        <span className="hamburger-user-badge">
                          {user.role === 'admin' ? '👑 Yönetici' : '⭐ Üye'}
                        </span>
                      </div>
                    </Link>

                    <div className="hamburger-menu-divider" />

                    <div className="hamburger-links-group">
                      {/* Mobile-only shortcuts */}
                      <Link to="/" className="hamburger-menu-item mobile-shortcut" onClick={() => setIsMenuOpen(false)}>
                        <FaFilm className="menu-item-icon" />
                        <span>Keşfet</span>
                      </Link>
                      <Link to="/community" className="hamburger-menu-item mobile-shortcut" onClick={() => setIsMenuOpen(false)}>
                        <FaUsers className="menu-item-icon" />
                        <span>Topluluk</span>
                      </Link>

                      <Link to="/profile" className="hamburger-menu-item" onClick={() => setIsMenuOpen(false)}>
                        <FaUser className="menu-item-icon" />
                        <span>Profilim</span>
                      </Link>

                      <Link to="/lists" className="hamburger-menu-item" onClick={() => setIsMenuOpen(false)}>
                        <FaList className="menu-item-icon" />
                        <span>Listelerim</span>
                      </Link>

                      {user.role === 'admin' && (
                        <Link to="/admin" className="hamburger-menu-item admin-item" onClick={() => setIsMenuOpen(false)}>
                          <FaCrown className="menu-item-icon admin-icon" />
                          <span>Admin Paneli</span>
                        </Link>
                      )}
                    </div>

                    <div className="hamburger-menu-divider" />

                    <button 
                      onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                      className="hamburger-logout-btn"
                    >
                      <FaSignOutAlt className="menu-item-icon" />
                      <span>Çıkış Yap</span>
                    </button>
                  </>
                ) : (
                  <div className="hamburger-guest-group">
                    {/* Mobile-only shortcuts */}
                    <Link to="/" className="hamburger-menu-item mobile-shortcut" onClick={() => setIsMenuOpen(false)}>
                      <FaFilm className="menu-item-icon" />
                      <span>Keşfet</span>
                    </Link>
                    <Link to="/community" className="hamburger-menu-item mobile-shortcut" onClick={() => setIsMenuOpen(false)}>
                      <FaUsers className="menu-item-icon" />
                      <span>Topluluk</span>
                    </Link>
                    <div className="hamburger-menu-divider mobile-shortcut" />

                    <Link to="/login" className="hamburger-menu-item" onClick={() => setIsMenuOpen(false)}>
                      <FaUser className="menu-item-icon" />
                      <span>Giriş Yap</span>
                    </Link>
                    <Link to="/register" className="hamburger-register-btn" onClick={() => setIsMenuOpen(false)}>
                      <span>Kayıt Ol</span>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
