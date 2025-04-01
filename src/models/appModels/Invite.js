const mongoose = require("mongoose");

const InviteSchema = new mongoose.Schema({
    email: { type: String, required: true, lowercase: true, trim: true },
    branchId: { type: mongoose.Schema.ObjectId, ref: "Branch", autopopulate: true },
    ownerId: { type: mongoose.Schema.ObjectId, ref: "User-Data" },
    main_user_id: { type: mongoose.Schema.ObjectId, ref: "User-Data" },
    token: { type: String, required: true },
    status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Invite', InviteSchema);
