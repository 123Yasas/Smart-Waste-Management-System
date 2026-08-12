import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { User, Complaint, Sensor } from './models.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/civicflow';

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB database'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all complaints
app.get('/api/complaints', async (req, res) => {
  try {
    const complaints = await Complaint.find({}).sort({ createdAt: -1 });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new complaint
app.post('/api/complaints', async (req, res) => {
  try {
    const { id, title, description, type, source, location, coordinates, status, priority, reportedBy } = req.body;
    const newComplaint = new Complaint({
      id: id || `C${Date.now()}`,
      title,
      description,
      type: type || 'other',
      source: source || 'citizen',
      location,
      coordinates,
      status: status || 'pending',
      priority: priority || 'medium',
      reportedBy: reportedBy || '2',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const saved = await newComplaint.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update complaint status or assignee
app.put('/api/complaints/:id', async (req, res) => {
  try {
    const { status, assignedTo } = req.body;
    const updateFields = { updatedAt: new Date() };
    if (status) updateFields.status = status;
    if (assignedTo !== undefined) updateFields.assignedTo = assignedTo;

    const updated = await Complaint.findOneAndUpdate(
      { id: req.params.id },
      { $set: updateFields },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Complaint not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all sensors
app.get('/api/sensors', async (req, res) => {
  try {
    const sensors = await Sensor.find({});
    res.json(sensors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update sensor value & distance (from ThingSpeak or direct HTTP)
app.put('/api/sensors/:id', async (req, res) => {
  try {
    const { value, distance, coordinates } = req.body;
    const updateFields = { lastUpdate: new Date() };
    if (value !== undefined) updateFields.value = value;
    if (distance !== undefined) updateFields.distance = distance;
    if (coordinates !== undefined) updateFields.coordinates = coordinates;

    const updated = await Sensor.findOneAndUpdate(
      { id: req.params.id },
      { $set: updateFields },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Sensor not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Direct ESP32 HTTP POST Endpoint (Option: ESP32 -> Node.js -> MongoDB)
app.post('/api/sensor', async (req, res) => {
  try {
    const { distance, id } = req.body;
    const targetId = id || 'S1';
    const distNum = parseFloat(distance);
    const fillValue = Math.max(0, Math.min(100, Math.round(100 - (distNum / 100) * 100)));

    const updated = await Sensor.findOneAndUpdate(
      { id: targetId },
      { $set: { distance: distNum, value: fillValue, lastUpdate: new Date() } },
      { new: true, upsert: true }
    );
    console.log(`[ESP32 Direct HTTP] Sensor ${targetId} updated: distance=${distNum}cm, fill=${fillValue}%`);
    res.json({ message: 'Sensor data saved to MongoDB', sensor: updated });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Backend API server running on port ${PORT}`);
});
