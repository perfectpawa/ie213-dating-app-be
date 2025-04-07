const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

process.on('uncaughtException', function(err) {
    console.log(err.name, err.message);
    console.log('UNCAUGHT EXCEPTION! Shutting down...');
    process.exit(1);
})

const app = require('./app');

const mongoose = require('mongoose');
mongoose
    .connect(process.env.DB_URI)
    .then(() => {
        console.log("DB connection successful");
    })
    .catch(err => {
        console.log(err);
    });

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

process.on('unhandledRejection', function(err) {
    console.log(err.name, err.message);
    console.log('UNHANDLED REJECTION! Shutting down...');
    server.close(() => {
        process.exit(1);
    });
})