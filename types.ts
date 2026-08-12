
export type UserRole = 'admin' | 'citizen' | 'worker';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  stationedAt?: string; // For workers: which zone or area they are assigned to
  coordinates?: [number, number];
}

export type ComplaintStatus = 'pending' | 'assigned' | 'in-progress' | 'completed' | 'verified';
export type ComplaintType = 'garbage' | 'streetlight' | 'road' | 'water' | 'other';
export type ComplaintPriority = 'low' | 'medium' | 'high' | 'critical';
export type ComplaintSource = 'citizen' | 'sensor';

export interface Complaint {
  id: string;
  title: string;
  description: string;
  type: ComplaintType;
  source: ComplaintSource;
  location: string;
  coordinates?: [number, number];
  status: ComplaintStatus;
  priority: ComplaintPriority;
  assignedTo?: string; // Worker ID
  reportedBy: string; // User ID
  createdAt: string;
  updatedAt: string;
}

export interface Sensor {
  id: string;
  binId?: string;
  type: 'ultrasonic' | 'ldr';
  value: number; // Fill percentage
  distance?: number; // Distance in cm from HC-SR04 ultrasonic sensor
  location: string;
  coordinates?: [number, number];
  isActive: boolean;
  lastUpdate: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
