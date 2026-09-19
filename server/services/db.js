import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });

  console.log(`✅ MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

export function isDBConnected() {
  return mongoose.connection.readyState === 1;
}

export default { connectDB, isDBConnected };
