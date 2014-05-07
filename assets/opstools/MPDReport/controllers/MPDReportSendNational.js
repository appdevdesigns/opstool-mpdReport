
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

            // This must be an object reference and should not be copied by
            // value via defaults()
            self.toolState = options.toolState;

            this.key = '#email';
            this.initDOM();


			// listen for resize notifications
            AD.comm.hub.subscribe('opsportal.resize', function (key, data) {
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
            this.element.html(can.view(this.options.templateDOM, {} ));
        },
        
        
        ".balrep-send a click": function ($el, ev) {
            var self = this;
            var serviceURL;

            var action = $el.attr('href');
            if (action == '#send-individual') {
                serviceURL = '/nsmpdreport/email/send/individual';
            } else if (action == '#send-regional') {
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
            
            ev.preventDefault();
        }
        
    });


});