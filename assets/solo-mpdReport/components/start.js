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
		// User clicks on either '#US' or '#NS'
		this.$('.staff-type a').on('click', (ev) => {
			ev.preventDefault();
			var $a = $(ev.target);
			this.emit('selected', $a.attr('href'));
			
			this.emit('next');
		});
	}
	
	
}