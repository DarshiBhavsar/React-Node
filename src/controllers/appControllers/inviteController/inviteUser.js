// const express = require('express');
// const jwt = require('jsonwebtoken');
// const nodemailer = require('nodemailer');
// const Invite = require('../models/Invite');

// const router = express.Router();

// router.post('/invite-user', async (req, res) => {
//     const { email } = req.body;

//     if (!email) {
//         return res.status(400).json({ success: false, message: 'Email is required' });
//     }

//     try {
      
//         const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '24h' });

        
//         await Invite.create({ email, token });

//         const inviteLink = `http://localhost:3000/invite?token=${token}`;

       
//         const transporter = nodemailer.createTransport({
//             service: 'Gmail',
//             auth: {
//                 user: process.env.EMAIL_USER,
//                 pass: process.env.EMAIL_PASS,
//             },
//         });

       
//         const mailOptions = {
//             from: process.env.EMAIL_USER,
//             to: email,
//             subject: 'User Invitation',
//             html: `<p>You have been invited to create an account. Click <a href="${inviteLink}">here</a> to complete your registration.</p>`,
//         };

       
//         await transporter.sendMail(mailOptions);
//         console.log(`✅ Invitation email sent to ${email}`);

//         res.json({ success: true, message: 'Invitation sent successfully!' });
//     } catch (error) {
//         console.error('❌ Error sending invitation email:', error);
//         res.status(500).json({ success: false, message: 'Error sending invitation' });
//     }
// });

// module.exports = router;
