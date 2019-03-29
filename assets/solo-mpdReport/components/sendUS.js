//import $ from 'jquery';
import MPDReportComponent from './mpdReportComponent.js';
import comm from '../comm.js';


export default class Send extends MPDReportComponent {
	
	/**
	 * @param {object} options
	 * @param {element|string} options.element
	 * @param {string} options.template
	 * @param {function} options.memo
	 *		Function that returns the memo HTML.
	 */
	constructor(options) {
		options.template = options.template || '/solo-mpdReport/views/sendUS.html';
		super(options);
		
		this.getMemoHTML = options.memo;
		
		this.nextStep = {
			'#US': '#start',
		};
	}
	
	
	initDOM() {
		var self = this;
		
		// "Send" button
		var $button = this.$('button');
		$button.on('click', function(ev) {
			// Disable button while request is active
			$button.prop('disabled', true);
			$button.removeClass('completed');
			
			comm.post({
				url: '/mpdreport/email/send',
				data: {
					memo: self.getMemoHTML()
				}
			})
			.then(() => {
				// Show green checkmark
				$button.addClass('completed');
				$button.prop('disabled', false);
			})
			.catch((err) => {
				$button.prop('disabled', false);
				self.emit('error', err);
			});
		});
		
	}
	
	
}