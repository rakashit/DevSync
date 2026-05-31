const { auth } = require('../firebase');

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    if (!auth) {
      console.warn('Firebase Auth is not initialized. Skipping token verification (dev mode).');
      req.user = { uid: 'dev-user', email: 'dev@devsync.com' }; // mock user for dev if Firebase isn't set up yet
      return next();
    }

    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    return res.status(403).json({ error: 'Unauthorized: Invalid token' });
  }
};

module.exports = { verifyToken };
