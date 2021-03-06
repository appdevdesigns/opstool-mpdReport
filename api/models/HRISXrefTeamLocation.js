/**
* HRISXrefTeamLocation
*
* @module      :: Model
* @description :: A short summary of how this model works and what it represents.
*
*/

module.exports = {

    tableName:"hris_xref_team_location",
    autoCreatedAt:false,
    autoUpdatedAt:false,
    autoPK:false,
    migrate:'safe',


    connection: ['hris'],
    config:{
        pool:false
    },


    attributes: {

        /* e.g.
        nickname: 'string'
        */

        tl_id   : 'INTEGER',


        tl_guid : 'STRING',


        team_id : 'INTEGER',


        location_id : 'INTEGER'
    }

};
