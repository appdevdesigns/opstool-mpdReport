
steal(
	// List your Controller's dependencies here:
	'opstools/MPDReport/views/MPDReportUpload/MPDReportUpload.ejs',
	function() {
		System.import('appdev').then(function() {
			steal.import('appdev/ad',
				'appdev/control/control',
				'dropzone').then(function() {

					AD.Control.extend('opstools.MPDReport.MPDReportUpload', {


						init: function(element, options) {
							var self = this;
							this.options = AD.defaults({
								templateDOM: '/opstools/MPDReport/views/MPDReportUpload/MPDReportUpload.ejs'
							}, options);

							this.key = '#upload';
							this.initDOM();
							this.dropzoneHeaders = {
								'X-CSRF-Token': 'uninitialized'
							};

							//
							// attach dropzone to the file uplader
							//
							var myDrop = new Dropzone('#staff-report-uploader', {
								url: '/mpdreport/upload',
								acceptedFiles: '.csv',
								paramName: 'csvFile',
								headers: self.dropzoneHeaders
							});

							// Rather than trying to tinker with the inner workings of Dropzone
							// we will simply fetch the CSRF token periodically so it will
							// always be fresh.
							this.csrfInterval = setInterval(function() {
								self.fetchCSRF();
							}, 1000 * 60 * 60);
							self.fetchCSRF();


							myDrop.on('success', function(file, response) {
								// notify any other widgets about the file.uploaded event
								//AD.comm.hub.publish('ad.mpdreport.file.uploaded',{ file:file});

								// Notify the parent controller about the upload
								can.trigger(self, 'uploaded');
							});


						},


						fetchCSRF: function() {
							var self = this;
							AD.comm.service.get({
								url: '/csrfToken'
							})
								.done(function(data) {
									self.dropzoneHeaders['X-CSRF-Token'] = data._csrf;
								});

						},


						show: function() {
							this.element.show();
						},


						initDOM: function() {
							var self = this;

							// insert our base DOM with the Column contents: objectlist, and bottom elements
							this.element.html(can.view(this.options.templateDOM, {}));
						}

					});
				});
		});

	});