/** TO DO List:
**/

/** CHANGE LOGS:
 * Added JWT for taskIds and categoryIds
 * Added 'add category modal' route handlers.
**/


var express = require('express');
var router = express.Router();
var path = require('path');
var moment = require('moment');
var jwt = require('jsonwebtoken');

var Tasks = require('../models/tasks');
var Categories = require('../models/categories');

var config = require('../config/config.js');

//var mainRoute = require('./routes');  // routes with '/'

router.get('/', function(req, res, next) {
  Tasks.getTasksOfThisUserSortByDate(req.session.userID, function(err, tasks) {
    if(err) {
      req.flash('error_msg', 'Something Went Wrong!!!');
      console.error(err);
      return;
    }

    // make array of active tasks.
    let prevDate = -1, taskArr = [], momentDate = -1;
    let dateWiseTasks = [];
    for (let i = 0; i < tasks.length; i++) {
      let task = tasks[i];
      if(task.is_done) continue;
      if(Date.parse(task.due_date) != prevDate && prevDate != -1) {
        dateWiseTasks.push({millisecondValue: prevDate, date: momentDate, tasks: taskArr});
        taskArr = [];
      }

      task.due_date_toShow = moment(tasks[i].due_date).format("MMM Do YYYY");
      task.createdDate_toShow = moment(tasks[i].createdDate).format("MMM Do YYYY");
      task.lastEditedDate_toShow = moment(tasks[i].lastEditedDate).format("MMM Do YYYY");
      task.doneDate_toShow = moment(tasks[i].doneDate).format("MMM Do YYYY");
      task.JWT_Id = getJWT(task._id);

      taskArr.push(task);
      prevDate = Date.parse(task.due_date);
      momentDate = task.due_date_toShow;
    }

    if(prevDate != -1) {
      dateWiseTasks.push({millisecondValue: prevDate, date: momentDate, tasks: taskArr});
      taskArr = [];
    }

    console.log('date wise tasks', dateWiseTasks);

    // make array of done tasks
    prevDate = -1, momentDate = -1;
    let dateWiseTasks_done = [], doneTaskArr = [];
    for (let i = 0; i < tasks.length; i++) {
      let task = tasks[i];
      if(!task.is_done) continue;
      if(Date.parse(task.due_date) != prevDate && prevDate != -1) {
        dateWiseTasks_done.push({millisecondValue: prevDate, date: momentDate, tasks: doneTaskArr});
        doneTaskArr = [];
      }

      task.due_date_toShow = moment(tasks[i].due_date).format("MMM Do YYYY");
      task.createdDate_toShow = moment(tasks[i].createdDate).format("MMM Do YYYY");
      task.lastEditedDate_toShow = moment(tasks[i].lastEditedDate).format("MMM Do YYYY");
      task.doneDate_toShow = moment(tasks[i].doneDate).format("MMM Do YYYY");
      task.JWT_Id = getJWT(task._id);
      
      doneTaskArr.push(task);
      prevDate = Date.parse(task.due_date);
      momentDate = task.due_date_toShow;
    }

    if(prevDate != -1) {
      dateWiseTasks_done.push({millisecondValue: prevDate, date: momentDate, tasks: doneTaskArr});
      doneTaskArr = []; 
    }

    console.log('date wise tasks done', dateWiseTasks_done);

    let hasTasks = dateWiseTasks.length | dateWiseTasks_done.length;
    // req.flash can only be accessed once, after that it expires. And it also expires when there is a different request...

    /* console.log('res.locals', res.locals);
    console.log('req.flash', req.flash('error_msg')); */

    if(res.locals.success_msg.toString() == "" && res.locals.error_msg.toString() == "") {
      res.render('index', {hasTasks: hasTasks, dateWiseTasks: dateWiseTasks, dateWiseTasks_done: dateWiseTasks_done, isActiveNavLink_Tasks: true, user: {firstName: req.user.firstName}});
      return;
    }

    var flashMsgObj = {
      success: res.locals.success_msg,
      error: res.locals.error_msg
    }

    console.log('flashMsg', flashMsgObj);
    res.render('index', {hasTasks: hasTasks, dateWiseTasks: dateWiseTasks, dateWiseTasks_done: dateWiseTasks_done, isActiveNavLink_Tasks: true, flashMsgObj: flashMsgObj, user: {firstName: req.user.firstName}});
  });
});

router.get('/addTask', function(req, res, next) {
  Categories.getAllCategoriesOfTheUser(req.session.userID, function(err, categories) {
    if(err) {
      throw err;
    }

    res.render('addTasks', {isActiveNavLink_AddTask: true, categories: categories, user: {firstName: req.user.firstName}});
  });
});

