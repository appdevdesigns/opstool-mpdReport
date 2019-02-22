//import $ from 'jquery';
import Dropzone from 'dropzone';
import Component from './component.js';
import comm from '../comm.js';

export default class Upload extends Component {
	
	constructor(options) {
		options.template = options.template || '/solo-mpdReport/views/upload.html';
		super(options);
		
		// This will be updated later
		this.dropzoneHeaders = {
			'X-CSRF-Token': 'uninitialized',
		};
		
		this.nextStep = {
			'#US': '#memo',
		};
	}
	
	
	initDOM() {
		//// Init Dropzone uplaoder
		this.dropzone = new Dropzone('#staff-report-uploader', {
			url: '/mpdreport/upload',
			acceptedFiles: '.csv',
			paramName: 'csvFile',
			headers: this.dropzoneHeaders,
			accept: (file, done) => {
				// Update to the current CSRF token before uploading
				this.dropzoneHeaders['X-CSRF-Token'] = comm.csrfToken;
				done();
			}
		});
		
		this.dropzone.on('success', (file, response) => {
			// Notify parent about the upload
			this.emit('uploaded');
			this.emit('next');
		});
	}
	
	
	
	
}