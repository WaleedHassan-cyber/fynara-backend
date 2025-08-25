const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary.js');

const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ecommerce/profile',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const uploadProfile = multer({ storage: profileStorage });

module.exports = uploadProfile;
