# MessManager

A full-stack shared living ("mess") management application built with **React**, **Python / Flask**, and **Google Sheets** as the database.

## Project Structure

```text
.
├── app.py                  # Flask REST API & static frontend server
├── sheets.py               # Google Sheets data-access layer
├── requirements.txt        # Python dependencies (includes gunicorn)
├── Procfile                # Process file for backend hosting (Render/Railway/Heroku)
├── netlify.toml            # Netlify build & redirect configuration for frontend
├── seed.py                 # Sample data seeder
├── cleanup_meals.py        # Utility script for meal cleanup
├── .gitignore              # Ignores credentials.json, .venv, node_modules, build, etc.
└── frontend/               # React single-page application
    ├── public/
    │   └── _redirects      # SPA routing fallback for Netlify
    └── src/
        ├── App.js
        ├── App.css
        └── components/
```

## Local Development

### 1. Backend (Flask)
1. Create/activate a virtual environment and install dependencies:
   ```sh
   pip install -r requirements.txt
   ```
2. Place your Google Cloud service account `credentials.json` in the project root (it is ignored by `.gitignore` so it will never be committed to GitHub).
3. Run the server:
   ```sh
   python app.py
   ```
   The backend runs on `http://127.0.0.1:5000`.

### 2. Frontend (React)
```sh
cd frontend
npm install
npm start
```
The React dev server runs on `http://localhost:3000` and proxies `/api/*` requests to `http://127.0.0.1:5000`.

To build for production:
```sh
cd frontend
npm run build
```

## Deploying to GitHub & Netlify

1. **Push to GitHub**
   - `.gitignore` excludes `credentials.json`, `.venv/`, `node_modules/`, `frontend/node_modules/`, `frontend/build/`, and `.env` files.
   - Verify with `git status` before committing that `credentials.json` is not staged.

2. **Deploy the Flask Backend** (e.g., Render, Railway, or Fly.io)
   - Netlify serves static sites and cannot run a persistent Flask server directly.
   - Deploy the root repository using `Procfile` (`web: gunicorn app:app`) and `requirements.txt`.
   - Set environment variables on your backend host:
     - `SHEET_ID`: Your Google Sheet ID.
     - `GOOGLE_CREDENTIALS_JSON`: The full JSON contents of `credentials.json`.
     - `FLASK_DEBUG`: `false`

3. **Deploy the Frontend on Netlify**
   - Connect your GitHub repository in Netlify.
   - Netlify will automatically read `netlify.toml` (`base = "frontend"`, `command = "npm run build"`, `publish = "build"`).
   - Once your Flask backend is live, uncomment the `/api/*` redirect block in `netlify.toml` and replace `https://your-backend-url.onrender.com` with your deployed backend URL, then redeploy.
