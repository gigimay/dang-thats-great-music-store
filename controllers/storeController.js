const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const multer = require('multer');//- uses for uploading file
const jimp = require('jimp')//- uses for resize photos
const uuid = require('uuid');//- make file names unique


const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter: function(req, file, next){
    const isPhoto = file.mimetype.startsWith('image/')//- verifying the type of image
    if(isPhoto){
      next(null, true)
    }else{
      next({message: 'That filetype isn\'t allowed!'}, false);
    }
  }
}

exports.homePage = (req, res) =>{
  res.render('index');
}

exports.addMusic = (req, res) =>{
  res.render('addmusic', {title: 'Adding Music'})
}

exports.upload = multer(multerOptions).single('photo')//- just saves the file temporarly it's like ROM

exports.resize = async ( req, res, next) =>{
  // check if there is no file to resize
  if (!req.file){
    next();
    return;
  }
  const extension = req.file.mimetype.split('/')[1]
  req.body.photo = `${uuid.v4()}.${extension}`;
  // resizing photos
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  next(); //keep going
}
exports.createMusic = async (req, res) =>{
  req.body.author = req.user._id;
  const store = new Store(req.body);
  await store.save();
  req.flash('success', `successfully created your music of ${store.name}. care to leave a review`);
  res.redirect(`/store/${store.slug}`);
};

exports.musicStore = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 4;
  const skip = (page * limit) - limit;
  //query the database for a list of all music storeSchema before u show them allow
  const storesPromise =  Store
  .find()
  .skip(skip)
  .limit(limit)
  .sort({ created: 'desc' });

  const countPromise = Store.count();
  const [stores, count] = await Promise.all([storesPromise, countPromise]);
  const pages = Math.ceil(count / limit);
  if (!stores.length && skip) {
    req.flash('info', `Hello! You have asked for page ${page}. You are out of music so better to enjoy with the previous ones ${pages} 😼 ` );
    res.redirect(`/stores/page/${pages}`)
    return;
  }

  res.render('musicstore', {title: 'music store', page, pages, count, stores})
};

const confirmOwner = (store, user) => {
  if (!store.author.equals(user._id)) {
    throw Error('You must own a store in order to edit it!');
  }
}

exports.editMusic = async (req, res) =>{
  const store = await Store.findOne({_id: req.params.id})
  confirmOwner(store, req.user);
  res.render('addmusic', {title: `Editing ${store.name}`, store})
};

exports.updateMusicStore = async (req, res) =>{
  const store = await Store.findOneAndUpdate({_id: req.params.id }, req.body, {
    new: true, //return the new music instade of the old one
    runValidators: true
  }).exec();
  req.flash('success', `successfully updated <strong>${store.name}</strong>. <a href="stores/${store.slug}"> View Store -> </a>`);
  res.redirect(`/stores`);
}

exports.getStoreBySlug = async (req, res) =>{
  const store = await Store.findOne({ slug: req.params.slug }).populate('author reviews');
  if(!store){
    return next();
  }
  res.render('store', {store, title: store.name})
}

exports.getStoresByTag = async (req, res) =>{
  const tag = req.params.tag;
  const tagQuery = tag || { $exists: true}
  const tagsPromise = Store.getTagList();
  const storesPromise = Store.find({ tags: tagQuery});
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);

  res.render('tag', { tags, title: 'Tags', tag, stores })
}

exports.searchStores = async (req, res) => {
  const stores = await Store
  //find stores that match the search
  .find({
    $text: {
      $search: req.query.q //q stands for query
    }
  }, {
    score: {
      $meta: 'textScore'
    }
  })
  // sort them by date added
  .sort({
    score: { $meta: 'textScore' }
  })
  // limit the search in five numbers
  .limit(5)
    res.json(stores);
};
