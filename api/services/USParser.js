var csvTool = require('csv');
var path = require('path');
var $ = require('jquery-deferred');
var async = require('async');

var AD = require('ad-utils');


//////
// CONFIG
//
var emailOptions = null;


var Log = null;  // opstool-mpdReport's own log fn() : prepends: 'opstool-mpdReport:'
var LogKey = '<green><bold>USParser:</bold></green>'; // prepend our logs with this

//////
// These values might change based upon the format of the report
//
var firstEntryRow = 12;     // row # (0 based) of the first entry
var numRowsPerEntry = 11;   // # rows for a single entry



var parseNumber = function(num) {
    num = num.replace(',','');
    var newNum = parseInt(num, 10);

    if ( num.indexOf('-') != -1) {
        newNum = -newNum;
    }
    return newNum;
};


// lookupKeys:
//  used in pulling important fields out of the block of CSV data for each staff account
var lookupKeys = {
        'accountNum': { key:'Acct#', col:1 },  // find row, col of 'Acct#' value, then col+= 1
        'accountBal': { key:'Balance', col:-1, parse:parseNumber},
        'avgAccountBal': { key:'Balance', col:1, parse:parseNumber },
        'monthsInDeficit': { key:'Months in Deficit', col:1, parse:parseNumber },
        'avgContributions' : { key:'Contributions', col:1, parse:parseNumber },
        'avgPayroll' : { key:'Payroll Charges', col:1, parse:parseNumber }
};


//// Node-Email-Templates:
var emailTemplates = require('email-templates');

