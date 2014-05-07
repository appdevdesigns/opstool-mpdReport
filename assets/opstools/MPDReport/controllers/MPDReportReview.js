
steal(
        // List your Controller's dependencies here:
        'appdev',
//        'pages/nsstaffreport/nsstaffreport.css',

function(){

    //if (typeof AD.controllers.opstools == 'undefined') AD.controllers.opstools = {};
    //if (typeof AD.controllers.opstools.HrisUserProfile == 'undefined') AD.controllers.opstools.HrisUserProfile = {};
    AD.controllers.opstools.MPDReport.MPDReportReview = can.Control.extend({


        init: function( element, options ) {
            var self = this;
            this.options = AD.defaults({
                    templateDOM: '//opstools/MPDReport/views/MPDReportReview/MPDReportReview.ejs',
                    templateFilter: '//opstools/MPDReport/views/MPDReportReview/filter.ejs',
                    templateTable: '//opstools/MPDReport/views/MPDReportReview/table.ejs'
            }, options);
            
            // This must be an object reference and should not be copied by
            // value via defaults()
            self.toolState = options.toolState;

            this.btnReload = null;
            
            this.reportData = {
                staffByRegion: {
                /*
                    "Region1": {
                        9876: {
                            accountNum: "0009876",
                            accountBal: 1234.
                            avgAccountBal: 1000,
                            avgContributions: 1111,
                            avgPayroll: 500,
                            hrisName: "Smith, John",
                            hrisRegion: "Region1",
                            monthsinDeficit: 0,
                            name: Smith, John",
                            phone "15551234 (m)",
                            email: "jsmith@example.com",
                            ren_id: 3210
                        },
                        8765: { ... },
                        ...
                    },
                    "Region2": { ... },
                    ...
                */
                },
                missing: {
                /* ... */
                }
            };
            
            this.key = '#review';
            this.initDOM();

            AD.comm.hub.subscribe('ad.mpdreport.file.uploaded', function(msg, data){
                self.loadResults();
            });

        },
        

        show: function() {
            
            this.element.show();
        },


        clearData: function () {
            // Clear out any old data from the table
            this.element.find('#balreport-review-table tbody tr').remove();
        },



        displayFilters: function() {

            // gather the regions:
            var regions = [];
            var selected = '';
            for (var r in this.reportData.staffByRegion) {
                regions.push(r);
                if (selected == '') selected = r;
            }

            var currSelected = this.filter.find('.filter-on');
            if (currSelected) {
                selected = currSelected.val();
            }

            if (this.reportData.missing) {
                regions.push('missing');
            }

            this.filter.html(can.view(this.options.templateFilter, {
                regions:regions,
                selected:selected
            }));

        },
        
        

        displayData: function (regionKey) {
            var tableData;
            
            // Default region for US / National staff
            if (typeof regionKey == 'undefined') {
                if (this.toolState.staffType == '#US') {
                    regionKey = 'missing';
                } else {
                    regionKey = 'AOA';
                }
            }
            
            // 'missing' region is handled a bit differently
            if (regionKey == 'missing') {
                tableData = this.reportData['missing'];
            } else {
                tableData = this.reportData.staffByRegion[regionKey];
            }
            
            // Update the tag buttons
            this.filter.find('.balrep-filter-tag').removeClass('filter-on');
            this.filter.find("a[data-balrep-filter='"+regionKey+"']").addClass('filter-on');
            
            var $table = this.element.find('.opsportal-table-container');
            
            if (!tableData) return;

            $table.html(can.view(this.options.templateTable, {
                dataSet:tableData
            }));

        },



        initDOM: function() {
            var self = this;

            // insert our base DOM with the Column contents: objectlist, and bottom elements
            this.element.html(can.view(this.options.templateDOM, {} ));
            
            // find the loadIndicator and Attach an ad_icon_busy widget
            var busyIcon = this.element.find('.loading-indicator');
            this.loadIndicator = new AD.widgets.ad_icon_busy(busyIcon);

            this.filter = this.element.find('.opsportal-filter');

        },



        getData: function(done) {
            var self = this;
            var serviceURL;
            if (self.toolState.staffType == '#US') {
                serviceURL = '/mpdreport/data';
            } else {
                serviceURL = '/nsmpdreport/data';
            }
            
            $.ajax({
                url: serviceURL,
                dataType:'json'
            })
            .done(function(data){
                console.log(data);
                self.reportData = data;
                done(null, data);
            })
            .fail(function(err){
                done(err, null);
            });
        },



        loadResults: function(){
            var self = this;

            // get data from server
            this.loadIndicator.show();
            this.getData(function(err, data){

                self.loadIndicator.hide();
                if (err) {

                    // display error msg
                    console.log(err);

                } else {
                    self.displayFilters();
                    self.displayData();
                    
                }
            });


        },


        // Handle clicks on the "Reload" button
        "a[href='#balrep-report-reload'] click": function($el, ev) {
            this.loadResults();
            ev.preventDefault();
        },
        

        // Handle clicks on the "Approve" button
        "a[href='#balrep-report-approve'] click": function($el, ev) {
            can.trigger(this, 'approved');
            //this.trigger('approved');
        },
        

        // Handle clicks on a filter tag
        'a.balrep-filter-tag click': function ($el, ev) {
            var self = this;
            var regionKey = $el.attr('data-balrep-filter');
            self.displayData(regionKey);
            ev.preventDefault();
        }


    });


});