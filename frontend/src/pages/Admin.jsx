import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FaUser, FaStar, FaList, FaTrash, FaUserShield, FaUserEdit, FaClock } from 'react-icons/fa';
import { useToast } from '../components/Toast';
import './Admin.css';

const Admin = () => {
    const [stats, setStats] = useState({ users: 0, reviews: 0, lists: 0, newReviewsToday: 0 });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'users'
    const { showToast } = useToast();

    useEffect(() => {
        fetchAdminData();
    }, []);

    const fetchAdminData = async () => {
        setLoading(true);
        try {
            const [statsRes, usersRes] = await Promise.all([
                api.get('/admin/stats'),
                api.get('/admin/users')
            ]);
            setStats(statsRes.data);
            setUsers(usersRes.data);
        } catch (err) {
            console.error("Admin data fetch error", err);
            showToast("Veriler yüklenirken bir hata oluştu.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            await api.patch(`/admin/users/${userId}/role`, { role: newRole });
            setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u));
            showToast("Kullanıcı rolü güncellendi.", "success");
        } catch (err) {
            showToast("Rol güncellenemedi.", "error");
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("Bu kullanıcıyı ve tüm verilerini silmek istediğinize emin misiniz?")) return;
        
        try {
            await api.delete(`/admin/users/${userId}`);
            setUsers(users.filter(u => u._id !== userId));
            setStats(prev => ({ ...prev, users: prev.users - 1 }));
            showToast("Kullanıcı silindi.", "success");
        } catch (err) {
            showToast("Kullanıcı silinemedi.", "error");
        }
    };

    if (loading) return (
        <div className="loading-container">
            <div className="spinner"></div>
            <p>Admin Paneli yükleniyor...</p>
        </div>
    );

    return (
        <div className="admin-page animate-fade-in">
            <div className="admin-header">
                <h1>Admin <span className="gold-text">Kontrol Paneli</span></h1>
                <p>Site istatistiklerini ve kullanıcıları buradan yönetebilirsin.</p>
            </div>

            {/* Custom Tabs */}
            <div className="admin-tabs">
                <button 
                    className={activeTab === 'overview' ? 'active' : ''} 
                    onClick={() => setActiveTab('overview')}
                >
                    Genel Bakış
                </button>
                <button 
                    className={activeTab === 'users' ? 'active' : ''} 
                    onClick={() => setActiveTab('users')}
                >
                    Kullanıcı Yönetimi
                </button>
            </div>

            {activeTab === 'overview' && (
                <div className="animate-fade-in">
                    <div className="admin-stats-grid">
                        <div className="stat-card glass-panel">
                            <div className="stat-icon"><FaUser /></div>
                            <div className="stat-info">
                                <h3>Toplam Üye</h3>
                                <p className="stat-number">{stats.users}</p>
                            </div>
                        </div>
                        <div className="stat-card glass-panel">
                            <div className="stat-icon"><FaStar /></div>
                            <div className="stat-info">
                                <h3>Toplam İnceleme</h3>
                                <p className="stat-number">{stats.reviews}</p>
                            </div>
                        </div>
                        <div className="stat-card glass-panel">
                            <div className="stat-icon"><FaList /></div>
                            <div className="stat-info">
                                <h3>Toplam Liste</h3>
                                <p className="stat-number">{stats.lists}</p>
                            </div>
                        </div>
                        <div className="stat-card glass-panel highlight-stat">
                            <div className="stat-icon"><FaClock /></div>
                            <div className="stat-info">
                                <h3>Bugün Yeni</h3>
                                <p className="stat-number">{stats.newReviewsToday}</p>
                            </div>
                        </div>
                    </div>

                    <div className="admin-notice glass-panel">
                        <p><strong>Bilgi:</strong> Şu an tüm istatistikler veritabanından anlık olarak çekilmektedir. Kullanıcı yönetimi sekmesinden yetkilendirme işlemlerini yapabilirsin.</p>
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="admin-users-section animate-fade-in">
                    <div className="glass-panel admin-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Kullanıcı</th>
                                    <th>E-posta</th>
                                    <th>Rol</th>
                                    <th>Katılım</th>
                                    <th>İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user._id}>
                                        <td>
                                            <div className="user-cell">
                                                <div className="user-avatar-mini">
                                                    {user.profilePic ? <img src={user.profilePic} alt="" /> : user.username.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="user-name">{user.username}</span>
                                            </div>
                                        </td>
                                        <td>{user.email}</td>
                                        <td>
                                            <span className={`role-badge ${user.role}`}>
                                                {user.role === 'admin' ? 'Yönetici' : 'Üye'}
                                            </span>
                                        </td>
                                        <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <div className="admin-actions-cell">
                                                <button 
                                                    onClick={() => handleRoleChange(user._id, user.role === 'admin' ? 'user' : 'admin')}
                                                    className="btn-action" 
                                                    title={user.role === 'admin' ? 'Üyeye Çevir' : 'Admin Yap'}
                                                >
                                                    <FaUserShield color={user.role === 'admin' ? 'var(--text-muted)' : 'var(--primary-color)'} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteUser(user._id)}
                                                    className="btn-action delete" 
                                                    title="Kullanıcıyı Sil"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;

