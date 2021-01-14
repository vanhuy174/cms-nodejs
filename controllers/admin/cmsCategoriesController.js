const mkdirp = require('mkdirp');
const fsExtra = require('fs-extra');

const { validationResult } = require('express-validator/check');

const CmsCategory = require('../../models/CmsCategory');

exports.getCategoriesCms = async (req, res, next) => {
    try {
        const categories = await CmsCategory.find().sort({sorting: 1});
        // Render view file and send data
        res.render('admin/cmsCategories', {
            title: 'CMS Categories',
            categories: categories
        });
    } catch(err) {
        console.log(err);
    }
}

exports.postReorderCategoriesCms = async (req, res, next) => {
    // Catch the array of category ids sent through POST request after manual reordering of categories
    console.log(req.body);
    const ids = req.body['id[]'];
    // For each reordered category -> catch it's id and increase var count for 1
    var count = 0;
    for(var i = 0; i < ids.length; i++) {
        var id = ids[i].toString();
        console.log(id);
        count++;
        try {
            // For each reordered category -> find that category in DB (based on it's previously caught id) and change it's sorting property
            const category = await CmsCategory.findById(id);
            category.sorting = count;
            await category.save();
            // When all categories are asigned with new sorting property values, catch all of them and put them in req.locals, so that they could be caught in the shop views - for the purpose of reordering sidebar links in accordance to their sorting values
            if(count >= ids.length) {
                const categories = await CmsCategory.find().sort({sorting: 1});
                req.app.locals.categories = categories;
            }
        } catch(err) {
            console.log(err);
        }
    };
}

exports.getAddCategoryCms = async (req, res, next) => {
    try {
        // Render view file and send data
        res.render('admin/addCmsCategory', {
            title: 'Add CMS Category',
            oldInput: {},
            valErrors: []
        });
    } catch(err) {
        console.log(err);
    }
}

exports.postAddCategoryCms = (req, res, next) => {
    // Parsing of form input data
    const title = req.body.title.charAt(0,1).toUpperCase() + req.body.title.slice(1);
    var slug = req.body.slug.replace(/\s+/g, '-').toLowerCase();
    if(slug == "") {
        slug = title.replace(/\s+/g, '-').toLowerCase();
    };
    const text = req.body.text;
    // Validating the mimetype of the parsed file (if sent)
    if(req.files && (
        req.files.image.mimetype !== 'image/jpeg' &&
        req.files.image.mimetype !== 'image/jpg' &&
        req.files.image.mimetype !== 'image/png'
    )) {
        req.flash('message-danger', 'The attached file is not an image!');
        return res.status(422).render('admin/addCmsCategory', {
            title: 'Add Category',
            oldInput: {
                title: title,
                text: text,
                slug: req.body.slug
            },
            valErrors: [],
            messageDang: req.flash('message-danger')
        });
    } else {
        // Catching and displaying validation errors
        const valErrors = validationResult(req);
        if(!valErrors.isEmpty()) {
            return res.status(422).render('admin/addCmsCategory', {
                title: 'Add Category',
                oldInput: {
                    title: title,
                    text: text,
                    slug: req.body.slug
                },
                valErrors: valErrors.array()
            });
        }
        // Check if category with this title aleady exists in DB
        CmsCategory.findOne({title: title})
            .then(category => {
                if(category) {
                    req.flash('message-danger', 'Category with this title already exists!');
                    return res.status(422).render('admin/addCmsCategory', {
                        title: 'Add Category',
                        oldInput: {
                            title: title,
                            text: text,
                            slug: req.body.slug
                        },
                        valErrors: valErrors.array(),
                        messageDang: req.flash('message-danger')
                    });
                } else {
                    // Check if category with this slug aleady exists in DB
                    CmsCategory.findOne({slug: slug})
                        .then(category => {
                            if(category) {
                                req.flash('message-danger', 'Category with this slug already exists!');
                                return res.status(422).render('admin/addCmsCategory', {
                                    title: 'Add Category',
                                    oldInput: {
                                        title: title,
                                        text: text,
                                        slug: req.body.slug
                                    },
                                    valErrors: valErrors.array(),
                                    messageDang: req.flash('message-danger')
                                });
                            } else {
                                // Check if category with this firstSlug already exists in DB
                                CmsCategory.findOne({firstSlug: slug})
                                    .then(category => {
                                        if(category) {
                                            req.flash('message-danger', 'Category with this firstSlug already exists!');
                                            return res.status(422).render('admin/addCmsCategory', {
                                                title: 'Add Category',
                                                oldInput: {
                                                    title: title,
                                                    text: text,
                                                    slug: req.body.slug
                                                },
                                                valErrors: [],
                                                messageDang: req.flash('message-danger')
                                            });
                                        } else {
                                            // Catch the name of the sent image and set the imageName variable
                                            let imageName;
                                            if(req.files && req.files.image) {
                                                imageName = req.files.image.name;
                                            } else {
                                                imageName = "";
                                            }
                                            // Create new category in DB
                                            const newCategory = new CmsCategory({
                                                title: title,
                                                slug: slug,
                                                text: text,
                                                firstSlug: slug,  // firstSlug - nedded in order to have always the same image path, as slug is the part of path
                                                image: imageName,
                                                sorting: 100
                                            });
                                            newCategory.save()
                                                .then(result => {
                                                    // Create folder on the server to save category image (regardless of whether it is sent or not)
                                                    mkdirp('public/images/categories/' + newCategory.firstSlug);
                                                    // If sent save the images on the server
                                                    if(imageName != "") {
                                                        const image = req.files.image;
                                                        const path = 'public/images/categories/' + newCategory.firstSlug + '/' + imageName;
                                                        // Move file to the specified place on the server using req.files.file.mv() method
                                                        image.mv(path)
                                                            .then(result => {})
                                                            .catch(err => console.log(err));
                                                    }
                                                    // Catch all categories and put them in request locals, so that they could be caught in shop views in the first next http request - this is done for the purpose of immediately refreshing sidebar links (categories) -> as now one more sidebar link should be added
                                                    CmsCategory.find().sort({sorting: 1})
                                                        .then(categories => {
                                                            req.app.locals.categories = categories;
                                                        })
                                                        .catch(err => console.log(err));
                                                    // Redirect
                                                    req.flash('message-success', 'New category successfully added!');
                                                    res.status(201).redirect('/admin/cmsCategories');
                                                })
                                                .catch(err => console.log(err));
                                        }
                                    })
                                    .catch(err => console.log(err));
                            }
                        })
                        .catch(err => console.log(err));
                }
            })
            .catch(err => console.log(err));
    }
}

