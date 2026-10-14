import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const UserListsContext = createContext();

export const UserListsProvider = ({ children }) => {
    const [userLists, setUserLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchUserLists = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setUserLists([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const res = await api.get('/lists');
            if (Array.isArray(res.data)) {
                setUserLists(res.data);
            }
            setError(null);
        } catch (err) {
            console.error("Error fetching user lists:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUserLists();

        const handleStorageChange = () => {
            fetchUserLists();
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [fetchUserLists]);

    const refreshLists = useCallback(() => {
        return fetchUserLists();
    }, [fetchUserLists]);

    const updateListLocally = useCallback((id, changes) => {
        setUserLists(prev => prev.map(l => l._id === id ? { ...l, ...changes } : l));
    }, []);

    return (
        <UserListsContext.Provider value={{ userLists, loading, error, refreshLists, updateListLocally }}>
            {children}
        </UserListsContext.Provider>
    );
};

export const useUserLists = () => {
    const context = useContext(UserListsContext);
    if (!context) {
        throw new Error('useUserLists must be used within a UserListsProvider');
    }
    return context;
};