module.exports= {


        lookupKeys:lookupKeys,


        compileStaffData:function(fileName, done) {
            var dfd = $.Deferred();

            if (Log == null) Log = MPDReportGen.Log; 

            var compiledData = {
                staffByRegion: {
                /*
                    <region1>: {
                        <staffAccount1> : { ... },
                        <staffACcount2> : { ... },
                        ...
                    },
                    <region2>: { ... },
                    ...
                */
                },
                missing: {
                /*
                    <staffAccount> : { ... },
                    ...
                */
                }
            };

            var csvParsed = this.parseCSV(fileName);
            var staffFound = LHRISWorker.workersByAccount({
                countryCode: 'US',
                groupByRegion: false
            });
            
            
            $.when(csvParsed, staffFound)
            .fail(function(err) {
                console.log('compileStaffData failed:', arguments);
                dfd.reject(err);
                return done({});
            })
            .done(function(csvInfo, usStaff) {
                for (var account in csvInfo) {
                    if (usStaff[account]) {
                        // HRIS data found
                        var region = usStaff[account].Region;
                        
                        // Add HRIS info to the CSV entry
                        csvInfo[account].phone = usStaff[account].Phone;
                        csvInfo[account].email = usStaff[account].Email;
                        csvInfo[account].hrisName = usStaff[account].Name;
                        
                        // Group by region -> account
                        compiledData.staffByRegion[region] = compiledData.staffByRegion[region] || {};
                        compiledData.staffByRegion[region][account] = csvInfo[account];
                    } 
                    else {
                        // No HRIS data found for this account.
                        compiledData.missing[account] = csvInfo[account];
                    }
                }
                
                
                // *****
                // All the `account` indexes uses above are the staff account
                // numbers with leading zeroes removed, and parsed into int.
                // This helps prevent mismatches between CSV & HRIS data due to
                // number formatting.
                //
                // Below this point, the sort procedures will re-index the
                // data with the original account numbers containing 
                // leading zeroes.
                // *****
                

                //// sort this data by account Balance:
                var sortedData = {
                    staffByRegion: {},
                    missing:{}
                };

                // sort all the regions
                var sbr = compiledData.staffByRegion;
                for (var region in sbr) {
                    sortedData.staffByRegion[region] = {};
                    var sortedRegion = arrayOrderedBy(sbr[region], 'accountBal');
                    sortedRegion.forEach(function(item){
                        sortedData.staffByRegion[region][item.accountNum] = item;
                    });
                }

                // sort the missing entries
                var sortedMissing = arrayOrderedBy(compiledData.missing, 'accountBal');
                sortedMissing.forEach(function(item){
                    sortedData.missing[item.accountNum] = item;
                });



                if (done) done(sortedData);
                dfd.resolve(sortedData);

            });
            
            return dfd;
        },



        parseCSV:function (fileName) {
            var self = this;

            var dfd = $.Deferred();

            var pathFile = path.join(process.cwd(), 'data', 'opstool-mpdReport', fileName );
            csvTool()
            	.from(pathFile)
            	.to.array(function( data, count) {

            	    self.array2obj(data, function(obj) {
            	        dfd.resolve(obj);
            	    });
            	});

            return dfd;

        },



        array2obj: function(rawCSV, done) {

            var returnObj = {};  /// accountNum:  { family Obj }

            var entryNum = 1;
            var row = rowCalc(firstEntryRow, numRowsPerEntry, entryNum);
            while(row < rawCSV.length) {

                var entry = this.pullObj( rawCSV, row);

                // store with [accountNum] => entry
                returnObj[ parseInt(entry.accountNum, 10) ] = entry;

                row = rowNextEntry(rawCSV, row);
            }


            if (done) done(returnObj);

        },



        pullObj: function( csv, row) {

            var obj = {};
            obj.name = csv[row][0];  // name should be 1st entry

            for (var l in this.lookupKeys) {
                obj[l] = this.findValue( csv, row, this.lookupKeys[l]);
            }

            return obj;

        },



        findValue: function(csv, row, lookup) {
            
            for (var r = row; r <= (row + numRowsPerEntry); r++) {
                for (var c=0; c< csv[row].length; c++){
                    
                    if (csv[r]) {
                        var val = csv[r][c];
                        if (val == lookup.key) {
                            
                            var val = csv[r][c + lookup.col];
                            if (typeof lookup.parse != 'undefined') {
                                val = lookup.parse(val);
                            }
                            return val;
                            
                        }
                    }
                }
            }
            
        },


        /**
         * @param string sourceData
         *      The CSV filename
         * @param function done
         *      {
         *          <region1>: { ... },
         *          <region2>: { ... },
         *          ...
         *          'missing': { ... }
         *      }
         * @return Deferred
         */
        compileEmailData: function(sourceData, done) {
            var dfd = $.Deferred();

            if (Log == null) Log = MPDReportGen.Log; 

            USParser.compileStaffData(sourceData, function(data) {

                // Data should be 'Region' : { accounts }
                var emailData = {};

                // load emailDefs
                var emailDefs = sails.config.opstool_mpdReport.us.emails;

                // for each region in staff data
                var foundData = data.staffByRegion;
                for (var region in foundData){
                    emailData[ emailDefs[region]] = foundData[region];
                }

                // tack on the 'missing' group of people:
                emailData.missing = data.missing;

                if (done) done(emailData);
                dfd.resolve(emailData);

            });

            return dfd;
        },

        
        /**
         * @param string templatesDir
         * @param object emailData
         *      {
         *          <region1>: { ... },
         *          <region2>: { ... },
         *          ...
         *          'missing': { ... }
         *      }
         * @param object extra
         *      Any other information
         * @param function done
         *      function(err, emails)
         * @return Deferred
         */
        compileRenderedEmails: function(templatesDir, emailData, extra, done) {
            var dfd = $.Deferred();

            if (Log == null) Log = MPDReportGen.Log; 

            var renderedEmails = [];

            emailTemplates(templatesDir, function(err, template) {

                if (err) {
                    Log.error(LogKey+' error compiling emailTemplates:', err);
                    if (done) done(err, null);
                    dfd.reject(err);

                } else {
                    
                    async.series([

                        // Step 1: compile all Standard Emails
                        function(next) {

                            getRenderer(template, 'staffAccount')
                            .fail(function(err){
                                next(err);
                            })
                            .then(function(renderer) {

                                renderStandardEmails({
                                    renderer:renderer,
                                    listEmails:renderedEmails,
                                    data:emailData,
                                    extra:extra,
                                    dir:templatesDir})
                                .fail(function(err){
                                    console.log('renderStandard error:', err);
                                    next(err);
                                })
                                .then(function(data){
                                    next();
                                });
                            });

                        },


                        // Step 2: compile Missing Region Emails to all regions
                        function(next) {

                            getRenderer(template, 'staffAccount_Missing')
                            .fail(function(err){
                                next(err);
                            })
                            .then(function(renderer) {

                                renderMissingRegionsEmails({
                                    renderer:renderer,
                                    listEmails:renderedEmails,
                                    data:emailData,
                                    extra:extra,
                                    dir:templatesDir})
                                .fail(function(err){
                                    next(err);
                                })
                                .then(function(data){
                                    next();
                                });
                            });
                        },


                        // Step 3: compile Undefined Entries Emails to all regions
                        function(next) {

                            getRenderer(template, 'staffAccount_Unknown')
                            .fail(function(err){
                                next(err);
                            })
                            .then(function(renderer) {

                                renderMissingStaffEmails({
                                    renderer:renderer,
                                    listEmails:renderedEmails,
                                    data:emailData,
                                    extra:extra,
                                    dir:templatesDir})
                                .fail(function(err){
                                    next(err);
                                })
                                .then(function(data){
                                    next();
                                });
                            });
                        }


                    ], function(err,results) {

                        if (err) {
                            console.log('compileRenderedEmails error:', err);
                            if (done) done(err, null);
                            dfd.reject(err);

                        } else {

                            // renderedEmails contains the array of emails to send
                            if (done) done(null, renderedEmails);
                            dfd.resolve(renderedEmails);
                        }

                    });

                } // end if err
            });

            return dfd;
        }
};



