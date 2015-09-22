
steal(
        // List your Controller's dependencies here:
        'appdev',

        '//opstools/MPDReport/views/MPDReportReview/MPDReportReview.ejs',
        '//opstools/MPDReport/views/MPDReportReview/filter.ejs',
        '//opstools/MPDReport/views/MPDReportReview/table.ejs',

function(){


    AD.Control.extend('opstools.MPDReport.MPDReportReview', {


        init: function( element, options ) {
            var self = this;
            this.options = AD.defaults({
                    templateDOM: '//opstools/MPDReport/views/MPDReportReview/MPDReportReview.ejs',
                    templateFilter: '//opstools/MPDReport/views/MPDReportReview/filter.ejs',
                    templateTable: '//opstools/MPDReport/views/MPDReportReview/table.ejs'
            }, options);
            
//// TODO: Multilingual & call _super() on init.
            
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


//// TODO:  refactor RegionList as a Model

            //// get our List of Regions from our services:
            this.regionList = {};
            AD.comm.service.get({ url:'/nsmpdreport/regions'})
            .fail(function(err){
                console.error(err);
            })
            .done(function(data){
                console.log(data);
                self.regionList.national = data;
            })
            
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



        /**
         * @function currentFilter
         * 
         * Return the currently selected filter value.
         * 
         * @return [string] filter value.
         */
        currentFilter:function() {

            var selected = '';
            var currSelected = this.filter.find('.filter-on');
            if ((currSelected) && (currSelected.length)) {
                if (typeof currSelected == 'array') {
                    selected = currSelected[0].text();
                } else {
                    selected = currSelected.text();
                }
            }
            return selected;
        },



        /**
         * @function currentRegionList
         * 
         * Return the list of regions according to our toolState.
         * 
         * @return [array] region values or null if unknown.
         */
        currentRegionList:function() {

            var regions = null;

            //  allow US staff version to pull regions by current data:
            if (this.toolState.staffType == '#US') {
                regions = [];
                for (var r in this.reportData.staffByRegion) {
                    regions.push(r);
                }

            } else {

                // lookup region by our stored .regionList[key] 
                var key = this.toolState.staffType.replace('#', '').toLowerCase();
                if (this.regionList[key]){ 
                    regions = [];

                    // NOTE: make a copy of the region list so we don't modify the original
                    // when we .push() the missing option.
                    this.regionList[key].forEach(function(entry){
                        regions.push(entry);
                    })
                }

            }

            return regions;
        },


        defaultFilter: function() {

            var filter = this.currentFilter();
            if (filter == '') {
                var regions = this.currentRegionList();
                if (regions) {
                    filter = regions[0];
                } else {
                    console.warn('*** warn: could not determine a default filter');
                }
            }

            return filter;

        },



        displayFilters: function() {


            // pull the proper region list depending upon which toolState we are in
            var regions = this.currentRegionList();


            // find the value of the currently selected filter
            var selected = this.defaultFilter();


            if (this.toolState.staffType == '#US') {
                // if our reportData includes a 'missing' dataset: add 'missing'
                if (this.reportData.missing) {
                    regions.push('missing');
                }
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
            this.updateFilterTag(regionKey);
            
            var $table = this.element.find('.op-table-container');
            
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
            var regionList;
            if (self.toolState.staffType == '#US') {
                serviceURL = '/mpdreport/data';
            } else {
                serviceURL = '/nsmpdreport/dataForRegion';
            }

            var selectedRegion = this.currentFilter();
            if (selectedRegion == '') {
                regionList = this.currentRegionList();
                if (regionList) {
                    selectedRegion = regionList[0];  // just choose 1st one
                }
            }
            
            AD.comm.service.get({
                url: serviceURL,
                params: { region: selectedRegion },
                dataType:'json'
            })
            .fail(function(err){
                done(err, null);
            })
            .done(function(data){
                console.log(data);
                self.reportData = data;
                done(null, data);
            });
            
        },



        loadResults: function(){
            var self = this;

            //
            // Reworking this to be a Prepare For Display
            // fn() for our new approach:
            //

            // keep the US approach the same:
            if (self.toolState.staffType == '#US') {

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

            } else {

                var listRegions = [];
                var currentRegion = null;

                AD.util.async.series([

                    // step 1: make sure our regions are loaded
                    function(next) {
                        listRegions = self.currentRegionList();
                        if (listRegions) {
                            // got some results, so just continue on:
                            next();
                        } else {


                            // load that data:
                            self.loadIndicator.show();
                            AD.comm.service.get({ url:'/nsmpdreport/regions'})
                            .fail(function(err){
                                self.loadIndicator.hide();
                                next(err);
                            })
                            .done(function(data){
                                self.loadIndicator.hide();
                                self.regionList.national = data;
                                listRegions = data;
                                next();
                            })

                        } 
                    },

                    // step 2: choose a default
                    function(next) {

                        currentRegion = self.defaultFilter();
                        next();
                        
                    },

                    // step 3: make sure default region's data is loaded
                    function(next) {

                        // if that region is already loaded:
                        if (self.reportData.staffByRegion[currentRegion]) {
                            next();
                        } else {

                            // load that data:
                            self.loadIndicator.show();
                            AD.comm.service.get({ 
                                url:'/nsmpdreport/dataForRegion',
                                params:{ region: currentRegion }
                            })
                            .fail(function(err){
                                self.loadIndicator.hide();
                                console.error(' error loading dataForRegion(): currentRegion:'+currentRegion);
                                console.error(err);
                                next(err);
                            })
                            .done(function(data){

                                self.loadIndicator.hide();
                                // this returns [ {staffAccountAnalysis1}, {staffAccountAnalysis2}, ... ]

                                // the existing display wants this as a hash:
                                // { accountNum1: {staffAccountAnalysis1},  }
                                var hash = {};
                                data.forEach(function(entry){
                                    hash[entry.accountNum] = entry;
                                })

                                self.reportData.staffByRegion[currentRegion] = hash;
                                next();
                            })

                        }
                    },

                    // step 4: display information
                    function(next) {

                        self.displayFilters();
                        self.displayData(currentRegion);
                    }

                ], function(err, results) {

                    if (err) {
                        console.error(err);
                    } else {

                        console.log('ns staff report loadData() completed.');
                    }

                })

            }

        },



        /*
         * @function updateFilterTag
         *
         * Make sure the filter tag for the given region Key is selected.
         *
         * @param [string] regionKey    : one of the values of an existing filter
         */
        updateFilterTag:function(regionKey){

            // Update the tag buttons
            this.filter.find('.balrep-filter-tag').removeClass('filter-on');
            this.filter.find('a[data-balrep-filter="'+regionKey+'"]').addClass('filter-on');

        },



        // Handle clicks on the "Reload" button
        "a[href='#balrep-report-reload'] click": function($el, ev) {
            var self = this;

            if (this.toolState.staffType != '#US') {
                // erase our data!
                this.reportData.staffByRegion = {}
            }
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

            self.updateFilterTag(regionKey);

            // keep us staff working as before:
            if (self.toolState.staffType == '#US') {
                self.displayData(regionKey);
            } else {
                self.loadResults();
            }
            
            ev.preventDefault();
        }


    });


});