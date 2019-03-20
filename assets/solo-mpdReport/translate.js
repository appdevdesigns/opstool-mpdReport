/**
 * @class Translate
 * 
 * Manages language translation.
 * 
 * Any text within an HTML element with a 'translate' attribute will be 
 * considered as a label translated. For example:
 *	  <div><span translate=1>Hello world</span></div>
 *
 * Text within <T> tags will likewise be translated:
 *	  <h2><t>Hello world</t></h2>
 *
 * Placeholder text will also be translated:
 *	  <input placeholder="Enter your name">
 *
 */
//import $ from 'jquery';
import EventEmitter from 'eventemitter2';
import comm from './comm.js';

export default class Translate extends EventEmitter {
	
	/**
	 * @param {object} options
	 * @param {string} options.context
	 *		The context to use for fetching label data from the server.
	 * @param {HTMLElement|jQuery|string} [options.base]
	 *		The base element to limit transslations to. Meaning, text that is
	 *		outside of this base element will NOT be translated.
	 *		This allows you to have separate Translate objects for different
	 *		parts of the page, each with their own `context`.
	 *		The default is to use `document.body`, which covers the whole
	 *		web page globally.
	 * @param {string} [options.langCode]
	 *		The language to translate to.
	 *		Default is to follow the browser setting.
	 * @param {boolean} [options.ignoreBrowserLanguage]
	 *		Ignore the browser language setting?
	 *		Default is false.
	 *
	 * @param {boolean} [options.loggingEnabled]
	 *		Dev option. Log untranslated labels to console?
	 *		Default is false.
	 */
	constructor(options={}) {
		super();
		this.loggingEnabled = options.loggingEnabled || false;
		this.loggingTimer = null;
		this.needsTranslation = [];
		
		this.context = options.context;
		
		this.base = options.base || document.body;
		if (typeof this.base  == 'string') {
			// DOM selection string was given. Get the raw element from it.
			this.base = $(this.base).get(0);
		}
		else if (this.base instanceof $) {
			// jQuery selection was provided. Get the raw element.
			this.base = this.base.get(0);
		}
		if (!this.base instanceof HTMLElement) {
			throw new TypeError('options.base is invalid'); 
		}
		
		if (options.langCode) {
			this.langCode = options.langCode;
		}
		else if (options.ignoreBrowserLanguage) {
			// Rely on the server default of this user
			this.langCode = null;
		}
		else if (navigator.languages && navigator.languages[0]) {
			// Browser language
			this.langCode = navigator.languages[0];
		} 
		else {
			// Browser language alt method
			this.langCode = navigator.language || null;
		}
		
		this.counter = 2;
		this.data = {
		/*
			<original text>: <translated text>,
			"hello world": "Hello World!",
			"start.instructions": "To start, choose the type of report:",
			...
		*/
		};
		this.dataReady = $.Deferred();
		
		// React whenever new elements are added to the base element
		try {
			this.observer = new MutationObserver((mutationList) => {
				var nodes = [];
				
				for (var i=0; i<mutationList.length; i++) {
					var mutation = mutationList[i];
					if (mutation.addedNodes && mutation.addedNodes.length > 0) {
						for (var j=0; j<mutation.addedNodes.length; j++) {
							nodes.push(mutation.addedNodes[j]);
						}
					}
				}
				
				if (nodes.length > 0) {
					this.translateDOM(nodes);
				}
			});
			this.observer.observe(this.base, { 
				childList: true,
				subtree: true
			});
		} catch (err) {
			console.log(err);
			alert(
				'Error initializing the translation system:\n'
				+ (err.message || '') + '\n'
				+ (err.stack || '')
			);
		}
		
		// Browser language got changed
		if (!options.ignoreBrowserLanguage) {
			window.onlanguagechange = () => {
				this.counter += 1;
				this.dataReady = $.Deferred();
				this.loadData();
				this.translateDOM();
			};
		}
		
		this.loadData();
		this.translateDOM();
	}
	
	
	/**
	 * Loads the multilingual labels to be used for translation.
	 *
	 * @param {string} [context]
	 * @param {string} [langCode]
	 * @return {Promise}
	 */
	loadData(context=null, langCode=null) {
		// Override context?
		if (context) {
			this.context = context;
		}
		// Override language?
		if (langCode) {
			this.langCode = langCode;
		}
		
		// Set lang attribute on document body for CSS language targetting
		if (this.langCode) {
			$(document.body).attr('lang', this.langCode);
		}
		
		// Fetch label data from server
		return comm.get({
			url: '/site/labelsJSON/' + this.context,
			qs: { 'lang': this.langCode },
		})
		.then((serverData) => {
			// Merge server data into local object data
			serverData.forEach((row) => {
				this.data[row.label_key] = row.label_label;
			});
			
			this.dataReady.resolve();
		})
		.catch((err) => {
			// Data file not found/recognized. Language not supported?
			console.error('Multilingual data error', err);
			this.emit('error', err);
			
			// Fall back on English language as last resort
			if (this.langCode != 'en') {
				this.loadData(context, 'en');
			}
		});
	}
	
	
	/**
	 * Returns the translation of the given text.
	 *
	 * @param {string} text
	 * @return {string}
	 */
	t(text) {
		text = text.trim().replace(/\s+/g, ' ');
		var translated = this.data[text];
		
		// Keep track of untranslated text
		if (!translated) {
			if (this.loggingEnabled && this.needsTranslation.indexOf(text) < 0) {
				this.needsTranslation.push(text);
				if (this.loggingTimer) clearTimeout(this.loggingTimer);
				this.loggingTimer = setTimeout(() => {
					console.log('Translations needed for context [' + this.context + ']:');
					console.log(this.needsTranslation);
				}, 200);
			}
			translated = text;
		}
		
		return translated;
	}
	
	
	/**
	 * @param {Array|HTMLElement} [target]
	 *		Optional target(s) to translate. Default is to target the
	 *		base element.
	 */
	translateDOM(target=null) {
		this.dataReady.done(() => {
			var self = this;
			var $nodes;
			
			if (target === null) {
				$nodes = $(this.base);
			} else {
				$nodes = $(target);
			}
			
			$nodes.find('t,[translate]').each(function() {
				var $node = $(this);
				var text = this.innerHTML;
				var counter = $node.attr('translate') || 1;
				
				if (counter < self.counter) {
					if ($node.is('[original-text]')) {
						text = $node.attr('original-text');
					}
					else {
						$node.attr('original-text', text);
					}
					$node.html(self.t(text));
					$node.attr('translate', self.counter);
				}
			});
			
			$nodes.find('[placeholder]').each(function() {
				var $node = $(this);
				var text = $node.attr('placeholder');
				var counter = $node.attr('translate') || 1;
				
				if (counter < self.counter) {
					if ($node.is('[original-text]')) {
						text = $node.attr('original-text');
					}
					else {
						$node.attr('original-text', text);
					}
					$node.attr('placeholder', self.t(text));
					$node.attr('translate', self.counter);
				}
			});
			
			// What's this part for?
			$nodes.find('.dialog-button').each(function() {
				var $node = $(this);
				var text = this.innerHTML;
				var counter = $node.attr('translate') || 1;
				
				if (counter < self.counter) {
					if ($node.is('[original-text]')) {
						text = $node.attr('original-text');
					}
					else {
						$node.attr('original-text', text);
					}
					$node.html(self.t(text));
					$node.attr('translate', self.counter);
				}
			});
			
			// The translations cause the UI to shift because of the difference 
			// in word widths, we need to trigger a resize as if the window was 
			// resized to fix the layout
			
			setTimeout( function() {
				$(window).trigger('resize');
			}, 200);

		});
	}
	
};