var rowCalc = function( fER, nRPE, eN) {
    return fER + ((eN-1) * nRPE);
};



var rowNextEntry = function( csv, baseRow) {

    // ok, the beginning of the next row is the row BEFORE the Acct# row:
    for (var r = baseRow+2; r < csv.length; r++ ) {

        var val = csv[r][0];
        if (val == 'Acct#') {
            return r-1;  // row BEFORE
        }
    }

    // if we get here, then r > csv length
    return r;  // this will stop the process.
};


var getRenderer = function(templateObj, name) {
    var dfd = $.Deferred();

    // send all the standard Emails
    templateObj(name, true, function(err, renderer){

        if (err) {
            Log.error(LogKey+' error getting renderer for ['+name+']:  ', err);
            console.log(err);
            dfd.reject(err);
        } else {
            dfd.resolve(renderer);
        }

    });

    return dfd;
};




var renderStandardEmails = function(opts) {
    var dfd = $.Deferred();

//        opts.renderer   The renderer for this email template
//        opts.listEmails The array to store our rendered email obj into
//        opts.data       The data to use for our
//        opts.extra      Any extra data to add
//        opts.dir        The template directory (why do we need this again?)



    // for each regional email address:
    for (var emailAddr in opts.data) {

        if ((emailAddr != 'undefined')
                && (emailAddr != 'missing')) {

            // NOTE: this is NOT asynchronous...
            var people = arrayOrderedBy(opts.data[emailAddr], 'accountBal');
            var renderData = { 
                people: people,
                extra: opts.extra
            }
            opts.renderer(renderData, opts.dir, function(err, html, text) {
                if (err) {
                    Log.error(LogKey+' error rendering email : ',err);

                    // bail out!!!!
                    dfd.reject(err);
                    return dfd;

                } else {

                    if (emailOptions == null) { emailOptions = MPDReportGen.emailOptionsUS };

                    // the "name" of the email distribution list to be used in the subject line
                    var emailName = MPDReportGen.parseAddressForName(emailAddr);
                    
                    var email = {
                        from: emailOptions.From(),
                        to: emailOptions.To(emailAddr),
                        cc: emailOptions.CC(),
                        bcc: emailOptions.BCC(),
                        subject:'US Staff Account Info ('+emailName+')',
                        html:html,
                        text:text
                    };

                    opts.listEmails.push(email);
                };
            });

        };
    } // next region
    dfd.resolve(opts.listEmails);

    return dfd;
};



/**
 * Report of staff with no HRIS assignment
 */
var renderMissingRegionsEmails = function(opts) {
    var dfd = $.Deferred();

//        opts.renderer   The renderer for this email template
//        opts.listEmails The array to store our rendered email obj into
//        opts.data       The data to use for our
//        opts.extra      Any extra data to add
//        opts.dir        The template directory (why do we need this again?)
    
    // Sending the missing assignment list to all region addresses.
    
    // Only proceed if there are staff with no assignments
    if (_.size(opts.data['undefined']) > 0) {
    
        // for each regional email address:
        for (var emailAddr in opts.data) {
    
            if ((emailAddr != 'undefined') && (emailAddr != 'missing')) {
    
                // NOTE: this is NOT asynchronous...
                // NOTE: region = 'undefined' means that we couldn't find their region
                var people = arrayOrderedBy(opts.data['undefined'], 'accountBal');
                var renderData = { 
                    people: people,
                    extra: opts.extra
                }
                opts.renderer(renderData, opts.dir, function(err, html, text) {
                    if (err) {
                        Log.error(LogKey+' error rendering email: ', err);
                        dfd.reject(err);
                        return dfd;
    
                    } else {
    
                        if (emailOptions == null) { emailOptions = MPDReportGen.emailOptionsUS };
                        var email = {
                                from: emailOptions.From(),
                                to: emailOptions.To(emailAddr),
                                cc: emailOptions.CC(),
                                bcc: emailOptions.BCC(),
                                subject:'US Staff Account Info ('+emailAddr+') for staff with Missing Assignments',
                                html:html,
                                text:text
                        };
    
                        opts.listEmails.push(email);
                    };
                });
            };
        } // next region
    }
    
    dfd.resolve(opts.listEmails);

    return dfd;
};



