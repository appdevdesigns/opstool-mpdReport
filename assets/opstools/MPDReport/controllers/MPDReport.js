steal(
    // List your Controller's dependencies here:
    'opstools/MPDReport/controllers/MPDReportType.js',
    'opstools/MPDReport/controllers/MPDReportUpload.js',
    'opstools/MPDReport/controllers/MPDReportReview.js',
    'opstools/MPDReport/controllers/MPDReportSend.js',
    'opstools/MPDReport/controllers/MPDReportSendNational.js',
    'opstools/MPDReport/views/MPDReport/MPDReport.ejs',
	function() {
		System.import('appdev').then(function() {
			steal.import(
				'appdev/ad',
				'appdev/control/control',
				'GenericList',
				'OpsPortal/classes/OpsTool',
				'site/labels/opstool-MPDReport').then(function() {

					AD.Control.OpsTool.extend('MPDReport', {

						init: function(element, options) {
							var self = this;
							options = AD.defaults({
								templateDOM: '/opstools/MPDReport/views/MPDReport/MPDReport.ejs',
								resize_notification: 'MPDReport.resize',
								tool: null   // the parent opsPortal Tool() object
							}, options);
							this.options = options;

							//// TODO: Multilingual & call _super() on init.

							self.toolState = {
								staffType: '#US' // toggles between '#US' & '#NATIONAL'
							}


							// Call parent init
							AD.classes.opsportal.OpsTool.prototype.init.apply(this, arguments);

							this.dataSource = this.options.dataSource; // AD.models.Projects;

							this.initDOM();

							//new AD.controllers.opstools.MPDReport.MPDReportType(this.element.find('.tool-balance-report-type'), {toolState: self.toolState});
							self.toolUpload = new AD.controllers.opstools.MPDReport.MPDReportUpload(this.element.find('.tool-balance-report-upload'), { toolState: self.toolState });
							self.toolReview = new AD.controllers.opstools.MPDReport.MPDReportReview(this.element.find('.tool-balance-report-review'), { toolState: self.toolState });
							self.toolSend = new AD.controllers.opstools.MPDReport.MPDReportSend(this.element.find('.tool-balance-report-send'), { toolState: self.toolState });
							self.toolSendNS = new AD.controllers.opstools.MPDReport.MPDReportSendNational(this.element.find('.tool-balance-report-send-national'), { toolState: self.toolState });


							// Initial state is US MPD report
							this.toggleStaffType('#US');

							// listen for resize notifications
							this.idResize = AD.comm.hub.subscribe('opsportal.resize', function(key, data) {
								if (self.element) {
									self.element.css("height", data.height + "px");
									self.element.find(".opsportal-stage-container").css("height", data.height + "px");
								} else {
									AD.comm.hub.unsubscribe(self.idResize);
								}
							});

							// Show the Review panel after a file is uploaded
							//AD.comm.hub.subscribe('ad.mpdreport.file.uploaded', function(msg, data){
							can.bind.call(self.toolUpload, 'uploaded', function() {
								self.showTool('#review');
								self.toolReview.loadResults();
							});

							// Show the Send panel after a review is approved
							can.bind.call(self.toolReview, 'approved', function() {
								self.showTool('#email');
							});
							
                            // Get a reference to the memo Quill widget when it is ready
                            can.bind.call(self.toolUpload, 'memoReady', function(event, widget) {
                                self.memo = widget;
                                self.toolReview.memo = widget;
                                self.toolSend.memo = widget;
                                self.toolSendNS.memo = widget;
                            });
							
						},

						// Show a tool and hide its siblings
						// @param string toolKey
						showTool: function(toolKey) {
							// Toggle the tool's nav button state
							this.element.find('.tool-balance-report-nav li a.active-btn').removeClass('active-btn');
							this.element.find(".tool-balance-report-nav li a[href='" + toolKey + "']").addClass('active-btn');
							// Toggle the tool's panel visibility
							this.element.find('.tool-balance-container').hide();

							switch (toolKey) {
								case '#upload':
									this.toolUpload.show();
									break;

								case '#review':
									this.toolReview.show();
									break;

								case '#email':
									if (this.toolState.staffType == '#US') {
										this.toolSend.show();
									} else {
										this.toolSendNS.show();
									}
									break;

								default:
									console.log('Invalid tool key: ' + toolKey);
									break;
							}
						},

						// @param string type
						//     either '#US' or '#NATIONAL'
						toggleStaffType: function(type) {
							this.toolState.staffType = type;
							if (type == '#US') {
								this.element.find('ul.national-report-steps').hide();
								this.element.find('ul.us-report-steps').show();
								this.element.find('#staff-report-uploader').parent().show();
								this.showTool('#upload');
								// Reset the review table
								this.toolReview.clearData();
							} else {
								this.element.find('ul.us-report-steps').hide();
								this.element.find('ul.national-report-steps').show();
								this.element.find('#staff-report-uploader').parent().hide();
								this.showTool('#upload');
								//this.showTool('#review');
								// Load the review table
								this.toolReview.loadResults();
							}
						},

						initDOM: function() {

							this.element.html(can.view(this.options.templateDOM, {}));

						},


						// Toggle between US and National staff reports
						'.mpdreport-us-national a click': function($el, ev) {
							this.element.find('.opsportal-stage-title a.active-btn').removeClass('active-btn');
							$el.addClass('active-btn');
							this.toggleStaffType($el.attr('href'));
							ev.preventDefault();
						},


						// Navigation between Upload / Review / Send
						'.tool-balance-report-nav li a.btn click': function($el, ev) {
							var self = this;

							// The link HREF contains the tool key
							var toolKey = $el.attr('href');
							self.showTool(toolKey);
							ev.preventDefault();
						}

					});
				});
		});

	});