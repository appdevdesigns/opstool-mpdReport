//import $ from 'jquery';
import MPDReportComponent from './mpdReportComponent.js';

export default class Start extends MPDReportComponent {
	
	constructor(options) {
		options.template = '/solo-mpdReport/views/start.html';
		super(options);	
		
		this.nextStep = {
			'#US': '#upload',
			'#NS': '#memo',
		};
	}
	
	
	initDOM() {
		var self = this;
		
		// User clicks on either '#US' or '#NS'
		this.$('.staff-type a').on('click', function(ev) {
			ev.preventDefault();
			var $a = $(this);
			self.emit('selected', $a.attr('href'));
			
			self.emit('next');
		});
	}
	
	
}