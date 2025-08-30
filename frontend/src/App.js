import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import CreateMess from './components/CreateMess';
import AddMemberToMess from './components/AddMemberToMess';

import AddDeposit from './components/AddDeposit';
import AddMeal from './components/AddMeal';
import AddCost from './components/AddCost';
import AddBazarDate from './components/AddBazarDate';
import ActiveMonthDetails from './components/ActiveMonthDetails';
import AllMember from './components/AllMember';
import NotificationList from './components/NotificationList';
import MyMess from './components/MyMess';
import Profile from './components/Profile';
import Sidebar from './components/Sidebar';
import PreviousMonthDetails from './components/PreviousMonthDetails';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    try {
      const user = JSON.parse(localStorage.getItem('currentUser'));
      const authenticated = user && user['User ID'];
      setIsAuthenticated(authenticated);
    } catch (e) {
      console.error("Error parsing currentUser from localStorage:", e);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    checkAuthStatus();
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <Router>
      <div className="app-container">
        {isAuthenticated && <Sidebar />}
        <main className="main-content">
          <Routes>
            <Route 
              path="/login" 
              element={
                !isAuthenticated ? 
                  <Login onLogin={handleLogin} /> : 
                  <Navigate to="/dashboard" replace />
              } 
            />
            <Route 
              path="/register" 
              element={
                !isAuthenticated ? 
                  <Register /> : 
                  <Navigate to="/dashboard" replace />
              } 
            />
            <Route
              path="/dashboard"
              element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/create-mess"
              element={isAuthenticated ? <CreateMess /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/my-mess"
              element={isAuthenticated ? <MyMess /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/profile"
              element={isAuthenticated ? <Profile /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/add-member-to-mess"
              element={isAuthenticated ? <AddMemberToMess /> : <Navigate to="/login" replace />}
            />
            
            <Route
              path="/add-deposit"
              element={isAuthenticated ? <AddDeposit /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/add-meal"
              element={isAuthenticated ? <AddMeal /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/add-cost"
              element={isAuthenticated ? <AddCost /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/add-bazar-date"
              element={isAuthenticated ? <AddBazarDate /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/active-month-details"
              element={isAuthenticated ? <ActiveMonthDetails /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/active-month-details/:memberId"
              element={isAuthenticated ? <ActiveMonthDetails /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/all-member"
              element={isAuthenticated ? <AllMember /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/previous-month-details"
              element={isAuthenticated ? <PreviousMonthDetails /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/notifications"
              element={isAuthenticated ? <NotificationList /> : <Navigate to="/login" replace />}
            />
            <Route 
              path="/" 
              element={
                isAuthenticated ? 
                  <Navigate to="/dashboard" replace /> : 
                  <Navigate to="/login" replace />
              } 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
