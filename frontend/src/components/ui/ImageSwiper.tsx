'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- DATA STRUCTURE INTERFACE ---
export interface CardData {
  id: number;
  imageUrl: string;
  title: string;
}

// --- PROPS INTERFACE ---
interface ImageSwiperProps {
  cards: CardData[];
  cardWidth?: number;
  cardHeight?: number;
  className?: string;
  autoSwipeInterval?: number; // Auto swipe interval in milliseconds (default: 4000ms)
  enableAutoSwipe?: boolean; // Enable/disable auto swipe (default: true)
}

export const ImageSwiper: React.FC<ImageSwiperProps> = ({
  cards,
  cardWidth: propCardWidth = 320,
  cardHeight: propCardHeight = 400,
  className = '',
  autoSwipeInterval = 4000, // Default 4 seconds
  enableAutoSwipe = true,
}) => {
  // Responsive card dimensions
  const [dimensions, setDimensions] = useState({ width: propCardWidth, height: propCardHeight });
  const [isPaused, setIsPaused] = useState(false); // Pause auto-swipe on user interaction
  
  useEffect(() => {
    const updateDimensions = () => {
      const screenWidth = window.innerWidth;
      if (screenWidth < 480) {
        setDimensions({ width: Math.min(280, screenWidth - 60), height: 360 });
      } else if (screenWidth < 768) {
        setDimensions({ width: 320, height: 420 });
      } else if (screenWidth < 1024) {
        setDimensions({ width: 360, height: 460 });
      } else {
        setDimensions({ width: propCardWidth, height: propCardHeight });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [propCardWidth, propCardHeight]);

  const cardWidth = dimensions.width;
  const cardHeight = dimensions.height;
  // --- STATE AND REFS ---
  const cardStackRef = useRef<HTMLDivElement>(null);
  const isSwiping = useRef(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const animationFrameId = useRef<number | null>(null);
  const autoSwipeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [cardOrder, setCardOrder] = useState<number[]>(() =>
    Array.from({ length: cards.length }, (_, i) => i)
  );

  // --- HELPER FUNCTIONS (MEMOIZED) ---

  const getCards = useCallback((): HTMLElement[] => {
    if (!cardStackRef.current) return [];
    return Array.from(cardStackRef.current.querySelectorAll('.image-card'));
  }, []);

  const getActiveCard = useCallback((): HTMLElement | null => {
    return getCards()[0] || null;
  }, [getCards]);

  const updateCardPositions = useCallback(() => {
    getCards().forEach((card, i) => {
      card.style.setProperty('--i', i.toString());
      card.style.setProperty('--swipe-x', '0px');
      card.style.setProperty('--swipe-rotate', '0deg');
      card.style.opacity = '1';
      card.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease';
    });
  }, [getCards]);

  const applySwipeStyles = useCallback((deltaX: number) => {
    const card = getActiveCard();
    if (!card) return;
    const rotation = deltaX * 0.08;
    const opacity = 1 - Math.abs(deltaX) / (cardWidth * 2);
    card.style.setProperty('--swipe-x', `${deltaX}px`);
    card.style.setProperty('--swipe-rotate', `${rotation}deg`);
    card.style.opacity = Math.max(0.3, opacity).toString();
  }, [getActiveCard, cardWidth]);

  // --- AUTO SWIPE FUNCTION ---
  const performAutoSwipe = useCallback(() => {
    const card = getActiveCard();
    if (!card || isSwiping.current) return;

    // Animate the card to the left
    card.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease';
    const swipeOutX = -cardWidth * 1.5;
    card.style.setProperty('--swipe-x', `${swipeOutX}px`);
    card.style.setProperty('--swipe-rotate', '-15deg');
    card.style.opacity = '0';

    setTimeout(() => {
      setCardOrder(prev => [...prev.slice(1), prev[0]]);
    }, 450);
  }, [getActiveCard, cardWidth]);

  // --- AUTO SWIPE EFFECT ---
  useEffect(() => {
    if (!enableAutoSwipe || isPaused || cards.length <= 1) return;

    // Clear any existing timeout
    if (autoSwipeTimeoutRef.current) {
      clearTimeout(autoSwipeTimeoutRef.current);
    }

    // Set new timeout for auto swipe
    autoSwipeTimeoutRef.current = setTimeout(() => {
      performAutoSwipe();
    }, autoSwipeInterval);

    return () => {
      if (autoSwipeTimeoutRef.current) {
        clearTimeout(autoSwipeTimeoutRef.current);
      }
    };
  }, [enableAutoSwipe, isPaused, cardOrder, autoSwipeInterval, performAutoSwipe, cards.length]);

  // --- INTERACTION HANDLERS (MEMOIZED) ---

  const handleStart = useCallback((clientX: number) => {
    if (isSwiping.current) return;
    isSwiping.current = true;
    setIsPaused(true); // Pause auto-swipe during manual interaction
    startX.current = clientX;
    currentX.current = clientX;

    const card = getActiveCard();
    if (card) {
      card.style.transition = 'none';
    }

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
  }, [getActiveCard]);

  const handleMove = useCallback((clientX: number) => {
    if (!isSwiping.current) return;
    currentX.current = clientX;

    animationFrameId.current = requestAnimationFrame(() => {
      const deltaX = currentX.current - startX.current;
      applySwipeStyles(deltaX);
    });
  }, [applySwipeStyles]);

  const handleEnd = useCallback(() => {
    if (!isSwiping.current) return;
    isSwiping.current = false;

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }

    const deltaX = currentX.current - startX.current;
    const threshold = cardWidth / 3;
    const card = getActiveCard();
    if (!card) return;

    card.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease';

    if (Math.abs(deltaX) > threshold) {
      const direction = Math.sign(deltaX);
      const swipeOutX = direction * (cardWidth * 1.8);
      card.style.setProperty('--swipe-x', `${swipeOutX}px`);
      card.style.setProperty('--swipe-rotate', `${direction * 20}deg`);
      card.style.opacity = '0';

      setTimeout(() => {
        setCardOrder(prev => [...prev.slice(1), prev[0]]);
      }, 350);
    } else {
      applySwipeStyles(0);
    }

    // Resume auto-swipe after a delay
    setTimeout(() => {
      setIsPaused(false);
    }, 1000);
  }, [getActiveCard, applySwipeStyles, cardWidth]);

  // --- LIFECYCLE HOOKS ---

  useEffect(() => {
    const element = cardStackRef.current;
    if (!element) return;

    const onPointerDown = (e: PointerEvent) => handleStart(e.clientX);
    const onPointerMove = (e: PointerEvent) => handleMove(e.clientX);
    const onPointerUp = () => handleEnd();
    const onPointerLeave = () => handleEnd();

    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('pointerleave', onPointerLeave);

    return () => {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('pointerleave', onPointerLeave);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [handleStart, handleMove, handleEnd]);

  useEffect(() => {
    updateCardPositions();
  }, [cardOrder, updateCardPositions]);

  // --- RENDER ---
  return (
    <section
      ref={cardStackRef}
      className={`relative grid place-content-center select-none ${className}`}
      style={{
        width: cardWidth + 40,
        height: cardHeight + 50,
        perspective: '1200px',
        touchAction: 'none',
      } as React.CSSProperties}
    >
      {cardOrder.map((originalIndex, displayIndex) => {
        const card = cards[originalIndex];
        return (
          <article
            key={card.id}
            className="image-card absolute cursor-grab active:cursor-grabbing
                       place-self-center rounded-2xl
                       shadow-2xl overflow-hidden will-change-transform bg-white
                       ring-1 ring-black/5"
            style={{
              '--i': displayIndex.toString(),
              '--swipe-x': '0px',
              '--swipe-rotate': '0deg',
              width: cardWidth,
              height: cardHeight,
              zIndex: cards.length - displayIndex,
              transform: `
                translateY(calc(var(--i) * 12px))
                translateZ(calc(var(--i) * -50px))
                translateX(var(--swipe-x))
                rotate(var(--swipe-rotate))
                scale(${1 - displayIndex * 0.03})
              `,
              filter: displayIndex > 0 ? `brightness(${1 - displayIndex * 0.08})` : 'none',
            } as React.CSSProperties}
          >
            <img
              src={card.imageUrl}
              alt={card.title}
              className="w-full h-full object-cover pointer-events-none transition-transform duration-500"
              draggable={false}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = `https://placehold.co/${cardWidth}x${cardHeight}/4461F2/ffffff?text=${encodeURIComponent(card.title)}`;
              }}
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
              <h3 className="font-bold text-lg sm:text-xl text-white drop-shadow-lg">{card.title}</h3>
              <p className="text-white/70 text-sm mt-1">Swipe to explore</p>
            </div>
          </article>
        );
      })}
    </section>
  );
};
