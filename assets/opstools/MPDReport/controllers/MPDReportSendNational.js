
steal(
        // List your Controller's dependencies here:
        'appdev',
function(){

    //if (typeof AD.controllers.opstools == 'undefined') AD.controllers.opstools = {};
    //if (typeof AD.controllers.opstools.HrisUserProfile == 'undefined') AD.controllers.opstools.HrisUserProfile = {};
    AD.controllers.opstools.MPDReport.MPDReportSendNational = can.Control.extend({


        init: function( element, options ) {
            var self = this;
            this.options = AD.defaults({
                    templateDOM: '//opstools/MPDReport/views/MPDReportSendNational/MPDReportSendNational.ejs',
            }, options);

            this.initDOM();

			//this.element.find('#idOfPassportDiv').hide();

			// listen for resize notifications
            AD.comm.hub.subscribe('opsportal.resize', function (key, data) {
				self.element.css("height", data.height + "px");
				self.element.find(".opsportal-stage-container").css("height", data.height + "px");
            });


        },

		//nextStep: function(argStep) {

            //AD.comm.hub.publish('hris.form.object.new', {});

        //},

        initDOM: function() {
            var self = this;

            // insert our base DOM with the Column contents: objectlist, and bottom elements
            this.element.html(can.view(this.options.templateDOM, {} ));
        }
    });


});