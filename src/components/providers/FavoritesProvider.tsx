
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { FavoriteSurah, Bookmark } from '@/types/quran';

interface FavoritesContextType {
  favorites: FavoriteSurah[];
  bookmarks: Bookmark[];
  lastRead: { surahNumber: number; surahName: string; ayahNumber: number } | null;
  addFavorite: (surah: FavoriteSurah) => void;
  removeFavorite: (surahNumber: number) => void;
  isFavorite: (surahNumber: number) => boolean;
  addBookmark: (bookmark: Bookmark) => void;
  removeBookmark: (surahNumber: number, ayahNumber: number) => void;
  isBookmarked: (surahNumber: number, ayahNumber: number) => boolean;
  setLastRead: (data: { surahNumber: number; surahName: string; ayahNumber: number }) => void;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteSurah[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [lastRead, setLastReadState] = useState<{ surahNumber: number; surahName: string; ayahNumber: number } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedFavs = localStorage.getItem('quran_favorites');
      if (storedFavs) setFavorites(JSON.parse(storedFavs));
      const storedBookmarks = localStorage.getItem('quran_bookmarks');
      if (storedBookmarks) setBookmarks(JSON.parse(storedBookmarks));
      const storedLastRead = localStorage.getItem('quran_lastread');
      if (storedLastRead) setLastReadState(JSON.parse(storedLastRead));
    } catch {}
    setHydrated(true);
  }, []);

  const addFavorite = useCallback((surah: FavoriteSurah) => {
    setFavorites(prev => {
      if (prev.find(f => f.number === surah.number)) return prev;
      const next = [...prev, surah];
      localStorage.setItem('quran_favorites', JSON.stringify(next));
      return next;
    });
  }, []);

  const removeFavorite = useCallback((surahNumber: number) => {
    setFavorites(prev => {
      const next = prev.filter(f => f.number !== surahNumber);
      localStorage.setItem('quran_favorites', JSON.stringify(next));
      return next;
    });
  }, []);

  const isFavorite = useCallback((surahNumber: number) => {
    return favorites.some(f => f.number === surahNumber);
  }, [favorites]);

  const addBookmark = useCallback((bookmark: Bookmark) => {
    setBookmarks(prev => {
      const next = [bookmark, ...prev.filter(b => !(b.surahNumber === bookmark.surahNumber && b.ayahNumber === bookmark.ayahNumber))];
      localStorage.setItem('quran_bookmarks', JSON.stringify(next));
      return next;
    });
  }, []);

  const removeBookmark = useCallback((surahNumber: number, ayahNumber: number) => {
    setBookmarks(prev => {
      const next = prev.filter(b => !(b.surahNumber === surahNumber && b.ayahNumber === ayahNumber));
      localStorage.setItem('quran_bookmarks', JSON.stringify(next));
      return next;
    });
  }, []);

  const isBookmarked = useCallback((surahNumber: number, ayahNumber: number) => {
    return bookmarks.some(b => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber);
  }, [bookmarks]);

  const setLastRead = useCallback((data: { surahNumber: number; surahName: string; ayahNumber: number }) => {
    setLastReadState(data);
    localStorage.setItem('quran_lastread', JSON.stringify(data));
  }, []);

  return (
    <FavoritesContext.Provider value={{
      favorites, bookmarks, lastRead,
      addFavorite, removeFavorite, isFavorite,
      addBookmark, removeBookmark, isBookmarked,
      setLastRead,
    }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
