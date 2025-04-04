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

const app = express();

// ✅ CORS Configuration
app.use(
  cors({
    origin: "https://idurarcrmerp.netlify.app", // Exact origin, no trailing slash
    credentials: true, // Required to allow cookies/auth headers
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Length', 'X-Requested-With'],
    optionsSuccessStatus: 200, // Ensures OPTIONS preflight succeeds
  })
);

// ✅ Don't override CORS with another app.options
// app.options('*', cors()); // ❌ remove this line if it exists

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// ✅ Route setup
app.use('/api', coreAuthRouter);
app.use('/api', adminAuth.isValidAuthToken, coreApiRouter);
app.use('/api', adminAuth.isValidAuthToken, erpApiRouter);
app.use('/download', coreDownloadRouter);
app.use('/public', corePublicRouter);

// ✅ Error handlers
app.use(errorHandlers.notFound);
app.use(errorHandlers.productionErrors);

module.exports = app;
