document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const messageDiv = document.getElementById('message');

    function showMessage(message, type) {
        messageDiv.textContent = message;
        messageDiv.className = 'message ' + type;
        messageDiv.style.display = 'block';
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const username = this.elements['username'].value;
            const password = this.elements['password'].value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });
                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                    window.location.href = '/dashboard'; // Redirect to main app
                } else {
                    showMessage(data.error || 'Login failed', 'error');
                }
            } catch (error) {
                console.error('Error during login:', error);
                showMessage('An error occurred during login.', 'error');
            }
        });
    }

    if (registerForm) {
        const usernameInput = document.getElementById('username');
        const usernameMessageDiv = document.getElementById('username-message');

        usernameInput.addEventListener('blur', async function() {
            const username = this.value;
            if (username.length > 0) {
                try {
                    const response = await fetch(`/api/check_username?username=${username}`);
                    const data = await response.json();
                    if (data.exists) {
                        usernameMessageDiv.textContent = 'Username already taken.';
                        usernameMessageDiv.className = 'message error';
                        usernameMessageDiv.style.display = 'block';
                    } else {
                        usernameMessageDiv.textContent = 'Username available.';
                        usernameMessageDiv.className = 'message success';
                        usernameMessageDiv.style.display = 'block';
                    }
                } catch (error) {
                    console.error('Error checking username:', error);
                    usernameMessageDiv.textContent = 'Error checking username.';
                    usernameMessageDiv.className = 'message error';
                    usernameMessageDiv.style.display = 'block';
                }
            } else {
                usernameMessageDiv.style.display = 'none';
            }
        });

        registerForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const username = this.elements['username'].value;
            const password = this.elements['password'].value;

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });
                const data = await response.json();
                if (response.ok) {
                    showMessage('Registration successful! Please login.', 'success');
                    registerForm.reset();
                    // Optionally redirect to login page
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 2000);
                } else {
                    showMessage(data.error || 'Registration failed', 'error');
                }
            } catch (error) {
                console.error('Error during registration:', error);
                showMessage('An error occurred during registration.', 'error');
            }
        });
    }
});