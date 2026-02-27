export default () => ({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  pythonApiUrl: process.env.PYTHON_API_URL,
  pythonApiKey: process.env.PYTHON_API_KEY,
  redisUrl: process.env.REDIS_URL,
});
