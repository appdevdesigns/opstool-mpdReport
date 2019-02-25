/**
 * @class Controller
 *
 * A base class to extend for making interactive pages or widgets.
 *
 * `options.element` is the only required parameter. The specified DOM element
 * must already be present on the page before the controller object is created.
 * You may optionally also supply an HTML template that will be inserted into
 * the element with `options.template`. And if you also specify 
 * the`options.templateData` parameter, the template will be parsed as EJS
 * and merged with the data before insertion.
 *
 * After the HTML has been inserted into the DOM, the object's initDOM() method
 * will be called. The `loadedDOM` event will also get emitted at that point.
 */

//import $ from 'jquery';
//import ejs from 'ejs/ejs.min.js';
import EventEmitter from 'eventemitter2';
import async from 'async';
import css from '../css.js';

export default class Controller extends EventEmitter {
	
	/**
	 * @param {object} options
	 * @param {element|string} options.element
	 *		The container DOM element for this component.
	 *		Can also be a CSS selector string.
	 * @param {string} [options.template]
	 *		Full path and filename of the HTML or EJS template.
	 * @param {object|function} [options.templateData]
	 *		JSON data to merge into EJS template.
	 * @param {object} [options.subTemplates]
	 *		Dictionary of EJS sub template names and paths:
	 *		{
	 *			<name>: <path>,
	 *			...
	 *		}
	 *		These templates will be compiled into `this.subTemplates` as a
	 *		dictionary:
	 *		{
	 *			<name>: <compiled template>,
	 *			...
	 *		}
	 *		A compiled template can be merged with data later by
	 *		calling `this.subTemplates[ <name> ](data)`.
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
			// Compile sub-templates if any were given
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
			this.emit('loadedDOM');
		});
		
	}
	
	
	
	/**
	 * Any initialization that depends on, or makes use of the DOM should
	 * go here. This includes initializing sub-controllers, because those
	 * have DOM elements themselves.
	 */
	initDOM() {
		// the subclass should override this
	}
	
	
	
	/**
	 * jQuery select something within the component.
	 * 
	 * So if you use `this.$(".some-class-name")` you can be sure it won't
	 * select any elements from outside the component. Plus, it should run
	 * faster since there is a smaller search space.
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
