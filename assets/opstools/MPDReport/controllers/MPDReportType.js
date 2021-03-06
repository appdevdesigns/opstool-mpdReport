
steal(
        // List your Controller's dependencies here:
        'appdev',
        '//opstools/MPDReport/views/MPDReportType/MPDReportType.ejs',
function(){

    // if (typeof AD.controllers.opstools == 'undefined') AD.controllers.opstools = {};
    // if (typeof AD.controllers.opstools.MPDReport == 'undefined') AD.controllers.opstools.MPDReport = {};
    // AD.controllers.opstools.MPDReport.MPDReportType = can.Control.extend({
    AD.Control.extend('opstools.MPDReport.MPDReportType', {

        init: function( element, options ) {
            var self = this;
            this.options = AD.defaults({
                    templateDOM: '//opstools/MPDReport/views/MPDReportType/MPDReportType.ejs'
            }, options);

            this.initDOM();

			//this.element.find('#idOfPassportDiv').hide();

			// listen for resize notifications
            AD.comm.hub.subscribe('opsportal.resize', function (key, data) {
				self.element.css("height", data.height + "px");
				self.element.find(".opsportal-stage-container").css("height", data.height + "px");
				console.log("The stage container height is " + data.height);
            });


        },

		nextStep: function(argStep) {

            //AD.comm.hub.publish('hris.form.object.new', {});

        },

        initDOM: function() {
            var self = this;

            // insert our base DOM with the Column contents: objectlist, and bottom elements
            this.element.html(can.view(this.options.templateDOM, {} ));
        },

		'#staff-us click': function($el, ev) {
            console.log('US Staff selected!');
			self.nextStep('upload');
            ev.preventDefault();
        },

		'#staff-national click': function($el, ev) {			
            console.log('National Staff selected!');
			self.nextStep('review');
            ev.preventDefault();
        }
        
    });


});