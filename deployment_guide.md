# Deployment & Update Guide

## 1. Initial Deployment to Netlify

1.  **Log in to Netlify**: Go to [netlify.com](https://www.netlify.com) and log in.
2.  **Add New Site**: Click "Add new site" > "Import an existing project".
3.  **Connect to GitHub**: Choose GitHub and authorize Netlify.
4.  **Select Repository**: Pick the `keystate` repository.
5.  **Configure Build Settings**:
    *   **Build Command**: `npm run build`
    *   **Publish Directory**: `dist`
6.  **Environment Variables**:
    *   Click "Add environment variables".
    *   Copy all values from your local `.env` file (e.g., `VITE_SUPABASE_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`, etc.).
    *   **Important**: Update `VITE_PUBLIC_SITE_URL` to your Netlify URL (e.g., `https://your-app.netlify.app`) or custom domain.
7.  **Deploy**: Click "Deploy site".

## 2. Connecting a Custom Domain

1.  In Netlify, go to **Domain Settings**.
2.  Click **Add custom domain**.
3.  Enter your domain (e.g., `getkeystate.com`).
4.  Follow the instructions to update your DNS records (usually creating an A record or CNAME).

## 3. Making Updates

### Content Updates (Instant & No Code)
*   **What**: Changing campaign details, prices, contact info, creating new campaigns.
*   **How**: Log in to your Admin Dashboard (`/admin`).
*   **Effect**: Changes are instant.

### Code Updates (Features & Layout)
*   **What**: Changing colors, layouts, adding new features, modifying the order form.
*   **How**:
    1.  Developer makes changes in the code.
    2.  Developer commits and pushes code to GitHub:
        ```bash
        git add .
        git commit -m "Update homepage design"
        git push origin main
        ```
    3.  **That's it!** Netlify detects the push and automatically rebuilds and deploys the site.
    4.  The live site updates in ~1-2 minutes.

## 4. Switching to Stripe Live Mode

1.  **Stripe Dashboard**: Toggle "View Test Data" to **Off**.
2.  **Get Keys**: Copy your **Live** Publishable Key and Secret Key.
3.  **Netlify Settings**:
    *   Go to **Site configuration > Environment variables**.
    *   Update `VITE_STRIPE_PUBLISHABLE_KEY` with the **pk_live_...** key.
    *   Update `STRIPE_SECRET_KEY` with the **sk_live_...** key.
4.  **Redeploy**: Go to **Deploys** > **Trigger deploy** to apply the new keys.
