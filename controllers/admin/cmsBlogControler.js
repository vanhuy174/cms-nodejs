const mkdirp = require('mkdirp');
const fsExtra = require('fs-extra');
const resizeImg = require('resize-img');

const { validationResult } = require('express-validator/check');

const Blog = require('../../models/CmsBlog');
const Category = require('../../models/CmsCategory');

exports.getBlogsListPage = async (req, res, next) => {
    try {
        const blogs = await Blog.find().populate('category', 'title slug').sort({sorting: 1});
        // .then(prods => {
        //      console.log(prods);
        //      const products = prods.map(product => {
        //           Category.find({slug: product.category})
        //                .then(category => {
        //                     console.log(category);
        //                     return {...product, catName: category.title};
        //                })
        //                .catch(err => console.log(err));
        //      });
        //      return products;
        // })
        // Render view file and send data
        res.render('admin/blog', {
            title: 'Blogs',
            blogs: blogs
        });
    } catch(err) {
        console.log(err);
    }
}

exports.postReorderBlogs = async (req, res, next) => {
    // Catch the array of page ids sent through POST request after manual reordering of pages
    console.log(req.body);
    const ids = req.body['id[]'];
    try {
        // For each reordered page -> catch it's id and increase value of variable 'count' by 1
        var count = 0;
        for(var i = 0; i < ids.length; i++) {
            var id = ids[i].toString();
            console.log(id);
            count++;
            // For each reordered page -> find that page in DB (based on it's previously caught id) and change it's sorting property
            const blog = await Blog.findById(id);
            blog.sorting = count;
            await blog.save();
            // When all pages are asigned with new sorting property values, catch all pages and put them in request locals, so that they could be caught in the header view - for the purpose of reordering navigation links in accordance to new pages' sorting values
            if(count >= ids.length) {
                const blog = await Blog.find().sort({sorting: 1});
                req.app.locals.products = products;
            }
        };
    } catch(err) {
        console.log(err);
    }
}

exports.getAddBlogPage = async (req, res, next) => {
    try {
        // Catch all categories that could be assigned to newly added product
        const categories = await Category.find().sort({sorting: 1});
        // Render view file and send data
        res.render('admin/add-blog', {
            title: 'Add Blog',
            oldInput: {},
            categories: categories,
            valErrors: []
        });
    } catch (err) {
        console.log(err);
    }
}

