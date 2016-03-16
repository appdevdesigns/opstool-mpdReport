/**
 * Routes
 *
 * Use this file to add any module specific routes to the main Sails
 * route object.
 */


module.exports = {

    '/mpdreport/upload'                       : 'opstool-mpdReport/StaffReportUSController.uploadFile'
    
    , '/usmpdreport/email/preview'             : 'opstool-mpdReport/StaffReportUSController.emailPreview'
    , 'get /mpdreport/data'                    : 'opstool-mpdReport/StaffReportUSController.data'
    , 'post /mpdreport/email/send'             : 'opstool-mpdReport/StaffReportUSController.emailSend'

    , 'get /nsmpdreport/regions'               : 'opstool-mpdReport/StaffReportNSController.regions'
    , 'get /nsmpdreport/dataForRegion'         : 'opstool-mpdReport/StaffReportNSController.dataForRegion'

    , '/nsmpdreport/email/preview'             : 'opstool-mpdReport/StaffReportNSController.emailPreview'
    , 'post /nsmpdreport/email/send'           : 'opstool-mpdReport/StaffReportNSController.emailSend'
    , 'post /nsmpdreport/email/individual/send': 'opstool-mpdReport/StaffReportNSController.emailSendIndividual'

};

