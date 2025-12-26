import React, { useState, useEffect } from 'react';

function NotificationList() {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('currentUser'));

    const fetchNotifications = async () => {
      setError(null);

      if (!storedUser || !storedUser['User ID']) {
        setError('User not logged in.');
        return;
      }

      try {
        const response = await fetch(`/api/notifications?user_id=${storedUser['User ID']}`);
        if (!response.ok) {
          throw new Error('Failed to fetch notifications.');
        }
        const data = await response.json();
        setNotifications(data);

        // Mark all as read
        await fetch(`/api/notifications/read_all?user_id=${storedUser['User ID']}`, {
          method: 'PUT',
        });
        window.dispatchEvent(new Event('notificationsUpdated'));

      } catch (err) {
        console.error('Error fetching notifications:', err);
        setError('Failed to load notifications. Please try again.');
      } finally {
      }
    };

    fetchNotifications();

    // Implement polling (e.g., every 30 seconds)
    const interval = setInterval(fetchNotifications, 120000); // Poll every 2 minutes

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  if (error) {
    return <div className="page message error">{error}</div>;
  }

  return (
    <div className="page">
      <h1>Notifications</h1>
      {notifications.length === 0 ? (
        <p>No new notifications.</p>
      ) : (
        <div className="notification-list">
          {notifications.map(notification => (
            <div key={notification['Notification ID']} className={`notification-item ${notification.Read ? 'read' : 'unread'}`}>
              <p>{notification.Message}</p>
              <small>{new Date(notification.Timestamp).toLocaleString()}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotificationList;
