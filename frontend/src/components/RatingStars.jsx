import React, { useState } from 'react';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';

const RatingStars = ({ rating, onChange, readonly = false }) => {
    const [hover, setHover] = useState(null);

    const stars = [];
    const displayRating = hover || rating || 0;

    const handleRating = (val) => {
        if (!readonly && onChange) {
            onChange(val);
        }
    };

    for (let i = 1; i <= 5; i++) {
        const starValue = i;
        const halfStarValue = i - 0.5;

        // Determine which icon to show for this star position
        let Icon;
        if (displayRating >= starValue) {
            Icon = FaStar;
        } else if (displayRating >= halfStarValue) {
            Icon = FaStarHalfAlt;
        } else {
            Icon = FaRegStar;
        }

        stars.push(
            <div 
                key={i} 
                style={{ 
                    position: 'relative', 
                    display: 'inline-block',
                    cursor: readonly ? 'default' : 'pointer'
                }}
                onMouseLeave={() => !readonly && setHover(null)}
            >
                {/* Left Half (invisible trigger) */}
                {!readonly && (
                    <div 
                        style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '100%', zIndex: 2 }}
                        onMouseEnter={() => setHover(halfStarValue)}
                        onClick={() => handleRating(halfStarValue)}
                    />
                )}
                {/* Right Half (invisible trigger) */}
                {!readonly && (
                    <div 
                        style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '100%', zIndex: 2 }}
                        onMouseEnter={() => setHover(starValue)}
                        onClick={() => handleRating(starValue)}
                    />
                )}
                
                <Icon 
                    size={28}
                    color={displayRating >= halfStarValue ? '#fbbf24' : '#475569'}
                    style={{ transition: 'color 0.2s ease', display: 'block' }}
                />
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {stars}
            {displayRating > 0 && (
                <span style={{ marginLeft: '8px', color: '#fbbf24', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    {displayRating}
                </span>
            )}
        </div>
    );
};

export default RatingStars;