exports.postAddBlog = async (req, res, next) => {
    // Parsing of text input data

    const title = req.body.title;
    let slug = req.body.slug.replace(/\s+/g, '-').toLowerCase();
    if(slug == "") {
        slug = title.replace(/\s+/g, '-').toLowerCase();
    }
    const category = req.body.category;
    const description = req.body.description;
    const features = req.body.features;
    const featured = req.body.featured;
    try {
        // Validating the mimetype of the parsed file (if sent)
        if(req.files && (
            req.files.image.mimetype !== 'image/jpeg' &&
            req.files.image.mimetype !== 'image/jpg' &&
            req.files.image.mimetype !== 'image/png'
        )) {
            // Catch all categories that could be assigned to newly added product
            const categories = await Category.find().sort({sorting: 1});
            await req.flash('message-danger', 'The attached file is not an image!');
            res.status(422).render('admin/blog', {
                title: 'Add Blog',
                oldInput: {
                    title: title,
                    slug: req.body.slug,
                    category: category,
                    description: description,
                    features: features,
                    featured: featured,
                },
                categories: categories,
                valErrors: [],
                messageDang: req.flash('message-danger')
            });
        } else {
            //Catching and displaying validation errors

            // const valErrors = validationResult(req);
            // if(!valErrors.isEmpty()) {
            //     console.log(valErrors.isEmpty());
            //     /*Catch all categories that could be assigned to newly added product*/
            //     const categories = await Category.find().sort({sorting: 1});
            //     res.status(422).render('admin/add-blog', {
            //         title: 'Add Blog',
            //         oldInput: {
            //             title: title,
            //             slug: req.body.slug,
            //             category: category,
            //             description: description,
            //             features: features,
            //         },
            //         categories: categories,
            //         valErrors: valErrors.array()
            //     });
            // } else {
                // Check if product with this name already exists in DB
                const blog = await Blog.findOne({title: title});
                if(blog) {
                    // Catch all categories that could be assigned to newly added product
                    const categories = await Category.find().sort({sorting: 1});
                    await req.flash('message-danger', 'Blog with this name already exists!');
                    return res.status(422).render('admin/add-blog', {
                        title: 'Add blog',
                        oldInput: {
                            title: title,
                            slug: req.body.slug,
                            category: category,
                            description: description,
                            features: features,
                            featured: featured,
                        },
                        categories: categories,
                        valErrors: [],
                        messageDang: req.flash('message-danger')
                    });
                } else {
                    // Check if product with this slug already exists in DB
                    const blog = await Blog.findOne({slug: slug});
                    if(blog) {
                        // Catch all categories that could be assigned to newly added product
                        const categories = await Category.find().sort({sorting: 1});
                        await req.flash('message-danger', 'Blog with this slug already exists!');
                        return res.status(422).render('admin/add-blog', {
                            title: 'Add Blog',
                            oldInput: {
                                title: title,
                                slug: req.body.slug,
                                category: category,
                                description: description,
                                features: features,
                                featured: featured,
                            },
                            categories: categories,
                            valErrors: [],
                            messageDang: req.flash('message-danger')
                        });
                    } else {
                        // Check if product with this firstSlug already exists in DB
                        const blog = await Blog.findOne({firstSlug: slug});
                        if(blog) {
                            // Catch all categories that could be assigned to newly added product
                            const categories = await Category.find().sort({sorting: 1});
                            await req.flash('message-danger', 'Product with this firstSlug already exists!');
                            return res.status(422).render('admin/add-blog', {
                                title: 'Add Blog',
                                oldInput: {
                                    title: title,
                                    slug: req.body.slug,
                                    category: category,
                                    description: description,
                                    features: features,
                                    featured: featured,
                                },
                                categories: categories,
                                valErrors: [],
                                messageDang: req.flash('message-danger')
                            });
                        } else {
                            // Catch the name of the sent image and set the imageName variable
                            let imageName;
                            if(req.files) {
                                imageName = req.files.image.name;
                            } else {
                                imageName = "";
                            }
                            // Create new product in DB
                            const newBlog = new Blog({
                                title: title,
                                slug: slug,
                                firstSlug: slug,  // firstSlug - nedded in order to have always the same image path, as slug is the part of path
                                category: category,
                                image: imageName,
                                description: description,
                                features: features,
                                featured: featured,
                                sorting: 500
                            });
                            newBlog.save();
                            // Create folders on the server to save the image (regardless of whether it is sent or not)
                            await mkdirp('public/images/products/' + newBlog.firstSlug);
                            await mkdirp('public/images/products/' + newBlog.firstSlug + '/gallery');
                            await mkdirp('public/images/products/' + newBlog.firstSlug + '/gallery/thumbs');
                            // If sent -> save the image on the server
                            if(imageName != "") {
                                const image = req.files.image;
                                const path = 'public/images/products/' + newBlog.firstSlug + '/' + imageName;
                                // Move file to the specified place on the server using req.files.file.mv() method
                                await image.mv(path);
                            }
                            await req.flash('message-success', 'New product added successfully!');
                            res.status(201).redirect('/admin/blogs');
                        }
                    }
                }
            // }
        }
    } catch (err) {
        console.log(err);
    }
}

exports.getEditBlog = async (req, res, next) => {
    const slug = req.params.slug;
    try {
        // Find the poroduct in DB
        const blog = await Blog.findOne({slug: slug});
        if(!blog) {
            await req.flash('message-danger', 'Blog not found!');
            return res.status(404).redirect('/admin/blogs');
        }
        // Catch gallery images (if any)
        const gallery = 'public/images/products/' + blog .firstSlug + '/gallery';
        let galleryImages = null;
        galleryImages = await fsExtra.readdir(gallery);
        // Catch all categories that could be assigned to newly edited product
        const categories = await Category.find().sort({sorting: 1});
        // Render view file and send data
        res.render('admin/edit-blog', {
            title: 'Edit Blog',
            oldInput: {
                title: blog.title,
                slug: blog.slug,
                firstSlug: blog.firstSlug,
                category: blog.category,
                description: blog.description,
                features: blog.features,
                featured: blog.featured,
                image: blog.image,
                special: blog.special,
                id: blog._id
            },
            categories: categories,
            galleryImages: galleryImages,
            valErrors: []
        });
    } catch(err) {
        console.log(err);
    }
}