exports.getEditCategoryCms = (req, res, next) => {
    const slug = req.params.slug;
    // Find category in DB
    CmsCategory.findOne({slug: slug})
        .then(category => {
            if(!category) {
                req.flash('message-danger', 'Category not found!')
                return res.status(404).redirect('/admin/cmsCategories');
            }
            // Render view file and send data
            return res.render('admin/editCmsCategory', {
                title: 'Edit CMS Category',
                oldInput: {
                    title: category.title,
                    slug: category.slug,
                    firstSlug: category.firstSlug,
                    text: category.text,
                    image: category.image,
                    id: category._id
                },
                valErrors: []
            });
        })
        .catch(err => console.log(err));
}

exports.postEditCategoryCms = (req, res, next) => {
    // Parsing of form input data
    const title = req.body.title.charAt(0).toUpperCase() + req.body.title.slice(1);
    var slug = req.body.slug.replace(/\s+/g, '-').toLowerCase();
    if(slug == "") {
        slug = title.replace(/\s+/g, '-').toLowerCase();
    };
    const firstSlug = req.body.firstSlug;
    const text = req.body.text;
    const oldImage = req.body.oldImage;
    const categoryId = req.body.categoryId;
    // Validating the mimetype of the parsed file (if sent)
    if(req.files && (
        req.files.image.mimetype !== 'image/jpg' &&
        req.files.image.mimetype !== 'image/jpeg' &&
        req.files.image.mimetype !== 'image/png'
    )) {
        req.flash('message-danger', 'The attached file is not an image!');
        return res.status(422).render('admin/edit-categoryM', {
            title: 'Edit Category',
            oldInput: {
                title: title,
                slug: req.body.slug,
                firstSlug: firstSlug,
                text: text,
                image: oldImage,
                id: categoryId
            },
            valErrors: [],
            messageDang: req.flash('message-danger')
        });
    } else {
        // Catching and displaying validation errors
        const valErrors = validationResult(req);
        if(!valErrors.isEmpty()) {
            console.log(valErrors.array());
            return res.status(422).render('admin/edit-categoryM', {
                title: 'Edit Category',
                oldInput: {
                    title: title,
                    slug: slug,
                    firstSlug: firstSlug,
                    text: text,
                    image: oldImage,
                    id: categoryId
                },
                valErrors: valErrors.array()
            });
        }
        // Check if different category with this title already exists in DB
        CmsCategory.findOne({title: title, _id: {$ne: categoryId}})
            .then(category => {
                if(category) {
                    req.flash('message-danger', 'Category with this title already exists!');
                    return res.status(422).render('admin/edit-categoryM', {
                        title: 'Edit Category',
                        oldInput: {
                            title: title,
                            slug: slug,
                            firstSlug: firstSlug,
                            text: text,
                            image: oldImage,
                            id: categoryId
                        },
                        valErrors: [],
                        messageDang: req.flash('message-danger')
                    });
                } else {
                    // Check if different category with this slug already exists in DB
                    CmsCategory.findOne({slug: slug, _id: {$ne: categoryId}})
                        .then(category => {
                            if(category) {
                                req.flash('message-danger', 'Category with this slug already exists!');
                                return res.status(422).render('admin/edit-categoryM', {
                                    title: 'Edit Category',
                                    oldInput: {
                                        title: title,
                                        slug: slug,
                                        firstSlug: firstSlug,
                                        text: text,
                                        image: oldImage,
                                        id: categoryId
                                    },
                                    valErrors: [],
                                    messageDang: req.flash('message-danger')
                                });
                            } else {
                                // Find existing category in DB that should be edited
                                CmsCategory.findById(categoryId)
                                    .then(category => {
                                        if(!category) {
                                            req.flash('message-danger', 'Category not found!');
                                            res.status(404).redirect('/admin/categories');
                                        }
                                        // Catch name of the sent image and set the imageName variable
                                        let imageName;
                                        if(!req.files) {
                                            imageName = "";
                                        } else {
                                            imageName = req.files.image.name;
                                        }
                                        // Update category in DB
                                        category.title = title;
                                        category.slug = slug;
                                        category.text = text;
                                        if(req.files) {
                                            category.image = imageName;
                                        }
                                        category.save()
                                            .then(result => {
                                                // If new image sent - remove the old one from the server (if any)
                                                if(imageName != "") {
                                                    if(oldImage != "") {
                                                        fsExtra.remove('public/images/categories/' + firstSlug + '/' + oldImage)
                                                            .then(result => {})
                                                            .catch(err => console.log(err));
                                                    }
                                                    // Save new image on the server
                                                    const newImage = req.files.image;
                                                    const path = 'public/images/categories/' + firstSlug + '/' + imageName;
                                                    newImage.mv(path)
                                                        .then(result => {})
                                                        .catch(err => console.log(err));
                                                }
                                            })
                                            .then(result => {
                                                // Catch all categories and put them in request locals, so that they could be caught in shop views in the first next http request - this is done for the purpose of immediately refreshing sidebar links (categories) -> one link might be edited (e.g it's title)
                                                CmsCategory.find().sort({sorting: 1})
                                                    .then(categories => {
                                                        req.app.locals.categories = categories;
                                                    })
                                                    .catch(err => console.log(err));
                                                // Redirect
                                                req.flash('message-success', 'Category successfully updated!');
                                                res.status(200).redirect('/admin/categories');
                                            })
                                            .catch(err => console.log(err));
                                    })
                                    .catch(err => console.log(err));
                            }
                        })
                        .catch(err => console.log(err));
                }
            })
            .catch(err => console.log(err));
    }
}

