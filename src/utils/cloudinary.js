const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    timeout: parseInt(process.env.CLOUDINARY_TIMEOUT),
});

const uploadToCloudinary = async (file) => {
    try {
        const result = await cloudinary.uploader.upload(file, {
            upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
        });
        return result.secure_url;
    } catch (error) {
        throw new Error(error.message);
    }
}

module.exports = { uploadToCloudinary, cloudinary };