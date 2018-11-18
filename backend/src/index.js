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
// TODO: Populate current user

server.start({
  cors: {
    credentials: true,
    origin: process.env.FRONTEND_URL,
  }
}, serverDetails => {
  console.log(`Server running on port http://localhost:${serverDetails.port}`);
});