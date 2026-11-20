import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './NotificationBadge.css';

function NotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('currentUser'));
    if (storedUser) {
      setCurrentUser(storedUser);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch(`/api/notifications/unread_count?user_id=${currentUser['User ID']}`);
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.unread_count);
        }
      } catch (error) {
        console.error('Error fetching unread notification count:', error);
      }
    };

    fetchUnreadCount(); // Initial fetch
    const interval = setInterval(fetchUnreadCount, 120000); // Poll every 2 minutes

    const handleNotificationsUpdated = () => fetchUnreadCount();
    window.addEventListener('notificationsUpdated', handleNotificationsUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener('notificationsUpdated', handleNotificationsUpdated);
    };
  }, [currentUser]);

  return (
    <Link to="/notifications" className="notification-badge">
      <span className="notification-icon">🔔</span>
      {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
    </Link>
  );
}

export default NotificationBadge;
