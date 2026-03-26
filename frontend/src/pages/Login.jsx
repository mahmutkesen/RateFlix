import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaVideo } from 'react-icons/fa';
import api from '../services/api';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = new URLSearchParams(window.location.search);
  const isVerified = location.get('verified') === 'true';

  React.useEffect(() => {
    if (isVerified) {
        setError('success:Hesabınız başarıyla doğrulandı! Şimdi giriş yapabilirsiniz.');
    }
  }, [isVerified]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        navigate('/');
    } catch (err) {
        setError(err.response?.data?.message || 'Giriş başarısız. Lütfen tekrar deneyin. ');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="auth-container animate-fade-in">
        <div className="auth-card">
            <div style={{display: 'flex', justifyContent: 'center', marginBottom: '1rem'}}>
                <div style={{background: 'rgba(212,175,55,0.2)', padding:'12px', borderRadius:'50%'}}>
                    <FaVideo size={28} color="#d4af37" />
                </div>
            </div>
            
            <h2 className="auth-title">Tekrar Hoş Geldiniz</h2>
            <p className="auth-subtitle">Yeni filmleri keşfetmek ve listelerinizi yönetmek için giriş yapın</p>
            
            {error && (
                <div className={error.startsWith('success:') ? "auth-success" : "auth-error"}>
                    {error.startsWith('success:') ? error.replace('success:', '') : error}
                </div>
            )}
            
            <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                    <label>E-posta Adresi</label>
                    <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                        placeholder="isim@ornek.com" 
                    />
                    <FaEnvelope className="auth-icon" />
                </div>
                <div className="form-group">
                    <label>Şifre</label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                        placeholder="••••••••" 
                    />
                    <FaLock className="auth-icon" />
                </div>
                
                <button type="submit" className="auth-btn" disabled={loading}>
                    {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                </button>
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <Link to="/forgot-password" style={{ color: 'var(--primary-color)', fontSize: '0.85rem' }}>Şifrenizi mi unuttunuz?</Link>
                </div>
            </form>
            
            <div className="auth-footer">
                <span>RateFlix'te yeni misiniz?</span>
                <Link to="/register" className="auth-link">Hesap oluşturun</Link>
            </div>
        </div>
    </div>
  );
};

export default Login;
