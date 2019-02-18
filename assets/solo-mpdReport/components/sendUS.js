//import $ from 'jquery';
import Component from './component.js';
import comm from '../comm.js';


export default class Send extends Component {
	
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
		// "Send" button
		var $button = this.$('button');
		$button.on('click', (ev) => {
			// Disable button while request is active
			$button.prop('disabled', true);
			$button.removeClass('completed');
			
			comm.post({
				url: '/mpdreport/email/send',
				data: {
					memo: this.getMemoHTML()
				}
			})
			.then(() => {
				// Show green checkmark
				$button.addClass('completed');
				$button.prop('disabled', false);
			})
			.catch((err) => {
				$button.prop('disabled', false);
				this.emit('error', err);
			});
		});
		
	}
	
	
}