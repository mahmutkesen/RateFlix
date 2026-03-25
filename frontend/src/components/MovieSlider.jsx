import React, { useRef } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import MovieCard from './MovieCard';
import './MovieSlider.css';

const MovieSlider = ({ title, items, type }) => {
    const sliderRef = useRef(null);

    const scroll = (direction) => {
        if (sliderRef.current) {
            const { scrollLeft, clientWidth } = sliderRef.current;
            const scrollTo = direction === 'left'
                ? scrollLeft - clientWidth * 0.8
                : scrollLeft + clientWidth * 0.8;

            sliderRef.current.scrollTo({
                left: scrollTo,
                behavior: 'smooth'
            });
        }
    };

    if (!items || items.length === 0) return null;

    return (
        <section className="movie-slider-section animate-fade-in">
            <div className="slider-header">
                <h2 className="slider-title">{title}</h2>
                <div className="slider-controls">
                    <button className="slider-btn" onClick={() => scroll('left')} aria-label="Previous">
                        <FaChevronLeft />
                    </button>
                    <button className="slider-btn" onClick={() => scroll('right')} aria-label="Next">
                        <FaChevronRight />
                    </button>
                </div>
            </div>

            <div className="slider-container" ref={sliderRef}>
                <div className="slider-track">
                    {items.map((item) => (
                        <div className="slider-item" key={item.id}>
                            <MovieCard item={item} type={type || item.media_type} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default MovieSlider;
