import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Complaint, Sensor } from './models.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/civicflow';

const INITIAL_USERS = [
  { id: '1', name: 'Senthil Kumar', email: 'admin@civic.com', role: 'admin', avatar: 'https://picsum.photos/seed/senthil/200' },
  { id: '2', name: 'Rahul', email: 'citizen@civic.com', role: 'citizen', avatar: 'https://picsum.photos/seed/rahul/200' },
  { id: '3', name: 'Karthik', email: 'worker@civic.com', role: 'worker', avatar: 'https://picsum.photos/seed/karthik/200', stationedAt: 'North Sector', coordinates: [37.7749, -122.4194] },
  { id: '4', name: 'Priya', email: 'worker2@civic.com', role: 'worker', avatar: 'https://picsum.photos/seed/priya/200', stationedAt: 'East Market', coordinates: [37.7849, -122.4294] },
  { id: '5', name: 'Vijay', email: 'worker3@civic.com', role: 'worker', avatar: 'https://picsum.photos/seed/vijay/200', stationedAt: 'West Square', coordinates: [37.7649, -122.4094] },
];

const INITIAL_COMPLAINTS = [
  {
    id: 'C2',
    title: 'Garbage Overflow Detected',
    description: 'System alert: Bin level exceeded 95%. Automated request for pickup.',
    type: 'garbage',
    source: 'sensor',
    location: 'East Market, Gate 4',
    coordinates: [37.7800, -122.4200],
    status: 'pending',
    priority: 'high',
    reportedBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const INITIAL_SENSORS = [
  { id: 'S1', type: 'ultrasonic', value: 45, location: 'Market Square', isActive: true, lastUpdate: new Date(), coordinates: [37.7820, -122.4220] },
];

async function seed() {
  try {
    console.log('Connecting to MongoDB...', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!');

    // Clear existing collections
    await User.deleteMany({});
    await Complaint.deleteMany({});
    await Sensor.deleteMany({});
    console.log('Cleared existing data.');

    // Seed users
    await User.insertMany(INITIAL_USERS);
    console.log(`Seeded ${INITIAL_USERS.length} users.`);

    // Seed complaints
    await Complaint.insertMany(INITIAL_COMPLAINTS);
    console.log(`Seeded ${INITIAL_COMPLAINTS.length} complaints.`);

    // Seed sensors
    await Sensor.insertMany(INITIAL_SENSORS);
    console.log(`Seeded ${INITIAL_SENSORS.length} sensors.`);

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
}

seed();
