import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDetails, getImageUrl } from '../services/tmdb';
import api from '../services/api';
import RatingStars from '../components/RatingStars';
import { useToast } from '../components/Toast';
import { FaHeart, FaEye, FaPlus, FaCheck, FaList, FaTrash, FaUser } from 'react-icons/fa';
import './MovieDetails.css';
import ConfirmModal from '../components/ConfirmModal';
import { useUserLists } from '../context/UserListsContext';

const MovieDetails = ({ type }) => {
    const { id } = useParams();
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [myRating, setMyRating] = useState(0);
    const [myReviewText, setMyReviewText] = useState('');
    const [userReviews, setUserReviews] = useState([]);
    const { userLists } = useUserLists();
    const [showListMenu, setShowListMenu] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, reviewId: null });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAddingToList, setIsAddingToList] = useState(false);
    const token = localStorage.getItem('token');
    const { showToast } = useToast();

    const fetchDetails = async () => {
        try {
            const res = await getDetails(type, id);
            setDetails(res.data);

            // Fetch reviews from our backend
            try {
                const reviewsRes = await api.get(`/reviews/${id}/${type}`);
                setUserReviews(reviewsRes.data);

                // If logged in, find my review
                const user = JSON.parse(localStorage.getItem('user') || 'null');
                if (user) {
                    const myOldReview = reviewsRes.data.find(r => r.user._id === user.id);
                    if (myOldReview) {
                        setMyRating(myOldReview.rating);
                        setMyReviewText(myOldReview.reviewText || '');
                    }
                }
            } catch (reviewErr) {
                console.error("Error fetching reviews:", reviewErr);
            }
        } catch (error) {
            console.error("Error fetching details:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [id, type]);

    const handleRatingSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await api.post('/reviews', {
                tmdbId: id,
                mediaType: type,
                rating: myRating,
                reviewText: myReviewText,
                movieTitle: details.title || details.name,
                posterPath: details.poster_path
            });
            showToast('İnceleme başarıyla gönderildi!', 'success');
            fetchDetails(); // Refresh reviews
        } catch (err) {
            showToast('İnceleme gönderilirken hata oluştu', 'error');
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddToList = async (listId, listName) => {
        if (isAddingToList) return;
        setIsAddingToList(true);
        try {
            await api.post(`/lists/${listId}/items`, {
                tmdbId: id,
                mediaType: type,
                posterPath: details.poster_path
            });
            showToast(`${listName} listesine eklendi!`, 'success');
            setShowListMenu(false);
        } catch (err) {
            showToast('İçerik zaten bu listede', 'error');
        } finally {
            setIsAddingToList(false);
        }
    };

    const handleDeleteReview = async (reviewId) => {
        setConfirmDelete({ isOpen: true, reviewId });
    };

    const confirmDeleteReview = async () => {
        const reviewId = confirmDelete.reviewId;
        try {
            await api.delete(`/reviews/${reviewId}`);
            setUserReviews(userReviews.filter(r => r._id !== reviewId));
            showToast('İnceleme başarıyla silindi.', 'success');
        } catch (err) {
            showToast('Silme işlemi başarısız oldu.', 'error');
        }
    };

    if (loading) return <div className="loading">Yükleniyor...</div>;
    if (!details) return <div>Bulunamadı</div>;

    return (
        <div className="movie-details animate-fade-in">
            <div className="backdrop-container" style={{ backgroundImage: `url(${getImageUrl(details.backdrop_path, 'original')})` }}>
                <div className="backdrop-overlay"></div>
            </div>

            <div className="details-content container">
                <img src={getImageUrl(details.poster_path)} alt={details.title} className="details-poster" />

                <div className="details-info">
                    <h1 className="title">{details.title || details.name}</h1>
                    <p className="tagline">{details.tagline}</p>

                    <div className="meta" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span>{details.release_date || details.first_air_date}</span>
                        <span>•</span>
                        <span style={{
                            background: 'rgba(245, 158, 11, 0.2)',
                            color: '#fbbf24',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontWeight: 'bold'
                        }}>
                            ⭐ TMDB: {details.vote_average?.toFixed(1)} / 10
                        </span>

                        {userReviews.length > 0 && (
                            <span style={{
                                background: 'rgba(59, 130, 246, 0.2)',
                                color: '#60a5fa',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontWeight: 'bold'
                            }}>
                                ⭐ RateFlix: {(userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length).toFixed(1)} / 5
                            </span>
                        )}
                    </div>

                    <p className="overview">{details.overview}</p>

                    {token && (
                        <div className="actions" style={{ marginTop: '2rem', display: 'flex', gap: '0.8rem', position: 'relative' }}>
                            <div style={{ position: 'relative' }}>
                                <button
                                    className="btn-primary"
                                    onClick={() => setShowListMenu(!showListMenu)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    + Listeye Ekle
                                </button>

                                {showListMenu && (
                                    <div className="glass-panel animate-slide-in" style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        marginTop: '10px',
                                        zIndex: 100,
                                        minWidth: '200px',
                                        padding: '10px',
                                        maxHeight: '300px',
                                        overflowY: 'auto'
                                    }}>
                                        <div style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--primary-color)', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                            LİSTELERİM
                                        </div>
                                        {userLists.length === 0 ? (
                                            <div style={{ padding: '15px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                Henüz listeniz yok.<br />
                                                <Link to="/lists" style={{ color: 'var(--primary-color)', textDecoration: 'underline', marginTop: '5px', display: 'inline-block' }}>
                                                    Listelerim'e git
                                                </Link>
                                            </div>
                                        ) : (
                                            userLists
                                                .sort((a, b) => {
                                                    const order = { 'watched': 1, 'watchlist': 2, 'favorites': 3, 'custom': 4 };
                                                    return (order[a.type] || 5) - (order[b.type] || 5);
                                                })
                                                .map(list => {
                                                    const listNameMapping = {
                                                        'watchlist': 'İzleyeceklerim',
                                                        'watched': 'İzlediklerim',
                                                        'favorites': 'Favorilerim'
                                                    };
                                                    const iconMapping = {
                                                        'watchlist': <FaEye />,
                                                        'watched': <FaCheck />,
                                                        'favorites': <FaHeart />
                                                    };
                                                    return (
                                                        <button
                                                            key={list._id}
                                                            onClick={() => handleAddToList(list._id, listNameMapping[list.type] || list.name)}
                                                            style={{
                                                                width: '100%',
                                                                padding: '10px',
                                                                textAlign: 'left',
                                                                background: 'none',
                                                                border: 'none',
                                                                color: '#fff',
                                                                cursor: 'pointer',
                                                                borderRadius: '4px',
                                                                fontSize: '0.9rem',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '10px'
                                                            }}
                                                            className="list-item-hover"
                                                        >
                                                            <span style={{ color: list.type === 'favorites' ? '#e74c3c' : (list.type === 'watched' ? '#2ecc71' : 'var(--primary-color)') }}>
                                                                {iconMapping[list.type] || <FaList />}
                                                            </span>
                                                            {listNameMapping[list.type] || list.name}
                                                        </button>
                                                    );
                                                })
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="reviews-section container">
                <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem' }}>
                    <h2>Puan Ver ve İncele</h2>
                    {token ? (
                        <form onSubmit={handleRatingSubmit} style={{ marginTop: '1rem' }}>
                            <div className="form-group">
                                <label>Puanınız ({myRating}/5)</label>
                                <RatingStars rating={myRating} onChange={setMyRating} />
                            </div>
                            <div className="form-group" style={{ marginTop: '1rem' }}>
                                <label>İncelemeniz</label>
                                <textarea
                                    rows="4"
                                    value={myReviewText}
                                    onChange={e => setMyReviewText(e.target.value)}
                                    placeholder="Düşüncelerinizi yazın..."
                                ></textarea>
                            </div>
                            <button type="submit" className="btn-primary" disabled={myRating === 0 || isSubmitting} title={myRating === 0 ? "Lütfen önce yıldızlara tıklayarak puan verin" : ""}>
                                {isSubmitting ? "Gönderiliyor..." : (myRating === 0 ? "Puan Vererek Gönder" : "İncelemeyi Gönder")}
                            </button>
                        </form>
                    ) : (
                        <p style={{ color: 'var(--text-muted)' }}>Puan vermek ve inceleme yazmak için giriş yapmalısınız.</p>
                    )}
                </div>

                <div className="user-reviews" style={{ marginTop: '3rem' }}>
                    <h2>Topluluk İncelemeleri</h2>
                    {userReviews.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Henüz inceleme yok. İlk sen ol!</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                            {userReviews.map(review => (
                                <div key={review._id} className="glass-panel hover-scale" style={{ padding: '1.5rem', position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <Link to={`/profile/${review.user?.username || review.user?._id || review.user}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.8rem', color: '#fff' }} className="hover-text-primary">
                                            <div style={{ background: 'linear-gradient(135deg, var(--primary-color), #f39c12)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                                {review.user?.profilePic ? <img src={review.user.profilePic} alt={review.user.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : ((review.user?.username?.charAt(0).toUpperCase()) || <FaUser />)}
                                            </div>
                                            <strong style={{ fontSize: '1.1rem' }}>{review.user?.username || 'Kullanıcı'}</strong>
                                        </Link>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <RatingStars rating={review.rating} readonly />
                                            {token && (JSON.parse(localStorage.getItem('user'))?.id === review.user?._id || JSON.parse(localStorage.getItem('user'))?.role === 'admin') && (
                                                <button
                                                    onClick={() => handleDeleteReview(review._id)}
                                                    style={{ background: 'none', border: 'none', color: '#ff7675', cursor: 'pointer', fontSize: '1rem' }}
                                                    title="Sil"
                                                >
                                                    <FaTrash />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p>{review.reviewText}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                title="İncelemeyi Sil"
                message="Bu incelemeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
                onConfirm={confirmDeleteReview}
                onCancel={() => setConfirmDelete({ isOpen: false, reviewId: null })}
            />
        </div>
    );
};

export default MovieDetails;
