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

            if (Log == null) Log = MPDReportGen.Log; 

            var compiledData = {};

            var csvParsed = this.parseCSV(fileName);
            var staffFound = this.findUSStaff();
            var regionsFound = this.findRegionInfo();
            var assignmentsFound = this.findAssignments();
            var phonesFound = this.findPhones();
            var emailsFound = this.findEmails();


            $.when(csvParsed, staffFound, regionsFound, assignmentsFound, phonesFound, emailsFound)
            .fail(function() {
                console.log('compileStaffData failed:', arguments);
                return done({});
            })
            .done(function( csvInfo, usStaff, regionObj, assignmentObj, phoneObj, emailObj){
//                compiledData.csvInfo = csvObj;
//                compiledData.usStaff = staffObj;
                compiledData.staffByRegion = {};
                compiledData.missing = {};


                for (var a in csvInfo) {
                    if ( usStaff[a]) {

                        var clone = {};
                        var csv = csvInfo[a];
                        for (var c in csv) {
                            clone[c] = csv[c];
                        }

                        var staff = usStaff[a];
                        for (var s in staff) {
                            clone[s] = staff[s];
                        }

                        var lID = assignmentObj[staff.ren_id];

                        clone.hris_region = regionObj[lID];

                        clone.phone = phoneObj[clone.ren_id];
                        clone.email = emailObj[clone.ren_id];

                        var sbr = compiledData.staffByRegion;
                        if (!sbr[clone.hris_region]) {
                             sbr[clone.hris_region] = {};
                        }

                        sbr[clone.hris_region][a] = clone;

                    } else {
                        compiledData.missing[a] = csvInfo[a];
                    }
                }



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

            });
