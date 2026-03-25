import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const UserListsContext = createContext();

export const UserListsProvider = ({ children }) => {
    const [userLists, setUserLists] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const token = localStorage.getItem('token');

    const fetchUserLists = async (force = false) => {
        if (!token) return;
        if (userLists.length > 0 && !force) return;

        setLoading(true);
        try {
            const res = await api.get('/lists');
            setUserLists(res.data);
            setError(null);
        } catch (err) {
            console.error("Error fetching user lists:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchUserLists();
        }
    }, [token]);

    const refreshLists = () => fetchUserLists(true);

    return (
        <UserListsContext.Provider value={{ userLists, loading, error, refreshLists }}>
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
