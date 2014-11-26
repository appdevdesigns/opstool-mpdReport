
steal(
        // List your Controller's dependencies here:
        'appdev',
        '//opstools/MPDReport/views/MPDReportUpload/MPDReportUpload.ejs',
function(){

    AD.Control.extend('opstools.MPDReport.MPDReportUpload', {


        init: function( element, options ) {
            var self = this;
            this.options = AD.defaults({
                    templateDOM: '//opstools/MPDReport/views/MPDReportUpload/MPDReportUpload.ejs'
            }, options);

            this.key = '#upload';
            this.initDOM();


            //
            // attach dropzone to the file uplader
            //
            var myDrop = new Dropzone('#staff-report-uploader', {
                url:'/mpdreport/upload',
                acceptedFiles:'.csv',
                paramName:'csvFile'
            });
        

            myDrop.on('success', function(file, response){
                // notify any other widgets about the file.uploaded event
                //AD.comm.hub.publish('ad.mpdreport.file.uploaded',{ file:file});

                // Notify the parent controller about the upload
                can.trigger(self, 'uploaded');
            });


        },
        
        
        show: function() {
            this.element.show();
        },


        initDOM: function() {
            var self = this;

            // insert our base DOM with the Column contents: objectlist, and bottom elements
            this.element.html(can.view(this.options.templateDOM, {} ));
        }
        
    });


});