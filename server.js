import './src/config/env.js';  // Load this first
import express from 'express';
import bodyParser from 'body-parser';
import whatsappRoutes from './src/routes/whatsappRoutes.js';

const app = express();
const port = process.env.PORT || 3000;

// Verify Supabase environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL is not defined in environment variables');
}

if (!process.env.SUPABASE_API_KEY) {
  throw new Error('SUPABASE_API_KEY is not defined in environment variables');
}

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Routes
app.use('/api', whatsappRoutes);

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
