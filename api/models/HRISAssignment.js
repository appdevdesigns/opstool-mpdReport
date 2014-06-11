/**
* HRISAssignment
*
* @module      :: Model
* @description :: A short summary of how this model works and what it represents.
*
*/

module.exports = {

    tableName:"hris_assignment",
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

        assignment_id   : 'INTEGER',


        assignment_guid : 'STRING',


        ren_id  : 'INTEGER',


        team_id : 'INTEGER',


        position_id : 'INTEGER',


        assignment_startdate    : 'DATE',


        assignment_enddate  : 'DATE',


        assignment_isprimary    : 'INTEGER'
    }

};
