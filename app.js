const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const helmet = require('helmet');
const cors = require('cors');
const mongooseSanitize = require('express-mongo-sanitize');

const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');


const indexRouter = require('./routes/index');
const usersRouter = require('./routes/usersRoute');
const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use("/", express.static("uploads"))
app.use(helmet());
app.use(cors(
    {
        origin: "http://localhost:3000",
        credentials: true
    }
));

if (process.env.NODE_ENV === 'development') {
    app.use(logger('dev'));
}

app.use(express.json({ limit: '10kb' }));

app.use(mongooseSanitize());

app.use('/', indexRouter);
app.use('/api/v1/users', usersRouter);

app.all('*', function(req, res, next) {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
})
app.use(globalErrorHandler);

module.exports = app;