/**
 * Report of staff with missing HRIS info
 */
var renderMissingStaffEmails = function(opts) {
    var dfd = $.Deferred();

//        opts.renderer   The renderer for this email template
//        opts.listEmails The array to store our rendered email obj into
//        opts.data       The data to use for our
//        opts.extra      Any extra data to add
//        opts.dir        The template directory (why do we need this again?)

    // Sending the missing staff to all region addresses
    
    // Only proceed if there are staff with missing HRIS info
    if (_.size(opts.data['missing']) > 0) {
        // for each regional email address:
        for (var emailAddr in opts.data) {
    
            if ((emailAddr != 'undefined')
                    && (emailAddr != 'missing')) {
    
                // NOTE: this is NOT asynchronous...
                // NOTE: region = 'undefined' means that we couldn't find their region
                var people = arrayOrderedBy(opts.data['missing'], 'accountBal');
                var renderData = { 
                    people: people,
                    extra: opts.extra
                }
                opts.renderer(renderData, opts.dir, function(err, html, text) {
                    if (err) {
                        Log.error(LogKey+' error rendering email: ', err);
    
                        // bail out!!!!
                        dfd.reject(err);
                        return dfd;
    
                    } else {
    
                        if (emailOptions == null) { emailOptions = MPDReportGen.emailOptionsUS };
    
                        var email = {
                                from: emailOptions.From(),
                                to: emailOptions.To(emailAddr),
                                cc: emailOptions.CC(),
                                bcc: emailOptions.BCC(),
                                subject:'Missing US Staff Accounts Info ('+emailAddr+') ',
                                html:html,
                                text:text
                        };
    
                        opts.listEmails.push(email);
                    };
                });
            };
        } // next region
    }

    dfd.resolve(opts.listEmails);

    return dfd;
};


var ListEntry = function(data, sortFn) {
    this.data = data;
    this.next = null;
    this.prev = null;
    this.sort = sortFn;
};



ListEntry.prototype.add = function(data) {
    var newEntry = new ListEntry(data, this.sort);

    // find place to insert newEntry
    var curr = this;

    // does new entry go before this one?
    if (this.sort(this, newEntry)) {
        newEntry.next = this;
        newEntry.prev = this.prev;
        if (this.prev) this.prev.next = newEntry;
        this.prev = newEntry;

        return newEntry;
    } else {

        while (curr.next != null) {

            curr = curr.next;

            // sort() should return true if newEntry should come before curr
            if (curr.sort(curr, newEntry)) {
                newEntry.next = curr;
                newEntry.prev = curr.prev;
                if (curr.prev) curr.prev.next = newEntry;
                curr.prev = newEntry;
                return this;
            }

        }

        // if we get here, then newEntry is added to the End
        curr.next = newEntry;
        newEntry.prev = curr;

        return this;
    }

};



ListEntry.prototype.toArray = function() {

    var list = [];

    var curr = this;
    while(curr != null) {

        list.push(curr.data);
        curr = curr.next;
    }

    return list;

};



var arrayOrderedBy = function (objList, fieldName, sortBy) {

    // objList:     : {object}  hash of values
    // fieldName    : name of the object.property to sort by
    // sortBy       : [ 'asc', 'desc' ]  ascending or decending sort
    sortBy = sortBy || 'asc';

    // the sortFn will return TRUE if b, should come before a
    var sortFn = function( a, b ) {
        if(sortBy == 'asc') {
            // should return true if b < a
            return (b.data[fieldName] < a.data[fieldName]);
        } else {

            // should return true if a < b
            return (a.data[fieldName] < b.data[fieldName]);
        }
    };

    var list = null;
    var numDone = 0;
    for (var acct in objList ) {
        numDone ++;
        if (list == null) {
            list = new ListEntry(objList[acct], sortFn);
        } else {

            list = list.add(objList[acct]);

        }

    }



    var sortedArray = [];
    if (list) {
        sortedArray = list.toArray();
    }
//    var curr = list;
//    while(curr != null) {
//
//        sortedArray.push(curr.data);
//        curr = curr.next;
//    }

    if (numDone != sortedArray.length) {
        Log.error(LogKey+' sorted array not equal to number of entries:', {objList:objList, sortedArray:sortedArray});
        console.log();
        console.log('**** WARNING: sortedArray not equal to number of entries!');
        console.log(objList);
        console.log(sortedArray);
        console.log();
    }
    return sortedArray;

};
