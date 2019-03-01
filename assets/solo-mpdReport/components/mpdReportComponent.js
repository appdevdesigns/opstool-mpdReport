//import $ from 'jquery';
import Controller from './controller.js';

export default class MPDReportComponent extends Controller {
	
	/**
	 * @see controller.js
	 */
	constructor(options={}) {
		super(options);
		
		this.on('loadedDOM', () => {
			// If there's a link to '#next', clicking on it will emit
			// a 'next' event so that the parent controller can navigate
			// to the following component.
			this.$('a[href="#next"]').on('click', (ev) => {
				ev.preventDefault();
				this.emit('next');
			});
		});
		
		// The subclass should initialize this property to declare what
		// is the next component after this.
		this.nextStep = this.nextStep || {
		/*
			'#US': {string} stepName,
			'#NS': {string} stepName,
		*/
		};
	}
	
	
}
