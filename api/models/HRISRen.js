/**
* HRISRenData
*
* @module      :: Model
* @description :: A short summary of how this model works and what it represents.
*
*/

module.exports = {

    tableName:"hris_ren_data",
    autoCreatedAt:false,
    autoUpdatedAt:false,
    autoPK:false,
    migrate:'safe',


    connection: ['nss'],
    config:{
        pool:false
    },


    attributes: {

        /* e.g.
        nickname: 'string'
        */

        ren_id  : 'INTEGER',


        ren_guid    : 'STRING',


        rentype_id  : 'INTEGER',


        family_id   : 'INTEGER',


        ren_surname : 'STRING',


        ren_givenname   : 'STRING',


        ren_namecharacters  : 'STRING',


        ren_namepinyin  : 'STRING',


        ren_preferredname   : 'STRING',


        ren_birthdate   : 'DATE',


        ren_deathdate   : 'DATE',


        gender_id   : 'INTEGER',


        maritalstatus_id    : 'INTEGER',


        ethnicity_id    : 'INTEGER',


        ren_primarycitizenship  : 'INTEGER',


        statustype_id   : 'INTEGER',


        ren_isfamilypoc : 'INTEGER',


        ren_preferredlang   : 'INTEGER',


        ren_picture : '?BLOB?'
    }

};
