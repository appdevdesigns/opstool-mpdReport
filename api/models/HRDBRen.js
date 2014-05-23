/**
* HRISRenData
*
* @module      :: Model
* @description :: A short summary of how this model works and what it represents.
*
*/

module.exports = {

    tableName:"ren",
    autoCreatedAt:false,
    autoUpdatedAt:false,
    autoPK:false,
    migrate:'safe',


    connection: ['hrdb'],
    config:{
        pool:false
    },


    attributes: {

        /* e.g.
        nickname: 'string'
        */

        ren_id: 'INTEGER',

        family_id:  'INTEGER',

        ren_surname: 'STRING',

        ren_givenname: 'STRING',

        ren_familyposition: 'STRING',

        ren_maritalStatus: 'STRING',

        ren_namecharacters: 'STRING',

        ren_namepinyin: 'STRING',

        ren_preferedname: 'STRING',

        ren_ethnicity: 'STRING',

        ren_citizenship: 'STRING',

        ren_birthday: 'DATE',

        ren_gender: 'STRING', //char(1)

        ren_educationlevel:  'STRING',

        ren_major: 'STRING',

        ren_schoolingmethod: 'STRING',

        ren_mobilephone:  'STRING',

        ren_workphone: 'STRING',

        ren_pager: 'STRING',

        ren_emailother: 'STRING',

        ren_passportcountry: 'STRING',

        ren_passport: 'STRING',

        ren_passportissuedate: 'DATE',

        ren_passportexpiredate: 'DATE',

        ren_visatype: 'STRING',

        ren_employeestatus: 'STRING',

        ren_sendingcountry: 'STRING',

        assignment_id: 'INTEGER',

        ren_datejoined: 'DATE',

        ren_dateasiaimpact: 'DATE',

        ren_staffaccount:  'STRING',

        ren_accountcountry: 'STRING',

        ren_nltc: 'STRING', //char(1)

        ren_newstafftraining: 'STRING', //char(1)

        ren_localleaderstraining: 'STRING', // char(1)

        ren_trainerstraining: 'STRING', // char(1)

        ren_ibs: 'STRING',

        ren_languagelevel: 'STRING',

        ren_enrolled: 'STRING', // char(1)

        ren_talentadmin: 'STRING', //char(1)

        ren_talentcomm: 'STRING', // char(1)

        ren_talentit: 'STRING', // char(1),

        ren_talentprog: 'STRING', //char(1)

        ren_talentdrama: 'STRING', // char(1)

        ren_talentfinance: 'STRING',  // char(1)

        ren_talentgraphics: 'STRING',  // char(1)

        ren_talentmedical: 'STRING', // char(1)

        ren_talentmusic: 'STRING', // char(1)

        ren_talentphotography: 'STRING', // char(1)

        ren_talentwebdesign: 'STRING',  //char(1)

        ren_talentother: 'STRING', //char(1),

        ren_talentdesc: 'STRING',

        ren_healthissues: 'STRING',

        ren_bloodtype: 'STRING', // char(2)

        ren_rhfactor: 'STRING', //char(2)

        ren_fatherattitude: 'STRING',

        ren_motherattitude: 'STRING',

        ren_registeredembassy: 'STRING', // char(2)

        ren_webuserid: 'STRING',

        ren_badgename: 'STRING',

        ren_badgelastname: 'STRING',

        track_id: 'INTEGER',

        ren_photoCounter: 'INTEGER',

        ren_secureemail: 'STRING',

        ren_imid: 'STRING',

        drupal_uid: 'INTEGER',

        location_id: 'INTEGER',

        ren_administer:  'INTEGER',

        global_uid: 'STRING',

        ren_staffStatus: 'STRING',

        ren_stageOfLife: 'STRING',

        ren_shenfenzhen: 'STRING'

    }

};
