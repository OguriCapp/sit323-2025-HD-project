const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const { auth } = require('./config/firebase');

// Load environment variables
dotenv.config();

// Create Express application
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const teamRoutes = require('./routes/teams');
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');

// Custom error handler middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Handle Firebase specific errors
  if (err.code && err.code.startsWith('firestore/')) {
    console.error('Firebase error:', err.code, err.message);
    
    // Common Firestore error codes and friendlier messages
    const errorMessages = {
      'firestore/permission-denied': 'Permission denied. Please check your Firebase rules or login again.',
      'firestore/unavailable': 'Database service is currently unavailable. Please try again later.',
      'firestore/not-found': 'The requested document was not found.',
      'firestore/unauthenticated': 'Authentication required. Please login again.',
      'firestore/data-loss': 'Data loss occurred. Please refresh and try again.',
      'firestore/cancelled': 'Operation was cancelled. Please try again.',
      'default': 'An error occurred while accessing the database.'
    };
    
    const errorMessage = errorMessages[err.code] || errorMessages['default'];
    return res.status(500).json({ 
      error: true,
      message: errorMessage
    });
  }
  
  // Handle other errors
  res.status(500).json({ 
    error: true,
    message: err.message || 'An unexpected error occurred'
  });
});

// Apply routes
console.log('Registering routes...');
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/users', userRoutes);
app.use('/api', dashboardRoutes);
console.log('Routes registered successfully');

// Log all routes for debugging
console.log('Available routes:');
function printRoutes(stack, path = '') {
  stack.forEach(middleware => {
    if (middleware.route) { // routes registered directly on the app
      const methods = Object.keys(middleware.route.methods).filter(method => middleware.route.methods[method]).join(', ');
      console.log(`${methods.toUpperCase()} ${path}${middleware.route.path}`);
    } else if (middleware.name === 'router') { // router middleware
      const routerPath = path + (middleware.regexp.toString().indexOf('^\\/') === 1 ? middleware.regexp.toString().slice(3, -3) : '');
      printRoutes(middleware.handle.stack, routerPath);
    }
  });
}
printRoutes(app._router.stack);

// Add simple documentation endpoint
app.get('/', (req, res) => {
  res.json({
    name: "Deakin Task Board API",
    version: "1.0.0",
    endpoints: [
      { path: '/api/auth', methods: ['POST /login', 'POST /register', 'GET /logout'] },
      { path: '/api/tasks', methods: ['GET /', 'GET /:id', 'POST /create', 'PUT /:id', 'DELETE /:id'] },
      { path: '/api/teams', methods: ['GET /', 'GET /:id', 'POST /create', 'PUT /:id', 'DELETE /:id', 'POST /:id/invite'] },
      { path: '/api/users', methods: ['GET /profile', 'PUT /profile'] },
      { path: '/api/dashboard', methods: ['GET /'] }
    ]
  });
});

// 404 handler - this needs to be after all valid routes
app.use((req, res) => {
  console.log(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ 
    error: true,
    message: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
}); 