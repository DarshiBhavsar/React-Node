const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    removed: {
        type: Boolean,
        default: false,
    },
    enabled: {
        type: Boolean,
        default: true,
    },
    name: {
        type: String,
        required: true,
    },
    surname: {
        type: String,
        required: true,
    },
    email: String,
    branch: {
        type: mongoose.Schema.ObjectId,
        ref: 'Branch',
        required: true,
        autopopulate: true,
    },
    role: {
        type: String,
        enum: ["owner", "admin", "member",],
        required: true
    },

    createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
    assigned: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
    created: {
        type: Date,
        default: Date.now,
    },
    updated: {
        type: Date,
        default: Date.now,
    },
});

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('AdminModel', schema);
