var $btnSignUp, $authFailsDiv, $btnSignIn, $btnResendToken, $btnForgotPassword;

// functions that show and hide jmspinner.
var $spinner, $container;

$(document).ready(function() {
  $btnSignUp = $('#btn-signUp');
  $authFailsDiv = $('#authFailsDiv');
  $btnSignIn = $('#btn-signIn');
  $spinner = $('#spinner');
  $container = $('.container');
  $btnResendToken = $('#btn-resendToken');
  $btnForgotPassword = $('#btn-forgotPassword');
  
  $authFailsDiv.html('');
  $authFailsDiv.removeClass('transform');
  
  $btnSignUp.on('click', validateSignup);
  //$btnSignIn.on('click', validateSignIn);
  $btnResendToken.on('click', resendAuthToken);
  $btnForgotPassword.on('click', function(event) {
    event.preventDefault();
    showSpinner();
    window.location.href = '/forgotPasswordPage';
  })
  
  $('.myAlert').hide();
  
  initPageActions();   //action needs to be performed on page load.
});

var showSpinner = function() {
  $spinner.jmspinner('large');
  $container.css('filter', 'blur(2px)');
}

var hideSpinner = function() {
  $spinner.jmspinner(false);
  $container.css('filter', '');
}

function initPageActions() {
  // When registrant is new, add successfully registered toast.
  if(window.location.pathname == '/newRegistrant') {
    $('.myAlert').find('span').first().text('You have registered successfully. Please Login!');
    $('.myAlert').addClass('alert-success').removeClass('alert-danger');
    $('.myAlert').show();
  }

  // Add authentication fail message.
  if(window.location.pathname == '/authFails') {
    $('.myAlert').find('span').first().text('Username or Password is Wrong! Try Again...');
    $('.myAlert').addClass('alert-danger').removeClass('alert-success');
    $('.myAlert').show();
    //$('#authFailsDiv').html('<p class="alert alert-danger text-center col-4 mx-auto"> Username or Password is Wrong! Try Again... </p>');
  }

  if(window.location.pathname == '/passwordChanged') {
    $('.myAlert').find('span').first().text('Password Changed Successfully. Please Login to continue!');
    $('.myAlert').addClass('alert-success').removeClass('alert-danger');
    $('.myAlert').show();
  }

  // bind method to close the alert toast on click of the close icon
  $('.myAlert').on('click', function() {
    $(this).alert('close');
  });

  // automatically closes the alert toast - velocity.js
  $('.myAlert').velocity("slideUp", {delay: 3000, duration: 500});
}

function validateSignIn() {
  if($('#username')[0].validity.valid && $('#password')[0].validity.valid) {
    showSpinner();
    return true;
  } else {
    if(!($('#username')[0].validity.valid)) {
      $('#username').addClass('errBox');
      $('#username_err').show();
    }
    if(!($('#password')[0].validity.valid)) {
      $('#password').addClass('errBox');
      $('#password_err').show();
    }
    return false;
  }
}

function validateSignup(event) {
  event.preventDefault();

  showSpinner();

  var signupData = {
    "newuser_firstName": $('#newuser_firstName').val(),
    "newuser_lastName": $('#newuser_lastName').val(),
    "newuser_email": $('#newuser_email').val(),
    "newuser_password": $('#newuser_password').val(),
    "newuser_confirm_password": $('#newuser_confirm_password').val()
  };

  $.ajax({
    url: '/register',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(signupData),
    success: function(data) {
      if(data.validationErrors) {
        $authFailsDiv.addClass('transform');
        
        var errorMsg = '';
        for (var i = 0; i < data.validationErrors.length; i++) {
          let curr = data.validationErrors[i];
          //errorMsg += '<span>' + (i + 1) + '. ' + data.validationErrors[i].msg + '</span><br>';
          $('#' + curr.param).addClass('errBox');
          $('#' + curr.param + '_err').text('*' + curr.msg).show();
        }

        //$authFailsDiv.html('<p class="alert alert-danger col-6 mx-auto"> ' + errorMsg + ' </p>');
        hideSpinner();
      } else {
        window.location.href = '/newRegistrant';
        hideSpinner();
      }
    },
    failure: function(err) {
      hideSpinner();
      console.error(err);
    }
  })
}

//this method prompts the server to resend the mail with auth token to the user once and then disables the button.
function resendAuthToken(event) {
  event.preventDefault();

  showSpinner();
  $.ajax({
    url: '/resendMail',
    method: 'GET',
    contentType: 'application/json',
    success: function(data) {
      hideSpinner();
      $btnResendToken.prop('disabled', true);
      $('#oneTimeOnlyResend').hide();
    },
    failure: function(err) {
      console.error(err);
    }
  });
}

function onfocusAction(id) {
  console.log('here', id);
  $('#' + id).removeClass('errBox');
  $('#' + id + '_err').hide();
}


//validates any input field with a particular Id.
function isFieldValid(Id) {
  if(!$('#' + Id).length) return false;
  return $('#' + Id).get(0).validity.valid & $.trim($('#' + Id).val()) != '';
}

//add Changes to the UI of a particular field to handle error
function handleErrorUI(id) {
  $('#' + id).addClass('errBox');
  $('#' + id + '_err').show();
}

//this method does 'client-side' validation of the 'auth token' input.
function validateAuthTokenInput(event) {
  event.preventDefault();

  if(isFieldValid('authTokenInput')) {
    showSpinner();
    $('#resendTokenBtnDisable').val($('#btn-resendToken').prop('disabled'));
    $('#authMailForm').submit();
  } else {
    $('#authTokenInput').addClass('errBox');
    $('#authTokenInput_err').show();
  }
}

