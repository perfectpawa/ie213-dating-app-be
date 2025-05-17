const dataUriParser = require('datauri/parser');
const path = require('path');

const getDataUri = (file) => {
    const parser = new dataUriParser();

    const ext = path.extname(file.originalname).toString();

    return parser.format(ext, file.buffer).content;
};

module.exports = getDataUri;