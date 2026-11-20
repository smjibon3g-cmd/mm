
# GEMINI.md: MessManager Project Context

This document provides a comprehensive overview of the MessManager project for AI-assisted development.

---

## 1. Project Overview

MessManager is a full-stack web application designed to manage shared living expenses, meals, and members for a household or "mess." It provides a central dashboard to track finances and member activities.

### Architecture

*   **Frontend:** A single-page application built with **React**. It handles the user interface and interacts with the backend via a REST API.
*   **Backend:** A **Python/Flask** server that exposes a REST API for the frontend. It handles business logic, user authentication, and data manipulation.
*   **Database:** **Google Sheets** is used as the data store. The backend interacts with the Google Sheet via the `gspread` library.

### Key Technologies

*   **Backend:** Python, Flask, Flask-CORS, gspread
*   **Frontend:** React, React Router, react-scripts (Create React App)
*   **Database:** Google Sheets API

---

## 2. Building and Running

### Backend (Flask Server)

1.  **Install Dependencies:** Navigate to the project root (`E:\mm`) and install the required Python packages.
    ```sh
    pip install -r requirements.txt
    ```

2.  **Setup Credentials:** The application requires Google Sheets API credentials.
    *   A `credentials.json` file (from a Google Cloud service account) must be placed in the root directory.
    *   The `SHEET_ID` is currently hardcoded in `app.py`. For better practice, this should be moved to an environment variable.

3.  **Run the Server:** Execute the `app.py` file from the root directory. The server will start in debug mode.
    ```sh
    python app.py
    ```
    The backend will run on `http://127.0.0.1:5000`.

### Frontend (React App)

1.  **Navigate to Frontend Directory:**
    ```sh
    cd frontend
    ```

2.  **Install Dependencies:**
    ```sh
    npm install
    ```

3.  **Run the Development Server:** This command starts the React development server and opens the app in a browser.
    ```sh
    npm start
    ```
    The frontend will run on `http://localhost:3000` and is configured to proxy API requests to the backend at `http://127.0.0.1:5000` (as defined in `package.json`).

4.  **Build for Production:** To create an optimized production build:
    ```sh
    npm run build
    ```

---

## 3. Development Conventions

*   **Project Documentation:** The `Plan and Progress.md` file serves as the single source of truth for the project's goals, features, and development status.
*   **Backend Structure:** The backend logic is split into multiple files. `app.py` contains the Flask routes and API endpoints, while `sheets.py` encapsulates all interactions with the Google Sheets database.
*   **Frontend Structure:** The frontend follows a standard Create React App structure. Reusable UI components are located in `frontend/src/components`.
*   **API:** The backend provides a RESTful API under the `/api/` prefix. All endpoints are defined in `app.py`.
*   **Data Model:** There is no formal ORM. The data structures are implicitly defined by the lists and dictionaries used when reading from and writing to Google Sheets in `sheets.py`.