exports.getDeleteImage = (req, res, next) => {
    // Catch the image to be deleted
    const categorySlug = req.params.firstSlug;
    const image = req.query.name;
    const type = req.query.type;
    // Find the image locations
    const path = 'public/images/categories/' + categorySlug + '/' + image;
    // Remove the image
    fsExtra.remove(path)
        .then(result => {
            req.flash('message-success', 'Image deleted successfully!');
            // Find page's current slug needed for adequate page redirection (edit-page)
            CmsCategory.findOne({firstSlug: categorySlug})
                .then(category => {
                    if(type === 'image') {
                        category.image = "";
                    }
                    category.save()
                        .then(result => {
                            res.status(200).redirect('/admin/edit-category/' + category.slug);
                        })
                        .catch(err => console.log(err));
                })
                .catch(err => console.log(err));
        })
        .catch(err => console.log(err));
}

exports.getDeleteCategoryCms = (req, res, next) => {
    const slug = req.params.slug;
    // Find existing category in DB
    CmsCategory.findOne({slug: slug})
        .then(category => {
            if(!category) {
                req.flash('message-danger', 'Category not found!')
                return res.status(404).redirect('/admin/categories');
            }
            // Remove category from DB
            return CmsCategory.findByIdAndDelete(category._id)
                .then(result => {
                    // Remove page's images folder from the server
                    return fsExtra.remove('public/images/categories/' + category.firstSlug);
                })
                .then(result => {
                    // Catch all categories and put them in request locals, so that they could be caught in shop views in the first next http request - for the purpose of refreshing sidebar links (categories) -> one link should be removed
                    CmsCategory.find().sort({sorting: 1})
                        .then(categories => {
                            req.app.locals.categories = categories;
                        })
                        .catch(err => console.log(err));
                    // Redirect
                    req.flash('message-success', 'Category succesfully deleted!');
                    res.status(200).redirect('/admin/categories');
                })
                .catch(err => console.log(err));
        })
        .catch(err => console.log(err));
}