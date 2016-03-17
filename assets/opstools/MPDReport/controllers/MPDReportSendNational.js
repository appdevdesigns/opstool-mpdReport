
steal(
	// List your Controller's dependencies here:
	'opstools/MPDReport/views/MPDReportSendNational/MPDReportSendNational.ejs',
	function() {
		System.import('appdev').then(function() {
			steal.import('appdev/ad',
				'appdev/control/control',
				'appdev/widgets/ad_icon_busy/ad_icon_busy',
				'appdev/comm/hub',
				'appdev/comm/service').then(function() {

					AD.Control.extend('opstools.MPDReport.MPDReportSendNational', {


						init: function(element, options) {
							var self = this;
							this.options = AD.defaults({
								templateDOM: '/opstools/MPDReport/views/MPDReportSendNational/MPDReportSendNational.ejs'
							}, options);

							// This must be an object reference and should not be copied by
							// value via defaults()
							self.toolState = options.toolState;

							this.key = '#email';
							this.initDOM();

							var busyIcon = this.element.find('.balrep-indicator span');
							this.busyIndicator = new AD.widgets.ad_icon_busy(busyIcon);
							this.memo = null; // will be assigned by parent controller

							// listen for resize notifications
							AD.comm.hub.subscribe('opsportal.resize', function(key, data) {
								self.element.css("height", data.height + "px");
								self.element.find(".opsportal-stage-container").css("height", data.height + "px");
							});


						},


						show: function() {
							this.element.show();
						},


						initDOM: function() {
							var self = this;

							// insert our base DOM with the Column contents: objectlist, and bottom elements
							this.element.html(can.view(this.options.templateDOM, {}));
						},


						".balrep-send a click": function($el, ev) {
							ev.preventDefault();
							if ($el.attr('disabled')) return;
							var self = this;
							var serviceURL;

							var action = $el.attr('href');
							if (action == '#send-individual') {
								serviceURL = '/nsmpdreport/email/individual/send';
							} else if (action == '#send-regional') {
								serviceURL = '/nsmpdreport/email/send';
							}

							var $buttons = self.element.find('.balrep-send a');

							self.busyIndicator.show();
							$buttons.attr('disabled', 1);

							AD.comm.service.post({
								url: serviceURL,
								params: {
									memo: self.memo.getHTML()
								}
							})
								.always(function() {
									self.busyIndicator.hide();
									$buttons.removeAttr('disabled');
								})
								.fail(function(err) {
									console.log(err);
									alert(err.message);
								})
								.done(function() {
									alert("Completed");
								});

						}

					});
				});
		});

	});