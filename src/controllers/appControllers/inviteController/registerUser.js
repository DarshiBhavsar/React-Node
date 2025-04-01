const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../../models/appModels/User-Data');
const AdminPassword = require('../../../models/coreModels/AdminPassword');
const Invite = require('../../../models/appModels/Invite');

const router = express.Router();

router.post('/register-user', async (req, res) => {
    const { name, password, confirmPassword, token } = req.body;

    if (!name || !password || !confirmPassword || !token) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const email = decoded.email;

        // Check if the invite is valid
        const invite = await Invite.findOne({ email, token, status: 'pending' });
        if (!invite) {
            return res.status(400).json({ success: false, message: 'Invalid or expired invite' });
        }

        // Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create User
        const newUser = new User({ name, email, role: 'member' });
        await newUser.save();

        // Save hashed password separately
        await AdminPassword.create({ userData: newUser._id, password: hashedPassword });

        // Update invite status
        invite.status = 'accepted';
        await invite.save();

        res.json({ success: true, message: 'User registered successfully!' });
    } catch (error) {
        console.error('❌ Error during registration:', error);
        res.status(500).json({ success: false, message: 'Invalid or expired token' });
    }
});

module.exports = router;
