var $tasks, $spinner, $container, $category, $categories, $dropdownMenu, $navbarDropdownMenuLink;

// functions that show and hide jmspinner.
var showSpinner, hideSpinner;

$(document).ready(function() {
  $tasks = $('#tasks');
  $spinner = $('#spinner');
  $container = $('.container');
  $category = $('#category');
  $categories = $('#categories');
  $dropdownMenu = $('.dropdown-menu');
  $dropdownLink = $('#navbarDropdownMenuLink');

  // dropdown menu actions
  $dropdownLink.on('click', function(event) {
    $dropdownMenu.toggle();
    event.stopPropagation();
  });

  // when clicked anywhere on the document, hide the profile dropdown menu and stop propagation of the event.
  $(document).click(function(event) {
    $dropdownMenu.hide();
    event.stopPropagation();
  })

  // bind method to close the alert toast on click of the close icon
  $('.myAlert').on('click', function() {
    $(this).alert('close');
  });

  // automatically closes the alert toast - velocity.js
  $('.myAlert').velocity("slideUp", {delay: 3000, duration: 500});

  $('body').on('click', '.del-task-btn', function() {
    $(".forCategory").hide();

    $('#myModal').fadeIn("fast", function() {
      $(this).modal('show');
    });

    $(".sure-del-task").data('taskid', $(this).data('taskid'));
  });

  $('.sure-del-task').on('click', deleteThisTask);

  $('body').on('click', '.del-category-btn', function() {
    $(".forTask").hide();

    $('#myModal').fadeIn("fast", function() {
      $(this).modal('show');
    });

    $('.sure-del-category').data('categoryid', $(this).data('categoryid'));
  });

  $('.sure-del-category').on('click', deleteThisCategory);

  // add category modal
  $('#category_name_modal_err').hide();

  $('.open-add-category-modal').on('click', function() {
    $('#addCategoryModal').fadeIn("fast", function() {
      $(this).modal('show');
    });
  });

  $('body').on('click', '.add-category-modal-btn', addCategoryAndUpdateList);

});

showSpinner = function() {
  $spinner.jmspinner('large');
  $container.css('filter', 'blur(2px)');
}

hideSpinner = function() {
  $spinner.jmspinner(false);
  $container.css('filter', '');
}

function deleteThisTask(event) {
  // fadeout delete confirmation modal
  $('#myModal').fadeOut("fast", function() {
    $(this).modal('hide');
  });

  showSpinner();

  let taskId = $(this).data('taskid');

  $.ajax({
    url: "/users/deleteTask?id=" + taskId,
    contentType: "application/json",
    type: "DELETE",
    success: function() {
      console.log('deletion of task is successful!!!');
      window.location.href='/users';
    },
    failure: function(err) {
      console.error(err);
      window.location.href='/users';
    }
  });

  event.preventDefault();
}

function deleteThisCategory(event) {
  // fadeout delete confirmation modal
  $('#myModal').fadeOut("fast", function() {
    $(this).modal('hide');
  });

  showSpinner();

  let categoryId = $(this).data('categoryid');

  $.ajax({
    url: "/users/deleteCategory?id=" + categoryId,
    contentType: "application/json",
    type: "DELETE",
    success: function() {
      console.log('deletion of category is successful!!!');
      window.location.href='/users/categories';
    },
    failure: function(err) {
      console.error(err);
    }
  });

  event.preventDefault();
}

// on focus, remove any Error UI changes.
function onfocusAction(id) {
  console.log('here', id);
  $('#' + id).removeClass('errBox');
  $('#' + id + '_err').hide();
}

//add Changes to the UI of a particular field to handle error
function handleErrorUI(id) {
  $('#' + id).addClass('errBox');
  $('#' + id + '_err').show();
}

// add the category via the modal and update the category 'select' list, while on Add Task and Edit Task page.
function addCategoryAndUpdateList(event) {
  if($.trim($('#category_name_modal').val()) == "") {
    handleErrorUI('category_name_modal');
    return;
  }

  // hide the modal
  $('#addCategoryModal').fadeOut('fast', function() {
    $(this).modal('hide');
  });

  showSpinner();
  $.ajax({
    url: "/users/addThisCategory",
    contentType: "application/json",
    type: "POST",
    data: JSON.stringify({
      category_name: $('#category_name_modal').val(),
      isFromModal: true
    }),
    success: function() {
      console.log('category added successfully to db from modal');

      $('#category').append($('<option>', {
        value: $('#category_name_modal').val(),
        text: $('#category_name_modal').val()
      }));
      hideSpinner();
    }
  })
}

// check if all the field values in the form are valid, then only send a request to the server to add task.
function checkAddTaskFormValidity() {
  if($('#task_name')[0].validity.valid && $('#category')[0].validity.valid && $('#due_date')[0].validity.valid && $('#description')[0].validity.valid && $('#is_urgent')[0].validity.valid && $('#is_done')[0].validity.valid && $('#description')[0].validity.valid) {
    showSpinner();
    return true;
  }
}