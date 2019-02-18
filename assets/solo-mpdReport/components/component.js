//import $ from 'jquery';
//import ejs from 'ejs/ejs.min.js';
import EventEmitter from 'eventemitter2';
import async from 'async';
import css from '../css.js';

export default class Component extends EventEmitter {
	
	/**
	 * @param {object} options
	 * @param {element|string} options.element
	 *		DOM element for this component.
	 *		Can also be a CSS selector string.
	 * @param {string} [options.template]
	 *		Full path and filename of the HTML or EJS template.
	 * @param {object|function} [options.templateData]
	 *		JSON data to merge into EJS template.
	 * @param {object} [options.subTemplates]
	 *		Dictionary of EJS sub template names and paths.
	 *		{
	 *			<name>: <path>,
	 *			...
	 *		}
	 *		These templates will be compiled into `this.subTemplates`.
	 * @param {string} [options.css]
	 *		Full path and filename of the CSS file.
	 */
	constructor(options={}) {
		super();
		this.$element = $(options.element);
		
		var templateContent, templateData;
		
		Promise.resolve()
		.then(() => {
			if (options.css) {
				css(options.css);
			}
			if (options.template) {
				// If template was provided, load that into the DOM element
				return $.get(options.template);
			}
		})
		.then((result) => {
			if (result) {
				templateContent = result;
				
				// Template data was given
				if (options.templateData) {
					if (typeof options.templateData == 'function') {
						// Data function (possibly async).
						return options.templateData();
					} else {
						// Data object.
						return options.templateData;
					}
				}
			}
		})
		.then((result) => {
			var html = '';
			
			if (result) {
				// Merge data with EJS template
				templateData = result;
				html = ejs.render(templateContent, templateData, { client: true });
			}
			else if (templateContent) {
				// Plain HTML template
				html = templateContent;
			}
			
			this.$element.html(html);
		})
		.then(() => {
			// Compile any sub templates if they were given
			if (options.subTemplates) {
				return new Promise((subTemplatesDone, subTemplatesFail) => {
					this.subTemplates = {
					/*
						<templateName>: <compiled EJS template>,
						...
					*/
					};
					async.eachOf(options.subTemplates, (templateFile, templateName, ok) => {
						$.get(templateFile)
						.done((content) => {
							try {
								// Replace CanJS tags with regular EJS tags
								content = content.replace(/<%==/g, '<%-');
								this.subTemplates[ templateName ] = ejs.compile(content, { client: true });
							}
							catch (err) {
								console.error('EJS template error', templateName, this.constructor.name);
								console.error(err);
							}
							ok();
						})
						.fail((xhr, status, err) => {
							ok(err);
						});
					}, (err) => {
						if (err) {
							console.error(err);
							// should we continute regardless of the error?
							// subTemplatesFail(err);
						}
						subTemplatesDone();
					});
				});
			}
		})
		.then(() => {
			this.initDOM();
			
			// If there's a link to '#next', clicking on it will emit
			// a 'next' event.
			this.$('a[href="#next"]').on('click', (ev) => {
				ev.preventDefault();
				this.emit('next');
			});
		});
		
	}
	
	
	
	/**
	 * Any initialization that depends on, or makes use of the DOM should
	 * go here. This includes initializing sub-components, because components
	 * have DOM elements.
	 */
	initDOM() {
		// the subclass should override this
	}
	
	
	
	/**
	 * jQuery select something within the component
	 * 
	 * @param {string} selector
	 *		DOM selector string
	 * @return {jQuery}
	 */
	$(selector) {
		return this.$element.find(selector);
	}
	
	
	show() {
		this.$element.show();
		this.emit('show');
	}
	
	
	hide() {
		this.$element.hide();
		this.emit('hide');
	}
}
