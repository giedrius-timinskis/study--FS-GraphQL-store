require('dotenv').config({ path: 'variables.env' });
const createServer = require('./createServer');
const db = require('./db');

const server = createServer();

// TODO: Handle cookies (JWT)
// TODO: Populate current user

server.start({
  cors: {
    credentials: true,
    origin: process.env.FRONTEND_URL,
  }
}, serverDetails => {
  console.log(`Server running on port http://localhost:${serverDetails.port}`);
});