const mongoose = require('mongoose');

const paymentModeSchema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  branchId: { type: mongoose.Schema.ObjectId, ref: 'Branch', autopopulate: true },
  ownerId: { type: mongoose.Schema.ObjectId, ref: "User-Data" },
  main_user_id: { type: mongoose.Schema.ObjectId, ref: "User-Data" },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  // ref: {
  //   type: String,
  // },
  isDefault: {
    type: Boolean,
    default: false,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  assigned: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
});

module.exports = mongoose.model('PaymentMode', paymentModeSchema);
