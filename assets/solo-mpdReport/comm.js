/**
 * HTTP requests that automatically handle CSRF tokens, authentication, and
 * parsing JSON data.
 *
 * @usage:
 *
 *		import comm from './comm.js';
 *
 *		comm.get('/some/server/data')
 *		.then((data) => {
 *			alert('Got data: ' + JSON.stringify(data));
 *		});
 *
 *		comm.get({ url: '/some/server/html', json: false })
 *		.then((html) => {
 *			myDiv.innerHTML = html;
 *		});
 *
 *		comm.post({
 *			url: '/some/json/service',
 *			data: { param1: 'value1', param2: 'value2' },
 *			qs: { querystringArg1: 'qsValue1' }
 *		})
 *		.catch((err) => {
 *			console.error(err);
 *		});
 *
 *		
 */
import request from 'browser-request';
import EventEmitter from 'eventemitter2';
import reauth from './reauth.js';

class Comm extends EventEmitter {
	
	constructor() {
		super();
		this.csrfToken = null;
	}
	
	
	fetchCSRFToken() {
		return this.get('/csrfToken')
		.then((data) => {
			this.csrfToken = data._csrf;
			return this.csrfToken;
		})
		.catch((err) => {
			console.error('Error while trying to fetch CSRF token');
			throw err;
		});
	}

	
	/**
	 * Request a resource over HTTP.
	 * 
	 * POST, PUT, and DELETE requests will have the CSRF token added to the
	 * headers automatically.
	 *
	 * Reauthentication prompts will be shown automatically if needed.
	 * 
	 * @param {object|string} options
	 *		Specify the request options as an object.
	 *		Or, if no other options are needed, you can just give the
	 *		URL string instead.
	 *
	 * @param {string} options.url
	 * @param {string} [options.method]
	 *		"GET", "POST", "PUT", "DELETE", etc.
	 *		Default is "GET".
	 * @param {boolean} [options.json]
	 *		Treat `options.body` as JSON data.
	 *		Default is true.
	 * @param {object} [options.body]
	 *		Data to be sent as the request body.
	 *		Not used for GET or HEAD requests.
	 * @param {object} [options.data]
	 *		Alias for `options.body`.
	 * @param {object} [options.qs]
	 *		Data to be encoded as the request querystring.
	 *
	 * @param {string} [method]
	 *		The HTTP method may be specified here instead of within the
	 *		`options` object.
	 *
	 * @return {Promise}
	 */
	request(options, method='GET') {
		return new Promise((resolve, reject) => {
			// Can give the URL directly as a string intead of the options
			// object.
			if (typeof options == 'string') {
				options = { url: options };
			}
			// JSON format by default
			if (typeof options.json == 'undefined') {
				options.json = true;
			}
			// Use jar to remember cookies by default
			if (typeof options.jar == 'undefined') {
				options.jar = true;
			}
			// GET method by default
			options.method = options.method || method;
			
			// Accept options.data as an alias for options.body
			if (options.data && !options.body) {
				options.body = options.data;
			}
			
			// For GET requests, convert body data into querystring
			if (options.method.match(/^GET$/i) && options.body && !options.qs) {
				options.qs = options.body;
			}
			
			Promise.resolve()
			.then(() => {
				// Add CSRF token if needed
				if (!options.method.match(/^(GET|HEAD)$/i)) {
					options.headers = options.headers || {};
					if (!this.csrfToken) {
						return this.fetchCSRFToken();
					}
					else {
						return this.csrfToken;
					}
				}
			})
			.then((csrfToken) => {
				if (csrfToken) {
					options.headers['X-CSRF-Token'] = csrfToken;
				}
				
				// Make the actual HTTP request
				return new Promise((requestOK, requestErr) => {
					request(options, (err, res, body) => {
						if (err) {
							requestErr({err, res, body});
						}
						else if (body.status && body.status == 'success' && body.data) {
							// AppDev server adds an extra layer to the response
							// so just return the actual data.
							requestOK(body.data);
						}
						else if (body.status && body.status != 'success') {
							// No `err` produced by `request` library, but the
							// JSON response wrapper says there was an error.
							requestErr({ res, body });
						}
						else if (res.statusCode >= 500) {
							// The `request` library doesn't produce an `err`
							// even if the server sends a 5XX response.
							// "Internal Server Error", etc.
							// That seems wrong since it's clearly an error. 
							requestErr({ res, body });
						}
						else {
							// Plain string response
							requestOK(body);
						}
					});
				});
			})
			.then((data) => {
				// SUCCESSFUL FINAL RESULT HERE
				resolve(data);
			})
			.catch((obj) => {
				// Caught a normal JavaScript error
				if (obj instanceof Error) {
					reject(obj);
				}
				// HTTP error
				// obj == {err, res, body}
				else {
					// CSRF token mismatch
					if (obj.res.statusCode == 403 && obj.res.response.match(/csrf/i)) {
						// Force token refresh and retry
						this.emit('csrfMismatch');
						this.csrfToken = null;
						this.request(options)
						.then(resolve)
						.catch(reject);
					}
					// Normal authentication error
					else if (obj.res.statusCode == 401) {
						// Reauthenticate and retry
						this.emit('reauth');
						reauth().then(() => {
							this.emit('reauthDone');
							this.request(options)
							.then(resolve)
							.catch(reject);
						});
					}
					// Some other error
					else {
						//console.error('Unable to fetch: ' + options.url, obj);
						// AppDev JSON response
						if (obj.body && obj.body.status && obj.body.data) {
							if (obj.body.message && !obj.body.data.message) {
								obj.body.data.message = obj.body.message;
							}
							// Just return the actual data.
							reject(obj.body.data);
						}
						// Other JSON response
						else if (obj.body) {
							reject(obj.body);
						}
						// Return the request status.
						else if (obj.res && obj.res.statusText) {
							// E.g. "404 Not Found"
							reject(obj.res.statusCode + ' ' + obj.res.statusText);
						}
						// Return the error instead. This might be a JSON parse
						// error that has nothing to do with the actual
						// request.
						else {
							reject(obj.err);
						}
					}
				}
			});
		});
	}
	
	
	get(options) {
		return this.request(options, 'GET');
	}
	post(options) {
		return this.request(options, 'POST');
	}
	put(options) {
		return this.request(options, 'PUT');
	}
	"delete"(options) {
		return this.request(options, 'DELETE');
	}
	
}



var comm = new Comm();
export default comm;
