import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

const ResetPassword = () => {
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState('');
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!token) {
            setMessage('Geçersiz bağlantı: Lütfen e-postanızdaki linke tıklayın.');
            return;
        }
        try {
            const res = await api.post('/auth/reset-password', { token, newPassword });
            setMessage(res.data.message);
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setMessage(err.response?.data?.message || 'Şifre sıfırlanırken hata oluştu.');
        }
    };

    return (
        <div style={{ paddingTop: '100px', maxWidth: '400px', margin: '0 auto' }}>
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)' }}>Şifreyi Sıfırla</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Yeni Şifre</label>
                        <input 
                            type="password" 
                            value={newPassword} 
                            onChange={e => setNewPassword(e.target.value)} 
                            placeholder="Yeni şifrenizi girin" 
                            required 
                        />
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                        Şifreyi Sıfırla
                    </button>
                </form>
                {message && <p style={{ marginTop: '1rem', color: 'var(--primary-color)' }}>{message}</p>}
            </div>
        </div>
    );
};

export default ResetPassword;
