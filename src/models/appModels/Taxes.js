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
   branchId: { type: mongoose.Schema.ObjectId, ref: 'Branch', autopopulate: true },
    // ownerId: { type: mongoose.Schema.ObjectId, ref: "User-Data" },
    main_user_id: { type: mongoose.Schema.ObjectId, ref: "Admin" },
  taxName: {
    type: String,
    required: true,
  },
  taxValue: {
    type: Number,
    required: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  created: {
    type: Date,
    default: Date.now,
  },
});
schema.plugin(require('mongoose-autopopulate'));
module.exports = mongoose.model('Taxes', schema);
