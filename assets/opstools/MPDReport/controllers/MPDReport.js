
steal(
        // List your Controller's dependencies here:
        'appdev',
function(){


    // Namespacing conventions:
    // AD.controllers.opstools.[Tool].Tool  --> main controller for tool
    // AD.controllers.opstools.[Tool].[controller] --> sub controllers for tool
    // AD.controllers.opstools.HrisAdminObjects.Tool = can.Control.extend({

    if (typeof AD.controllers.opstools == 'undefined') AD.controllers.opstools = {};
    if (typeof AD.controllers.opstools.MPDReport == 'undefined') AD.controllers.opstools.MPDReport = {};
    AD.controllers.opstools.MPDReport.Tool = AD.classes.opsportal.OpsTool.extend({

        init: function( element, options ) {
            var self = this;
            options = AD.defaults({
                    templateDOM: '//opstools/MPDReport/views/MPDReport/MPDReport.ejs',
                    resize_notification: 'MPDReport.resize',
                    tool:null   // the parent opsPortal Tool() object
            }, options);
            this.options = options;
            
            self.toolState = {
                staffType: '#US' // toggles between '#US' & '#NATIONAL'
            }
            

            // Call parent init
            AD.classes.opsportal.OpsTool.prototype.init.apply(this, arguments);

            this.dataSource = this.options.dataSource; // AD.models.Projects;

			// this.shouldUpdateUI = true;     // we have not updated our UI for the work area yet.

            this.initDOM();

			//new AD.controllers.opstools.MPDReport.MPDReportType(this.element.find('.tool-balance-report-type'), {toolState: self.toolState});
			self.toolUpload = new AD.controllers.opstools.MPDReport.MPDReportUpload(this.element.find('.tool-balance-report-upload'), {toolState: self.toolState});
			self.toolReview = new AD.controllers.opstools.MPDReport.MPDReportReview(this.element.find('.tool-balance-report-review'), {toolState: self.toolState});
			self.toolSend = new AD.controllers.opstools.MPDReport.MPDReportSend(this.element.find('.tool-balance-report-send'), {toolState: self.toolState});
			//new AD.controllers.opstools.MPDReport.MPDReportSendNational(this.element.find('.tool-balance-report-send-national'), {toolState: self.toolState});

            this.toggleStaffType('#US');


			// listen for resize notifications
            AD.comm.hub.subscribe('opsportal.resize', function (key, data) {
				self.element.css("height", data.height + "px");
				self.element.find(".opsportal-stage-container").css("height", data.height + "px");
            });
            
            // Show the Review panel after a file is uploaded
            //AD.comm.hub.subscribe('ad.mpdreport.file.uploaded', function(msg, data){
            can.bind.call(self.toolUpload, 'uploaded', function() {
                self.showTool(self.toolReview);
            });
            
            // Show the Send panel after a review is approved
            can.bind.call(self.toolReview, 'approved', function() {
                self.showTool(self.toolSend);
            });

        },
        
        // Show a tool and hide its siblings
        showTool: function(tool) {
            // Toggle the tool's nav button state
            this.element.find('.tool-balance-report-nav li a.active-btn').removeClass('active-btn');
            this.element.find(".tool-balance-report-nav li a[href='"+tool.key+"']").addClass('active-btn');
            // Toggle the tool's panel visibility
            this.element.find('.tool-balance-container').hide();
            tool.show();
        },
        
        // @param string type
        //     either '#US' or '#NATIONAL'
        toggleStaffType: function (type) {
            this.toolState.staffType = type;
            if (type == '#US') {
                this.element.find('ul.national-report-steps').hide();
                this.element.find('ul.us-report-steps').show();
                this.showTool(this.toolUpload);
                // Reset the review table
                this.toolReview.clearData();
            } else {
                this.element.find('ul.us-report-steps').hide();
                this.element.find('ul.national-report-steps').show();
                this.showTool(this.toolReview);
                // Reset the review table
                this.toolReview.loadResults();
            }
        },
        
        initDOM: function() {
            
            this.element.html(can.view(this.options.templateDOM, {} ));

        },

        '.ad-item-add click': function($el, ev) {

            ev.preventDefault();
        },
        
        '.opsportal-stage-title a click': function($el, ev) {
            this.element.find('.opsportal-stage-title a.active-btn').removeClass('active-btn');
            $el.addClass('active-btn');
            this.toggleStaffType($el.attr('href'));
            ev.preventDefault();
        },
        
        '.tool-balance-report-nav li a.btn click': function($el, ev) {
            var self = this;
            var href = $el.attr('href');
            switch (href) {
                case '#upload':
                    self.showTool(self.toolUpload);
                    break;

                case '#review':
                    self.showTool(self.toolReview);
                    break;
                
                case '#email':
                    self.showTool(self.toolSend);
                    break;
            }
            ev.preventDefault();
        }
        
    });


});