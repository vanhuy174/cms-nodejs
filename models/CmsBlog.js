const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    slug: String,
    firstSlug: String,
    description: {
        type: String,
        required: true
    },
    features: String,
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cms_Category',
        // type: String,
        required: true
    },
    image: String,
    featured: Boolean
});

module.exports = mongoose.model('Cms_Blog', productSchema);