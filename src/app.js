const express = require('express');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');

// Import your route handlers and controllers
const coreAuthRouter = require('./routes/coreRoutes/coreAuth');
const coreApiRouter = require('./routes/coreRoutes/coreApi');
const coreDownloadRouter = require('./routes/coreRoutes/coreDownloadRouter');
const corePublicRouter = require('./routes/coreRoutes/corePublicRouter');
const adminAuth = require('./controllers/coreControllers/adminAuth');
const errorHandlers = require('./handlers/errorHandlers');
const erpApiRouter = require('./routes/appRoutes/appApi');

// Optional for handling file uploads (if needed)
const fileUpload = require('express-fileupload');

// Create our Express app
const app = express();

// CORS configuration
const allowedOrigins = [
  "https://idurarcrmerp.netlify.app", // Ensure no trailing slash
];

// CORS Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (allowedOrigins.includes(origin) || !origin) {
        callback(null, true); // Allow requests from allowed origins
      } else {
        callback(new Error('Not allowed by CORS'), false); // Deny requests from other origins
      }
    },
    credentials: true, // Allow cookies to be sent with requests
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Allow specific methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allow headers that are necessary for your app
    exposedHeaders: ['Content-Length', 'X-Requested-With'], // Allow headers to be exposed to the browser
  })
);

// Handle preflight OPTIONS requests
app.options('*', cors()); // This will allow preflight requests for all routes

// Middleware for parsing cookies, JSON bodies, and URL-encoded data
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable compression for responses
app.use(compression());

// Optional: Enable file uploads if necessary
// app.use(fileUpload());

// API Routes
app.use('/api', coreAuthRouter);
app.use('/api', adminAuth.isValidAuthToken, coreApiRouter);
app.use('/api', adminAuth.isValidAuthToken, erpApiRouter);
app.use('/download', coreDownloadRouter);
app.use('/public', corePublicRouter);

// If the above routes didn't work, return 404 and forward to error handler
app.use(errorHandlers.notFound);

// Production error handler
app.use(errorHandlers.productionErrors);

// Export the app for use in a server
module.exports = app;
