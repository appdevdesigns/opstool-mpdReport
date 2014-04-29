/**
 * NssCoreFiscalYear
 *
 * @module      :: Model
 * @description :: A short summary of how this model works and what it represents.
 *
 */

module.exports = {

  tableName:"nss_core_gltran",
  autoCreatedAt:false,
  autoUpdatedAt:false,
  autoPK:false,
  migrate:'safe',


  adapter:"nss",



  attributes: {

  	/* e.g.
  	nickname: 'string'
  	*/
	gltran_id: 'INTEGER',

	gltran_acctnum: 'INTEGER',

	gltran_subacctnum: 'STRING',

	gltran_cramt: 'DOUBLE',

	gltran_dramt: 'DOUBLE',

	gltran_fiscalyr: 'INTEGER',

	gltran_refnum: 'STRING',

	gltran_trandate: 'DATE',

	gltran_trandesc: 'STRING',

	gltran_perpost: 'INTEGER',

	gltran_batchlinenum:  'INTEGER',

	gltran_linenum: 'INTEGER'
  }

};
