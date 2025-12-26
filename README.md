# MessManager

This is a full-stack web application for managing shared living expenses, meals, and members for a household or "mess."

## Deployment to Netlify

This project has been configured for deployment to Netlify.

### Prerequisites

*   A Netlify account.
*   The project pushed to a Git repository (GitHub, GitLab, or Bitbucket).

### Deployment Steps

1.  **Push the code to your Git repository.**
2.  **Log in to Netlify.**
3.  Click on **"Add new site"** and select **"Import an existing project"**.
4.  **Connect to your Git provider** and select the repository for this project.
5.  Netlify will automatically detect the `netlify.toml` file and configure the build settings.
6.  **Before deploying, you need to add environment variables:**
    *   Go to **Site settings > Build & deploy > Environment**.
    *   Add the following variables:
        *   **SHEET_ID**: The ID of your Google Sheet.
        *   **GOOGLE_CREDENTIALS**: The content of your `credentials.json` file.

7.  **Trigger the deployment.**

Once the deployment is complete, your site will be live on Netlify!