// this method shows the EditTask page with task values pre populated, on click of the 'edit task' button.
router.get('/editTask', function(req, res, next) {
  let taskId;

  // try catch block to catch exception if JWT Token cannot get decrypted. Try-Catch is used because the function call is chosen to be synchronous and not asynchronous.
  try {
    taskId = verifyJWT(req.query.taskid).Id;
  } catch(err) {
    req.flash('error_msg', 'Something Went Wrong!!!');
    //console.error('My error', err);
    res.redirect('/');
    return;
  }
  
  Tasks.getTaskById(taskId, function(err, task) {
    if(err) {
      req.flash('error_msg', 'Something Went Wrong!!!');
      console.error(err);
      return;
    }

    // get all categories for "select category dropdown list"
    Categories.getAllCategoriesOfTheUser(req.session.userID, function(err, categories) {
      if(err) {
        req.flash('error_msg', 'Something Went Wrong!!!');
        console.error(err);
        return;
      }
      //task.due_date_toShow = task.due_date.toString().split('T')[0];
      task.due_date_toShow = moment(task.due_date).format('YYYY-MM-DD');
      task.JWT_Id = getJWT(task._id);

      for (var i = 0; i < categories.length; i++) {
        categories[i].is_selected = (categories[i].category_name == task.category);
      }

      res.render('editTask', {task: task, categories: categories, user: {firstName: req.user.firstName}});
    });

  });
});

// this route saves the task that is edited.
router.post('/saveEditedTask', function(req, res, next) {
  let taskId;

  // try catch block to catch exception if JWT Token cannot get decrypted. Try-Catch is used because the function call is chosen to be synchronous and not asynchronous.
  try {
    taskId = verifyJWT(req.query.taskid).Id;
    console.log('verify jwt', taskId)
  } catch(err) {
    req.flash('error_msg', 'Something Went Wrong!!!');
    console.error(err);
    return;
  }

  Tasks.updateTaskById(taskId, req.body, {new: true}, function(err, task) {
    if(err) {
      req.flash('error_msg', 'Something Went Wrong!!!');
      console.error(err);
    } else {
      req.flash('success_msg', 'Task Edited Successfully!');
    }
    res.redirect('/users');
  });
});

router.post('/saveTask', function(req, res, next) {
  var task = new Tasks({
    "task_name": req.body.task_name,
    "category": req.body.category,
    "description": req.body.description,
    "is_urgent": req.body.is_urgent,
    "due_date": req.body.due_date,
    "is_done": req.body.is_done,
    "owner": req.session.userID
  });

  Tasks.saveNewTask(task, function(err) {
    if(err) {
      req.flash('error_msg', 'Something Went Wrong!!!');
      console.error(err);
    } else {
      req.flash('success_msg', 'Task Added Successfully!');
    }

    res.redirect('/users');
  });
});

// this route deletes a particular task.
router.delete('/deleteTask', function(req, res, next) {
  let taskId;

  // try catch block to catch exception if JWT Token cannot get decrypted. Try-Catch is used because the function call is chosen to be synchronous and not asynchronous.
  try {
    taskId = verifyJWT(req.query.id).Id;
  } catch(err) {
    req.flash('error_msg', 'Something Went Wrong!!!');
    console.error('my error ', err);

    res.send();
    return;
  }

  Tasks.deleteTaskById(taskId, function(err, task) {
    if(err) {
      req.flash('error_msg', 'Something Went Wrong!!!');
      console.error(err);
    } else {
      req.flash('success_msg', 'Task Deleted Successfully!');
    }

    res.send();
  });
});

// this method marks a particular task as 'done' once the done button is clicked.
router.get('/setTaskDone', function(req, res, next) {
  let taskId;

  // try catch block to catch exception if JWT Token cannot get decrypted. Try-Catch is used because the function call is chosen to be synchronous and not asynchronous.
  try {
    taskId = verifyJWT(req.query.taskid).Id;
  } catch(err) {
    req.flash('error_msg', 'Something Went Wrong!!!');
    console.error('my error', err);

    res.redirect('/');
    return;
  }

  Tasks.setTaskDone(taskId, function (err) { 
    if(err) {
      req.flash('error_msg', 'Something Went Wrong!!!');
      console.error(err);
    } else {
      req.flash('success_msg', 'Marked Done!');
    }
    res.redirect('/users');
  });
});

// this method re-activates a done task after the 're-activate' button is clicked.
router.get('/setTaskActive', function(req, res, next) {
  let taskId;

  // try catch block to catch exception if JWT Token cannot get decrypted. Try-Catch is used because the function call is chosen to be synchronous and not asynchronous.
  try {
    taskId = verifyJWT(req.query.taskid).Id;
  } catch(err) {
    req.flash('error_msg', 'Something Went Wrong!!!');
    console.error(err);

    res.redirect('/');
    return;
  }

  Tasks.setTaskActive(taskId, function (err) { 
    if(err) {
      req.flash('error_msg', 'Something Went Wrong!!!');
      console.error(err);
    } else {
      req.flash('success_msg', 'Marked Active again!');
    }
    res.redirect('/users');
  });
});

