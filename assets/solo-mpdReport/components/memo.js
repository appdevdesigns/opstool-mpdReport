//import $ from 'jquery';
import Quill from 'quill';
import MPDReportComponent from './mpdReportComponent.js';


export default class Memo extends MPDReportComponent {
	
	constructor(options) {
		options.template = options.template || '/solo-mpdReport/views/memo.html';
		super(options);
		
		this.nextStep = {
			'#US': '#reviewUS',
			'#NS': '#reviewNS',
		};
	}
	
	
	initDOM() {
		//// Init Quill text editor
		this.quill = new Quill(this.$('#memo-textbox').get(0), {
			theme: 'snow',
			modules: {
				toolbar: [
				  ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
				  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
				  [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
				  [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
				  [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
				  [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
				  [{ 'align': [] }],
				  ['clean']                                         // remove formatting button
				],
			},
		});		
	}
	
	
	show() {
		super.show();
		// Focus the editor automatically whenever the memo component is shown
		this.quill.focus();
	}
	
	
	clear() {
		this.quill.setText('');
	}
	
	
	getMemoHTML() {
		return this.quill.container.firstChild.innerHTML;
	}
	
	
}