import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaUser, FaVideo } from 'react-icons/fa';
import api from '../services/api';
import './Auth.css';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
        const res = await api.post('/auth/register', { username, email, password });
        if (res.data.message) {
            setError('success:' + res.data.message);
            // After 5s  redirect to login
            setTimeout(() => navigate('/login'), 5000);
        } else {
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            navigate('/');
        }
    } catch (err) {
        setError(err.response?.data?.message || 'Kayıt başarısız. Lütfen tekrar deneyin.');
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

            <h2 className="auth-title">RateFlix'e Katılın</h2>
            <p className="auth-subtitle">İzlediklerinizi takip etmeye başlamak için bir hesap oluşturun</p>
            
            {error && (
                <div className={error.startsWith('success:') ? "auth-success" : "auth-error"}>
                    {error.startsWith('success:') ? error.replace('success:', '') : error}
                </div>
            )}
            
            <form onSubmit={handleSubmit} className="auth-form">
                 <div className="form-group">
                    <label>Kullanıcı Adı</label>
                    <input 
                        type="text" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                        required 
                        minLength={3} 
                        placeholder="cinephile99" 
                    />
                    <FaUser className="auth-icon" />
                </div>
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
                        minLength={6} 
                        placeholder="En az 6 karakter" 
                    />
                    <FaLock className="auth-icon" />
                </div>
                
                <button type="submit" className="auth-btn" disabled={loading}>
                    {loading ? 'Hesap Oluşturuluyor...' : 'Kayıt Ol'}
                </button>
            </form>
            
            <div className="auth-footer">
                <span>Zaten bir hesabınız var mı?</span>
                <Link to="/login" className="auth-link">Giriş yapın</Link>
            </div>
        </div>
    </div>
  );
};

export default Register;
