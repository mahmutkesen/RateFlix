import React, { useState } from 'react';
import api from '../services/api';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/auth/forgot-password', { email });
            setMessage(res.data.message);
        } catch (err) {
            setMessage('Sıfırlama bağlantısı gönderilirken hata oluştu.');
        }
    };
 
    return (
        <div style={{ paddingTop: '100px', maxWidth: '400px', margin: '0 auto' }}>
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)' }}>Şifremi Unuttum</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>E-posta Adresi</label>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            placeholder="E-postanızı girin" 
                            required 
                        />
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                        Sıfırlama Bağlantısını Gönder
                    </button>
                </form>
                {message && <p style={{ marginTop: '1rem', color: 'var(--primary-color)' }}>{message}</p>}
            </div>
        </div>
    );
};

export default ForgotPassword;
