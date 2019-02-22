//import $ from 'jquery';
import Component from './component.js';

export default class Start extends Component {
	
	constructor(options) {
		options.template = '/solo-mpdReport/views/start.html';
		super(options);	
		
		this.nextStep = {
			'#US': '#upload',
			'#NS': '#memo',
		};
	}
	
	
	initDOM() {
		this.$('.staff-type a').on('click', (ev) => {
			ev.preventDefault();
			var $a = $(ev.target);
			this.emit('selected', $a.attr('href'));
			
			this.emit('next');
		});
	}
	
	
}