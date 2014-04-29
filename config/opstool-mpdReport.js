/**
 * Global adapter opsportal
 *
 * The Ops Portal configuration allows you to configure the installed ops tools
 * for the portal.
 *
 */

module.exports.opstool_mpdReport = {

    // US Staff Settings:
    us: {

        // list out all the possible permissions listed by
        mode: 'replace',  // ['replace', 'merge', 'use'] : if an email address is programmatically
                          //      passed to one of these addresses, do we
                          //      'replace' the one provided below with the one passed in
                          //      'merge'   the one provided below with the one passed in
                          //      'use'     the one below instead of the one passed in
      
        // define the base email addresses to use when sending reports:
        from: 'from@email.net',
        to:   'to@email.net',
        cc:   'cc@email.net',
        bcc:  'bcc@email.net',


        // list the emails here:
        emails: {
            // region:'email@address.com',
            //   region: needs to match the region key returned from HRIS
        }

    },



    // National Staff Settings:
    ns: {

        // list out all the possible permissions listed by
        mode: 'replace',  // ['replace', 'merge', 'use'] : if an email address is programmatically
                          //      passed to one of these addresses, do we
                          //      'replace' the one provided below with the one passed in
                          //      'merge'   the one provided below with the one passed in
                          //      'use'     the one below instead of the one passed in
      
      
        // define the base email addresses to use when sending reports:
        from: 'from@email.net',
        to:   'to@email.net',
        cc:   'cc@email.net',
        bcc:  'bcc@email.net',


        // list the emails here:
        emails: {
            // region:'email@address.com',
            //   region: needs to match the region key returned from HRIS

        }

    }
};