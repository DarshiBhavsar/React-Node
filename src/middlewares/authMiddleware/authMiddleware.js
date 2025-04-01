const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ success: false, message: 'Unauthorized - No Token Provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        console.log("✅ JWT Verified for User ID:", decoded.id);
        console.log("✅ Logged-in User:", req.user);

        next();
    } catch (error) {
        console.error('❌ Error in verifyToken:', error);
        return res.status(401).json({ success: false, message: 'Unauthorized - Invalid Token' });
    }
};

module.exports = verifyToken;
