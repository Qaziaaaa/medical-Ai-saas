# Deployment Guide — AI Clinic Management SaaS

## Step 1 — Run Locally First (Test Before Deploy)

### Start the backend
```bash
cd backend
npm install
node src/utils/seedUsers.js   # creates demo doctor + receptionist accounts
npm run dev
```
Backend runs at: http://localhost:5000

### Start the frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at: http://localhost:5173

### Demo login credentials
| Role         | Email                        | Password     |
|--------------|------------------------------|--------------|
| Doctor       | doctor@clinic.demo           | Doctor@123   |
| Receptionist | receptionist@clinic.demo     | Recept@123   |

---

## Step 2 — Deploy Backend to Render

1. Go to https://render.com and sign up / log in
2. Click **New → Web Service**
3. Connect your GitHub repo (push your code to GitHub first)
4. Set these settings:
   - **Name:** ai-clinic-backend
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/server.js`
   - **Environment:** Node

5. Add Environment Variables (click "Environment" tab):
   ```
   MONGO_URI        = (your MongoDB Atlas connection string)
   JWT_SECRET       = (copy from your .env file)
   JWT_EXPIRES_IN   = 7d
   PORT             = 5000
   GEMINI_API_KEY   = (your Gemini API key)
   FRONTEND_ORIGIN  = (your Vercel frontend URL — add after Step 3)
   NODE_ENV         = production
   ```

6. Click **Create Web Service**
7. Wait for deploy (~2 min). Copy the URL — looks like: `https://ai-clinic-backend.onrender.com`

---

## Step 3 — Deploy Frontend to Vercel

1. Go to https://vercel.com and sign up / log in
2. Click **Add New → Project**
3. Import your GitHub repo
4. Set these settings:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

5. Add Environment Variable:
   ```
   VITE_API_BASE_URL = https://ai-clinic-backend.onrender.com
   ```
   (use the Render URL from Step 2)

6. Click **Deploy**
7. Copy your Vercel URL — looks like: `https://ai-clinic.vercel.app`

---

## Step 4 — Update CORS on Render

1. Go back to Render → your backend service → Environment
2. Update `FRONTEND_ORIGIN` to your Vercel URL:
   ```
   FRONTEND_ORIGIN = https://ai-clinic.vercel.app
   ```
3. Click **Save Changes** — Render will redeploy automatically

---

## Step 5 — Seed Demo Users on Production

After backend is live, run this once from your local machine:

```bash
cd backend
MONGO_URI="your_production_mongo_uri" node src/utils/seedUsers.js
```

Or just use the same MongoDB Atlas cluster — the seed script checks if users exist before creating them.

---

## Step 6 — Verify Everything Works

Test these in order:
- [ ] Visit your Vercel URL — login page loads
- [ ] Login as doctor@clinic.demo / Doctor@123
- [ ] Login as receptionist@clinic.demo / Recept@123
- [ ] Create a patient (as receptionist)
- [ ] Book an appointment (as receptionist)
- [ ] Create a prescription + download PDF (as doctor)
- [ ] Run AI symptom checker (as doctor)

---

## Quick Reference

| Service   | URL                                    |
|-----------|----------------------------------------|
| Frontend  | https://your-app.vercel.app            |
| Backend   | https://your-backend.onrender.com      |
| Health    | https://your-backend.onrender.com/health |
| MongoDB   | MongoDB Atlas (cloud.mongodb.com)      |

---

## Common Issues

**Backend not starting on Render:**
- Check that `NODE_ENV=production` is set
- Check all env variables are filled in
- Check Render logs for errors

**CORS error in browser:**
- Make sure `FRONTEND_ORIGIN` on Render matches your exact Vercel URL (no trailing slash)

**Login not working:**
- Run the seed script to create demo users
- Check `MONGO_URI` is correct

**AI not responding:**
- Check `GEMINI_API_KEY` is valid
- The app shows a fallback message if AI fails — this is expected behavior
