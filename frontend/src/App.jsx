import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
const Home = React.lazy(() => import('./pages/Home'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const MovieDetails = React.lazy(() => import('./pages/MovieDetails'));
const Search = React.lazy(() => import('./pages/Search'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Lists = React.lazy(() => import('./pages/Lists'));
const Community = React.lazy(() => import('./pages/Community'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const CategoryPage = React.lazy(() => import('./pages/CategoryPage'));
const Admin = React.lazy(() => import('./pages/Admin'));
import { ToastProvider } from './components/Toast';

import { UserListsProvider } from './context/UserListsContext';

const AppContent = () => {
  const location = useLocation();
  const isAuthPage = ['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname);

  return (
    <div className="app">
      <Navbar />
      <main className={isAuthPage ? "" : "container"} style={{ paddingTop: '80px', paddingBottom: '40px' }}>
        <React.Suspense fallback={<div className="loading-container"><div className="spinner"></div></div>}>
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
        </React.Suspense>
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