exports.postEditBlog = async (req, res, next) => {
    // Parsing of text input data
    console.log("asdf ahih");
    const title = req.body.title;
    let slug = req.body.slug.replace(/\s+/g, '-').toLowerCase();
    if(slug == "") {
        slug = title.replace(/\s+/g, '-').toLowerCase();
    }
    const category = req.body.category;
    const description = req.body.description;
    const features = req.body.features;
    const firstSlug = req.body.firstSlug;
    const availability = req.body.availability;
    const special = req.body.special;
    const prodImage = req.body.prodImage;
    const productId = req.body.productId;
    const featured = req.body.featured;
    try {
        // Catch gallery images (fsExtra.readdir() will also catch 'thumbs' folder inside gallery folder)
        const gallery = 'public/images/products/' + firstSlug + '/gallery';
        let galleryImages = null;
        const images = await fsExtra.readdir(gallery);
        galleryImages = images;
        // Validating the mimetype of the parsed file (if sent)
        if(req.files && (
            req.files.image.mimetype !== 'image/jpg' &&
            req.files.image.mimetype !== 'image/jpeg' &&
            req.files.image.mimetype !== 'image/png'
        )) {
            await req.flash('message-danger', 'The attached file is not an image!');
            // Catch all categories that could be assigned to newly edited product
            const categories = await Category.find().sort({sorting: 1});
            res.status(422).render('admin/edit-blog', {
                title: 'Edit Product',
                oldInput: {
                    title: title,
                    slug: req.body.slug,
                    category: category,
                    description: description,
                    features: features,
                    firstSlug: firstSlug,
                    image: prodImage,
                    availability: availability,
                    special: special,
                    featured: featured,
                    id: productId
                },
                categories: categories,
                valErrors: [],
                galleryImages: galleryImages,
                messageDang: req.flash('message-danger')
            });
        } else {
            // Catching and displaying validation errors
            // const valErrors = validationResult(req);
            // if(!valErrors.isEmpty()) {
            //     // Catch all categories that could be assigned to newly edited product
            //     const categories = await Category.find().sort({sorting: 1});
            //     res.status(422).render('admin/edit-blog', {
            //         title: 'Edit Blog',
            //         oldInput: {
            //             title: title,
            //             slug: req.body.slug,
            //             category: category,
            //             description: description,
            //             features: features,
            //             firstSlug: firstSlug,
            //             image: prodImage,
            //             availability: availability,
            //             special: special,
            //             id: productId
            //         },
            //         categories: categories,
            //         galleryImages: galleryImages,
            //         valErrors: valErrors.array()
            //     });
            // } else {
                // Check if other product with the same name already exists in DB (it must be unique)
                const product = await Blog.findOne({title: title, _id: {$ne: productId}});
                if(product) {
                    await req.flash('message-danger', 'Blog with this name already exists!');
                    // Catch all categories that could be given to newly edited product
                    const categories = await Category.find().sort({sorting: 1});
                    res.status(422).render('admin/edit-blog', {
                        title: 'Edit Product',
                        oldInput: {
                            title: title,
                            slug: req.body.slug,
                            category: category,
                            description: description,
                            features: features,
                            firstSlug: firstSlug,
                            image: prodImage,
                            availability: availability,
                            special: special,
                            featured: featured,
                            id: productId
                        },
                        categories: categories,
                        valErrors: [],
                        galleryImages: galleryImages,
                        messageDang: req.flash('message-danger')
                    });
                } else {
                    // Check if product with this slug already exists in DB
                    const product = await Blog.findOne({slug: slug, _id: {$ne: productId}});
                    if(product) {
                        await req.flash('message-danger', 'Blog with this slug already exists!');
                        // Catch all categories that could be given to newly edited product
                        const categories = await Category.find().sort({sorting: 1});
                        res.status(422).render('admin/edit-blog', {
                            title: 'Edit Product',
                            oldInput: {
                                title: title,
                                slug: req.body.slug,
                                category: category,
                                description: description,
                                features: features,
                                firstSlug: firstSlug,
                                image: prodImage,
                                availability: availability,
                                special: special,
                                featured: featured,
                                id: productId
                            },
                            categories: categories,
                            valErrors: [],
                            galleryImages: galleryImages,
                            messageDang: req.flash('message-danger')
                        });
                    } else {
                        // Find existing product in DB that should be edited
                        const product = await Blog.findById(productId);
                        if(!product) {
                            await req.flash('message-danger', 'Blog not found!');
                            return res.status(404).redirect('/admin/blogs');
                        }
                        // Catch the name of the sent image and set the imageName variable
                        let imageName;
                        if(!req.files) {
                            imageName = "";
                        } else {
                            imageName = req.files.image.name;
                        }
                        // Update product in DB
                        product.title = title;
                        product.slug = slug;
                        product.category = category;
                        product.description = description;
                        product.features = features;
                        product.availability = availability;
                        product.special = special;
                        product.featured = featured;
                        if(req.files) {
                            product.image = imageName;
                        }
                        await product.save();
                        // If new image sent - remove the old one from the server (if any)
                        if(imageName != "") {
                            if(prodImage != "") {
                                await fsExtra.remove('public/images/products/' + firstSlug + '/' + prodImage);
                            }
                            // Save new image on the server
                            const newImage = req.files.image;
                            const path = 'public/images/products/' + firstSlug + '/' + imageName;
                            await newImage.mv(path);
                        }
                        await req.flash('message-success', 'Product updated successfully!');
                        res.status(200).redirect('/admin/blogs');
                    }
                }
            // }
        }
    } catch (err) {
        console.log(err);
    }
}

