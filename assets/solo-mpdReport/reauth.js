/**
 * @function reauth()
 *
 * Automatically invoked by comm.js when it receives a 401 Unauthorized 
 * response from the server.
 */


//import $ from 'jquery';
import Lock from './lock.js';
import comm from './comm.js';

// timestamp of last authentication
var lastAuthTime = 0;


var config, casTemplate, localTemplate;

// Fetch config & templates right after this file is loaded.
// Slight delay to avoid circular dependency problems, since comm.js also
// depends on this reauth.js.
setTimeout(() => {

	// @return {Promise}
	config = comm.get('/appdev/config/data.json')
	.then((data) => {
		return data.authType;
	});

	// @return {Promise}
	casTemplate = comm.get({
		url: '/appdev/widgets/ad_ui_reauth/reauth_cas.ejs',
		json: false
	});
	localTemplate = comm.get({
		url: '/appdev/widgets/ad_ui_reauth/reauth_local.ejs',
		json: false
	});
	
}, 100);

// Mutex lock to ensure only one reauth at a time
var lock = new Lock();



/**
 * Display a re-login form to allow the user to reauthenticate after
 * the session has timed out.
 *
 * @return {Promise}
 *		Resolves after successful authentication.
 */
export default function reauth() {
	return lock.acquire()
	.then(() => {
		// Make sure config has been loaded
		return config;
	})
	.then((authType) => {
		// If we have recently reauthenticated, this reauth() call was
		// probably queued from before the session was renewed. So just resolve
		// immediately now that there is a valid session.
		if (Date.now() - lastAuthTime < (1000 * 60)) {
			return;
		}
		else if (authType == 'CAS') {
			return casAuth();
		}
		else {
			return localAuth();
		}
	})
	.then(() => {
		lastAuthTime = Date.now();
		lock.release();
	})
	.catch((err) => {
		lock.release();
		throw err;
	});
}



/**
 * Used by reauth().
 *
 * Will resolve after the CAS login iframe successfully completes.
 *
 * @return {Promise}
 */ 
var casAuth = function() {
	return casTemplate.then((html) => {
		// Display the CAS login page in an iframe in a popup modal
		var $form = $(html).find('#appDev-formLogin');
		$form.appendTo(document.body);
		$form.modal({
			backdrop: 'static',
			keyboard: false,
			show: true,
		});
		
		return new Promise((done) => {
			// Set up listener for successful login.
			// This will be called from the CAS iframe.
			window.AD = window.AD || {};
			window.AD.ui = window.AD.ui || {};
			window.AD.ui.reauth = window.AD.ui.reauth || {};
			window.AD.ui.reauth.end = () => {
				$form.modal('hide');
				$form.on('hidden.bs.modal', () => {
					$form.modal('dispose');
					$form.remove();
				});
				done();
			};
		});
	});
}


/**
 * Used by reauth().
 * 
 * Will resolve after logging in via the /site/login service route.
 *
 * @return {Promise}
 */
var localAuth = function() {
	return new Promise((resolve) => {
		localTemplate.then((html) => {
			// Display the local login form in a popup modal
			var $form = $(html).find('#appDev-formLogin');
			$form.appendTo(document.body);
			$form.modal({
				backdrop: 'static',
				keyboard: false,
				show: true,
			});
			
			var $username = $form.find('#username');
			var $password = $form.find('#password');
			var $button = $form.find('button.login');
			var $message = $form.find('.alert');
			var $spinner = $('<span class="fa fa-spin fa-cog"></span>');
			
			var inProgress = false;
			var doLogin = function() {
				// Prevent double submit
				if (inProgress) return;
				inProgress = true;
				$button.hide();
				
				// Hide any previous messages
				$message.hide();
				// Show loading animation
				$button.after($spinner);
				$spinner.show();
				
				comm.post({
					url: '/site/login',
					data: {
						username: $username.val(),
						password: $password.val()
					}
				})
				.then(() => {
					$form.modal('hide');
					$form.on('hidden.bs.modal', () => {
						$form.modal('dispose');
						$form.remove();
					});
					resolve();
				})
				.catch((err) => {
					var message = err.message || 'Error';
					// TODO multilingual translation
					//if (err.mlKey) {
					//	
					//}
					
					// Display error message
					$message.text(message).show();
					
					// Clear password field
					$password.val('');
					
					// Allow user to retry
					inProgress = false;
					$button.show();
					$spinner.hide();
				});
			}
			
			$button.on('click', doLogin);
			$password.on('keypress', (ev) => {
				// Pressing Enter should submit
				if ([3,10,13].indexOf(ev.keyCode) >= 0) {
					ev.preventDefault();
					doLogin();
				}
			});
			$form.find('form').on('submit', (ev) => {
				ev.preventDefault();
				doLogin();
			});
			
			// Auto focus the username field when form is shown
			$form.on('shown.bs.modal', () => {
				$username.focus();
			});
		})
		
	});
}
