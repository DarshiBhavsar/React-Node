const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    removed: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
    name: { type: String, required: true },
    city: String,
    country: String,
    address: String,
    color: String,
    createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
    assigned: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
    ownerId: { type: mongoose.Schema.ObjectId, ref: "User-Data" },
    main_user_id: { type: mongoose.Schema.ObjectId, ref: "Admin" },
    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now },
});

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('Branch', schema);