router.get('/categories', function(req, res, next) {
  Categories.getAllCategoriesOfTheUser(req.session.userID, function(err, categories) {

    for (let i = 0; i < categories.length; i++) {
      categories[i].JWT_Id = getJWT(categories[i]._id);
    };

    // req.flash can only be accessed once, after that it expires. And it also expires when there is a different request...
    if(res.locals.success_msg.toString() == "" && res.locals.error_msg.toString() == "") {
      res.render('categories', {categories: categories, isActiveNavLink_ManageCategories: true, user: {firstName: req.user.firstName}});
      return;
    }

    var flashMsgObj = {
      success: res.locals.success_msg,
      error: res.locals.error_msg
    }

    res.render('categories', {categories: categories, isActiveNavLink_ManageCategories: true, flashMsgObj: flashMsgObj, user: {firstName: req.user.firstName}});
  });
});

router.get('/editcategory', function(req, res, next) {
  var categoryid;

  // try catch block to catch exception if JWT Token cannot get decrypted. Try-Catch is used because the function call is chosen to be synchronous and not asynchronous.
  try {
    categoryid = verifyJWT(req.query.id).Id;
  } catch(err) {
    req.flash('error_msg', 'Something Went Wrong!!!');
    console.error(err);

    res.redirect('/users/category');
    return;
  }

  Categories.getCategoryById(categoryid, function(err, category) {
    category.JWT_Id = getJWT(category._id);
    if(err) {
      req.flash('error_msg', 'Something Went Wrong!!!');
      console.error(err);
    } else {
      res.render('editCategory', {category: category, user: {firstName: req.user.firstName}});
    }
  })
});

router.post('/saveEditedCategory', function(req, res, next) {
  var categoryid;

  // try catch block to catch exception if JWT Token cannot get decrypted. Try-Catch is used because the function call is chosen to be synchronous and not asynchronous.
  try {
    categoryid = verifyJWT(req.query.id).Id;
  } catch(err) {
    req.flash('error_msg', 'Something Went Wrong!!!');
    console.error(err);

    res.redirect('/users/categories');
    return;
  }
  
  Categories.updateCategoryById(categoryid, req.body, {new: true}, function(err, category) {
    if(err) {
      req.flash('error_msg', 'Something Went Wrong!!!');
      console.error(err);
    } else {
      req.flash('success_msg', 'Category Edited Successfully!');
    }

    res.redirect('/users/categories');
  });
});

router.delete('/deleteCategory', function(req, res, next) {
  var categoryid;

  // try catch block to catch exception if JWT Token cannot get decrypted. Try-Catch is used because the function call is chosen to be synchronous and not asynchronous.
  try {
    categoryid = verifyJWT(req.query.id).Id;
  } catch(err) {
    req.flash('error_msg', 'Something Went Wrong!!!');
    console.error(err);

    res.send();
    return;
  }

  Categories.deleteCategoryById(categoryid, function(err) {
    if(err) {
      req.flash('error_msg', 'Something Went Wrong!!!');
      console.error(err);
    } else {
      req.flash('success_msg', 'Category Deleted Successfully!');
    }

    res.send();
  });
});

router.get('/addCategory', function(req, res, next) {
  res.render('addCategory', {user: {firstName: req.user.firstName}});
});

router.post('/addThisCategory', function(req, res, next) {
  var category = new Categories({
    "category_name": req.body.category_name,
    "owner": req.session.userID
  });

  let isFromModal = req.body.isFromModal;
  console.log('req', req.body);
  Categories.addNewCategory(category, function(err) {
    if(err) {
      req.flash('error_msg', 'Something Went Wrong!!!');
      console.error(err);
    } else {
      req.flash('success_msg', 'Category Added Successfully!');
    }

    if(isFromModal) {
      res.send();
    } else {
      res.redirect('/users/categories');
    }
  })
});

// this route renders the 'change password page'.
router.get('/changePasswordPage', function(req, res, next) {
  res.render('changePassword', {layout: 'other.handlebars' , renderOldPassword: true});
});

router.get('/logout', function(req, res, next) {
  console.log('here at logout 1');
  //res.redirect('/logout');
});

module.exports = router;

// method that gives the encrypts the Id passed as arguments into a JWT Token.
function getJWT(Id) {  
  return jwt.sign({ Id }, config.jwtSecret);
}

// method that decrypts the Token with the jwtSecret and fetches the actual original value.
function verifyJWT(token) {
  //console.log('token', token);
  return jwt.verify(token, config.jwtSecret);
}