import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './NotificationBadge.css';
import { FaTachometerAlt, FaPlusCircle, FaHome, FaUserPlus, FaPiggyBank, 
  FaUtensils, FaShoppingCart, FaCalendarAlt, FaUsers, FaUserCircle, FaSignOutAlt, FaBell
} from 'react-icons/fa';
import NotificationBadge from './NotificationBadge';

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    setCurrentUser(user);

    const handleStorageChange = () => {
      const updatedUser = JSON.parse(localStorage.getItem('currentUser'));
      setCurrentUser(updatedUser);
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const hasMess = currentUser && currentUser['Mess ID'];

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      if (window.confirm('Are you really sure? This will end your session.')) {
        localStorage.removeItem('currentUser');
        navigate('/login');
      }
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Mess Manager</h2>
      </div>
      <ul className="sidebar-menu">
        <li><Link to="/dashboard" className={`sidebar-link ${location.pathname === '/dashboard' ? 'active' : ''}`}><FaTachometerAlt /> <span>Dashboard</span></Link></li>
        {!hasMess && (
          <li><Link to="/create-mess" className={`sidebar-link ${location.pathname === '/create-mess' ? 'active' : ''}`}><FaPlusCircle /> <span>Create a Mess</span></Link></li>
        )}
        {hasMess && (
          <li><Link to="/my-mess" className={`sidebar-link ${location.pathname === '/my-mess' ? 'active' : ''}`}><FaHome /> <span>My Mess</span></Link></li>
        )}
        <li><Link to="/add-member-to-mess" className={`sidebar-link ${location.pathname === '/add-member-to-mess' ? 'active' : ''}`}><FaUserPlus /> <span>Add Member to Mess</span></Link></li>
        
        <li><Link to="/add-deposit" className={`sidebar-link ${location.pathname === '/add-deposit' ? 'active' : ''}`}><FaPiggyBank /> <span>Add Deposit</span></Link></li>
        <li><Link to="/add-meal" className={`sidebar-link ${location.pathname === '/add-meal' ? 'active' : ''}`}><FaUtensils /> <span>Add Meal</span></Link></li>
        <li><Link to="/add-cost" className={`sidebar-link ${location.pathname === '/add-cost' ? 'active' : ''}`}><FaShoppingCart /> <span>Add Cost</span></Link></li>
        <li><Link to="/add-bazar-date" className={`sidebar-link ${location.pathname === '/add-bazar-date' ? 'active' : ''}`}><FaCalendarAlt /> <span>Add Bazar Date</span></Link></li>
        <li><Link to="/active-month-details" className={`sidebar-link ${location.pathname === '/active-month-details' ? 'active' : ''}`}><FaCalendarAlt /> <span>Active Month Details</span></Link></li>
        <li><Link to="/previous-month-details" className={`sidebar-link ${location.pathname === '/previous-month-details' ? 'active' : ''}`}><FaCalendarAlt /> <span>Previous Month Details</span></Link></li>
        <li><Link to="/all-member" className={`sidebar-link ${location.pathname === '/all-member' ? 'active' : ''}`}><FaUsers /> <span>All Member</span></Link></li>
        <li>
          <Link to="/notifications" className={`sidebar-link ${location.pathname === '/notifications' ? 'active' : ''}`}>
            <FaBell /> 
            <span>Notifications</span>
            <NotificationBadge />
          </Link>
        </li>
        
        <li><Link to="/profile" className={`sidebar-link ${location.pathname === '/profile' ? 'active' : ''}`}><FaUserCircle /> <span>Profile</span></Link></li>
        <li><button onClick={handleLogout} className="sidebar-button sidebar-link"><FaSignOutAlt /> <span>Logout</span></button></li>
      </ul>
    </aside>
  );
}

export default Sidebar;
