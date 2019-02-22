/**
 * Load a given CSS file into the current HTML page.
 *
 * @param {string} filepath
 *		The full path and filename of the CSS file.
 */
export default function css(filepath) {
	var el = document.createElement('link');
	el.setAttribute('rel', 'stylesheet');
	el.setAttribute('type', 'text/css');
	el.setAttribute('href', filepath);
	document.head.appendChild(el);	
}
