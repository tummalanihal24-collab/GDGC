const mongoose = require('mongoose');
const { Schema } = mongoose;

// Every JSON response uses `id` instead of `_id`, and drops `__v`.
mongoose.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => { ret.id = ret._id; delete ret._id; delete ret.passwordHash; return ret; },
});
const ref = (model) => ({ type: Schema.Types.ObjectId, ref: model, required: true });

const User = mongoose.model('User', new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['customer', 'admin'], required: true },
}));

const Setting = mongoose.model('Setting', new Schema({ _id: String, value: Schema.Types.Mixed }));

const PotteryItem = mongoose.model('PotteryItem', new Schema({ _id: String, name: String }));
const Glaze = mongoose.model('Glaze', new Schema({ _id: String, name: String }));

const Painting = mongoose.model('Painting', new Schema({
  seedId: String,
  title: { type: String, required: true },
  artist: { type: String, default: '' },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 1 },
  imageUrl: { type: String, default: '' },
  status: { type: String, enum: ['available', 'sold'], default: 'available' },
}));

const orderSchema = new Schema({
  user: ref('User'),
  painting: ref('Painting'),
  price: { type: Number, required: true },
  status: { type: String, enum: ['placed', 'cancelled'], required: true },
}, { timestamps: true });
// A painting can have at most one live order, enforced by MongoDB.
orderSchema.index({ painting: 1 }, { unique: true, partialFilterExpression: { status: 'placed' } });
const Order = mongoose.model('Order', orderSchema);

const bookingSchema = new Schema({
  user: ref('User'),
  date: { type: String, required: true }, // YYYY-MM-DD
  wallSqft: { type: Number, required: true },
  address: { type: String, required: true },
  rate: { type: Number, required: true },
  price: { type: Number, required: true },
  status: { type: String, enum: ['requested', 'confirmed', 'declined', 'cancelled'], required: true },
  // true while requested/confirmed: the unique index below only covers live bookings.
  live: { type: Boolean, default: true },
}, { timestamps: true });
bookingSchema.index({ date: 1 }, { unique: true, partialFilterExpression: { live: true } });
const Booking = mongoose.model('Booking', bookingSchema);

const PotteryRequest = mongoose.model('PotteryRequest', new Schema({
  user: ref('User'),
  item: { type: String, ref: 'PotteryItem', required: true },
  glaze: { type: String, ref: 'Glaze', required: true },
  quantity: { type: Number, required: true },
  neededBy: { type: String, required: true },
  status: { type: String, enum: ['requested', 'accepted', 'declined', 'cancelled'], required: true },
}, { timestamps: true }));

module.exports = { User, Setting, PotteryItem, Glaze, Painting, Order, Booking, PotteryRequest };