//// TODO:  need a .fail(function(err){  ... }); option here since one of these could fail.
////        this means done() needs to support: done(err, compiledData) format.

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

        },



        findRegionInfo: function () {
            var self = this;
            var dfd = $.Deferred();

            // return a lookup table with all location_id =>  regionCode

            this.getLocationLookup(function( err, locationLookup) {

                if (err) {

                    dfd.reject(err);

                } else {

                    //
                    // now pull all location sub types and relate them back to their parent location_trans
                    self.locationSubLocations(locationLookup, function(err, finalLookup) {
                        if (err) {
                            dfd.reject(err);
                        } else {
                            dfd.resolve(finalLookup);
                        }
                    });

                }
            });
            return dfd;
        },



        getLocationLookup: function(done) {
            // create a lookup with all Region Locations:  { location_id : RegionCode }

            // find which location type == Region
            HRISAssignLocationTypeTrans
            .find({ language_code:'en', locationtype_label:'Region'})
            .fail(function(err){
                Log.error(LogKey+' error looking up HRISAssignLocationTypeTrans:', err);
                done(err);
            })
            .then(function(locationType){

                // pull all locations_data with this locationType
                get(HRISAssignLocation, 'locationtype_id', {}, locationType, function(err, locations){

                    if (err) {

                        Log.error(LogKey+' error looking up HRISAssignLocation:', err);
                        done(err);

                    } else {


                        // pull the location_tran for these locations
                        get(HRISAssignLocationTrans, 'location_id', { language_code:'en' },  locations, function(err, trans) {

                            if (err) {

                                Log.error(LogKey+' error looking up HRISAssignLocationTrans:', err);
                                done(err);

                            } else {


                                var locationLookup = lookupTable(trans, 'location_id', 'location_label');
                                if (done) done(null, locationLookup);

                            }

                        });

                    }
                });

                
            });
        },



        locationSubLocations: function(lookup, done) {
            // take the given lookup and then find all their sub locations
            // and map the sublocations to the parent's Region Code

            // convert lookup into an array of location_id's
            var set = [];
            for (var l in lookup) {
                set.push(parseInt(l), 10);
            }

            var recursiveLookup = function( currentSet, cb) {
                // currentSet {array} list of location_id's to lookup

                // if we have locations to look up
                if (currentSet.length > 0 ) {

                    // pull all locations with parent_id in currentSet
                    HRISAssignLocation.find({parent_id:currentSet})
                    .fail(function(err){
                        Log.error(LogKey+'error searching sub locations: ',err, ' \ncurrSet: ',currentSet);
                        if (cb) cb(err);
                    })
                    .then(function(locations) {

                        if (locations.length > 0 ) {

                            var nextSet = [];
                            for (var l=0; l<locations.length; l++) {
                                var element = locations[l];

                                // insert into lookup table
                                lookup[element.location_id] = lookup[element.parent_id];

                                // store this id for the next call
                                nextSet.push(element.location_id);
                            }

                            recursiveLookup(nextSet, function(err) {
                                if (err) {
                                    if (cb) cb(err);
                                } else {
                                    if (cb) cb();
                                }
                            });

                        } else {
                            if (cb) cb();
                        }
                        
                    });

                } else {

                    if (cb) cb();
                }

            };

            recursiveLookup(set, function(err) {
                if (err) {
                    if (done) done(err);
                } else {
                    if (done) done(null, lookup);
                }
            });
        },



        findUSStaff: function(done) {
            var dfd = $.Deferred();
            HRISCountryData
            .find({ country_code:'US'})
            .fail(function(err){
                Log.error(LogKey+'error finding countries:', err);
console.log(err);
                dfd.reject(err);
            })
            .then(function (countries) {


                    get(HRISAccount, 'country_id', {}, countries, function(err, accounts){

                        if (err) {
                            Log.error(LogKey+'error finding account->countries:', err);
console.log(err);
                            dfd.reject(err);

                        } else {


                            // create a lookup:  { 'family_id' : 'account_number' }
                            var familyID_Account = lookupTable(accounts, 'family_id', 'account_number');
                            get(HRISRen, 'family_id', { ren_isfamilypoc:1}, accounts, function(err, ren) {

                                if (err) {
                                    Log.error(LogKey+'error finding ren->accounts:', err );
console.log(err);
                                    dfd.reject(err);

                                } else {

                                    var account_poc = {};
                                    for (var r=0; r<ren.length; r++) {
                                        var info = {};
                                        info.hrisName = ren[r].ren_surname + ', ' + ren[r].ren_givenname + ' ( '+ ren[r].ren_preferredname + ' )';
                                        info.ren_id = ren[r].ren_id;

                                        var key = parseInt(familyID_Account[ren[r].family_id], 10);
                                        account_poc[ key ] = info;
                                    }

                                    dfd.resolve(account_poc);

                                }

                            }); // end get(HRISRen);

                        }

                    }); // end get(HRISAccount);

                


            });  // end HRISCountryData.find()

            return dfd;
        },



        findAssignments: function () {
            // create a lookup to relate a ren => location_id (by assignment)
            var dfd = $.Deferred();

            HRISAssignment.find({ assignment_isprimary:1 })
            .fail(function(err){
                Log.error(LogKey+'error finding assignments:',err);
                console.log(err);
                dfd.reject(err);
            })
            .then( function(assignments) {

                Log(LogKey+' assignments found ['+assignments.length+']');

                if (assignments.length > 0 ) {

                    var ren2assign = lookupTable(assignments, 'ren_id', 'team_id');
                    get( HRISXrefTeamLocation, 'team_id', {}, assignments, function( err, tlocations) {
                        if (err) {
                            Log.error(LogKey+'error finding team X location:', err);
                            console.log(err);
                            dfd.reject(err);

                        } else {


                            var team2Loc = lookupTable(tlocations, 'team_id', 'location_id');
                            var combinedLookup = {};

                            for (var rid in ren2assign) {
                                combinedLookup[rid] = team2Loc[ren2assign[rid]];
                            }

                            dfd.resolve(combinedLookup);
                        }
                    });

                } else {

                    dfd.resolve({});
                }

            });


            return dfd;
        },



        findPhones: function () {
            var dfd = $.Deferred();

            // return a lookup table with all location_id =>  regionCode
            var phoneTypes = {};
            var phoneLookup = {};

            HRISPhoneTypeTrans.find({language_code:'en'})
            .fail(function(err) {
                Log.error(LogKey+' error finding PHone types: ', err);
                dfd.reject(err);
            })
            .then(function(types){

                types.forEach(function(type) {
                    phoneTypes[type.phonetype_id] = type.phonetype_label;
                });

                HRISPhone.find()
                .fail(function(err){

                    Log.error(LogKey+' error finding phones:', err);
                    console.log(err);
                    dfd.reject(err);
                })
                .then(function(phones){


                    phones.forEach(function(phone) {

                        var phoneNum = phone.phone_number + ' '+getPhoneTag(phoneTypes[phone.phonetype_id]);
                        phoneLookup[phone.ren_id] = phoneNum;

                    });

                    dfd.resolve(phoneLookup);
                    
                });

            });

            return dfd;
        },



        findEmails: function () {
            var dfd = $.Deferred();

            // return a lookup table with all ren_id =>  email_address
            var emailLookup = {};

            HRISEmail.find({email_issecure:1})
            .fail(function(err) {
                Log.error(LogKey+' error finding emails:', err);
                console.log(err);
                dfd.reject(err);
            })
            .then(function(emails){

                emails.forEach(function(email) {
                    emailLookup[email.ren_id] = email.email_address;
                });

                dfd.resolve(emailLookup);
                
            });

            return dfd;
        },



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

                // now, tack on the 'missing' group of people:
                emailData.missing = data.missing;

                if (done) done(emailData);
                dfd.resolve(emailData);

            });

            return dfd;
        },


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


var get = function( model, fkey, options, values, cb) {

    if ((values) && (values.length > 0)) {

        var listFKey = [];
        for (var v =0; v < values.length; v++ ) {

            if (values[v][fkey]) {
                listFKey.push( values[v][fkey]);
            }

        }

        options = options || {};
        options[fkey]=listFKey;

        model.find(options)
        .fail(function(err) {
            if (cb) cb(err, []);
        })
        .then(function(values) {
            if (cb) cb(null, values);
        });

    } else {
        if (cb) cb(null, []);
    }
};

var lookupTable = function (values, fromKey, toKey) {
    var table = {};
    if ((values) && (values.length>0)) {
        for (var v=0; v < values.length; v++) {
            table[values[v][fromKey]] = values[v][toKey];
        }
    }
    return table;
};



var getPhoneTag = function(phoneType) {

    switch (phoneType.toLowerCase()) {
        case 'mobile':
            return '(m)';
            break;
        case 'home':
            return '(h)';
            break;
        case 'work':
            return '(w)';
            break;
    }

    return '';
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
                        subject:'PREVIEW: US Staff Account Info ('+emailName+')',
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




var renderMissingRegionsEmails = function(opts) {
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
            // NOTE: region = 'undefined' means that we couldn't find their region
            var people = arrayOrderedBy(opts.data['undefined'], 'accountBal');
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
                            subject:'PREVIEW: US Staff Account Info ('+emailAddr+') for staff with Missing Assignments',
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




var renderMissingStaffEmails = function(opts) {
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
                            subject:'PREVIEW: Missing US Staff Accounts Info ('+emailAddr+') ',
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
