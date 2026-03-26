import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { getImageUrl } from '../services/tmdb';
import RatingStars from '../components/RatingStars';
import { FaUserPlus, FaUserMinus, FaUser, FaStar, FaList, FaFilm, FaChevronDown, FaChevronUp, FaTrash, FaClock } from 'react-icons/fa';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../components/Toast';
import './Profile.css';

const Profile = () => {
    const { userId } = useParams();
    const myUser = JSON.parse(localStorage.getItem('user') || 'null');
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const { showToast } = useToast();
    const [expandedListId, setExpandedListId] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, type: null, id: null });
    const [editingReview, setEditingReview] = useState(null);
    const [showFollowers, setShowFollowers] = useState(false);
    const [showFollowing, setShowFollowing] = useState(false);

    // Determine target ID (either the URL param or the logged-in user's ID)
    const targetUserId = userId || myUser?.id;

    useEffect(() => {
        const fetchProfile = async () => {
            if (!targetUserId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const res = await api.get(`/auth/profile/${targetUserId}`);
                setProfileData(res.data);
                setFollowersCount(res.data.user.followers?.length || 0);

                // Check if current user is in the followers array
                if (myUser && res.data.user.followers) {
                    const following = res.data.user.followers.some(f =>
                        (f._id || f) === myUser.id
                    );
                    setIsFollowing(following);
                }
            } catch (err) {
                console.error("Profile fetch error", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [targetUserId, myUser?.id]);

    const handleFollow = async () => {
        if (!myUser) {
            showToast("Takip etmek için giriş yapmalısınız.", 'error');
            return;
        }

        try {
            if (isFollowing) {
                await api.post(`/auth/unfollow/${profileData.user._id}`);
                setIsFollowing(false);
                setFollowersCount(prev => prev - 1);
                showToast("Takipten çıkıldı.", 'success');
            } else {
                await api.post(`/auth/follow/${profileData.user._id}`);
                setIsFollowing(true);
                setFollowersCount(prev => prev + 1);
                showToast("Takip edildi.", 'success');
            }
        } catch (err) {
            console.error("Follow error", err);
            showToast("Bir hata oluştu.", 'error');
        }
    };

    const toggleList = (id) => {
        setExpandedListId(expandedListId === id ? null : id);
    };

    const handleDeleteReview = (id) => {
        setConfirmDelete({ isOpen: true, type: 'review', id });
    };

    const handleDeleteList = (id) => {
        setConfirmDelete({ isOpen: true, type: 'list', id });
    };

    const confirmDeleteAction = async () => {
        const { type, id } = confirmDelete;
        try {
            if (type === 'review') {
                await api.delete(`/reviews/${id}`);
                setProfileData({
                    ...profileData,
                    reviews: profileData.reviews.filter(r => r._id !== id)
                });
                showToast("İnceleme silindi.", 'success');
            } else if (type === 'list') {
                await api.delete(`/lists/${id}`);
                setProfileData({
                    ...profileData,
                    lists: profileData.lists.filter(l => l._id !== id)
                });
                showToast("Liste silindi.", 'success');
            }
        } catch (error) {
            showToast("Silme işlemi başarısız.", 'error');
        } finally {
            setConfirmDelete({ isOpen: false, type: null, id: null });
        }
    };

    const handleUpdateReview = async (e) => {
        e.preventDefault();
        try {
            await api.post('/reviews', {
                tmdbId: editingReview.tmdbId,
                mediaType: editingReview.mediaType,
                rating: editingReview.rating,
                reviewText: editingReview.reviewText,
                movieTitle: editingReview.movieTitle,
                posterPath: editingReview.posterPath
            });
            setProfileData({
                ...profileData,
                reviews: profileData.reviews.map(r => r._id === editingReview.id ? { ...r, rating: editingReview.rating, reviewText: editingReview.reviewText } : r)
            });
            setEditingReview(null);
            showToast('İnceleme güncellendi.', 'success');
        } catch (error) {
            showToast('Güncelleme başarısız.', 'error');
        }
    };

    if (loading) return (
        <div className="loading-container" style={{ paddingTop: '100px' }}>
            <div className="spinner"></div>
            <p>Profil yükleniyor...</p>
        </div>
    );

    if (!profileData || !profileData.user) return (
        <div className="container" style={{ paddingTop: '100px', textAlign: 'center' }}>
            <h2>Kullanıcı bulunamadı.</h2>
            <p style={{ color: 'var(--text-muted)' }}>Aranan profil yok veya silinmiş olabilir.</p>
            <Link to="/community" className="btn-secondary" style={{ marginTop: '1rem', display: 'inline-block' }}>Topluluk Sayfasına Dön</Link>
        </div>
    );

    const { user, lists, reviews } = profileData;
    const isMyProfile = myUser && (myUser.id === user._id.toString());

    return (
        <div className="profile-page animate-fade-in" style={{ padding: '2rem' }}>
            {editingReview && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }} onClick={() => setEditingReview(null)}>
                    <form
                        onSubmit={handleUpdateReview}
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
                        <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)', textAlign: 'center' }}>İncelemeyi Düzenle</h2>
                        
                        <div className="form-group" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Puanınız</label>
                            <RatingStars rating={editingReview.rating} onChange={(val) => setEditingReview({ ...editingReview, rating: val })} />
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>Yorumunuz</label>
                            <textarea
                                rows="4"
                                value={editingReview.reviewText}
                                onChange={e => setEditingReview({ ...editingReview, reviewText: e.target.value })}
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
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="submit" className="btn-primary" style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: 700 }}>Güncelle</button>
                            <button type="button" className="btn-secondary" style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff' }} onClick={() => setEditingReview(null)}>Vazgeç</button>
                        </div>
                    </form>
                </div>
            )}
            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '2rem', borderRadius: '15px' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-color), #f39c12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', color: '#000', fontWeight: 'bold' }}>
                    {user.profilePic ? <img src={user.profilePic} alt={user.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : user.username.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }}>{user.username}</h1>
                    <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-muted)' }}>
                        <span style={{ cursor: 'pointer' }} onClick={() => setShowFollowers(true)} className="hover-text-primary"><strong style={{ color: '#fff' }}>{followersCount}</strong> Takipçi</span>
                        <span style={{ cursor: 'pointer' }} onClick={() => setShowFollowing(true)} className="hover-text-primary"><strong style={{ color: '#fff' }}>{user.following?.length || 0}</strong> Takip Edilen</span>
                        <span><strong style={{ color: '#fff' }}>{reviews?.length || 0}</strong> İnceleme</span>
                    </div>
                </div>

                {!isMyProfile && myUser && (
                    <button
                        onClick={handleFollow}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.6rem',
                            padding: '0.8rem 1.8rem', borderRadius: '25px', border: 'none', cursor: 'pointer',
                            fontWeight: 700, fontSize: '0.95rem', transition: 'all 0.3s',
                            background: isFollowing
                                ? 'linear-gradient(135deg, #e74c3c, #c0392b)'
                                : 'linear-gradient(135deg, var(--primary-color), #f39c12)',
                            color: isFollowing ? '#fff' : '#000',
                            boxShadow: isFollowing
                                ? '0 4px 15px rgba(231, 76, 60, 0.4)'
                                : '0 4px 15px rgba(212, 175, 55, 0.4)',
                        }}
                        className="hover-scale"
                    >
                        {isFollowing ? <><FaUserMinus /> Takipten Çık</> : <><FaUserPlus /> Takip Et</>}
                    </button>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <section>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FaStar style={{ color: 'var(--primary-color)' }} /> Son İncelemeler</h2>
                    {reviews?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {reviews.map(review => (
                                <div key={review._id} className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem' }}>
                                    <Link to={`/${review.mediaType}/${review.tmdbId}`}>
                                        {review.posterPath ? (
                                            <img src={getImageUrl(review.posterPath, 'w92')} alt={review.movieTitle} style={{ width: '60px', borderRadius: '8px' }} />
                                        ) : (
                                            <div style={{ width: '60px', height: '90px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaFilm /></div>
                                        )}
                                    </Link>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                                            <Link to={`/${review.mediaType}/${review.tmdbId}`} style={{ fontWeight: 'bold', color: '#fff', textDecoration: 'none' }}>{review.movieTitle || 'Film Detayı'}</Link>
                                            <RatingStars rating={review.rating} readonly />
                                        </div>
                                        <p style={{ color: '#ccc', fontSize: '0.9rem', margin: '0 0 0.8rem 0' }}>"{review.reviewText}"</p>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            <span><FaClock style={{ marginRight: '0.3rem' }} /> {new Date(review.createdAt).toLocaleDateString('tr-TR')}</span>
                                            {(isMyProfile || myUser?.role === 'admin') && (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button 
                                                        onClick={() => setEditingReview({ 
                                                            id: review._id, 
                                                            tmdbId: review.tmdbId, 
                                                            mediaType: review.mediaType,
                                                            rating: review.rating, 
                                                            reviewText: review.reviewText,
                                                            movieTitle: review.movieTitle,
                                                            posterPath: review.posterPath
                                                        })} 
                                                        style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.8rem' }}
                                                    >
                                                        Düzenle
                                                    </button>
                                                    <button onClick={() => handleDeleteReview(review._id)} style={{ background: 'none', border: 'none', color: '#ff7675', cursor: 'pointer' }} title="Sil">
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-muted)' }}>İnceleme yok.</p>
                    )}
                </section>

                <section>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FaList style={{ color: 'var(--primary-color)' }} /> {isMyProfile ? 'Tüm Listelerim' : 'Herkese Açık Listeler'}</h2>
                    {lists?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {lists.map((list, idx) => {
                                const listItemColors = ['#ff7675', '#74b9ff', '#55efc4', '#ffeaa7', '#a29bfe', '#fd79a8'];
                                return (
                                    <div key={list._id} className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', transition: 'all 0.3s', backgroundColor: expandedListId === list._id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => toggleList(list._id)}>
                                            <div>
                                                <h3 style={{ fontSize: '1.3rem', marginBottom: '0.3rem', color: '#fff' }}>{list.name}</h3>
                                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{list.items?.length || 0} içerik</p>
                                                {list.description && (
                                                    <p style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '0.4rem', fontStyle: 'italic' }}>{list.description}</p>
                                                )}

                                                {/* Unexpanded Preview Row */}
                                                {expandedListId !== list._id && list.items?.length > 0 && (
                                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', overflow: 'hidden' }}>
                                                        {list.items.slice(0, 5).map((item, i) => (
                                                            <div key={i} style={{ flexShrink: 0 }}>
                                                                {item.posterPath ? (
                                                                    <img src={getImageUrl(item.posterPath, 'w92')} alt={item.title} style={{ width: '40px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                                ) : (
                                                                    <div style={{ width: '40px', height: '60px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <FaFilm size={12} color="var(--text-muted)" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                        {list.items.length > 5 && (
                                                            <div style={{ width: '40px', height: '60px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.1)' }}>+{list.items.length - 5}</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '1.2rem', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {(isMyProfile || myUser?.role === 'admin') && !['favorites', 'watchlist', 'watched'].includes(list.type) && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteList(list._id); }}
                                                        style={{ background: 'none', border: 'none', color: '#ff7675', cursor: 'pointer', fontSize: '0.9rem' }}
                                                        title="Listeyi Sil"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                )}
                                                {expandedListId === list._id ? <FaChevronUp /> : <FaChevronDown />}
                                            </div>
                                        </div>

                                        {/* Expanded Content View */}
                                        {expandedListId === list._id && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                                {list.items?.length > 0 ? (
                                                    list.items.map(item => (
                                                        <Link to={`/${item.mediaType || 'movie'}/${item.tmdbId}`} key={item.tmdbId} style={{ textDecoration: 'none', color: '#fff', textAlign: 'center' }} className="hover-scale">
                                                            {item.posterPath ? (
                                                                <img src={getImageUrl(item.posterPath, 'w200')} alt={item.title} style={{ width: '100%', borderRadius: '8px', marginBottom: '0.5rem' }} />
                                                            ) : (
                                                                <div style={{ width: '100%', aspectRatio: '2/3', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}><FaFilm /></div>
                                                            )}
                                                            <div style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                                                        </Link>
                                                    ))
                                                ) : (
                                                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '1rem 0' }}>Bu listede henüz içerik yok.</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-muted)' }}>Liste yok.</p>
                    )}
                </section>
            </div>

            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                title={confirmDelete.type === 'review' ? "İncelemeyi Sil" : "Listeyi Sil"}
                message="Bunu kalıcı olarak silmek istediğinize emin misiniz?"
                onConfirm={confirmDeleteAction}
                onCancel={() => setConfirmDelete({ isOpen: false, type: null, id: null })}
            />

            {/* Followers Modal */}
            {showFollowers && (
                <div className="modal-overlay" onClick={() => setShowFollowers(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass-panel animate-scale-up" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '420px', padding: '2rem', maxHeight: '80vh', overflowY: 'auto', borderRadius: '16px', position: 'relative' }}>
                        <button onClick={() => setShowFollowers(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} className="hover-bg-primary">×</button>
                        <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FaUserPlus style={{ color: 'var(--primary-color)' }} /> Takipçiler <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 400 }}>({user.followers?.length || 0})</span>
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {user.followers?.length > 0 ? user.followers.map(f => (
                                <Link to={`/profile/${f.username || f._id}`} key={f._id} onClick={() => setShowFollowers(false)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: '#fff', padding: '0.75rem', borderRadius: '10px', transition: 'background 0.3s', border: '1px solid transparent' }} className="hover-bg-primary">
                                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-color), #f39c12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold', fontSize: '1.1rem', flexShrink: 0 }}>
                                        {f.profilePic ? <img src={f.profilePic} alt={f.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (f.username?.charAt(0).toUpperCase() || <FaUser />)}
                                    </div>
                                    <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>{f.username || 'Kullanıcı'}</span>
                                </Link>
                            )) : <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>Henüz takipçi yok.</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* Following Modal */}
            {showFollowing && (
                <div className="modal-overlay" onClick={() => setShowFollowing(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass-panel animate-scale-up" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '420px', padding: '2rem', maxHeight: '80vh', overflowY: 'auto', borderRadius: '16px', position: 'relative' }}>
                        <button onClick={() => setShowFollowing(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} className="hover-bg-primary">×</button>
                        <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FaUserPlus style={{ color: 'var(--primary-color)' }} /> Takip Edilenler <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 400 }}>({user.following?.length || 0})</span>
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {user.following?.length > 0 ? user.following.map(f => (
                                <Link to={`/profile/${f.username || f._id}`} key={f._id} onClick={() => setShowFollowing(false)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: '#fff', padding: '0.75rem', borderRadius: '10px', transition: 'background 0.3s', border: '1px solid transparent' }} className="hover-bg-primary">
                                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-color), #f39c12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold', fontSize: '1.1rem', flexShrink: 0 }}>
                                        {f.profilePic ? <img src={f.profilePic} alt={f.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (f.username?.charAt(0).toUpperCase() || <FaUser />)}
                                    </div>
                                    <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>{f.username || 'Kullanıcı'}</span>
                                </Link>
                            )) : <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>Kimseyi takip etmiyor.</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
