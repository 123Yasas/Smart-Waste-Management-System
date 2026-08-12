import mongoose from 'mongoose';

// User Schema
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, required: true, enum: ['admin', 'citizen', 'worker'] },
  avatar: { type: String, required: true },
  stationedAt: { type: String },
  coordinates: { type: [Number] } // [lat, lng]
});

// Complaint Schema
const complaintSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, required: true },
  source: { type: String, required: true, enum: ['sensor', 'citizen'] },
  location: { type: String, required: true },
  coordinates: { type: [Number] }, // [lat, lng]
  status: { type: String, required: true, enum: ['pending', 'assigned', 'in-progress', 'completed', 'verified'] },
  priority: { type: String, required: true, enum: ['low', 'medium', 'high', 'critical'] },
  reportedBy: { type: String, required: true }, // User id
  assignedTo: { type: String }, // User id (worker)
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Sensor Schema
const sensorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  value: { type: Number, required: true },
  distance: { type: Number },
  location: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  lastUpdate: { type: Date, default: Date.now },
  coordinates: { type: [Number] } // [lat, lng]
});

export const User = mongoose.model('User', userSchema);
export const Complaint = mongoose.model('Complaint', complaintSchema);
export const Sensor = mongoose.model('Sensor', sensorSchema);
