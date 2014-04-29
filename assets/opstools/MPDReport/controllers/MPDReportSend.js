
steal(
        // List your Controller's dependencies here:
        'appdev',
        'appdev/widgets/ad_icon_busy/ad_icon_busy.js',
function(){

    //if (typeof AD.controllers.opstools == 'undefined') AD.controllers.opstools = {};
    //if (typeof AD.controllers.opstools.HrisUserProfile == 'undefined') AD.controllers.opstools.HrisUserProfile = {};
    AD.controllers.opstools.MPDReport.MPDReportSend = can.Control.extend({


        init: function( element, options ) {
            var self = this;
            this.options = AD.defaults({
                    templateDOM: '//opstools/MPDReport/views/MPDReportSend/MPDReportSend.ejs',
            }, options);
            
            // This must be an object reference and should not be copied by
            // value via defaults()
            self.toolState = options.toolState;

            this.key = '#email';
            this.initDOM();
            
            var busyIcon = this.element.find('.balrep-indicator span');
			this.busyIndicator = new AD.widgets.ad_icon_busy(busyIcon);

        },

		//nextStep: function(argStep) {

            //AD.comm.hub.publish('hris.form.object.new', {});

        //},

        initDOM: function() {
            var self = this;

            // insert our base DOM with the Column contents: objectlist, and bottom elements
            this.element.html(can.view(this.options.templateDOM, {} ));
            
        },
        
        
        "#balance-report-send-btn click": function ($el, ev) {
            var self = this;
            ev.preventDefault();
            
            var serviceURL;
            if (self.toolState.staffType == '#US') {
                serviceURL = '/mpdreport/email/send';
            } else {
                serviceURL = '/nsmpdreport/email/send';
            }
            

            self.busyIndicator.show();
            $.ajax({
                url: serviceURL,
                dataType:'json'
            })
            .always(function(){
                self.busyIndicator.hide();
            })
            .fail(function(err){
                console.log(err);
            });
            
        }
        
    });


});