//this method does 'client-side' validation of the 'auth token' input.
function validatePasswordInputs(event) {
  event.preventDefault();

  let isOldPassValid = isFieldValid('oldPassword');
  let isNewPassValid = isFieldValid('newPassword');
  let isNewPass2Valid = isFieldValid('newPassword2');

  if(!$('#oldPassword').length) isOldPassValid = true; // if the change password request comes from forgot password section, the oldPassword field should be hidden and hence its input are valid.

  if(isOldPassValid && isNewPassValid && isNewPass2Valid) {
    sendChangePasswordReq();
  } else {
    if(!isOldPassValid) {
      handleErrorUI('oldPassword');
    }

    if(!isNewPassValid) {
      handleErrorUI('newPassword');
    }

    if(!isNewPass2Valid) {
      handleErrorUI('newPassword2');
    }

    if($.trim($('#newPassword').val()) != $.trim($('#newPassword2').val())) {
      $('#newPassword2_err').text('Passwords don\'t match. Please Check!').show();
      $('#newPassword_err').text('Passwords don\'t match. Please Check!').show();
      $('#newPassword').addClass('errBox');
      $('#newPassword2').addClass('errBox');
    }
  }
}

//ajax request to change password
function sendChangePasswordReq() {
  showSpinner();
  let data = {
    "oldPassword": $('#oldPassword').val(),
    "newPassword": $('#newPassword').val(),
    "newPassword2": $('#newPassword2').val(),
    "fromForgotPassword": 'false'
  };

  if(!$('#oldPassword').length) data.fromForgotPassword = 'true',
  console.log('here at changePassword');
  $.ajax({
    url: '/changePassword',
    data: JSON.stringify(data),
    method: 'POST',
    contentType: 'application/json',
    success: function(data) {
      console.log(data);
      if(data.validationErrors || data.customValidation) {
        for (var i = 0; i < data.validationErrors.length; i++) {
          let curr = data.validationErrors[i];
          $('#' + curr.param).addClass('errBox');
          $('#' + curr.param + '_err').text('*' + curr.msg).show();
        }

        if(data.customValidation) {
          let curr = data.customValidation;
          $('#' + curr.param).addClass('errBox');
          $('#' + curr.param + '_err').text('*' + curr.msg).show();
        }

        $('#changePasswordForm').get(0).reset();
      } else {
        window.location.href = '/passwordChanged';
      }

      hideSpinner();
    },
    failure: function(err) {
      console.error(err);
    }
  });
}

// In the forget password section, first validate the 'User email' input by the user and if it checks out, send a mail to the User with updated 'Auth Token' and show the input fields for 'Auth Token Input' and buttons to validate the auth token then input by the user.
function validateFPemailAndSendToken(event) {
  event.preventDefault();

  if(!isFieldValid('user_email')) {
    handleErrorUI('user_email');
    return;
  }
  
  showSpinner();

  $.ajax({
    url: '/forgotPasswordPage/sendAuth',
    contentType: 'application/json',
    data: JSON.stringify({
      'email': $('#user_email').val()
    }),
    type: 'application/json',
    method: 'POST',
    success: function(data) {
      console.log('gotData', data);
      if(data.validationErrors || data.customValidation) {
        for (var i = 0; i < data.validationErrors.length; i++) {
          let curr = data.validationErrors[i];
          $('#' + curr.param).addClass('errBox');
          $('#' + curr.param + '_err').text('*' + curr.msg).show();
        }

        if(data.customValidation) {
          let curr = data.customValidation;
          $('#' + curr.param).addClass('errBox');
          $('#' + curr.param + '_err').text('*' + curr.msg).show();
        }

        $('#forgotPasswordForm').get(0).reset();
      } else {
        if($('#FP-btn-sendToken-useMsg').css('display') == 'block') {
          $('#btn-FP-sendToken').prop('disabled', 'true');
          $('#FP-btn-sendToken-useMsg').hide();
        } else {
          $('#FP-btn-sendToken-useMsg').show();
          $('#user_email').attr('readonly', 'true');
          $('#FP-nextDiv').velocity("slideDown", { duration: 1500 });

          $('.myAlert').find('span').first().text('A mail with Authentication Token is sent to you. Please use the token to verify yourself!');
          $('.myAlert').addClass('alert-success').removeClass('alert-danger');
          $('.myAlert').show();

          // bind method to close the alert toast on click of the close icon
          $('.myAlert').on('click', function() {
            $(this).alert('close');
          });

          // automatically closes the alert toast - velocity.js
          $('.myAlert').velocity("slideUp", {delay: 6000, duration: 500});
        }
      }

      hideSpinner();
    },
    failure: function(err) {
      console.error(err);
      hideSpinner();
    }
  });
}

// In the forget password section, validate the 'Auth Token' input by the User, and if it checks out, redirect User to 'change password section'.
function validateFPAuthInputs(event) {
  event.preventDefault();

  if(!isFieldValid('FPAuthToken')) {
    handleErrorUI('FPAuthToken');
    return;
  }
  
  showSpinner();

  $.ajax({
    url: '/forgotPasswordPage/validateAuth',
    contentType: 'application/json',
    data: JSON.stringify({
      'email': $('#user_email').val(),
      'authToken': $('#FPAuthToken').val()
    }),
    type: 'application/json',
    method: 'POST',
    success: function(data) {
      console.log('gotData', data);
      if(data.customValidation) {
        let curr = data.customValidation;
        $('#' + curr.param).addClass('errBox');
        $('#' + curr.param + '_err').text('*' + curr.msg).show();
      } else {
        window.location.href = '/changeYourPassword';
      }
      hideSpinner();
    },
    failure: function(err) {
      console.error(err);
      hideSpinner();
    }
  });
}