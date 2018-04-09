const mongoose = require('mongoose');
mongoose.Proomise = global.Promise;
const slug = require('slugs');//the slugs is gonna allow us make url friendly names for our slugs
const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'please a store name!'
  },
  slug: String,
  discription: {
    type: String,
    trim: true
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author'
  }
});

storeSchema.pre('save', async function(next){
  if(!this.isModified('name')){
    return next();//stop the function from running and skip to the next
  }
  //- check if there are store that have the same store names
  this.slug = slug(this.name)
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i')
  //- in upper line i reffers to case in sensitive
  const storesWithSlug = await this.constructor.find({slug: slugRegEx });
  if(storesWithSlug.length){
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`
  }
  next()
})

storeSchema.statics.getTagList = function() {
  return this.aggregate([
    { $unwind: '$tags'},
    { $group: { _id: '$tags', count: { $sum: 1 } }},
    { $sort: { count: -1 } }
  ]);
}
module.exports = mongoose.model('Store', storeSchema);
