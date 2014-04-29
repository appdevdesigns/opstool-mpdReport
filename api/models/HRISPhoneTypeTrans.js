/**
 * HRISPhoneTypeTrans
 *
 * @module      :: Model
 * @description :: A short summary of how this model works and what it represents.
 * @docs		:: http://sailsjs.org/#!documentation/models
 */

module.exports = {

  tableName:"hris_phonetype_trans",
  autoCreatedAt:false,
  autoUpdatedAt:false,
  autoPK:false,
  migrate:'safe',  // don't update the tables!

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


    phonetype_id	: 'INTEGER',


    language_code	: 'STRING',


    phonetype_label	: 'STRING'
  }

};
