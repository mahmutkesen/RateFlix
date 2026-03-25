import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import MovieDetails from './pages/MovieDetails';
import Search from './pages/Search';
import Profile from './pages/Profile';
import Lists from './pages/Lists';
import Community from './pages/Community';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import CategoryPage from './pages/CategoryPage';
import Admin from './pages/Admin';
import { ToastProvider } from './components/Toast';

import { UserListsProvider } from './context/UserListsContext';

const AppContent = () => {
  const location = useLocation();
  const isAuthPage = ['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname);

  return (
    <div className="app">
      <Navbar />
      <main className={isAuthPage ? "" : "container"} style={{ paddingTop: '80px', paddingBottom: '40px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/movie/:id" element={<MovieDetails type="movie" />} />
          <Route path="/tv/:id" element={<MovieDetails type="tv" />} />
          <Route path="/category/:type" element={<CategoryPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/lists" element={<Lists />} />
          <Route path="/community" element={<Community />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <ToastProvider>
      <UserListsProvider>
        <Router>
          <AppContent />
        </Router>
      </UserListsProvider>
    </ToastProvider>
  );
}

export default App;
