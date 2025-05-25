require('dotenv').config({ path: './local.env' });

const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 8000;
const DB_URI = process.env.DB_URI || 'mongodb://localhost:27017/dating-app';

// Connect to MongoDB
console.log('Attempting to connect to MongoDB...');
mongoose
    .connect(DB_URI)
    .then(() => {
        console.log('Successfully connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

// Handle process termination
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
    } catch (err) {
        console.error('Error during MongoDB connection closure:', err);
        process.exit(1);
    }
});