exports.postDropImagesToGallery = (req, res, next) => {
    console.log(req.files);
    // Catch images dropped to Dropzone on 'edit-page.ejs' (one image by one)
    const droppedImage = req.files.file;
    // Create paths on the server ehere dropped images will be saved
    const firstSlug = req.params.firstSlug;
    const path = 'public/images/products/' + firstSlug + '/gallery/' + droppedImage.name;
    const thumbsPath = 'public/images/products/' + firstSlug + '/gallery/thumbs/' + droppedImage.name;
    //Move caught images to the gallery folder
    droppedImage.mv(path)
        .then(result => {
            // Resize the moved images
            resizeImg(fsExtra.readFileSync(path), {width: 100, height: 100})
                .then(buf => {
                    // Move resized image to the thumbs folder in the gallery
                    fsExtra.writeFileSync(thumbsPath, buf);
                })
                .catch(err => console.log(err));
        })
        .catch(err => console.log(err));
    // Send response status (we must do that in order that Dropzone Ajax code works)
    res.sendStatus(200);
}

exports.getDeleteImage = (req, res, next) => {
    // Catch the image to be deleted
    const productSlug = req.params.firstSlug;
    const galImage = req.query.name;
    // Find the image locations
    const path = 'public/images/products/' + productSlug + '/gallery/' + galImage;
    const thumbPath = 'public/images/products/' + productSlug + '/gallery/thumbs/' + galImage;
    // Remove the image
    fsExtra.remove(path)
        .then(result => {
            fsExtra.remove(thumbPath)
                .then(result => {
                    req.flash('message-success', 'Image deleted successfully!');
                    // Find product's current slug needed for adequate page redirection (edit-product)
                    Blog.findOne({firstSlug: productSlug})
                        .then(product => {
                            res.status(200).redirect('/admin/edit-product/' + product.slug);
                        })
                        .catch(err => console.log(err));
                })
                .catch(err => console.log(err));
        })
        .catch(err => console.log(err));
}

exports.getDeleteBlog = (req, res, next) => {
    const slug = req.params.slug;
    // Find existing product in DB
    Blog.findOne({slug: slug})
        .then(product => {
            if(!product) {
                req.flash('message-danger', 'Blog not found!')
                return res.status(404).redirect('/admin/blogs');
            }
            // Remove product from DB
            Blog.findByIdAndDelete(product._id)
                .then(result => {
                    // Remove product's images folder from the server
                    return fsExtra.remove('public/images/products/' + product.firstSlug);
                })
                .then(result => {
                    req.flash('message-success', 'Blog deleted successfully!');
                    res.status(200).redirect('/admin/blogs');
                })
                .catch(err => console.log(err));
        })
        .catch(err => console.log(err));
}