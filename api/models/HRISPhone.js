/**
 * HRISPhone
 *
 * @module      :: Model
 * @description :: A short summary of how this model works and what it represents.
 * @docs		:: http://sailsjs.org/#!documentation/models
 */

module.exports = {

  tableName:"hris_phone_data",
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

    phone_id	: 'INTEGER',


    phone_guid	: 'STRING',


    ren_id	: 'INTEGER',


    phonetype_id	: 'INTEGER',


    phone_countrycode	: 'INTEGER',


    phone_number	: 'STRING'
  }

};
