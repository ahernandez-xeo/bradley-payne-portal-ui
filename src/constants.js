// NODE_ENV is set by Create React App automatically:
//   npm start      → "development" → local backend
//   npm run build  → "production"  → Cloud Run backend
// You do not need to set NODE_ENV yourself.
export const BACKEND_BASE_URL =
  process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:5000"
    : "https://bp-portal-backend-201472570173.us-central1.run.app";
