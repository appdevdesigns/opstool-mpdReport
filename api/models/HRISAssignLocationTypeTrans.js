/**
 * HRISAssignLocationTypeTrans
 *
 * @module      :: Model
 * @description :: A short summary of how this model works and what it represents.
 *
 */

module.exports = {

  tableName:"hris_assign_locationtype_trans",
  autoCreatedAt:false,
  autoUpdatedAt:false,
  autoPK:false,
  migrate:'safe',

  config:{
//    database:'test_hris',
    pool:false
  },


  adapter:"hris",



  attributes: {

  	/* e.g.
  	nickname: 'string'
  	*/

    Trans_id	: 'INTEGER',


    locationtype_id	: 'INTEGER',


    language_code	: 'STRING',


    locationtype_label	: 'STRING'
  }

};
