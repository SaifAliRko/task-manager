const mongoose = require('mongoose');

var Schema = mongoose.Schema;

// Task Schema
var TaskSchema = new Schema({
  "task_name": {
    type: String,
    trim: true
  },
  "category": {
    type: String,
    trim: true
  },
  "is_urgent": {
    type: Boolean,
  },
  "description": {
    type: String,
    trim: true
  },
  "due_date": {
    type: Date,
  },
  "createdDate": {
    type: Date,
    default: Date.now
  },
  "lastEditedDate": {
    type: Date,
    default: Date.now
  },
  "owner": {
    type: Schema.Types.ObjectId,
    ref: 'user'
  },
  "is_done": {
    type: Boolean,
    default: false
  },
  "doneDate": {
    type: Date,
    default: Date.now
  }
});

var Tasks = module.exports = mongoose.model('task', TaskSchema);

// utility function that fetches the Tasks of the Current User.
module.exports.getTasksOfThisUser = function(userId, callback) {
  Tasks.find({owner: userId}, callback);
  //Tasks.find({}, callback);
};

// utility method that fetches the tasks of a particular user sorted by date.
module.exports.getTasksOfThisUserSortByDate = function(userId, callback) {
  Tasks.find({owner: userId}).sort({due_date: 'asc'}).exec(callback);
}

// utility function that fetched the Task with a particular ID.
module.exports.getTaskById = function(taskId, callback) {
  Tasks.findById(taskId, callback);
}

// utility function that updates a Task with a particular ID.
module.exports.updateTaskById = function(taskId, task, option, callback) {
  Tasks.findByIdAndUpdate(taskId, task, option, callback);
}

// utility function that saves a new Task.
module.exports.saveNewTask = function(task, callback) {
  //console.log('tosavetask', task);
  task.save(function(err) {
    if(err) {
      req.flash('error_msg', 'Something Went Wrong!!!');
      console.error(err);
      return;
    }

    //console.log('inside saveNewTask', task);
    Tasks.findById(task._id)
          .populate('owner')
          .exec(callback);
  });
}

// utility function that deletes a Task with a particular ID.
module.exports.deleteTaskById = function(taskId, callback) {
  Tasks.findByIdAndRemove(taskId, callback);
}

// utility function that marks a particular task as 'done'.
module.exports.setTaskDone = function(taskId, callback) {
  Tasks.findByIdAndUpdate(taskId, {is_done: true, doneDate: new Date()}, {new: true}, callback);
}

// utility function that marks a 'done' task as 'Active' again.
module.exports.setTaskActive = function(taskId, callback) {
  Tasks.findByIdAndUpdate(taskId, {is_done: false}, {new: true}, callback);
}