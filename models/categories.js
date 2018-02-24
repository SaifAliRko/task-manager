const mongoose = require('mongoose');

var Schema = mongoose.Schema;

// Category Schema
var CategorySchema = new Schema({
  "category_name": {
    type: String,
    trim: true
  },
  "createdDate": {
    type: Date,
    default: Date.now
  },
  "owner": {
    type: Schema.Types.ObjectId,
    ref: 'user'
  }
});

var Categories = module.exports = mongoose.model('categories', CategorySchema); // syntax - mongoose.model(dbCollectionName, relatedSchema)

// utility method that fetches all Categories from the database.
module.exports.getAllCategoriesOfTheUser = function(userId, callback) {
  Categories.find({owner: userId}, callback);
}

// utility method that fetches a category with a particular ID.
module.exports.getCategoryById = function(categoryId, callback) {
  Categories.findById(categoryId, callback);
}

// utility method that updates category with a particular ID.
module.exports.updateCategoryById = function(categoryid, category, option, callback) {
  Categories.findByIdAndUpdate(categoryid, category, option, callback);
}

// utility method that deletes category with a particular ID.
module.exports.deleteCategoryById = function(categoryid, callback) {
  Categories.findByIdAndRemove(categoryid, callback);
}

// utility method that saves a new category to DB.
module.exports.addNewCategory = function(category, callback) {
  category.save(function(err) {
    if(err) {
      req.flash('error_msg', 'Something Went Wrong!!!');
      console.error(err);
      return;
    }

    Categories.findById(category._id)
      .populate('owner')
      .exec(callback);
  });
}