
steal(
        // List your Controller's dependencies here:
        'appdev',
function(){

    //if (typeof AD.controllers.opstools == 'undefined') AD.controllers.opstools = {};
    //if (typeof AD.controllers.opstools.HrisUserProfile == 'undefined') AD.controllers.opstools.HrisUserProfile = {};
    AD.controllers.opstools.MPDReport.MPDReportUpload = can.Control.extend({


        init: function( element, options ) {
            var self = this;
            this.options = AD.defaults({
                    templateDOM: '//opstools/MPDReport/views/MPDReportUpload/MPDReportUpload.ejs',
            }, options);

            this.key = '#upload';
            this.initDOM();

			//this.element.find('#idOfPassportDiv').hide();


            //
            // attach dropzone to the file uplader
            //
            var myDrop = new Dropzone('#staff-report-uploader', {
                url:'/mpdreport/upload',
                acceptedFiles:'.csv'
            });
        
            myDrop.on('success', function(file, response){
                // notify any other widgets about the file.uploaded event
                AD.comm.hub.publish('ad.mpdreport.file.uploaded',{ file:file});
            })

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