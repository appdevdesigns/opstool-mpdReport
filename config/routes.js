/**
 * Routes
 *
 * Use this file to add any module specific routes to the main Sails
 * route object.
 */


module.exports = {

    '/mpdreport/upload'                       : 'opstool-mpdReport/StaffReportUSController.uploadFile'
    , 'get /mpdreport/data'                   : 'opstool-mpdReport/StaffReportUSController.data'
    , 'get /mpdreport/email/send'             : 'opstool-mpdReport/StaffReportUSController.emailSend'

    , 'get /nsmpdreport/regions'              : 'opstool-mpdReport/StaffReportNSController.regions'
    , 'get /nsmpdreport/dataForRegion'        : 'opstool-mpdReport/StaffReportNSController.dataForRegion'

    /// old 
    , 'get /nsmpdreport/data'                 : 'opstool-mpdReport/StaffReportNSController.data'
    , 'get /nsmpdreport/email/send'           : 'opstool-mpdReport/StaffReportNSController.emailSend'
    , 'get /nsmpdreport/email/individual/send': 'opstool-mpdReport/StaffReportNSController.emailSendIndividual'

};

