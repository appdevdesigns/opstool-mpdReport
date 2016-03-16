
steal(
	// List your Controller's dependencies here:
	'opstools/MPDReport/views/MPDReportSend/MPDReportSend.ejs',
	function() {
		System.import('appdev').then(function() {
			steal.import('appdev/ad',
				'appdev/control/control',
				'appdev/widgets/ad_icon_busy/ad_icon_busy',
				'appdev/comm/service').then(function() {

					AD.Control.extend('opstools.MPDReport.MPDReportSend', {


						init: function(element, options) {
							var self = this;
							this.options = AD.defaults({
								templateDOM: '/opstools/MPDReport/views/MPDReportSend/MPDReportSend.ejs'
							}, options);

							//// TODO: Multilingual & call _super() on init.

							// This must be an object reference and should not be copied by
							// value via defaults()
							self.toolState = options.toolState;

							this.key = '#email';
							this.initDOM();

							var busyIcon = this.element.find('.balrep-indicator span');
							this.busyIndicator = new AD.widgets.ad_icon_busy(busyIcon);

						},


						show: function() {
							this.element.show();
						},


						initDOM: function() {
							var self = this;

							// insert our base DOM with the Column contents: objectlist, and bottom elements
							this.element.html(can.view(this.options.templateDOM, {}));

						},


						"#balance-report-send-btn click": function($el, ev) {
							var self = this;
							ev.preventDefault();
							if ($el.attr('disabled')) return;

							var serviceURL = '/mpdreport/email/send';
							var $memo = $('textarea#mpd-report-memo');
							var $buttons = self.element.find('.balrep-send a');

							self.busyIndicator.show();
							$buttons.attr('disabled', 1);

							AD.comm.service.post({
								url: serviceURL,
								params: {
									memo: $memo.val()
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
									alert('Completed');
								});

						}

					});
				});
		});

	});