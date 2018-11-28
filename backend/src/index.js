const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config({ path: 'variables.env' });
const createServer = require('./createServer');
const db = require('./db');

const server = createServer();

server.express.use(cookieParser());

// Decode JWT so we get the user ID on each request
server.express.use((req, res, next) => {
  const { token } = req.cookies;
  if (token) {
    const { userId } = jwt.verify(token, process.env.APP_SECRET);
    // Put userId onto the request for future request to access
    req.userId = userId;
  }
  next();
});

// Populate current user on each express
server.express.use(async (req, res, next) => {
  // If user is not logged in, skip this middleware
  if (!req.userId) return next();

  const user = await db.query.user(
    { where: { id: req.userId }},
    '{ id permissions email name}'
    );

    req.user = user;
    next();
});

server.start({
  cors: {
    credentials: true,
    origin: process.env.FRONTEND_URL,
  }
}, serverDetails => {
  console.log(`Server running on port http://localhost:${serverDetails.port}`);
});