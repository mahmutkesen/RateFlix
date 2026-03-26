import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getImageUrl } from '../services/tmdb';
import { FaPlus, FaTrash, FaFilm, FaTv, FaList } from 'react-icons/fa';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import { useUserLists } from '../context/UserListsContext';

const Lists = () => {
    const { userLists: lists, loading, refreshLists } = useUserLists();
    const [newListName, setNewListName] = useState('');
    const [newListDesc, setNewListDesc] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, listId: null });
    const [editingList, setEditingList] = useState(null); // { id, name, description, isPublic }
    const { showToast } = useToast();
    const navigate = useNavigate();

    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
        }
    }, [token, navigate]);

    const handleCreateList = async (e) => {
        e.preventDefault();
        if (!newListName.trim() || isCreating) return;
        setIsCreating(true);
        try {
            await api.post('/lists', { name: newListName, description: newListDesc, isPublic: isPublic });
            setNewListName('');
            setNewListDesc('');
            setIsPublic(false);
            setShowForm(false);
            refreshLists();
            showToast('Liste başarıyla oluşturuldu.', 'success');
        } catch (error) {
            showToast('Liste oluşturulamadı.', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteList = (id) => {
        setConfirmDelete({ isOpen: true, listId: id });
    };

    const confirmDeleteList = async () => {
        const id = confirmDelete.listId;
        try {
            await api.delete(`/lists/${id}`);
            refreshLists();
            showToast('Liste silindi.', 'success');
        } catch (error) {
            showToast('Bu liste silinemez (Varsayılan listeler silinemez)', 'error');
        }
    };

    const handleRemoveItem = async (listId, tmdbId) => {
        try {
            await api.delete(`/lists/${listId}/items/${tmdbId}`);
            refreshLists();
            showToast('İçerik listeden çıkarıldı.', 'success');
        } catch (error) {
            showToast('İşlem başarısız oldu.', 'error');
        }
    };

    const handleUpdateList = async (e) => {
        e.preventDefault();
        try {
            await api.patch(`/lists/${editingList.id}`, {
                name: editingList.name,
                description: editingList.description,
                isPublic: editingList.isPublic
            });
            setEditingList(null);
            refreshLists();
            showToast('Liste güncellendi.', 'success');
        } catch (error) {
            showToast('Liste güncellenemedi.', 'error');
        }
    };

    const toggleListVisibility = async (list) => {
        try {
            await api.patch(`/lists/${list._id}`, { isPublic: !list.isPublic });
            refreshLists();
            showToast(list.isPublic ? 'Liste topluluktan kaldırıldı.' : 'Liste toplulukla paylaşıldı.', 'success');
        } catch (error) {
            showToast('İşlem başarısız oldu.', 'error');
        }
    };

    if (loading) return (
        <div className="loading" style={{ paddingTop: '100px' }}>
            Listeler Yükleniyor...
        </div>
    );

    return (
        <>
        <div style={{ paddingTop: '90px', paddingBottom: '4rem', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{
                background: 'radial-gradient(ellipse at top, rgba(212,175,55,0.12) 0%, transparent 60%)',
                borderBottom: '1px solid rgba(212,175,55,0.1)',
                padding: '3rem 0 2.5rem',
                marginBottom: '3rem',
                textAlign: 'center'
            }}>
                <div className="container">
                    <h1 style={{
                        fontSize: '2.8rem',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #d4af37 0%, #f39c12 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-1px',
                        marginBottom: '0.5rem'
                    }}>
                        Listelerim
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                        Favori film ve dizilerinizi düzenleyin
                    </p>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <FaPlus /> {showForm ? 'İptal' : 'Yeni Liste Oluştur'}
                    </button>
                </div>
            </div>

            <div className="container">
                {/* Create List Form */}
                {showForm && (
                    <form
                        onSubmit={handleCreateList}
                        className="glass-panel animate-fade-in"
                        style={{ padding: '2rem', marginBottom: '3rem' }}
                    >
                        <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)' }}>
                            Yeni Liste
                        </h3>
                        <div className="form-group">
                            <label>Liste Adı *</label>
                            <input
                                type="text"
                                value={newListName}
                                onChange={e => setNewListName(e.target.value)}
                                placeholder="Örn. Tüm Zamanların En İyileri"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Açıklama (İsteğe bağlı)</label>
                            <input
                                type="text"
                                value={newListDesc}
                                onChange={e => setNewListDesc(e.target.value)}
                                placeholder="Bu liste hakkında kısa bir açıklama..."
                            />
                        </div>
                        <div className="form-group" style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            background: 'rgba(255,255,255,0.05)',
                            padding: '1rem',
                            borderRadius: '12px',
                            marginBottom: '1.5rem',
                            cursor: 'pointer'
                        }} onClick={() => setIsPublic(!isPublic)}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff' }}>Toplulukla Paylaş</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Diğer üyeler görebilir.</div>
                            </div>
                            <div 
                                style={{
                                    width: '44px',
                                    height: '24px',
                                    background: isPublic ? 'var(--primary-color)' : 'rgba(255,255,255,0.2)',
                                    borderRadius: '12px',
                                    position: 'relative',
                                    transition: 'all 0.3s'
                                }}
                            >
                                <div style={{
                                    width: '18px',
                                    height: '18px',
                                    background: '#fff',
                                    borderRadius: '50%',
                                    position: 'absolute',
                                    top: '3px',
                                    left: isPublic ? '23px' : '3px',
                                    transition: 'all 0.3s'
                                }}></div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="submit" className="btn-primary" disabled={isCreating} style={{ flex: 1, padding: '12px', borderRadius: '10px' }}>
                                {isCreating ? 'Oluşturuluyor...' : 'Listeyi Oluştur'}
                            </button>
                            <button 
                                type="button" 
                                className="btn-secondary" 
                                onClick={() => setShowForm(false)} 
                                style={{ 
                                    flex: 1, 
                                    padding: '12px', 
                                    borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.1)',
                                    color: '#fff',
                                    border: 'none'
                                }}
                            >
                                Vazgeç
                            </button>
                        </div>
                    </form>
                )}
                
                {/* Lists */}
                {lists.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '4rem' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.3 }}>
                            <FaList />
                        </div>
                        <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Henüz liste yok</h2>
                        <p style={{ color: 'var(--text-muted)' }}>
                            İlk listenizi oluşturun ve film eklemeye başlayın!
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                        {lists.map(list => (
                            <div key={list._id} className="glass-panel" style={{ padding: '2rem', overflow: 'hidden' }}>
                                {/* List Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                    <div>
                                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                                            {list.name}
                                        </h2>
                                        {list.description && (
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{list.description}</p>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                background: 'rgba(212,175,55,0.15)',
                                                color: 'var(--primary-color)',
                                                padding: '2px 10px',
                                                borderRadius: '20px',
                                                fontSize: '0.8rem',
                                                fontWeight: 600
                                            }}>
                                                {list.items.length} içerik
                                            </span>
                                            {list.isPublic && (
                                                <span style={{ fontSize: '0.75rem', color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    • Toplulukta Paylaşıldı
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => setEditingList({ id: list._id, name: list.name, description: list.description || '', isPublic: list.isPublic })}
                                            style={{
                                                background: 'rgba(212,175,55,0.1)',
                                                border: '1px solid rgba(212,175,55,0.3)',
                                                color: 'var(--primary-color)',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            Düzenle
                                        </button>
                                        <button
                                            onClick={() => handleDeleteList(list._id)}
                                            style={{
                                                background: 'rgba(231,76,60,0.1)',
                                                border: '1px solid rgba(231,76,60,0.3)',
                                                color: 'var(--danger-color)',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            }}
                                        >
                                            <FaTrash /> Sil
                                        </button>
                                    </div>
                                </div>

                                {/* Items */}
                                {list.items.length === 0 ? (
                                    <div style={{
                                        padding: '2rem',
                                        border: '2px dashed rgba(212,175,55,0.2)',
                                        borderRadius: '12px',
                                        textAlign: 'center',
                                        color: 'var(--text-muted)'
                                    }}>
                                        <FaFilm style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.4 }} />
                                        <p>Bu liste boş.</p>
                                        <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                                            Bir filmin sayfasına gidin ve buraya eklemek için <strong style={{ color: 'var(--primary-color)' }}>"Listeye Ekle"</strong>ye tıklayın.
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{
                                        display: 'flex',
                                        gap: '1.2rem',
                                        overflowX: 'auto',
                                        paddingBottom: '1rem',
                                        scrollbarWidth: 'thin',
                                        scrollbarColor: 'rgba(212,175,55,0.3) transparent'
                                    }}>
                                        {(list.items || []).map(item => (
                                            <div
                                                key={item.tmdbId}
                                                style={{ position: 'relative', minWidth: '130px', maxWidth: '130px' }}
                                            >
                                                {/* Remove Button */}
                                                <button
                                                    onClick={() => handleRemoveItem(list._id, item.tmdbId)}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '6px',
                                                        right: '6px',
                                                        zIndex: 2,
                                                        background: 'rgba(0,0,0,0.75)',
                                                        border: '1px solid rgba(231,76,60,0.4)',
                                                        color: '#e74c3c',
                                                        width: '26px',
                                                        height: '26px',
                                                        borderRadius: '50%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        fontSize: '0.7rem',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    title="Listeden çıkar"
                                                >
                                                    ✕
                                                </button>

                                                <Link
                                                    to={`/${item.mediaType || 'movie'}/${item.tmdbId}`}
                                                    style={{ display: 'block', textDecoration: 'none' }}
                                                >
                                                    {item.posterPath ? (
                                                        <img
                                                            src={getImageUrl(item.posterPath, 'w300')}
                                                            alt="poster"
                                                            style={{
                                                                width: '130px',
                                                                height: '195px',
                                                                objectFit: 'cover',
                                                                borderRadius: '10px',
                                                                boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
                                                                display: 'block',
                                                                transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                                                            }}
                                                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(212,175,55,0.3)'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.5)'; }}
                                                        />
                                                    ) : (
                                                        <div style={{
                                                            width: '130px',
                                                            height: '195px',
                                                            borderRadius: '10px',
                                                            background: 'rgba(255,255,255,0.05)',
                                                            border: '1px solid rgba(212,175,55,0.2)',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: 'var(--text-muted)',
                                                            gap: '0.5rem'
                                                        }}>
                                                            {item.mediaType === 'tv' ? <FaTv style={{ fontSize: '2rem' }} /> : <FaFilm style={{ fontSize: '2rem' }} />}
                                                            <span style={{ fontSize: '0.7rem', textAlign: 'center', padding: '0 0.5rem' }}>
                                                                ID: {item.tmdbId}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div style={{
                                                        marginTop: '0.5rem',
                                                        fontSize: '0.78rem',
                                                        color: 'var(--text-muted)',
                                                        textAlign: 'center',
                                                        lineHeight: 1.3,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '0.25rem'
                                                    }}>
                                                        {item.mediaType === 'tv'
                                                            ? <FaTv style={{ color: '#60a5fa', fontSize: '0.65rem' }} />
                                                            : <FaFilm style={{ color: '#d4af37', fontSize: '0.65rem' }} />
                                                        }
                                                        {item.mediaType === 'tv' ? 'Dizi' : 'Film'}
                                                    </div>
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
        {editingList && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', zIndex: 1000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                    }} onClick={() => setEditingList(null)}>
                        <form
                            onSubmit={handleUpdateList}
                            className="glass-panel animate-scale-up"
                            style={{ 
                                padding: '2.5rem', 
                                width: '100%', 
                                maxWidth: '500px', 
                                border: '1px solid rgba(255,255,255,0.15)',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)', textAlign: 'center', fontSize: '1.8rem' }}>Listeyi Düzenle</h2>
                            
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>Liste Adı</label>
                                <input
                                    type="text"
                                    value={editingList.name}
                                    onChange={e => setEditingList({ ...editingList, name: e.target.value })}
                                    style={{ 
                                        width: '100%', 
                                        padding: '12px 16px', 
                                        fontSize: '1.05rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        color: '#fff'
                                    }}
                                    required
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>Açıklama</label>
                                <textarea
                                    rows="3"
                                    value={editingList.description}
                                    onChange={e => setEditingList({ ...editingList, description: e.target.value })}
                                    style={{ 
                                        width: '100%', 
                                        padding: '12px 16px', 
                                        fontSize: '1rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        color: '#fff',
                                        resize: 'none'
                                    }}
                                    placeholder="Liste hakkında kısa bir bilgi..."
                                />
                            </div>

                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                background: 'rgba(255,255,255,0.05)',
                                padding: '1rem',
                                borderRadius: '12px',
                                marginBottom: '2rem'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '1rem', color: '#fff' }}>Toplulukla Paylaş</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Diğer üyeler bu listeyi görebilir.</div>
                                </div>
                                <div 
                                    onClick={() => setEditingList({ ...editingList, isPublic: !editingList.isPublic })}
                                    style={{
                                        width: '50px',
                                        height: '26px',
                                        background: editingList.isPublic ? 'var(--primary-color)' : 'rgba(255,255,255,0.2)',
                                        borderRadius: '13px',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s'
                                    }}
                                >
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        background: '#fff',
                                        borderRadius: '50%',
                                        position: 'absolute',
                                        top: '3px',
                                        left: editingList.isPublic ? '27px' : '3px',
                                        transition: 'all 0.3s',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }}></div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: 700 }}>Değişiklikleri Kaydet</button>
                                <button 
                                    type="button" 
                                    className="btn-secondary" 
                                    style={{ 
                                        flex: 1, 
                                        padding: '14px', 
                                        borderRadius: '12px', 
                                        fontWeight: 700,
                                        background: 'rgba(255,255,255,0.1)',
                                        color: '#fff',
                                        border: 'none'
                                    }} 
                                    onClick={() => setEditingList(null)}
                                >
                                    Vazgeç
                                </button>
                            </div>
                        </form>
                    </div>
                )}

            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                title="Listeyi Sil"
                message="Bu listeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
                onConfirm={confirmDeleteList}
                onCancel={() => setConfirmDelete({ isOpen: false, listId: null })}
            />
        </>
    );
};

export default Lists;
