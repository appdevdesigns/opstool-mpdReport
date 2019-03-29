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
		options.template = options.template || '/solo-mpdReport/views/sendNS.html';
		super(options);
		
		this.getMemoHTML = options.memo;
		
		this.nextStep = {
			'#NS': '#start',
		};
	}
	
	
	initDOM() {
		var self = this;
		
		// "Send" buttons
		this.$('button').on('click', function(ev) {
			var $button = $(this);
			var url = null;
			
			// Determine which button was clicked
			switch ($button.val()) {
				case 'send-regional':
					url = '/nsmpdreport/email/send';
					break;
				case 'send-individual':
					url = '/nsmpdreport/email/individual/send';
					break;
			}
			
			if (url) {
				// Disable button while request is active
				$button.prop('disabled', true);
				$button.removeClass('completed');
				
				comm.post({
					url: url,
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
			}
		});
	}
	
	
}