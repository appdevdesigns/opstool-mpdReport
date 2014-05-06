
var path = require('path');
var AD = require('ad-utils');




var emailDump = function(email) {
    
    Log('<red><bold>to:</bold>'+email.to+'</red>');
    Log('<red><bold>from:</bold>'+email.from+'</red>');
    Log('<red><bold>cc:</bold>'+email.cc+'</red>');
    Log('<red><bold>bcc:</bold>'+email.bcc+'</red>');
    Log('<red><bold>subject:</bold>'+email.subject+'</red>');
}




//////
// CONFIG
//
var emailFn = function(system, field, emailAddr) {

    // make sure configuration file properly set.
    if ('undefined' == typeof sails.config.opstool_mpdReport) {
        Log.error(' config file not defined!');
        sails.config.opstool_mpdReport = { us: { mode:'replace' }, ns: { mode:'replace' } };
    } 

    if ('undefined' == typeof sails.config.opstool_mpdReport[system]) {
        Log.error(' config/opstool-mpdReport.js did not define system: '+system);
        sails.config.opstool_mpdReport[system] = { mode:'replace' };
    }

    if ('undefined' == typeof sails.config.opstool_mpdReport[system][field]) {
        Log.error(' config/opstool-mpdReport.js  (system:'+system+') did not define field: '+field);
        sails.config.opstool_mpdReport[system][field] = field+'@not.provided.net';
    }
    


    var emailTo = sails.config.opstool_mpdReport[system][field];
    if (emailAddr) {

        // lets figure out what to do with the passed in address
        var mode = sails.config.opstool_mpdReport[system].mode.toLowerCase();
        if ( mode == 'merge') {
            emailTo = emailAddr + ', ' + emailTo;
        } else if (mode == 'replace') {
            emailTo = emailAddr;
        } 
    }
    
    return emailTo;
}

var emailOptionsUS = {
    To:   function( addr ) { return emailFn('us', 'to',   addr); },
    From: function( addr ) { return emailFn('us', 'from', addr); },
    CC:   function( addr ) { return emailFn('us', 'cc',   addr); },
    BCC:  function( addr ) { return emailFn('us', 'bcc',  addr); },
};


var emailOptionsNS = {
    To:   function( addr ) { return emailFn('ns', 'to',   addr); },
    From: function( addr ) { return emailFn('ns', 'from', addr); },
    CC:   function( addr ) { return emailFn('ns', 'cc',   addr); },
    BCC:  function( addr ) { return emailFn('ns', 'bcc',  addr); },
};





var Log = function() {

  var args = ['<green><bold>opstool-mpdReport:</bold></green>'];
  for (var i=0; i<arguments.length; i++) {
    args.push(arguments[i]);
  }
  AD.log.apply(AD, args);

}



Log.error = function() {

  var args = ['<bold>opstool-mpdReport:</bold>'];
  for (var i=0; i<arguments.length; i++) {
    args.push(arguments[i]);
  }
  AD.log.error.apply(AD, args);
}



var pathTemplates = function() {
    return  path.join(sails.config.appPath, 'data', 'opstool-mpdReport', 'templates_email');
}



module.exports= {

        emailDump:emailDump,
        emailOptionsUS:emailOptionsUS,
        emailOptionsNS:emailOptionsNS,
        Log: Log,
        pathTemplates:pathTemplates

};