export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  pythonApiUrl: process.env.PYTHON_API_URL,
  pythonApiKey: process.env.PYTHON_API_KEY,
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
  },
  serpApiKey: process.env.SERPAPI_KEY,
});
